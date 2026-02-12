import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';
import NewUserModal from './NewUserModal';
import { debugLog } from '../utils/debug';

const CreateTicket = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // State initialization
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'OTHERS',
        employeeId: user?.username || '',
        deviceDetails: '',
        softwareName: '',
        softwareVersion: '',
        procurementItem: '',
        subCategory: ''
    });
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState('success');
    const [dialogMsg, setDialogMsg] = useState('');
    const [createdTicket, setCreatedTicket] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [showNewUserModal, setShowNewUserModal] = useState(false);
    const [newUserDetails, setNewUserDetails] = useState(null);
    const [managers, setManagers] = useState([]);
    const [managerSelection, setManagerSelection] = useState('');
    const [isLoadingManagers, setIsLoadingManagers] = useState(false);
    const [resetScope, setResetScope] = useState('Password Only');
    const [resetEmail, setResetEmail] = useState('');
    const [upgradeEmail, setUpgradeEmail] = useState('');
    const [deleteUserEmail, setDeleteUserEmail] = useState('');

    const TICKET_CATEGORIES = [
        { value: 'HARDWARE', label: 'Hardware Issues' },
        { value: 'SOFTWARE', label: 'Software Installation / Upgrade' },
        { value: 'NETWORK', label: 'Network Issues' },
        { value: 'ACCESS_AND_M365', label: 'Access & Microsoft 365' },
        { value: 'PROCUREMENT', label: 'Procurement' },
        { value: 'OTHERS', label: 'Others' }
    ];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleManagerChange = (e) => {
        const selectedId = e.target.value;
        setManagerSelection(selectedId);
        debugLog('Manager selected', { managerId: selectedId });
    };

    const fetchManagers = async () => {
        setIsLoadingManagers(true);
        try {
            const response = await apiClient.get('/users/managers');
            setManagers(response.data);
        } catch (err) {
            console.error('Failed to load managers', err);
        } finally {
            setIsLoadingManagers(false);
        }
    };

    // Auto-load managers on component mount
    React.useEffect(() => {
        fetchManagers();
    }, []);

    // ... (rest of component)
    // ...
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        debugLog('Create Ticket Submit attempt', formData); // Log attempt

        // 1. Manual Validation
        const requiredFields = ['title', 'description', 'category'];
        const missingFields = requiredFields.filter(field => !formData[field]);

        if (missingFields.length > 0) {
            debugLog('Create Ticket Validation Failed', missingFields);
            setError(`Please fill in required fields: ${missingFields.join(', ')}`);
            window.scrollTo(0, 0);
            return;
        }

        // 2. Manager Validation (required for certain categories)
        const categoriesRequiringManager = ['HARDWARE', 'SOFTWARE', 'ACCESS_AND_M365'];
        if (categoriesRequiringManager.includes(formData.category) && !managerSelection) {
            setError('Please select an approving manager for this category');
            window.scrollTo(0, 0);
            return;
        }

        setSubmitting(true);
        try {
            // Construct payload with proper User objects for backend
            const payload = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                employeeId: formData.employeeId,
                deviceDetails: formData.deviceDetails || undefined,
                softwareName: formData.softwareName || undefined,
                softwareVersion: formData.softwareVersion || undefined,
                subCategory: formData.subCategory || undefined,
                reqeuster: { id: user.id },  // Send User object with ID
                // FIX: Include priority in payload
                priority: formData.priority || 'LOW',
                requester: { id: user.id },  // Send User object with ID
                manager: managerSelection ? { id: parseInt(managerSelection) } : undefined  // Send User object if selected
            };

            debugLog('Sending Create Ticket Payload', payload);

            const ticketResponse = await apiClient.post('/tickets', payload);

            // FIX: Check for both 200 and 201
            if (ticketResponse.status === 200 || ticketResponse.status === 201) {
                const ticketData = ticketResponse.data;
                debugLog('Create Ticket Success', ticketData);

                // 2. Upload Attachment if present
                if (file) {
                    try {
                        debugLog('Uploading attachment...', { name: file.name, size: file.size });
                        const formData = new FormData();
                        formData.append('file', file);

                        await apiClient.post(`/tickets/${ticketData.id}/attachments`, formData, {
                            headers: { "Content-Type": "multipart/form-data" }
                        });
                        debugLog('Attachment uploaded successfully');
                    } catch (uploadError) {
                        console.error('Attachment upload failed', uploadError);
                        // We don't fail the whole ticket creation, but we warn the user
                        setDialogMsg(`Ticket created successfully (ID: ${ticketData.ticketNumber || ticketData.id})\n\nBUT Attachment upload failed: ${uploadError.response?.data || uploadError.message}`);
                        // Set dialog type to warning maybe? But existing types are success/error. 
                        // Let's stick to success but with warning in message.
                        // Or maybe show error dialog?
                        // If I show error dialog, user might think ticket failed.
                        // Better to show success but append warning.
                        setDialogType("success");
                        setCreatedTicket(ticketData);
                        setDialogOpen(true);
                        return;
                    }
                }

                // Show success modal with ticket number
                setDialogType("success");
                setDialogMsg(`Ticket created successfully!\nTicket Number: ${ticketData.ticketNumber || ticketData.id}`);
                setCreatedTicket(ticketData);
                setDialogOpen(true);
            } else {
                throw new Error(`Unexpected response status: ${ticketResponse.status}`);
            }

        } catch (error) {
            console.error('Error creating ticket:', error);
            const errorMsg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : '') || error.message || 'Failed to create ticket. Please ensure the backend is running and you are logged in.';

            // Show error popup
            setDialogType("error");
            setDialogMsg(`Ticket creation failed:\n${errorMsg}`);
            setCreatedTicket(null);
            setDialogOpen(true);
        } finally {
            setSubmitting(false);
        }
    };

    const onDialogOk = () => {
        setDialogOpen(false);
        if (dialogType === "success") {
            if (createdTicket && createdTicket.id) {
                navigate(`/app/tickets/${createdTicket.id}`);
            } else {
                navigate("/app/employee", { replace: true });
            }
        }
    };

    const showDeviceDetails = ['SOFTWARE', 'HARDWARE'].includes(formData.category);

    const handleSaveUserDetails = (data) => {
        setNewUserDetails(data);
        setShowNewUserModal(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <NewUserModal
                isOpen={showNewUserModal}
                onClose={() => setShowNewUserModal(false)}
                onSave={handleSaveUserDetails}
                savedData={newUserDetails}
            />
            <h1 className="text-3xl font-bold mb-6 text-[var(--text-primary)]">Create Service Request</h1>


            {error && !dialogOpen && (
                <div data-testid="ticket-form-error" className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            <form data-testid="create-ticket-form" onSubmit={handleSubmit} className="bg-[var(--bg-card)] shadow rounded-lg p-6 space-y-6 border border-[var(--border-subtle)] transition-colors duration-300">
                {/* 1. Title */}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)]">Title</label>
                    <input
                        data-testid="ticket-title"
                        id="title"
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-[var(--border-subtle)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm bg-[var(--bg-surface)] text-[var(--text-primary)]"
                        placeholder="Brief summary"
                    />
                </div>

                {/* 2. Employee ID */}
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Employee ID</label>
                    <input
                        type="text"
                        name="employeeId"
                        readOnly
                        value={formData.employeeId}
                        className="mt-1 block w-full border border-[var(--border-subtle)] bg-[var(--bg-muted)] rounded-md shadow-sm py-2 px-3 text-[var(--text-muted)] sm:text-sm"
                    />
                </div>

                {/* 3. Device Details (Conditional) */}
                {showDeviceDetails && (
                    <div>
                        <label htmlFor="deviceDetails" className="block text-sm font-medium text-[var(--text-secondary)]">Device Asset ID / Serial</label>
                        <input
                            id="deviceDetails"
                            type="text"
                            name="deviceDetails"
                            value={formData.deviceDetails}
                            onChange={handleChange}
                            className="mt-1 block w-full border border-[var(--border-subtle)] rounded-md shadow-sm py-2 px-3 focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm bg-[var(--bg-surface)] text-[var(--text-primary)]"
                            placeholder="e.g. LPT-2023-005"
                        />
                    </div>
                )}

                {/* 4. Category */}
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-[var(--text-secondary)]">Category</label>
                    <select
                        data-testid="ticket-category"
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[var(--border-subtle)] focus:outline-none focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)]"
                    >
                        {/* Keeping OTHERS as default/placeholder to match previous behavior, though typically this should be "" */}
                        <option value="OTHERS">Select Category...</option>
                        {TICKET_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                </div>

                {/* 4.5 Priority */}
                <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-[var(--text-secondary)]">Priority</label>
                    <select
                        data-testid="ticket-priority"
                        id="priority"
                        name="priority"
                        value={formData.priority || 'LOW'}
                        onChange={handleChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[var(--border-subtle)] focus:outline-none focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)]"
                    >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                    </select>
                </div>

                {/* --- DYNAMIC FIELDS --- */}
                {formData.category === 'SOFTWARE' && (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label htmlFor="softwareName" className="block text-sm font-medium text-[var(--text-secondary)]">Software Name</label>
                            <input
                                id="softwareName"
                                type="text"
                                name="softwareName"
                                value={formData.softwareName}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-[var(--border-subtle)] rounded-md shadow-sm py-2 px-3 focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm bg-[var(--bg-surface)] text-[var(--text-primary)]"
                            />
                        </div>
                        <div>
                            <label htmlFor="softwareVersion" className="block text-sm font-medium text-[var(--text-secondary)]">Version</label>
                            <input
                                id="softwareVersion"
                                type="text"
                                name="softwareVersion"
                                value={formData.softwareVersion}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-[var(--border-subtle)] rounded-md shadow-sm py-2 px-3 focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm bg-[var(--bg-surface)] text-[var(--text-primary)]"
                            />
                        </div>
                    </div>
                )}

                {formData.category === 'PROCUREMENT' && (
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Item Needed</label>
                        <select
                            name="procurementItem"
                            value={formData.procurementItem}
                            onChange={handleChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 border-[var(--border-subtle)] focus:outline-none focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)]"
                        >
                            <option value="">Select Item...</option>
                            <option value="Laptop">Laptop (Standard)</option>
                            <option value="High-Spec Laptop">Laptop (Engineering High-Spec)</option>
                            <option value="Monitor">Monitor</option>
                            <option value="Keyboard/Mouse">Peripherals (Keyboard/Mouse)</option>
                            <option value="Software License">New Software License</option>
                        </select>
                    </div>
                )}

                {formData.category === 'ACCESS_AND_M365' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">Request Type</label>
                            <select
                                name="subCategory"
                                value={formData.subCategory}
                                onChange={handleChange}
                                className="mt-1 block w-full pl-3 pr-10 py-2 border-[var(--border-subtle)] focus:outline-none focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)]"
                            >
                                <option value="">Select Type...</option>
                                <option value="New User Creation">New User Creation</option>
                                <option value="Reset Password / MFA">Reset Password / MFA</option>
                                <option value="Upgrade Subscription License">Upgrade Subscription License</option>
                                <option value="Block User Login">Block User Login</option>
                                <option value="Delete User">Delete User (M365)</option>
                            </select>
                        </div>

                        {(formData.subCategory === 'New User Creation') && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border-l-4 border-blue-400 dark:border-blue-600">
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    New User Details form is required.
                                    {newUserDetails ? (
                                        <span className="ml-2 font-semibold text-green-600 dark:text-green-400">✓ Details Captured</span>
                                    ) : (
                                        <span className="ml-2 font-semibold text-red-600 dark:text-red-400 cursor-pointer underline" onClick={() => setShowNewUserModal(true)}>Click here to fill form</span>
                                    )}
                                    {newUserDetails && (
                                        <button type="button" onClick={() => setShowNewUserModal(true)} className="ml-4 text-xs bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">Edit Details</button>
                                    )}
                                </p>
                            </div>
                        )}

                        {formData.subCategory === 'Reset Password / MFA' && (
                            <div className="space-y-4 bg-gray-50 dark:bg-slate-700/50 p-4 rounded-md border border-gray-200 dark:border-slate-600">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">What would you like to reset?</label>
                                    <div className="mt-2 space-y-2">
                                        <div className="flex items-center">
                                            <input
                                                id="reset-pwd"
                                                name="resetScope"
                                                type="radio"
                                                value="Password Only"
                                                checked={resetScope === 'Password Only'}
                                                onChange={(e) => setResetScope(e.target.value)}
                                                className="focus:ring-primary h-4 w-4 text-primary border-gray-300 dark:border-gray-600 dark:bg-slate-700"
                                            />
                                            <label htmlFor="reset-pwd" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Password Only
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                id="reset-mfa"
                                                name="resetScope"
                                                type="radio"
                                                value="MFA Only"
                                                checked={resetScope === 'MFA Only'}
                                                onChange={(e) => setResetScope(e.target.value)}
                                                className="focus:ring-primary h-4 w-4 text-primary border-gray-300 dark:border-gray-600 dark:bg-slate-700"
                                            />
                                            <label htmlFor="reset-mfa" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Microsoft Authenticator Only
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                id="reset-both"
                                                name="resetScope"
                                                type="radio"
                                                value="Both"
                                                checked={resetScope === 'Both'}
                                                onChange={(e) => setResetScope(e.target.value)}
                                                className="focus:ring-primary h-4 w-4 text-primary border-gray-300 dark:border-gray-600 dark:bg-slate-700"
                                            />
                                            <label htmlFor="reset-both" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Both (Password & Authenticator)
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Email / Username</label>
                                    <input
                                        type="email"
                                        name="resetEmail"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        className="mt-1 block w-full border border-[var(--border-subtle)] rounded-md shadow-sm py-2 px-3 focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm bg-[var(--bg-input)] text-[var(--text-primary)]"
                                        placeholder="user@gsg.com"
                                    />
                                </div>
                            </div>
                        )}

                        {formData.subCategory === 'Upgrade Subscription License' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email ID to Upgrade License</label>
                                <input
                                    type="email"
                                    name="upgradeEmail"
                                    onChange={(e) => setUpgradeEmail(e.target.value)}
                                    className="mt-1 block w-full border border-[var(--border-subtle)] rounded-md shadow-sm py-2 px-3 focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm bg-[var(--bg-input)] text-[var(--text-primary)]"
                                    placeholder="user.to.upgrade@gsg.com"
                                />
                            </div>
                        )}

                        {(formData.subCategory === 'Delete User' || formData.subCategory === 'Block User Login') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Email / Username to {formData.subCategory === 'Block User Login' ? 'Block' : 'Delete'}</label>
                                <input
                                    type="email"
                                    name="deleteUserEmail"
                                    value={deleteUserEmail}
                                    onChange={(e) => setDeleteUserEmail(e.target.value)}
                                    className="mt-1 block w-full border border-[var(--border-subtle)] rounded-md shadow-sm py-2 px-3 focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm bg-[var(--bg-input)] text-[var(--text-primary)]"
                                    placeholder="user.to.action@gsg.com"
                                />
                            </div>
                        )}
                    </div>
                )}


                {/* 5. Description */}
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)]">Description</label>
                    <textarea
                        data-testid="ticket-description"
                        id="description"
                        name="description"
                        rows="4"
                        value={formData.description}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-[var(--border-subtle)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm bg-[var(--bg-surface)] text-[var(--text-primary)]"
                        placeholder="Please provide detailed information..."
                    />
                </div>

                {/* 6. Layout: Attachment (Left) & Manager (Right) */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {/* Attachment Section */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Attachment (Optional)</label>
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors cursor-pointer
                                ${dragging ? 'border-[var(--accent)] bg-[var(--bg-elevated)]' : 'border-[var(--border-subtle)] hover:border-[var(--accent)]'}
                                ${file ? 'bg-[var(--bg-muted)] border-[var(--accent)]' : ''}
                            `}
                            onClick={() => document.getElementById('file-upload').click()}
                        >
                            <div className="space-y-1 text-center">
                                {file ? (
                                    <>
                                        <svg className="mx-auto h-12 w-12 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="flex text-sm text-[var(--text-primary)] justify-center items-center">
                                            <span className="font-semibold truncate max-w-[150px]">{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFile(null);
                                                    // Reset input value
                                                    document.getElementById('file-upload').value = '';
                                                }}
                                                className="ml-2 text-red-500 hover:text-red-700 font-bold"
                                                title="Remove file"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <svg className="mx-auto h-12 w-12 text-[var(--text-muted)]" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <div className="flex text-sm text-[var(--text-secondary)]">
                                            <span className="relative cursor-pointer rounded-md font-medium text-[var(--accent)] hover:text-[var(--accent-2)] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[var(--accent)]">
                                                Upload a file (Single)
                                            </span>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            PDF, PNG, JPG up to 2MB
                                        </p>
                                    </>
                                )}
                                <input data-testid="ticket-attachment" id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileSelect} />
                            </div>
                        </div>
                    </div>

                    {/* Manager Selection (Right) */}
                    <div>
                        <label htmlFor="managerSelect" className="block text-sm font-medium text-[var(--text-secondary)]">Approving Manager</label>
                        <select
                            data-testid="ticket-manager"
                            id="managerSelect"
                            name="managerSelect"
                            value={managerSelection}
                            onChange={handleManagerChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 border border-[var(--border-subtle)] focus:outline-none focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)]"
                        >
                            <option value="">Select Manager...</option>
                            {managers && managers.length > 0 ? (
                                managers.map(manager => (
                                    <option key={manager.id} value={manager.id}>
                                        {manager.fullName || manager.username} ({manager.department || 'General'})
                                    </option>
                                ))
                            ) : (
                                <option disabled>{isLoadingManagers ? "Loading..." : "Please click 'Fetch Managers' ->"}</option>
                            )}
                        </select>
                        <button
                            type="button"
                            onClick={fetchManagers}
                            disabled={isLoadingManagers}
                            className="mt-2 text-xs bg-[var(--accent)] text-white px-3 py-1 rounded hover:bg-opacity-90 disabled:opacity-50 w-full sm:w-auto"
                        >
                            {isLoadingManagers ? 'Loading...' : 'Fetch Managers'}
                        </button>
                    </div>
                </div>




                <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-subtle)]">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="bg-[var(--bg-surface)] py-2 px-4 border border-[var(--border-subtle)] rounded-md shadow-sm text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)]"
                    >
                        Cancel
                    </button>
                    <button
                        data-testid="ticket-submit"
                        type="submit"
                        disabled={submitting}
                        className="btn-primary inline-flex justify-center shadow-sm disabled:opacity-50"
                    >
                        {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </form >

            {/* Success/Fail Modal */}
            {dialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto backdrop-blur-sm">
                    <div data-testid="ticket-success-modal" className="bg-[var(--bg-card)] rounded-lg shadow-xl w-full max-w-md m-4 border border-[var(--border-subtle)] p-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            {dialogType === 'success' ? (
                                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                    <svg className="h-6 w-6 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                                    <svg className="h-6 w-6 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            )}

                            <h3 className="text-lg font-medium text-[var(--text-primary)]">
                                {dialogType === "success" ? "Ticket Created!" : "Submission Failed"}
                            </h3>

                            <div className="text-[var(--text-secondary)]">
                                <pre className="whitespace-pre-wrap font-sans bg-[var(--bg-muted)] p-3 rounded-md text-sm text-left overflow-auto max-h-40">
                                    {dialogMsg}
                                </pre>
                            </div>

                            <button
                                data-testid="ticket-success-ok"
                                onClick={onDialogOk}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[var(--accent)] text-base font-medium text-white hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] sm:text-sm"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default CreateTicket;
