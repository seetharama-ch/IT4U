import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ticketDetailsPath } from '../utils/routes';
import { useAuth } from '../context/AuthContext';
import UserList from './UserList';
import ReportsPage from './ReportsPage';
import toast from 'react-hot-toast';
import ApprovalSuccessModal from './ApprovalSuccessModal';


const TicketList = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('ALL');
    const [adminFilter, setAdminFilter] = useState('APPROVED');
    const [notification, setNotification] = useState(null);
    const [approvalModal, setApprovalModal] = useState({ open: false, ticketNumber: '', timestamp: '' });



    // Removed drawer state - using full-page navigation instead

    // Server-side Pagination & Sorting State
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(50);
    const [totalPages, setTotalPages] = useState(0);
    const [sortField, setSortField] = useState('createdAt');
    const [sortDir, setSortDir] = useState('desc');

    // Filter State
    const [filters, setFilters] = useState({
        ticketNumber: '',
        createdFrom: '',
        createdTo: '',
        raisedBy: '',
        managerAssigned: ''
    });

    // Applied filters (to trigger refetch only on Apply)
    const [appliedFilters, setAppliedFilters] = useState({
        ticketNumber: '',
        createdFrom: '',
        createdTo: '',
        raisedBy: '',
        managerAssigned: ''
    });

    // Tab State for Admin
    const [activeTab, setActiveTab] = useState('TICKETS'); // TICKETS, USERS, REPORTING

    // Tab State for Manager
    const [managerTab, setManagerTab] = useState('APPROVALS'); // APPROVALS, APPROVED, MY_REQUESTS

    const isAdmin = user && user.role === 'ADMIN';

    // -------------------------------------------------------------------------
    // Column Definition & Drag-Drop Logic
    // -------------------------------------------------------------------------
    const defaultColumns = [
        { id: 'createdAt', label: 'Created', sticky: 'left', width: '150px' }, // Locked
        { id: 'ticketNumber', label: 'Ticket ID', sticky: 'left', width: '120px' }, // Locked
        // Renewable Columns:
        { id: 'raisedByName', label: 'Raised By', sortField: 'raisedByName', adminOnly: true },
        { id: 'managerAssignedName', label: 'Manager', sortField: 'managerAssignedName', adminOnly: true },
        { id: 'title', label: 'Title', sortField: 'title' },
        { id: 'category', label: 'Category', sortField: 'category' },
        { id: 'priority', label: 'Priority', sortField: 'priority' },
        { id: 'status', label: 'Status', sortField: 'status' },
        { id: 'updated', label: 'Updated', sortField: 'updatedBy.displayName' }, // Composite Sort?
        { id: 'managerApprovalStatus', label: 'Approval', sortField: 'managerApprovalStatus', adminOnly: true },
        // Action is handled separately as right-sticky
    ];

    const [columns, setColumns] = useState([]);
    const [draggedColId, setDraggedColId] = useState(null);

    useEffect(() => {
        // Load columns from local storage or set default
        const storageKey = `ticketColumns_${user?.role || 'default'}`;
        const savedOrder = localStorage.getItem(storageKey);

        // Filter defaults based on role
        let initialCols = defaultColumns.filter(c => !c.adminOnly || (isAdmin || user.role === 'IT_SUPPORT'));

        // Exclude specific columns for basic users if needed, but requirements imply Dashboard changes for Admin + IT Support primarily.
        // Employee/Manager might see simple view. Let's keep logic general but only persist/reorder for Admin/IT.

        if (savedOrder && (isAdmin || user.role === 'IT_SUPPORT')) {
            try {
                const savedIds = JSON.parse(savedOrder);
                // Reconstruct order. 
                // We MUST preserver the locked ones at start.
                // Actually, let's just use the saved order for the middle parts.

                // Get locked columns
                const lockedLeft = initialCols.filter(c => c.sticky === 'left');
                const movable = initialCols.filter(c => c.sticky !== 'left');

                // Reorder movable based on savedIds
                const validSavedIds = savedIds.filter(id => movable.some(m => m.id === id));
                const reorderedMovable = [];

                validSavedIds.forEach(id => {
                    const col = movable.find(c => c.id === id);
                    if (col) reorderedMovable.push(col);
                });

                // Add any new columns that weren't in saved order
                movable.forEach(col => {
                    if (!validSavedIds.includes(col.id)) {
                        reorderedMovable.push(col);
                    }
                });

                setColumns([...lockedLeft, ...reorderedMovable]);
            } catch (e) {
                console.error("Failed to parse column order", e);
                setColumns(initialCols);
            }
        } else {
            setColumns(initialCols);
        }
    }, [user, isAdmin]);

    const handleDragStart = (e, colId) => {
        setDraggedColId(colId);
        e.dataTransfer.effectAllowed = 'move';
        // e.dataTransfer.setData('text/html', e.target.parentNode);
        // e.dataTransfer.setDragImage(e.target.parentNode, 20, 20);
    };

    const handleDragOver = (e, targetColId) => {
        e.preventDefault();
        // Simple swap logic or insertion?
    };

    const handleDrop = (e, targetColId) => {
        e.preventDefault();
        if (!draggedColId || draggedColId === targetColId) return;

        // Ensure we don't drag locked columns or drop onto locked columns
        const draggedIndex = columns.findIndex(c => c.id === draggedColId);
        const targetIndex = columns.findIndex(c => c.id === targetColId);

        if (columns[draggedIndex].sticky || columns[targetIndex].sticky) {
            return; // Cannot move sticky columns or move things into sticky area
        }

        const newCols = [...columns];
        const [removed] = newCols.splice(draggedIndex, 1);
        newCols.splice(targetIndex, 0, removed);

        setColumns(newCols);

        // Save to localStorage
        if (isAdmin || user.role === 'IT_SUPPORT') {
            const storageKey = `ticketColumns_${user.role}`;
            const orderToSave = newCols.filter(c => !c.sticky).map(c => c.id);
            localStorage.setItem(storageKey, JSON.stringify(orderToSave));
        }
        setDraggedColId(null);
    };

    const resetColumns = () => {
        const storageKey = `ticketColumns_${user?.role || 'default'}`;
        localStorage.removeItem(storageKey);
        let initialCols = defaultColumns.filter(c => !c.adminOnly || (isAdmin || user.role === 'IT_SUPPORT'));
        setColumns(initialCols);
        toast.success("Columns reset to default");
    };
    useEffect(() => {
        if (location.state?.notification) {
            setNotification(location.state.notification);
            // Clear state so notification doesn't persist on refresh/back
            window.history.replaceState({}, document.title);
            // Auto dismiss
            setTimeout(() => setNotification(null), 5000);
        }
    }, [location]);

    // Removed body scroll lock - no longer needed without drawer

    useEffect(() => {
        let isMounted = true;

        const fetchTickets = async () => {
            if (!user) return;
            try {
                setLoading(true);
                let url = '/tickets';
                let params = {
                    page,
                    size,
                    sort: `${sortField},${sortDir}`,
                    ...appliedFilters // Spread applied filters
                };

                if (user.role === 'EMPLOYEE') {
                    url = '/tickets/my';
                    params = {};
                } else if (user.role === 'MANAGER') {
                    if (managerTab === 'APPROVALS') {
                        url = '/tickets/manager/pending';
                        params = { managerId: user.id };
                    } else if (managerTab === 'APPROVED') {
                        url = '/tickets/manager/approved';
                        params = { managerId: user.id };
                    } else if (managerTab === 'MY_REQUESTS') {
                        url = '/tickets/my';
                        params = {};
                    }
                }

                const response = await apiClient.get(url, { params, timeout: 5000 });

                if (isMounted) {
                    let data = response.data;

                    if (data.content) {
                        setTickets(data.content);
                        setTotalPages(data.totalPages);
                    } else if (Array.isArray(data)) {
                        setTickets(data);
                        setTotalPages(1);
                    } else {
                        console.error('Unexpected data format:', data);
                        setError('Invalid data format received from server.');
                        setLoading(false);
                        return;
                    }
                    setLoading(false);
                }
            } catch (error) {
                console.error("Failed to load tickets", error);
                let msg = "Failed to load tickets";
                if (error.response) {
                    if (error.response.status === 401) msg = "Session expired or unauthorized. Please login again.";
                    else if (error.response.status === 403) msg = "You do not have permission to view these tickets.";
                    else if (error.response.status === 500) msg = "Internal Server Error. Please contact support.";
                    else msg = error.response.data?.message || msg;
                } else if (error.message) {
                    msg = error.message;
                }
                setError(msg);
                if (isMounted) setLoading(false);
            }
        };

        fetchTickets();

        return () => { isMounted = false; };
    }, [user, managerTab, page, size, sortField, sortDir, appliedFilters]);

    const handleApprove = async (ticketId) => {
        if (!window.confirm("Approve this ticket?")) return;
        try {
            const res = await apiClient.post(`/tickets/${ticketId}/approve`, {});
            const data = res.data;

            const approvedAt = data.approvedAt ? new Date(data.approvedAt).toLocaleString() : new Date().toLocaleString();
            const tNo = data.ticketNumber || ticketId;

            setApprovalModal({
                open: true,
                ticketNumber: tNo,
                timestamp: approvedAt
            });

            // Optimistically remove from list
            setTickets(prev => prev.filter(t => t.id !== ticketId));
        } catch (err) {
            console.error(err);
            setNotification({ type: 'error', message: 'Failed to approve ticket.' });
        }
    };



    const handleModalOk = () => {
        setApprovalModal({ ...approvalModal, open: false });
        setManagerTab('APPROVED');
        navigate('/app/manager');
    };

    const getFilteredTickets = () => {
        if (isAdmin) {
            if (adminFilter === 'PENDING_APPROVAL') {
                return tickets.filter(t => t.managerApprovalStatus === 'PENDING');
            } else {
                return tickets.filter(t => t.managerApprovalStatus === 'APPROVED' || t.managerApprovalStatus === 'NA');
            }
        }

        // Filter logic for Employee, Support, and Manager (My Requests)
        if (filter === 'OPEN') {
            // Exclude REJECTED tickets from OPEN tab (TicketService keeps them as PENDING_MANAGER_APPROVAL but sets managerApprovalStatus=REJECTED)
            return tickets.filter(t => ['OPEN', 'IN_PROGRESS', 'PENDING_MANAGER_APPROVAL', 'WAITING_FOR_USER'].includes(t.status) && t.managerApprovalStatus !== 'REJECTED');
        } else if (filter === 'RESOLVED') {
            return tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
        }

        // 'ALL' returns everything
        return tickets;
    };



    // Helper for Sorting
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        setPage(0); // Reset to first page
        setAppliedFilters(filters);
    };

    const clearFilters = () => {
        const reset = {
            ticketNumber: '',
            createdFrom: '',
            createdTo: '',
            raisedBy: '',
            managerAssigned: ''
        };
        setFilters(reset);
        setAppliedFilters(reset);
        setPage(0);
        setSortField('createdAt');
        setSortDir('desc');
    };

    if (loading && page === 0 && tickets.length === 0) return <div className="text-center mt-10 text-[var(--text-primary)]">Loading tickets...</div>;
    if (error) return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Connection Error: </strong>
                <span className="block sm:inline">{error}</span>
                <p className="mt-2 text-sm">Cannot reach API server. Please ensure the backend is running and you are logged in.</p>
            </div>
        </div>
    );

    if (!user) return <div className="text-center mt-10 text-[var(--text-primary)]">Please log in.</div>;

    const displayedTickets = getFilteredTickets();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-200">
            {user && user.role === 'MANAGER' && (
                <div className="flex border-b border-[var(--border-subtle)] mb-6 space-x-8">
                    <button
                        className={`py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${managerTab === 'APPROVALS' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'}`}
                        onClick={() => setManagerTab('APPROVALS')}
                    >
                        Pending Approvals
                    </button>
                    <button
                        className={`py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${managerTab === 'APPROVED' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'}`}
                        onClick={() => setManagerTab('APPROVED')}
                    >
                        Approved Tickets
                    </button>
                    <button
                        className={`py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${managerTab === 'MY_REQUESTS' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'}`}
                        onClick={() => setManagerTab('MY_REQUESTS')}
                    >
                        My Requests
                    </button>
                </div>
            )}

            {isAdmin && (
                <div className="flex border-b border-[var(--border-subtle)] mb-6 space-x-8">
                    <button
                        className={`py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'TICKETS' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'}`}
                        onClick={() => setActiveTab('TICKETS')}
                    >
                        Ticket Dashboard
                    </button>
                    <button
                        className={`py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'USERS' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'}`}
                        onClick={() => setActiveTab('USERS')}
                    >
                        User Management
                    </button>
                    <button
                        className={`py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'REPORTING' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'}`}
                        onClick={() => setActiveTab('REPORTING')}
                    >
                        Reporting Dashboard
                    </button>
                </div>
            )}

            {notification && (
                <div className={`mb-6 px-4 py-3 rounded relative ${notification.type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-green-100 border border-green-400 text-green-700'}`} role="alert">
                    <strong className="font-bold mr-2">{notification.type === 'error' ? 'Error!' : 'Success!'}</strong>
                    <span className="block sm:inline">{notification.message}</span>
                    <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setNotification(null)}>
                        <svg className={`fill-current h-6 w-6 ${notification.type === 'error' ? 'text-red-500' : 'text-green-500'}`} role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" /></svg>
                    </span>
                </div>
            )}

            {activeTab === 'USERS' ? (
                <UserList />
            ) : activeTab === 'REPORTING' ? (
                <ReportsPage />
            ) : (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-[var(--text-primary)]" data-testid="app-header">
                            {isAdmin ? 'Admin Dashboard' :
                                user.role === 'MANAGER' ? 'Team Approvals' :
                                    (user.role === 'IT_SUPPORT' ? 'All Support Tickets' : 'My Tickets')}
                        </h1>

                        <div className="flex gap-4">
                            {isAdmin ? (
                                <div className="flex bg-[var(--bg-muted)] p-1 rounded-lg">
                                    <button
                                        onClick={() => setAdminFilter('PENDING_APPROVAL')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${adminFilter === 'PENDING_APPROVAL'
                                            ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}
                                        data-testid="admin-filter-pending"
                                    >
                                        Pending Approval
                                    </button>
                                    <button
                                        onClick={() => setAdminFilter('APPROVED')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${adminFilter === 'APPROVED'
                                            ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}
                                        data-testid="admin-filter-approved"
                                    >
                                        Approved/Other
                                    </button>
                                </div>
                            ) : (
                                <div className="flex bg-[var(--bg-muted)] p-1 rounded-lg">
                                    <button
                                        onClick={() => setFilter('ALL')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'ALL'
                                            ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setFilter('OPEN')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'OPEN'
                                            ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}
                                    >
                                        Open
                                    </button>
                                    <button
                                        onClick={() => setFilter('RESOLVED')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'RESOLVED'
                                            ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}
                                    >
                                        Resolved
                                    </button>
                                </div>
                            )}

                            <Link to="/app/tickets/new" className="btn-primary flex items-center">
                                <span className="mr-2 text-xl">+</span> New Ticket
                            </Link>
                        </div>
                    </div>

                    {/* Filter Bar (Admin / IT Support) */}
                    {(isAdmin || user.role === 'IT_SUPPORT') && (
                        <div className="bg-[var(--bg-card)] p-4 rounded-lg shadow-sm border border-[var(--border-subtle)] mb-6 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Ticket No</label>
                                <input
                                    type="text"
                                    name="ticketNumber"
                                    value={filters.ticketNumber}
                                    onChange={handleFilterChange}
                                    placeholder="e.g. GSG..."
                                    className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Created From</label>
                                <input
                                    type="date"
                                    name="createdFrom"
                                    value={filters.createdFrom}
                                    onChange={handleFilterChange}
                                    className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Created To</label>
                                <input
                                    type="date"
                                    name="createdTo"
                                    value={filters.createdTo}
                                    onChange={handleFilterChange}
                                    className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Raised By</label>
                                <input
                                    type="text"
                                    name="raisedBy"
                                    value={filters.raisedBy}
                                    onChange={handleFilterChange}
                                    placeholder="Name/Email"
                                    className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Manager</label>
                                <input
                                    type="text"
                                    name="managerAssigned"
                                    value={filters.managerAssigned}
                                    onChange={handleFilterChange}
                                    placeholder="Name/Email"
                                    className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={applyFilters}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex-1"
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={clearFilters}
                                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 flex-1 dark:bg-gray-700 dark:text-gray-300"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="tableWrap bg-[var(--bg-card)] shadow sm:rounded-lg border border-[var(--border-subtle)]" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                        <table className="min-w-full divide-y divide-[var(--border-subtle)] border-separate border-spacing-0">
                            <thead className="bg-[var(--bg-muted)] hidden md:table-header-group sticky top-0 z-30">
                                <tr>
                                    {columns.map((col, index) => (
                                        <th
                                            key={col.id}
                                            draggable={!col.sticky}
                                            onDragStart={(e) => handleDragStart(e, col.id)}
                                            onDragOver={(e) => handleDragOver(e, col.id)}
                                            onDrop={(e) => handleDrop(e, col.id)}
                                            className={`px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)] relative group ${col.sticky === 'left' ? 'sticky left-0 z-40 bg-[var(--bg-muted)] shadow-[1px_0_0_0_var(--border-subtle)]' : ''
                                                }`}
                                            style={{
                                                left: col.sticky === 'left' ? (index === 0 ? 0 : '150px') : undefined,
                                                minWidth: col.width || 'auto'
                                            }}
                                            onClick={() => col.sortField && handleSort(col.sortField)}
                                        >
                                            <div className="flex items-center space-x-1">
                                                {!col.sticky && (
                                                    <span className="opacity-0 group-hover:opacity-100 cursor-grab mr-1 text-gray-400">
                                                        ⋮
                                                    </span>
                                                )}
                                                <span>{col.label}</span>
                                                {sortField === col.sortField && (
                                                    <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    {/* Action Column (Always Sticky Right) */}
                                    <th className="sticky right-0 z-40 bg-[var(--bg-muted)] px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider shadow-[-1px_0_0_0_var(--border-subtle)]">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)] hidden md:table-row-group">
                                {(displayedTickets ?? []).map((ticket) => (
                                    <tr key={ticket.id} className="hover:bg-[var(--bg-hover)]" data-testid="ticket-row">
                                        {columns.map((col, index) => (
                                            <td
                                                key={col.id}
                                                className={`px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] relative z-1 ${col.sticky === 'left' ? 'sticky z-20 bg-[var(--bg-card)] shadow-[1px_0_0_0_var(--border-subtle)]' : ''
                                                    }`}
                                                style={{ left: col.sticky === 'left' ? (index === 0 ? 0 : '150px') : undefined }}
                                            >
                                                {(() => {
                                                    switch (col.id) {
                                                        case 'createdAt':
                                                            return managerTab === 'APPROVED'
                                                                ? (ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : (ticket.approvedAt ? new Date(ticket.approvedAt).toLocaleString() : 'N/A'))
                                                                : (ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'N/A'); // Changed to LocaleString for timestamp
                                                        case 'ticketNumber':
                                                            return (
                                                                <button
                                                                    onClick={() => navigate(`/app/tickets/${ticket.id}`)}
                                                                    className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                                                >
                                                                    {ticket.ticketNumber || ticket.id}
                                                                </button>

                                                            );
                                                        case 'raisedByName':
                                                            return (
                                                                <div>
                                                                    <div>{ticket.raisedByName || "-"}</div>
                                                                    <div className="text-xs text-[var(--text-secondary)] opacity-75">{ticket.raisedByEmail}</div>
                                                                </div>
                                                            );
                                                        case 'managerAssignedName':
                                                            return (
                                                                <div>
                                                                    <div>{ticket.managerAssignedName || "-"}</div>
                                                                    <div className="text-xs text-[var(--text-secondary)] opacity-75">{ticket.managerAssignedEmail}</div>
                                                                </div>
                                                            );
                                                        case 'title':
                                                            return (
                                                                <div>
                                                                    <div className="font-medium">{ticket.title}</div>
                                                                    <div className="text-sm text-[var(--text-secondary)] truncate max-w-xs">{ticket.description}</div>
                                                                </div>
                                                            );
                                                        case 'category':
                                                            return ticket.category === 'SECURITY' ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                                    {ticket.category}
                                                                </span>
                                                            ) : ticket.category;
                                                        case 'priority':
                                                            return (
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                                    ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                                                                    {ticket.priority}
                                                                </span>
                                                            );
                                                        case 'status':
                                                            return (
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                                                                    {ticket.status}
                                                                </span>
                                                            );
                                                        case 'updated':
                                                            return (
                                                                <div>
                                                                    <div className="text-sm font-medium">{ticket.updatedByName ? `${ticket.updatedByName} (${ticket.updatedByRole || 'Unknown'})` : '-'}</div>
                                                                    <div className="text-xs text-[var(--text-secondary)]">
                                                                        {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : '-'}
                                                                    </div>
                                                                </div>
                                                            );
                                                        case 'managerApprovalStatus':
                                                            return (
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ticket.managerApprovalStatus === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                                    ticket.managerApprovalStatus === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                                        ticket.managerApprovalStatus === 'NA' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                                                                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                                    }`}>
                                                                    {ticket.managerApprovalStatus || 'NA'}
                                                                </span>
                                                            );
                                                        default:
                                                            return null;
                                                    }
                                                })()}
                                            </td>
                                        ))}
                                        {/* Action Column (Sticky Right) */}
                                        <td className="sticky right-0 z-20 bg-[var(--bg-card)] px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-1px_0_0_0_var(--border-subtle)]">
                                            <button
                                                onClick={() => navigate(`/app/tickets/${ticket.id}`)}
                                                className="text-primary hover:text-green-900 dark:hover:text-green-400 mr-4"
                                                data-testid="ticket-view-btn"
                                            >
                                                View
                                            </button>

                                            {isAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => navigate(`/app/tickets/${ticket.id}`, { state: { edit: true } })}
                                                        className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 mr-4"
                                                        data-testid="ticket-edit-btn"
                                                    >
                                                        Edit
                                                    </button>

                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {/* Only show if we have pages */}
                    {totalPages > 1 && (
                        <div className="px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)] flex items-center justify-between sm:px-6">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Showing page <span className="font-medium">{page + 1}</span> of <span className="font-medium">{totalPages}</span>
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => setPage(0)}
                                            disabled={page === 0}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-[var(--border-subtle)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
                                        >
                                            First
                                        </button>
                                        <button
                                            onClick={() => setPage(p => Math.max(0, p - 1))}
                                            disabled={page === 0}
                                            className="relative inline-flex items-center px-2 py-2 border border-[var(--border-subtle)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={page >= totalPages - 1}
                                            className="relative inline-flex items-center px-2 py-2 border border-[var(--border-subtle)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                        <button
                                            onClick={() => setPage(totalPages - 1)}
                                            disabled={page >= totalPages - 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-[var(--border-subtle)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
                                        >
                                            Last
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 p-4">
                        {displayedTickets.map((ticket) => (
                            <div key={ticket.id} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg p-4 shadow-sm space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-xs font-mono text-[var(--text-muted)]">#{ticket.ticketNumber || ticket.id}</span>
                                        <h3 className="text-base font-semibold text-[var(--text-main)] truncate max-w-[200px]">{ticket.title}</h3>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                                        {ticket.status}
                                    </span>
                                </div>
                                <p className="text-sm text-[var(--text-muted)] line-clamp-2">{ticket.description}</p>
                                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH' ? 'bg-red-500' : ticket.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                                        {ticket.priority}
                                    </div>
                                    <span>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="pt-2 border-t border-[var(--border-color)] flex justify-end">
                                    <Link to={ticketDetailsPath(ticket.id)} className="text-sm font-medium text-[var(--primary)] hover:underline">View Details</Link>
                                </div>
                            </div>
                        ))}
                    </div>
                    {displayedTickets.length === 0 && (
                        <div className="text-center py-16 px-4">
                            <div className="bg-[var(--card-bg)] rounded-2xl shadow-sm border border-[var(--border-color)] p-8 max-w-lg mx-auto transform transition-all hover:scale-[1.01] duration-300">
                                <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">Welcome to IT4U</h3>
                                <p className="text-[var(--text-muted)] mb-8">
                                    {user.role === 'MANAGER'
                                        ? "You're all caught up! No tickets require your approval right now."
                                        : "You haven't submitted any tickets yet. Need help? We're here for you."}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link to="/app/tickets/new" className="btn-primary flex items-center justify-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                        Report an Issue
                                    </Link>
                                    <Link to="/kb" className="px-4 py-2 rounded-md font-medium border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-color)] transition-colors flex items-center justify-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--text-muted)]" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                                        </svg>
                                        Knowledge Base
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            <ApprovalSuccessModal
                open={approvalModal.open}
                ticketNumber={approvalModal.ticketNumber}
                timestamp={approvalModal.timestamp}
                onOk={handleModalOk}
            />



            {/* Drawer removed - tickets now open in full-screen via routing */}
        </div>
    );
};

const getStatusColor = (status) => {
    switch (status) {
        case 'OPEN': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        case 'RESOLVED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case 'CLOSED': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

export default TicketList;
