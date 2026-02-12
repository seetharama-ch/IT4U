import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/apiClient';

const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain', 'text/csv'];

const FileUploader = ({ ticketId, onUploadSuccess }) => {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const validateFile = (file) => {
        if (!file) return 'No file selected';
        if (file.size > MAX_SIZE_BYTES) return `File too large (max ${MAX_SIZE_MB}MB)`;
        if (!ALLOWED_TYPES.includes(file.type)) return 'Unsupported file type (PDF, PNG, JPG, TXT only)';
        return null;
    };

    const handleUpload = async (file) => {
        setError(null);
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }

        setUploading(true);
        setProgress(0);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Let browser set Content-Type with boundary - don't override it
            await apiClient.post(`/tickets/${ticketId}/attachments`, formData, {
                headers: {
                    'Content-Type': undefined // Explicitly unset to let browser generate boundary
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);
                }
            });
            toast.success('File uploaded successfully!');
            onUploadSuccess();
        } catch (err) {
            console.error('Upload failed', err);
            const status = err.response?.status;
            const serverMessage = err.response?.data?.message || err.response?.data;

            if (status === 413) {
                const msg = 'File too large. Maximum 5MB allowed.';
                setError(msg);
                toast.error(msg);
            } else if (status === 415) {
                const msg = 'Unsupported file type';
                setError(msg);
                toast.error(msg);
            } else if (status === 403) {
                const msg = serverMessage || 'Access denied. You do not have permission to upload.';
                setError(msg);
                toast.error(msg);
            } else {
                const msg = serverMessage || 'Upload failed. Please try again.';
                setError(msg);
                toast.error(msg);
            }
        } finally {
            setUploading(false);
            setProgress(0);
        }
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
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleUpload(e.target.files[0]);
        }
    };

    return (
        <div className="w-full">
            <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
                    ${dragging ? 'border-[var(--accent)] bg-[var(--bg-elevated)]' : 'border-[var(--border-subtle)] hover:border-[var(--accent)]'}
                    ${uploading ? 'opacity-50 pointer-events-none' : ''}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,image/png,image/jpeg,image/webp,.txt,.csv"
                />

                {uploading ? (
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-[var(--accent)]">Uploading... {progress}%</div>
                        <div className="w-full bg-[var(--bg-muted)] rounded-full h-2.5 overflow-hidden">
                            <div className="bg-[var(--accent)] h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                ) : (
                    <>
                        <svg className="mx-auto h-12 w-12 text-[var(--text-secondary)]" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                        </svg>
                        <div className="mt-2 text-sm text-[var(--text-primary)]">
                            <span className="font-medium text-[var(--accent)] hover:text-[var(--accent-2)]">Upload a file</span> or drag and drop
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                            PDF, PNG, JPG, CSV, TXT up to 5MB
                        </p>
                    </>
                )}
            </div>

            {error && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded flex items-center">
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}
        </div>
    );
};

export default FileUploader;
