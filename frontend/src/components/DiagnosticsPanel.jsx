import React, { useState, useEffect } from 'react';
import { useLogs } from '../context/LogContext';
import apiClient from '../api/apiClient';

const DiagnosticsPanel = () => {
    const { logs: frontendLogs, clearLogs: clearFrontendLogs } = useLogs();
    const [backendLogs, setBackendLogs] = useState([]);
    const [activeTab, setActiveTab] = useState('backend'); // 'frontend' or 'backend'
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filterType, setFilterType] = useState('ALL');

    const fetchBackendLogs = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/admin/logs');
            setBackendLogs(response.data);
        } catch (err) {
            console.error("Failed to fetch backend logs", err);
            setError("Failed to load backend logs. Are you an admin?");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'backend') {
            fetchBackendLogs();
        }
    }, [activeTab]);

    const downloadFrontendLogs = () => {
        const data = JSON.stringify(frontendLogs, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `frontend-logs-${new Date().toISOString()}.json`;
        a.click();
    };

    const LogTable = ({ data, columns }) => (
        <div className="overflow-x-auto shadow-md rounded-lg border border-[var(--border-subtle)]">
            <table className="min-w-full bg-[var(--bg-card)] text-sm">
                <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} className="py-2 px-4 text-left font-semibold">{col.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                    {data.length === 0 ? (
                        <tr><td colSpan={columns.length} className="p-4 text-center text-[var(--text-muted)]">No logs found</td></tr>
                    ) : (data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[var(--bg-hover)] transition">
                            {columns.map(col => (
                                <td key={col.key} className="py-2 px-4 align-top whitespace-pre-wrap word-break">
                                    {col.render ? col.render(row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    )))}
                </tbody>
            </table>
        </div>
    );

    const getFrontendColumns = () => [
        { key: 'time', label: 'Time' },
        {
            key: 'type', label: 'Type', render: (row) => (
                <span className={`px-2 py-1 rounded text-xs font-bold ${row.type === 'ERROR' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {row.type}
                </span>
            )
        },
        { key: 'source', label: 'Source' },
        { key: 'message', label: 'Message' },
        {
            key: 'details', label: 'Details', render: (row) => (
                row.details ? (
                    <details className="cursor-pointer text-blue-600 dark:text-blue-400">
                        <summary>View</summary>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1 overflow-auto max-w-md">
                            {JSON.stringify(row.details, null, 2)}
                        </pre>
                    </details>
                ) : '-'
            )
        }
    ];

    const getBackendColumns = () => [
        { key: 'timestamp', label: 'Time', render: (row) => new Date(row.timestamp).toLocaleString() },
        {
            key: 'level', label: 'Level', render: (row) => (
                <span className={`px-2 py-1 rounded text-xs font-bold ${row.level === 'ERROR' ? 'bg-red-100 text-red-800' : row.level === 'WARN' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                    {row.level}
                </span>
            )
        },
        { key: 'loggerName', label: 'Logger' },
        { key: 'message', label: 'Message' },
        {
            key: 'trace', label: 'Trace', render: (row) => (
                row.trace ? (
                    <details className="cursor-pointer text-red-600 dark:text-red-400">
                        <summary>Stack Trace</summary>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1 overflow-auto max-w-lg whitespace-pre">
                            {row.trace.substring(0, 1000) + (row.trace.length > 1000 ? '...' : '')}
                        </pre>
                    </details>
                ) : '-'
            )
        }
    ];

    const filteredFrontend = frontendLogs.filter(l => filterType === 'ALL' || l.type === filterType);
    const filteredBackend = backendLogs.filter(l => filterType === 'ALL' || l.level === filterType);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">System Diagnostics & Logs</h1>
            <div className="flex space-x-4 mb-6 border-b border-[var(--border-subtle)]">
                <button
                    className={`py-2 px-4 border-b-2 transition-colors ${activeTab === 'backend' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    onClick={() => { setActiveTab('backend'); setFilterType('ALL'); }}
                >
                    Backend Logs
                </button>
                <button
                    className={`py-2 px-4 border-b-2 transition-colors ${activeTab === 'frontend' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    onClick={() => { setActiveTab('frontend'); setFilterType('ALL'); }}
                >
                    Frontend Logs
                </button>
            </div>

            <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="border rounded px-3 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    >
                        <option value="ALL">All Levels</option>
                        <option value="ERROR">ERROR</option>
                        <option value="WARN">WARN</option>
                        {activeTab === 'backend' && <option value="INFO">INFO</option>}
                    </select>

                    {activeTab === 'backend' && (
                        <button onClick={fetchBackendLogs} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 px-3 py-1 rounded text-sm dark:text-white">
                            Refresh
                        </button>
                    )}
                    {activeTab === 'frontend' && (
                        <>
                            <button onClick={clearFrontendLogs} className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded text-sm">
                                Clear
                            </button>
                            <button onClick={downloadFrontendLogs} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded text-sm">
                                Download JSON
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isLoading && <p className="text-gray-500">Loading...</p>}
            {error && <p className="text-red-500 mb-4">{error}</p>}

            {activeTab === 'backend' ? (
                <LogTable data={filteredBackend} columns={getBackendColumns()} />
            ) : (
                <LogTable data={filteredFrontend} columns={getFrontendColumns()} />
            )}
        </div>
    );
};

export default DiagnosticsPanel;
