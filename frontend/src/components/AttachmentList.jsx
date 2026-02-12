import React from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

const AttachmentList = ({ attachments, ticketId, onDelete }) => {
    const { user } = useAuth();
    const canDelete = (att) => {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        // Simple check: match ID if available, otherwise just show if it's their upload
        return att.uploadedById === user.id;
    };

    const handleDownload = async (att) => {
        try {
            const response = await apiClient.get(`/tickets/${ticketId}/attachments/${att.id}/download`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', att.originalFileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed', error);
            alert('Failed to download file');
        }
    };

    if (!attachments || attachments.length === 0) return null;

    return (
        <div className="space-y-2">
            {attachments.map((att) => (
                <div key={att.id} className="flex items-center justify-between p-3 bg-[var(--bg-muted)] border border-[var(--border-subtle)] rounded-lg">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="flex-shrink-0">
                            {/* Simple Icon based on type */}
                            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate" title={att.originalFileName}>
                                {att.originalFileName}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                                {(att.sizeBytes / 1024).toFixed(1)} KB • {att.uploadedByName || 'Unknown'} • {new Date(att.uploadedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                        <button
                            onClick={() => handleDownload(att)}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium"
                        >
                            Download
                        </button>
                        {canDelete(att) && (
                            <button
                                onClick={() => onDelete(att.id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Delete Attachment"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AttachmentList;
