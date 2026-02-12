import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const EmailAuditDashboard = () => {
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState({
        status: '',
        eventType: ''
    });

    const eventTypes = [
        'TICKET_CREATED',
        'MANAGER_APPROVAL_REQUESTED',
        'MANAGER_APPROVED',
        'MANAGER_REJECTED',
        'ADMIN_STATUS_CHANGED',
        'TICKET_RESOLVED',
        'TICKET_CLOSED',
        'SMTP_TEST'
    ];

    useEffect(() => {
        fetchAudits();
    }, [page, filters]);

    const fetchAudits = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                size: 20,
                sort: 'sentAt,desc'
            };
            if (filters.status) params.status = filters.status;
            if (filters.eventType) params.eventType = filters.eventType;

            const response = await apiClient.get('/admin/email-audit', { params });
            setAudits(response.data.content);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error("Failed to fetch email audits", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(0); // Reset to first page
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--bg-card)] p-4 rounded-lg shadow border border-[var(--border-subtle)]">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Email Audit Log</h2>
                    <p className="text-sm text-[var(--text-secondary)]">Track all system notifications</p>
                </div>

                <div className="flex gap-3">
                    <select
                        className="text-sm p-2 border border-[var(--border-subtle)] rounded bg-[var(--bg-surface)] text-[var(--text-primary)]"
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="SENT">SENT</option>
                        <option value="FAILED">FAILED</option>
                    </select>

                    <select
                        className="text-sm p-2 border border-[var(--border-subtle)] rounded bg-[var(--bg-surface)] text-[var(--text-primary)]"
                        value={filters.eventType}
                        onChange={(e) => handleFilterChange('eventType', e.target.value)}
                    >
                        <option value="">All Events</option>
                        {eventTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-[var(--bg-card)] shadow overflow-hidden sm:rounded-lg border border-[var(--border-subtle)]">
                {loading ? (
                    <div className="p-8 text-center text-[var(--text-secondary)]">Loading logs...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--border-subtle)]">
                            <thead className="bg-[var(--bg-muted)]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Event</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">To</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Subject</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Error</th>
                                </tr>
                            </thead>
                            <tbody className="bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
                                {audits.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-4 text-center text-sm text-[var(--text-secondary)]">
                                            No audit logs found.
                                        </td>
                                    </tr>
                                ) : (
                                    audits.map((log) => (
                                        <tr key={log.id} className={log.status === 'FAILED' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                                                {new Date(log.sentAt).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                                                {log.eventType}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                                                {log.toEmail}
                                            </td>
                                            <td className="px-6 py-4 whitespace-normal text-sm text-[var(--text-primary)] max-w-xs truncate">
                                                {log.subject}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${log.status === 'SENT' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-normal text-sm text-red-600 max-w-xs break-words">
                                                {log.errorMessage || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                <div className="px-6 py-3 flex items-center justify-between border-t border-[var(--border-subtle)]">
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0 || loading}
                        className="px-3 py-1 border border-[var(--border-subtle)] rounded text-sm disabled:opacity-50 hover:bg-[var(--bg-hover)]"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-[var(--text-secondary)]">
                        Page {page + 1} of {totalPages || 1}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1 || loading}
                        className="px-3 py-1 border border-[var(--border-subtle)] rounded text-sm disabled:opacity-50 hover:bg-[var(--bg-hover)]"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailAuditDashboard;
