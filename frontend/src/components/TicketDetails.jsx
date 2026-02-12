import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/apiClient';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardPathByRole } from '../utils/routes';
import { formatDateTime } from '../utils/dateUtils';
import AttachmentList from './AttachmentList';
import FileUploader from './FileUploader';
import ApprovalSuccessModal from './ApprovalSuccessModal';
import ConfirmDialog from './common/ConfirmDialog';
import { deleteTicket } from '../api/tickets';
import { debugLog } from '../utils/debug';

const TicketDetails = ({ ticketId: propId, onClose, initialEdit = false }) => {
    const { id: paramId } = useParams();
    const id = propId || paramId;
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [errorStatus, setErrorStatus] = useState(null);
    const [comment, setComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    // Assignment State
    const [users, setUsers] = useState([]);
    const [selectedAssignee, setSelectedAssignee] = useState('');

    // Manager Approval State
    const [approvalDecision, setApprovalDecision] = useState('');
    const [approvalPriority, setApprovalPriority] = useState('');
    const [approvalReason, setApprovalReason] = useState(''); // New State for Comment
    const [approvalModal, setApprovalModal] = useState({ open: false, ticketNumber: '', timestamp: '' });

    // Delete Modal State removed
    const [isDeleting, setIsDeleting] = useState(false);

    // Admin Edit State
    const [pendingStatus, setPendingStatus] = useState('');
    const [pendingAssignee, setPendingAssignee] = useState('');
    const [isSavingAdmin, setIsSavingAdmin] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(initialEdit);
    const [editForm, setEditForm] = useState({});

    const handleManagerSubmit = async () => {
        debugLog('Manager submitting decision', { decision: approvalDecision, priority: approvalPriority });
        if (!approvalDecision) return;

        // If Rejecting, use the specific reject flow or PATCH (assuming PATCH handles it)
        // If Approving, use the new POST endpoint as per requirements
        if (approvalDecision === 'APPROVED') {
            try {
                const res = await apiClient.post(`/tickets/${id}/approve`, {
                    priority: approvalPriority || undefined,
                    comment: approvalReason // Include comment
                });
                const data = res.data;

                const approvedAt = data.approvedAt ? new Date(data.approvedAt).toLocaleString() : new Date().toLocaleString();
                const tNo = data.ticketNumber || id;

                setApprovalModal({
                    open: true,
                    ticketNumber: tNo,
                    timestamp: approvedAt
                });

            } catch (error) {
                console.error('Approval failed', error);
                const msg = error.response?.data?.message || 'Failed to submit approval';
                // Try to handle 409 conflict specifically if needed
                if (error.response && error.response.status === 409) {
                    toast.error(msg);
                } else {
                    toast.error("Failed to approve ticket");
                }
            }
        } else {
            // Rejection Flow (Keep using PATCH or generic update if POST doesn't handle rejection)
            try {
                await apiClient.patch(`/tickets/${id}/approval`, {
                    managerApprovalStatus: approvalDecision,
                    priority: approvalPriority || undefined, // Priority usually not needed for reject but keeping logic
                    comment: approvalReason // Include comment
                });
                fetchTicket();
                setApprovalDecision('');
                setApprovalPriority('');
                toast.success("Ticket rejected successfully");
                navigate('/app/manager');
            } catch (error) {
                console.error('Rejection failed', error);
                toast.error('Failed to reject ticket');
            }
        }
    };

    const handleModalOk = () => {
        setApprovalModal({ ...approvalModal, open: false });
        navigate('/app/manager');
    };

    useEffect(() => {
        fetchTicket();
        if (user && (user.role === 'ADMIN' || user.role === 'IT_SUPPORT')) {
            fetchUsers();
        }
    }, [id, user]);

    const fetchTicket = async () => {
        try {
            const response = await apiClient.get(`/tickets/${id}`);
            setTicket(response.data);
            setEditForm(response.data); // Initialize edit form

            // Initialize Admin Edit State
            setPendingStatus(response.data.status);
            setPendingAssignee(response.data.assignedTo?.id || '');

            setError(null);
            setErrorStatus(null);
        } catch (error) {
            console.error('Error fetching ticket:', error);
            const status = error.response?.status;
            setErrorStatus(status);

            if (status === 404) {
                setError("Ticket not found");
            } else if (status === 403) {
                setError("You don't have permission to view this ticket");
            } else if (status === 401) {
                setError("Please log in to view this ticket");
            } else if (status >= 500) {
                setError("Server error. Please try again later.");
            } else {
                setError("Failed to load ticket. Please check your connection.");
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await apiClient.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleStatusChange = async (newStatus) => {
        debugLog('Updating status', { id, newStatus });
        try {
            await apiClient.patch(`/tickets/${id}/status`, { status: newStatus });
            fetchTicket();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const handleAssignToMe = async () => {
        debugLog('Assigning to me', user.username);
        try {
            await apiClient.patch(`/tickets/${id}/assign?userId=${user.id}`);
            fetchTicket();
        } catch (error) {
            alert('Failed to assign ticket');
        }
    };

    const handleAssignToUser = async () => {
        if (!selectedAssignee) return;
        debugLog('Assigning to user', selectedAssignee);
        try {
            await apiClient.patch(`/tickets/${id}/assign?userId=${selectedAssignee}`);
            fetchTicket();
            setSelectedAssignee('');
        } catch (error) {
            alert('Failed to assign ticket');
        }
    };

    const handleDeleteAttachment = async (attachmentId) => {
        if (!window.confirm('Are you sure you want to delete this attachment?')) return;
        try {
            await apiClient.delete(`/tickets/${id}/attachments/${attachmentId}`);
            fetchTicket();
        } catch (error) {
            console.error('Delete failed', error);
            alert('Failed to delete attachment. You may not have permission.');
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;

        debugLog('Posting comment', { ticketId: id, length: comment.length });

        setSubmittingComment(true);
        try {
            await apiClient.post(`/tickets/${id}/comments`, {
                content: comment,
                author: { id: user.id }
            });
            setComment('');
            fetchTicket();
        } catch (error) {
            console.error('Comment failed', error);
            alert('Failed to post comment');
        } finally {
            setSubmittingComment(false);
        }
    };



    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        if (!isEditing) setEditForm(ticket); // Reset on open
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleEditSubmit = async () => {
        try {
            // Only send updatable fields
            const payload = {
                title: editForm.title,
                description: editForm.description,
                priority: editForm.priority,
                category: editForm.category,
                status: editForm.status // Allow status update here too? Maybe not, stick to side panel
            };

            await apiClient.put(`/tickets/${id}`, payload);
            toast.success("Ticket updated successfully");
            setIsEditing(false);
            fetchTicket();
        } catch (error) {
            console.error("Update failed", error);
            toast.error("Failed to update ticket");
        }
    };

    const handleAdminSubmit = async () => {
        setIsSavingAdmin(true);
        try {
            const payload = {
                assignedTo: pendingAssignee ? parseInt(pendingAssignee) : null,
                status: pendingStatus,
                priority: editForm.priority, // Optional: include if we want to update it
                category: editForm.category, // Optional
                comment: "Admin Update" // We could add a comment field to UI later
            };

            await apiClient.patch(`/tickets/${id}/admin-actions`, payload);
            toast.success("Ticket updated successfully");

            // Refetch to update UI
            await fetchTicket();

            // Navigate back to Dashboard based on role if needed, or stay?
            // User requested: "After submit, refetch ticket details... UI will look stuck if not"
            // So we might stay on page.
            // But existing code navigated away.
            // "In Admin Actions... clicking Submit triggers multiple 500 toasts"
            // "After submit, refetch ticket details" -> implies checking if it worked.
            // Let's stay on page to verify update, or navigate if that's the desired flow.
            // Existing code: navigate(dashboardPathByRole(user.role));
            // Let's keep navigation consistent for now, OR fetch then decide.
            // If I fetchTicket, I assume the user wants to see the change.
            // Let's NOT navigate away immediately, to let them see the status change.
            // Or maybe separate "Save & Close" vs "Save".
            // For now, I'll fetchTicket and NOT navigate, similar to Assign/Comment.
        } catch (error) {
            console.error("Admin Update failed", error);
            const msg = error.response?.data?.message || "Failed to update ticket";
            toast.error(msg);
        } finally {
            setIsSavingAdmin(false);
        }
    };

    const handleAdminCancel = () => {
        // Reset to current ticket state
        if (ticket) {
            setPendingStatus(ticket.status);
            setPendingAssignee(ticket.assignedTo?.id || '');

            // Or navigate back if that was the intent
            navigate(dashboardPathByRole(user.role));
        }
    };

    // Track mount status to avoid state updates on unmount
    const isMountedRef = React.useRef(true);
    useEffect(() => {
        return () => { isMountedRef.current = false; };
    }, []);

    if (loading) {
        return (
            <div className="p-6 text-center text-gray-600">
                Loading ticket details...
            </div>
        );
    }

    if (error) {
        // Use status code instead of string matching for accurate error classification
        const isNotFound = errorStatus === 404;
        const isAuthError = errorStatus === 401 || errorStatus === 403;
        const isServerError = errorStatus >= 500;

        return (
            <div className="p-8 text-center">
                {/* Icon */}
                <div className="mb-4">
                    {isNotFound ? (
                        <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    ) : isAuthError ? (
                        <svg className="mx-auto h-16 w-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    ) : (
                        <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>

                {/* Error Message */}
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    {isNotFound ? 'Ticket Not Found' : isAuthError ? 'Access Denied' : 'Error Loading Ticket'}
                </h3>
                <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                    {error}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {onClose ? (
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-2)] transition-colors font-medium"
                        >
                            ← Back to List
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/app/admin')}
                            className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-2)] transition-colors font-medium"
                        >
                            ← Back to Dashboard
                        </button>
                    )}
                    {!isAuthError && (
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                        >
                            Reload Page
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="p-6 text-center text-gray-600">
                Ticket not found
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-6 text-center text-gray-600">
                Loading user profile...
            </div>
        );
    }

    const role = user.role || '';
    const isManager = Array.isArray(role) ? role.includes('MANAGER') : role === 'MANAGER';
    const isAdmin = Array.isArray(role) ? role.includes('ADMIN') : role === 'ADMIN';
    const isItSupport = Array.isArray(role) ? role.includes('IT_SUPPORT') : role === 'IT_SUPPORT';

    const renderManagerActions = () => {
        // Allow Admin and IT Support to override approval
        const isApprover = isManager || isAdmin || isItSupport;

        if (!isApprover) return null;

        return (
            <div className="card mt-6">
                <h4 className="font-bold mb-4 text-[var(--text-primary)]">Manager Approval</h4>
                <div className="flex flex-col space-y-4">
                    <div className="text-sm mb-2 text-[var(--text-secondary)]">
                        Current Status: <span className={`font-bold ${ticket.managerApprovalStatus === 'APPROVED' ? 'text-green-600 dark:text-green-400' :
                            ticket.managerApprovalStatus === 'REJECTED' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                            }`}>{ticket.managerApprovalStatus || 'PENDING'}</span>
                    </div>

                    {ticket.managerApprovalStatus !== 'APPROVED' && ticket.managerApprovalStatus !== 'REJECTED' && (
                        <div className="bg-[var(--bg-muted)] p-4 rounded-lg border border-[var(--border-subtle)] space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Decision</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="approvalDecision"
                                            value="APPROVED"
                                            checked={approvalDecision === 'APPROVED'}
                                            onChange={(e) => setApprovalDecision(e.target.value)}
                                            className="form-radio text-green-600"
                                            data-testid="manager-approve-radio"
                                        />
                                        <span>Approve</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="approvalDecision"
                                            value="REJECTED"
                                            checked={approvalDecision === 'REJECTED'}
                                            onChange={(e) => setApprovalDecision(e.target.value)}
                                            className="form-radio text-red-600"
                                            data-testid="manager-reject-radio"
                                        />
                                        <span>Reject</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Comments (Optional)</label>
                                <textarea
                                    value={approvalReason}
                                    onChange={(e) => setApprovalReason(e.target.value)}
                                    placeholder="Add a reason or note..."
                                    data-testid="manager-comment"
                                    className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 p-2"
                                    rows="2"
                                />
                            </div>

                            {approvalDecision === 'APPROVED' && (
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Set Priority {ticket.category === 'SECURITY' && <span className="text-red-500">*</span>}
                                    </label>
                                    <select
                                        data-testid="manager-priority-select"
                                        value={approvalPriority}
                                        onChange={(e) => setApprovalPriority(e.target.value)}
                                        className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 p-2"
                                    >
                                        <option value="">Select Priority...</option>
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                    {ticket.category === 'SECURITY' && !approvalPriority && (
                                        <p className="text-xs text-red-600 mt-1">Priority is required for security tickets.</p>
                                    )}
                                </div>
                            )}

                            <button
                                data-testid="manager-submit"
                                onClick={handleManagerSubmit}
                                disabled={!approvalDecision || (approvalDecision === 'APPROVED' && ticket.category === 'SECURITY' && !approvalPriority)}
                                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                                ${!approvalDecision || (approvalDecision === 'APPROVED' && ticket.category === 'SECURITY' && !approvalPriority)
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-[var(--accent)] hover:bg-[var(--accent-2)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)]'}`}
                            >
                                Submit Review
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <button
                onClick={() => navigate(-1)}
                className="mb-4 text-[var(--accent)] hover:text-[var(--accent-2)] transition-colors flex items-center"
            >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                Back
            </button>

            {/* Ticket Header */}
            <div className="bg-[var(--bg-card)] shadow overflow-hidden sm:rounded-lg mb-6 border border-[var(--border-subtle)] transition-colors">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
                    <div>
                        {isEditing ? (
                            <input
                                name="title"
                                value={editForm.title || ''}
                                onChange={handleEditChange}
                                className="text-2xl leading-6 font-bold text-[var(--text-primary)] bg-[var(--bg-input)] border border-[var(--border-input)] rounded px-2 w-full"
                            />
                        ) : (
                            <h3 className="text-2xl leading-6 font-bold text-[var(--text-primary)] flex items-center gap-2">
                                #{ticket.id} {ticket.title}
                                {ticket.category === 'SECURITY' && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                        SECURITY
                                    </span>
                                )}
                            </h3>
                        )}
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            Created: {formatDateTime(ticket.createdAt)}
                        </p>
                        <div className="mt-2 text-sm text-[var(--text-secondary)] space-x-4">
                            <span>Category: <span className="font-semibold text-[var(--text-primary)]">{ticket.category}</span></span>
                            {ticket.softwareName && (
                                <span>Software: <span className="font-semibold text-[var(--text-primary)]">{ticket.softwareName} {ticket.softwareVersion ? `(${ticket.softwareVersion})` : ''}</span></span>
                            )}
                            {ticket.deviceDetails && (
                                <span>Device: <span className="font-semibold text-[var(--text-primary)]">{ticket.deviceDetails}</span></span>
                            )}
                            {ticket.employeeId && (
                                <span>Emp ID: <span className="font-semibold text-[var(--text-primary)]">{ticket.employeeId}</span></span>
                            )}
                            {ticket.domain && (
                                <span>Domain: <span className="font-semibold text-[var(--text-primary)]">{ticket.domain}</span></span>
                            )}
                            {ticket.requestType && (
                                <span>Request: <span className="font-semibold text-[var(--text-primary)]">{ticket.requestType}</span></span>
                            )}
                            <span>Priority: <span className={`font-semibold ${ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH' ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>{ticket.priority || 'Unassigned'}</span></span>
                            <span>Assigned To: <span className="font-semibold text-[var(--text-primary)]">{ticket.assignedTo ? ticket.assignedTo.username : 'Unassigned'}</span></span>
                            {ticket.managerName && (
                                <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                                    <span className="block text-xs text-[var(--text-muted)] uppercase tracking-wider">Manager Approval</span>
                                    <span className="font-semibold text-[var(--accent-2)]">{ticket.managerName}</span>
                                    {ticket.managerEmail && <span className="text-[var(--text-muted)] text-xs ml-1">({ticket.managerEmail})</span>}
                                </div>
                            )}
                        </div>
                    </div>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full 
                        ${ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                            ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {ticket.status}
                    </span>
                </div>

                {/* Details Body */}
                <div className="border-t border-[var(--border-subtle)] px-4 py-5 sm:p-6">
                    {isEditing ? (
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">Description</label>
                                <textarea
                                    name="description"
                                    value={editForm.description}
                                    onChange={handleEditChange}
                                    rows={6}
                                    className="w-full text-[var(--text-primary)] bg-[var(--bg-input)] border border-[var(--border-input)] rounded p-2"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Category</label>
                                    <select
                                        name="category"
                                        value={editForm.category}
                                        onChange={handleEditChange}
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded p-2"
                                    >
                                        <option value="HARDWARE">Hardware</option>
                                        <option value="SOFTWARE">Software</option>
                                        <option value="NETWORK">Network</option>
                                        <option value="ACCESS_AND_M365">Access & M365</option>
                                        <option value="PROCUREMENT">Procurement</option>
                                        <option value="OTHERS">Others</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Priority</label>
                                    <select
                                        name="priority"
                                        value={editForm.priority}
                                        onChange={handleEditChange}
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded p-2"
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={handleEditToggle} className="px-3 py-1 text-sm border rounded">Cancel</button>
                                <button onClick={handleEditSubmit} className="px-3 py-1 text-sm bg-green-600 text-white rounded">Save Changes</button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-[var(--text-primary)] whitespace-pre-wrap mb-6">{ticket.description}</p>
                    )}

                    {/* New User Details Section */}
                    {ticket.newUserDetails && (
                        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-100 dark:border-blue-800">
                            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 border-b border-blue-200 dark:border-blue-700 pb-2">New User Request Details</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
                                {(() => {
                                    try {
                                        if (!ticket.newUserDetails) return null;
                                        const details = JSON.parse(ticket.newUserDetails);
                                        if (!details || typeof details !== 'object') return null;

                                        return Object.entries(details).map(([key, value]) => {
                                            if (!value || value === 'No') return null;
                                            // Format key: firstName -> First Name
                                            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                            return (
                                                <div key={key} className="flex flex-col sm:flex-row sm:justify-between">
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">{label}:</span>
                                                    <span className="text-[var(--text-primary)] font-semibold text-right">{value}</span>
                                                </div>
                                            );
                                        });
                                    } catch (e) {
                                        console.warn('Error parsing details', e);
                                        return <p className="text-red-500 text-xs">Error parsing details</p>;
                                    }
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Tracking Timeline */}
                    <div className="mb-8 border-t border-[var(--border-subtle)] pt-6">
                        <h4 className="font-bold text-lg mb-4 text-[var(--text-primary)]">Tracking Timeline</h4>
                        <div className="flow-root">
                            <ul className="-mb-8">
                                {[
                                    {
                                        label: 'Created',
                                        date: ticket.createdAt,
                                        icon: '📝',
                                        active: true,
                                        desc: `Ticket created by ${ticket.requester?.username}`
                                    },
                                    // Logic for Approval Step
                                    (ticket.category === 'SOFTWARE' || ticket.category === 'HARDWARE' || ticket.category === 'SECURITY') ? {
                                        label: ticket.managerApprovalStatus === 'APPROVED' ? 'Manager Approved' :
                                            ticket.managerApprovalStatus === 'REJECTED' ? 'Manager Rejected' : 'Pending Approval',
                                        date: ticket.managerApprovalStatus === 'APPROVED' ? ticket.approvedAt :
                                            ticket.managerApprovalStatus === 'REJECTED' ? ticket.rejectedAt : null,
                                        icon: ticket.managerApprovalStatus === 'APPROVED' ? '✅' :
                                            ticket.managerApprovalStatus === 'REJECTED' ? '❌' : '⏳',
                                        active: ticket.managerApprovalStatus !== 'PENDING',
                                        desc: ticket.managerApprovalStatus === 'PENDING' ? 'Waiting for manager action' :
                                            ticket.managerName ? `Reviewed by ${ticket.managerName}` : ''
                                    } : null,
                                    {
                                        label: 'In Progress',
                                        date: ticket.inProgressAt,
                                        icon: '⚙️',
                                        active: ticket.status === 'IN_PROGRESS' || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED',
                                        desc: ticket.assignedTo ? `Assigned to ${ticket.assignedTo.username}` : ''
                                    },
                                    {
                                        label: 'Resolved',
                                        date: ticket.resolvedAt,
                                        icon: '🎉',
                                        active: ticket.status === 'RESOLVED' || ticket.status === 'CLOSED',
                                        desc: ''
                                    },
                                    {
                                        label: 'Closed',
                                        date: ticket.closedAt,
                                        icon: '🔒',
                                        active: ticket.status === 'CLOSED',
                                        desc: ''
                                    }
                                ].filter(Boolean).map((step, stepIdx, steps) => (
                                    <li key={step.label}>
                                        <div className="relative pb-8">
                                            {stepIdx !== steps.length - 1 ? (
                                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
                                            ) : null}
                                            <div className="relative flex space-x-3">
                                                <div>
                                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-[var(--bg-page)] ${step.active ? 'bg-[var(--accent)]' : 'bg-[var(--bg-muted)]'
                                                        }`}>
                                                        <span className="text-white dark:text-gray-200 text-sm">{step.icon}</span>
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-[var(--text-primary)]">{step.label}</p>
                                                        {step.desc && <p className="text-xs text-[var(--text-secondary)]">{step.desc}</p>}
                                                    </div>
                                                    <div className="text-right text-sm whitespace-nowrap text-[var(--text-muted)]">
                                                        {step.date ? formatDateTime(step.date) : '--'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Attachments Section */}
                    <div className="border-t border-[var(--border-subtle)] pt-6 mt-6">
                        <h4 className="font-bold text-lg mb-4 text-[var(--text-primary)]">Attachments</h4>
                        <div className="space-y-4">
                            <AttachmentList
                                attachments={ticket.attachments || []}
                                ticketId={ticket.id}
                                onDelete={handleDeleteAttachment}
                            />

                            <div className="mt-4">
                                <h5 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Upload New File</h5>
                                <FileUploader ticketId={ticket.id} onUploadSuccess={fetchTicket} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Comments */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Current Status Badge for Clarity */}
                    <div className="card bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">Current Status</h4>
                                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                    {ticket.status}
                                    {ticket.managerApprovalStatus !== 'NA' && ` • Approval: ${ticket.managerApprovalStatus}`}
                                </p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide
                                ${ticket.status === 'OPEN' ? 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                    ticket.status === 'RESOLVED' ? 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                        ticket.status === 'CLOSED' ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                                            ticket.status === 'IN_PROGRESS' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'}`}>
                                {ticket.status.replace(/_/g, ' ')}
                            </span>
                        </div>
                    </div>

                    <div className="card">
                        <h4 className="font-bold text-lg mb-4 text-[var(--text-primary)]">Discussion</h4>

                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                            {ticket.comments && ticket.comments.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.author && String(msg.author.id) === String(user.id) ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg p-3 ${msg.author && String(msg.author.id) === String(user.id) ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-muted)] text-[var(--text-primary)]'}`}>
                                        <div className="text-xs text-[var(--text-muted)] mb-1">
                                            {msg.author ? msg.author.username : 'Unknown'} • {formatDateTime(msg.createdAt)}
                                        </div>
                                        <p className="text-sm">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                            {(!ticket.comments || ticket.comments.length === 0) && (
                                <p className="text-gray-400 text-sm italic">No comments yet.</p>
                            )}
                        </div>

                        <form onSubmit={handleCommentSubmit}>
                            <textarea
                                className="input-field mb-2"
                                rows="3"
                                placeholder="Type a response..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            ></textarea>
                            <button data-testid="comment-submit" type="submit" disabled={!comment.trim() || submittingComment} className="btn-primary w-full sm:w-auto">
                                {submittingComment ? 'Posting...' : 'Post Comment'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Actions */}
                <div className="space-y-6">
                    {/* Admin/Support Actions */}
                    {(isItSupport || isAdmin) ? (
                        <div className="card">
                            <h4 className="font-bold mb-4 text-[var(--text-primary)]">Admin Actions</h4>
                            <div className="flex flex-col space-y-2">

                                {/* Assign to User Dropdown */}
                                <div className="mb-2">
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Assign User</label>
                                    <div className="flex space-x-2">
                                        <select
                                            value={pendingAssignee || ''}
                                            onChange={(e) => setPendingAssignee(e.target.value)}
                                            className="input-field py-1 text-sm bg-[var(--bg-muted)] flex-1"
                                            data-testid="admin-ticket-assign-select"
                                        >
                                            <option value="">Unassigned</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>
                                                    {u.username} ({u.role})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {!ticket.assignedTo && !pendingAssignee && (
                                    <button
                                        onClick={() => setPendingAssignee(user.id)}
                                        className="btn bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-300 w-full text-left text-sm mb-2"
                                    >
                                        Assign to Me
                                    </button>
                                )}

                                <div className="border-t border-[var(--border-subtle)] my-2 pt-2">
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
                                    <select
                                        value={pendingStatus}
                                        onChange={(e) => setPendingStatus(e.target.value)}
                                        className="input-field py-1 text-sm bg-[var(--bg-muted)] w-full"
                                        data-testid="admin-ticket-status-select"
                                    >
                                        <option value="OPEN">Open</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="RESOLVED">Resolved</option>
                                        <option value="CLOSED">Closed</option>
                                    </select>
                                </div>

                                <div className="flex gap-2 mt-4" data-testid="admin-ticket-edit">
                                    <button
                                        onClick={handleAdminSubmit}
                                        disabled={isSavingAdmin}
                                        className="btn-primary flex-1 text-sm"
                                        data-testid="admin-ticket-submit"
                                    >
                                        {isSavingAdmin ? 'Saving...' : 'Submit'}
                                    </button>
                                    <button
                                        onClick={handleAdminCancel}
                                        className="btn-secondary flex-1 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>



                                <div className="border-t border-[var(--border-subtle)] my-2 pt-2">
                                    <button
                                        onClick={handleEditToggle}
                                        className="btn bg-[var(--bg-button-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-button-secondary-hover)] w-full text-left text-sm mb-1"
                                    >
                                        {isEditing ? 'Cancel Edit' : 'Edit Ticket'}
                                    </button>


                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Manager Actions */}
                    {renderManagerActions()}
                </div>
            </div>

            <ApprovalSuccessModal
                open={approvalModal.open}
                ticketNumber={approvalModal.ticketNumber}
                timestamp={approvalModal.timestamp}
                onOk={handleModalOk}
            />


        </div >
    );
};

export default TicketDetails;
