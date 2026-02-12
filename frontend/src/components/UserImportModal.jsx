import React, { useState } from 'react';
import apiClient from '../api/apiClient';

const UserImportModal = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setMessage('');
        setError('');
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await apiClient.get('/users/template', {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'user_import_template.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Error downloading template:', err);
            setError('Failed to download template.');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setError('');
        setMessage('');

        try {
            const response = await apiClient.post('/users/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage(response.data);
            setUploading(false);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err) {
            console.error('Error uploading file:', err);
            setError(err.response?.data || 'Failed to upload file.');
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-[var(--bg-card)] p-6 rounded-lg shadow-xl w-full max-w-md border border-[var(--border-subtle)]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Import Users</h2>
                    <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>

                <div className="mb-6">
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                        Upload a CSV file with columns: Username, Password, Role.
                    </p>
                    <button
                        onClick={handleDownloadTemplate}
                        className="text-[var(--accent)] hover:underline text-sm font-medium mb-4 inline-block"
                    >
                        Download Template CSV
                    </button>

                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-[var(--text-secondary)]
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-[var(--accent)] file:text-white
                            hover:file:bg-[var(--accent-hover)]
                        "
                    />
                </div>

                {message && (
                    <div className="mb-4 p-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded text-sm">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded text-sm">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-[var(--bg-muted)] text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={uploading || !file}
                        className={`px-4 py-2 rounded text-white transition-colors ${uploading || !file
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'btn-primary'
                            }`}
                    >
                        {uploading ? 'Uploading...' : 'Upload Users'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserImportModal;
