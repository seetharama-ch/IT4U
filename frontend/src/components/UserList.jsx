import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

const UserList = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionMessage, setActionMessage] = useState('');

    // File Upload State
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Modal States
    const [showResetModal, setShowResetModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Reset Password Form State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetError, setResetError] = useState('');

    // Manual User Create/Edit State
    const [showUserModal, setShowUserModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [userForm, setUserForm] = useState({
        username: '',
        password: '',
        role: 'EMPLOYEE',
        department: '',
        jobTitle: '',
        managerName: '',
        email: '',
        phoneNumber: ''
    });
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/users');
            if (Array.isArray(response.data)) {
                setUsers(response.data);
            } else {
                console.error("fetchUsers: API returned non-array data", response.data);
                setUsers([]);
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Failed to load users');
            setLoading(false);
        }
    };

    // --- Actions ---

    const [showDeactivateModal, setShowDeactivateModal] = useState(false);

    const openResetModal = (user) => {
        setSelectedUser(user);
        setNewPassword('');
        setConfirmPassword('');
        setResetError('');
        setShowResetModal(true);
    };

    const openDeleteModal = (user) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
    };

    const openDeactivateModal = (user) => {
        setSelectedUser(user);
        setShowDeactivateModal(true);
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setResetError("Passwords do not match!");
            return;
        }
        if (!newPassword) {
            setResetError("Password cannot be empty.");
            return;
        }

        try {
            await apiClient.post(`/users/${selectedUser.id}/reset-password`, { newPassword });
            setActionMessage(`Password reset for ${selectedUser.username} successfully.`);
            setShowResetModal(false);
            setSelectedUser(null);
        } catch (err) {
            console.error(err);
            setResetError('Failed to reset password. API Error.');
        }
    };

    const handleDeleteSubmit = async () => {
        if (!selectedUser) return;
        try {
            await apiClient.delete(`/users/${selectedUser.id}`);
            setActionMessage(`User ${selectedUser.username} deleted successfully.`);
            setShowDeleteModal(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 409) {
                // Specific handling for safe delete conflict
                setActionMessage('Cannot delete user because tickets are linked. Please deactivate instead.');
                // Optional: Open deactivate modal? For now just show toast.
            } else {
                setActionMessage('Failed to delete user.');
            }
            setShowDeleteModal(false);
        }
    };

    const handleDeactivateSubmit = async () => {
        if (!selectedUser) return;
        try {
            await apiClient.patch(`/users/${selectedUser.id}/deactivate`);
            setActionMessage(`User ${selectedUser.username} deactivated successfully.`);
            setShowDeactivateModal(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            console.error(err);
            setActionMessage('Failed to deactivate user.');
            setShowDeactivateModal(false);
        }
    };

    // --- Manual User Mgmt ---
    const openCreateModal = () => {
        setIsEditMode(false);
        setUserForm({
            username: '',
            password: '',
            role: 'EMPLOYEE',
            department: '',
            jobTitle: '',
            managerName: '',
            email: '',
            phoneNumber: ''
        });
        setShowUserModal(true);
        setFieldErrors({});
    };

    const openEditModal = (user) => {
        setIsEditMode(true);
        setSelectedUser(user);
        setFieldErrors({});
        setUserForm({
            username: user.username,
            password: '', // Password not editable here
            role: user.role,
            department: user.department || '',
            jobTitle: user.jobTitle || '',
            managerName: user.manager ? user.manager.username : '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || ''
        });
        setShowUserModal(true);
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...userForm };

            if (isEditMode) {
                // Backend User entity doesn't have managerName field in the main object for updates (handled via specific endpoints or ignored)
                // For safety we remove it for updates if it causes issues, but for Create (UserCreateRequest) it is REQUIRED if we want to set manager.
                delete payload.managerName;

                // If role changed, use the secure Admin API
                if (userForm.role !== selectedUser.role) {
                    await apiClient.put(`/admin/users/${selectedUser.id}/role`, { role: userForm.role });
                }

                // Update other details using regular API
                await apiClient.put(`/users/${selectedUser.id}`, payload);
                setActionMessage(`User ${userForm.username} updated successfully.`);
            } else {
                // For Create, we send managerName as expected by UserCreateRequest DTO
                // Ensure password is not empty string if somehow bypassed
                if (!payload.password) delete payload.password; // or handle validation

                await apiClient.post('/users', payload);
                setActionMessage(`User ${userForm.username} created successfully.`);
            }
            setShowUserModal(false);
            fetchUsers();
        } catch (err) {
            console.error(err);

            const errorData = err.response?.data;
            const status = err.response?.status;

            if (status === 400 && errorData && typeof errorData === 'object' && !Array.isArray(errorData) && !errorData.message && !errorData.errors) {
                // Handle Map<String, String> field errors from backend
                setFieldErrors(errorData);
                return;
            }

            let errorMessage = 'Operation failed';

            if (typeof errorData === 'string') {
                errorMessage = errorData;
            } else if (errorData && typeof errorData === 'object') {
                // Handle Spring Validation errors
                if (errorData.errors) {
                    if (Array.isArray(errorData.errors)) {
                        errorMessage = errorData.errors.map(e => e.defaultMessage || e.field + ' invalid').join(', ');
                    } else if (typeof errorData.errors === 'object') {
                        // Map of fieldName -> errorMessage
                        setFieldErrors(errorData.errors);
                        // If we set field errors, we might still want to show a toast or just return
                        // If we return here, we avoid the alert.
                        return;
                    }
                }

                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            }

            alert(errorMessage);
        }
    };

    // --- CSV ---
    const handleFileChange = (e) => setFile(e.target.files[0]);

    const handleUpload = async () => {
        if (!file) {
            alert("Please select a file first");
            return;
        }
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            await apiClient.post("/users/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            alert("Users uploaded successfully!");
            fetchUsers();
            setFile(null);
            // Reset file input manually if needed, or rely on state
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Failed to upload file");
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = () => {
        window.location.href = "/api/users/template";
    };

    if (loading) return <div className="text-center py-4">Loading Users...</div>;

    return (
        <div className="space-y-6 relative">
            {/* --- Modals --- */}

            {/* User Create/Edit Modal */}
            {showUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 hover:backdrop-blur-sm" role="dialog" aria-modal="true">
                    <div className="bg-[var(--bg-card)] rounded-lg p-6 w-full max-w-md shadow-xl border border-[var(--border-subtle)] max-h-[90vh] overflow-y-auto user-modal transition-all duration-300">
                        <h3 className="text-lg font-bold mb-4 text-[var(--text-primary)]">{isEditMode ? 'Edit User' : 'Create New User'}</h3>
                        <form onSubmit={handleUserSubmit} className="space-y-4">
                            {!isEditMode && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Username</label>
                                        <input
                                            type="text"
                                            name="username"
                                            required
                                            value={userForm.username}
                                            onChange={e => setUserForm({ ...userForm, username: e.target.value })}

                                            className={`mt-1 block w-full p-2 border rounded bg-[var(--bg-surface)] text-[var(--text-primary)] ${fieldErrors.username ? 'border-red-500' : 'border-[var(--border-subtle)]'}`}
                                        />
                                        {fieldErrors.username && <p className="text-red-500 text-xs mt-1">{fieldErrors.username}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Password</label>
                                        <input
                                            type="password"
                                            name="password"
                                            required
                                            value={userForm.password}
                                            onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                            className={`mt-1 block w-full p-2 border rounded bg-[var(--bg-surface)] text-[var(--text-primary)] ${fieldErrors.password ? 'border-red-500' : 'border-[var(--border-subtle)]'}`}
                                        />
                                        {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
                                    </div>
                                </>
                            )}

                            {/* Email & Phone */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">Email <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={userForm.email}
                                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}

                                    className={`mt-1 block w-full p-2 border rounded bg-[var(--bg-surface)] text-[var(--text-primary)] ${fieldErrors.email ? 'border-red-500' : 'border-[var(--border-subtle)]'}`}
                                    placeholder="user@example.com"
                                />
                                {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">Phone Number</label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={userForm.phoneNumber}
                                    onChange={e => setUserForm({ ...userForm, phoneNumber: e.target.value })}

                                    className={`mt-1 block w-full p-2 border rounded bg-[var(--bg-surface)] text-[var(--text-primary)] ${fieldErrors.phoneNumber ? 'border-red-500' : 'border-[var(--border-subtle)]'}`}
                                    placeholder="+1 555-0000"
                                />
                                {fieldErrors.phoneNumber && <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">Role</label>
                                <select
                                    name="role"
                                    value={userForm.role}

                                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                                    className={`mt-1 block w-full p-2 border rounded bg-[var(--bg-surface)] text-[var(--text-primary)] ${fieldErrors.role ? 'border-red-500' : 'border-[var(--border-subtle)]'}`}
                                >
                                    <option value="EMPLOYEE">Employee</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="IT_SUPPORT">IT Support</option>
                                    <option value="SECURITY_TEAM">Security Team</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">Department</label>
                                <input
                                    type="text"
                                    name="department"
                                    value={userForm.department}

                                    onChange={e => setUserForm({ ...userForm, department: e.target.value })}
                                    className={`mt-1 block w-full p-2 border rounded bg-[var(--bg-surface)] text-[var(--text-primary)] ${fieldErrors.department ? 'border-red-500' : 'border-[var(--border-subtle)]'}`}
                                />
                                {fieldErrors.department && <p className="text-red-500 text-xs mt-1">{fieldErrors.department}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">Job Title</label>
                                <input
                                    type="text"
                                    name="jobTitle"
                                    value={userForm.jobTitle}
                                    onChange={e => setUserForm({ ...userForm, jobTitle: e.target.value })}
                                    className={`mt-1 block w-full p-2 border rounded bg-[var(--bg-surface)] text-[var(--text-primary)] ${fieldErrors.jobTitle ? 'border-red-500' : 'border-[var(--border-subtle)]'}`}
                                />
                                {fieldErrors.jobTitle && <p className="text-red-500 text-xs mt-1">{fieldErrors.jobTitle}</p>}
                            </div>
                            {/* Only show Manager field for Employee/Manager? For now allow all */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">Manager Username (Optional)</label>
                                <input
                                    type="text"
                                    value={userForm.managerName}
                                    onChange={e => setUserForm({ ...userForm, managerName: e.target.value })}
                                    className="mt-1 block w-full p-2 border border-[var(--border-subtle)] rounded bg-[var(--bg-surface)] text-[var(--text-primary)]"
                                    placeholder="e.g. manager_mike"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowUserModal(false)}
                                    className="px-4 py-2 text-sm text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded hover:bg-[var(--bg-hover)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm text-white bg-primary rounded hover:bg-green-700"
                                >
                                    {isEditMode ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 hover:backdrop-blur-sm" role="dialog" aria-modal="true">
                    <div className="bg-[var(--bg-card)] rounded-lg p-6 w-96 shadow-xl border border-[var(--border-subtle)]">
                        <h3 className="text-lg font-bold mb-4 text-[var(--text-primary)]">Reset Password</h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">For user: <span className="font-semibold text-[var(--text-primary)]">{selectedUser?.username}</span></p>

                        <form onSubmit={handleResetSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="mt-1 block w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-md shadow-sm py-2 px-3 focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm"
                                    placeholder="New Password"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="mt-1 block w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-md shadow-sm py-2 px-3 focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm"
                                    placeholder="Confirm Password"
                                />
                            </div>
                            {resetError && <p className="text-red-600 text-xs">{resetError}</p>}

                            <div className="flex justify-end space-x-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowResetModal(false)}
                                    className="px-4 py-2 text-sm text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded hover:bg-[var(--bg-hover)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm text-white bg-primary rounded hover:bg-indigo-700"
                                >
                                    Reset
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                    <div className="bg-[var(--bg-card)] rounded-lg p-6 w-96 shadow-xl border border-[var(--border-subtle)]">
                        <h3 className="text-lg font-bold mb-2 text-red-600">Delete User?</h3>
                        <p className="text-[var(--text-secondary)] mb-6">
                            Are you sure you want to delete user <span className="font-semibold text-[var(--text-primary)]">{selectedUser?.username}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 text-sm text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded hover:bg-[var(--bg-hover)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteSubmit}
                                className="px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deactivate Confirmation Modal */}
            {showDeactivateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                    <div className="bg-[var(--bg-card)] rounded-lg p-6 w-96 shadow-xl border border-[var(--border-subtle)]">
                        <h3 className="text-lg font-bold mb-2 text-yellow-600">Deactivate User?</h3>
                        <p className="text-[var(--text-secondary)] mb-6">
                            Are you sure you want to deactivate user <span className="font-semibold text-[var(--text-primary)]">{selectedUser?.username}</span>? They will no longer be able to login, but ticket history will be preserved.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeactivateModal(false)}
                                className="px-4 py-2 text-sm text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded hover:bg-[var(--bg-hover)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeactivateSubmit}
                                className="px-4 py-2 text-sm text-white bg-yellow-600 rounded hover:bg-yellow-700"
                            >
                                Yes, Deactivate
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* --- Main Content --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[var(--bg-card)] p-4 rounded-lg shadow border border-[var(--border-subtle)]">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">User Management</h2>
                    <p className="text-sm text-[var(--text-secondary)]">Manage system access and roles</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                        onClick={openCreateModal}
                        className="bg-[var(--accent)] text-white px-3 py-1 rounded text-sm hover:bg-[var(--accent-2)] whitespace-nowrap"
                    >
                        + Add User
                    </button>
                    <button
                        onClick={handleDownloadTemplate}
                        className="text-sm text-[var(--accent)] hover:text-[var(--accent-2)] underline whitespace-nowrap"
                    >
                        Download Template CSV
                    </button>
                    <div className="flex flex-wrap gap-2 items-center">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="text-sm text-[var(--text-secondary)] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[var(--bg-muted)] hover:file:bg-[var(--bg-hover)]"
                        />
                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className="bg-[var(--accent)] text-white px-3 py-1 rounded text-sm hover:bg-[var(--accent-2)] disabled:opacity-50 whitespace-nowrap"
                        >
                            {uploading ? 'Uploading...' : 'Upload Users'}
                        </button>
                    </div>
                </div>
            </div>

            {actionMessage && (
                <div className="bg-green-50 text-green-700 p-3 rounded text-sm mb-4">
                    {actionMessage}
                </div>
            )}

            {error && <div className="text-red-600">{error}</div>}

            <div className="bg-[var(--bg-card)] shadow sm:rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                <div className="overflow-x-auto relative">
                    <table className="min-w-[1000px] w-full divide-y divide-[var(--border-subtle)]">
                        <thead className="bg-[var(--bg-muted)]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Role</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Department</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Job Title</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider sticky right-0 bg-[var(--bg-muted)] z-10 shadow-[-5px_0px_10px_rgba(0,0,0,0.05)] dark:shadow-[-5px_0px_10px_rgba(0,0,0,0.5)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
                            {users.map((u) => (
                                <tr key={u.id} className={u.active === false ? 'opacity-50 bg-gray-100 dark:bg-gray-800' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                                        {u.username}
                                        {u.active === false && <span className="ml-2 text-xs text-red-500">(Inactive)</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{u.email || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{u.phoneNumber || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                                u.role === 'MANAGER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{u.department || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{u.jobTitle || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-[var(--bg-card)] z-10 shadow-[-5px_0px_10px_rgba(0,0,0,0.05)] dark:shadow-[-5px_0px_10px_rgba(0,0,0,0.5)]">
                                        <div className="flex justify-end gap-3">
                                            {/* Edit Button */}
                                            <button
                                                onClick={() => openEditModal(u)}
                                                title="Edit User"
                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                                </svg>
                                            </button>
                                            {/* Reset Password Button */}
                                            <button
                                                onClick={() => openResetModal(u)}
                                                title="Reset Password"
                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                                                </svg>
                                            </button>
                                            {/* Deactivate Button (only if active) */}
                                            {u.active !== false && (
                                                <button
                                                    onClick={() => openDeactivateModal(u)}
                                                    title="Deactivate User"
                                                    className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-500 dark:hover:text-yellow-400 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                                                    </svg>
                                                </button>
                                            )}
                                            {/* Delete Button */}
                                            <button
                                                onClick={() => openDeleteModal(u)}
                                                title="Delete User"
                                                className="text-red-600 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserList;
