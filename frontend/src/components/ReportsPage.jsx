import React, { useState, useEffect } from 'react';
import { reportApi, userApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ReportsPage = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        dateRange: 'thisMonth', // 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'custom'
        status: '',
        priority: '',
        category: '',
        managerApprovalStatus: '',
        managerId: '',
        assignedToId: '',
        employeeName: '', // For search (not implemented in backend yet as search, but maybe ID?) - Backend uses employeeId (requesterId)
    });

    const [managers, setManagers] = useState([]);
    const [staff, setStaff] = useState([]);

    useEffect(() => {
        fetchUsers();
        // Set initial dates based on default range "thisWeek"
        handleDateRangeChange('thisWeek');
    }, []);

    const fetchUsers = async () => {
        try {
            // Fetch managers and IT staff for dropdowns
            // Assuming userApi has methods for this, or we filter from all users
            // This is an optimization; if APIs don't exist, we might need to add them or just fetch all
            const allUsersResponse = await userApi.getAll();
            const allUsers = allUsersResponse.data;
            setManagers(allUsers.filter(u => u.role === 'MANAGER'));
            setStaff(allUsers.filter(u => u.role === 'IT_SUPPORT' || u.role === 'ADMIN'));
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    };

    const calculateDateRange = (range) => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        const getMonday = (d) => {
            d = new Date(d);
            const day = d.getDay(),
                diff = d.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(d.setDate(diff));
        }

        if (range === 'thisWeek') {
            start = getMonday(now);
            end.setDate(start.getDate() + 6);
        } else if (range === 'lastWeek') {
            start = getMonday(now);
            start.setDate(start.getDate() - 7);
            end = new Date(start);
            end.setDate(end.getDate() + 6);
        } else if (range === 'thisMonth') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (range === 'lastMonth') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        }

        // Set times to BOD and EOD
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        if (range !== 'custom') {
            setFilters(prev => ({
                ...prev,
                startDate: start.toISOString(),
                endDate: end.toISOString()
            }));
        }
        return { start, end };
    };

    const handleDateRangeChange = (range) => {
        setFilters(prev => ({ ...prev, dateRange: range }));
        if (range !== 'custom') {
            calculateDateRange(range);
        }
    };

    const handleApplyFilters = async () => {
        setLoading(true);
        try {
            const response = await reportApi.getTickets(filters);
            setTickets(response.data.content || []);
        } catch (error) {
            console.error("Failed to fetch reports", error);
            alert("Failed to fetch reports");
        } finally {
            setLoading(false);
        }
    };

    const handleResetFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            dateRange: 'thisWeek',
            status: '',
            priority: '',
            category: '',
            managerApprovalStatus: '',
            managerId: '',
            assignedToId: '',
            employeeName: '',
        });
        handleDateRangeChange('thisWeek');
    };

    const handleExport = async (format = 'excel') => {
        setExporting(true);
        try {
            const response = await reportApi.exportTickets(filters, format);
            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const ext = format === 'excel' ? 'xlsx' : 'csv';
            link.setAttribute('download', `tickets_report_${dateStr}.${ext}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error(`Failed to export ${format}`, error);
            alert(`Failed to export report to ${format}`);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-[var(--accent-primary)]">Admin Reports</h1>

            {/* Filters Panel */}
            <div className="bg-[var(--bg-card)] p-4 rounded-lg shadow mb-6 border border-[var(--border-subtle)]">
                <h2 className="text-lg font-semibold mb-4">Filters</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">

                    {/* Date Range */}
                    <div className="flex flex-col">
                        <label htmlFor="dateRange" className="mb-1 text-sm font-medium">Date Range</label>
                        <select
                            id="dateRange"
                            className="p-2 rounded bg-[var(--bg-input)] border border-[var(--border-input)]"
                            value={filters.dateRange}
                            onChange={(e) => handleDateRangeChange(e.target.value)}
                        >
                            <option value="thisWeek">This Week</option>
                            <option value="lastWeek">Last Week</option>
                            <option value="thisMonth">This Month</option>
                            <option value="lastMonth">Last Month</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>

                    {/* Custom Date Pickers */}
                    {filters.dateRange === 'custom' && (
                        <>
                            <div className="flex flex-col">
                                <label className="mb-1 text-sm font-medium">From</label>
                                <input
                                    type="datetime-local"
                                    className="p-2 rounded bg-[var(--bg-input)] border border-[var(--border-input)]"
                                    value={filters.startDate ? filters.startDate.substring(0, 16) : ''}
                                    onChange={(e) => setFilters({ ...filters, startDate: new Date(e.target.value).toISOString() })}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="mb-1 text-sm font-medium">To</label>
                                <input
                                    type="datetime-local"
                                    className="p-2 rounded bg-[var(--bg-input)] border border-[var(--border-input)]"
                                    value={filters.endDate ? filters.endDate.substring(0, 16) : ''}
                                    onChange={(e) => setFilters({ ...filters, endDate: new Date(e.target.value).toISOString() })}
                                />
                            </div>
                        </>
                    )}

                    {/* Status */}
                    <div className="flex flex-col">
                        <label htmlFor="status" className="mb-1 text-sm font-medium">Status</label>
                        <select
                            id="status"
                            className="p-2 rounded bg-[var(--bg-input)] border border-[var(--border-input)]"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">All</option>
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                            <option value="WAITING_FOR_USER">Waiting for User</option>
                            <option value="PENDING_MANAGER_APPROVAL">Pending Approval</option>
                        </select>
                    </div>

                    {/* Manager */}
                    <div className="flex flex-col">
                        <label htmlFor="manager" className="mb-1 text-sm font-medium">Manager</label>
                        <select
                            id="manager"
                            className="p-2 rounded bg-[var(--bg-input)] border border-[var(--border-input)]"
                            value={filters.managerId}
                            onChange={(e) => setFilters({ ...filters, managerId: e.target.value })}
                        >
                            <option value="">All</option>
                            {managers.map(m => (
                                <option key={m.id} value={m.id}>{m.username}</option>
                            ))}
                        </select>
                    </div>

                    {/* Assigned To */}
                    <div className="flex flex-col">
                        <label htmlFor="assignedTo" className="mb-1 text-sm font-medium">Assigned To</label>
                        <select
                            id="assignedTo"
                            className="p-2 rounded bg-[var(--bg-input)] border border-[var(--border-input)]"
                            value={filters.assignedToId}
                            onChange={(e) => setFilters({ ...filters, assignedToId: e.target.value })}
                        >
                            <option value="">All</option>
                            {staff.map(s => (
                                <option key={s.id} value={s.id}>{s.username}</option>
                            ))}
                        </select>
                    </div>

                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors"
                        onClick={handleApplyFilters}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Apply Filters'}
                    </button>
                    <button
                        className="px-4 py-2 bg-[var(--bg-button-secondary)] text-[var(--text-primary)] rounded hover:bg-[var(--bg-button-secondary-hover)] transition-colors"
                        onClick={handleResetFilters}
                    >
                        Reset
                    </button>
                    <button
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors ml-auto"
                        onClick={() => handleExport('excel')}
                        disabled={exporting}
                    >
                        {exporting ? 'Exporting...' : 'Export to Excel'}
                    </button>
                    <button
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        onClick={() => handleExport('csv')}
                        disabled={exporting}
                    >
                        {exporting ? 'Exporting...' : 'Export to CSV'}
                    </button>
                </div>
            </div>

            {/* Results Table */}
            <div className="overflow-x-auto bg-[var(--bg-card)] rounded-lg shadow">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                            <th className="p-3">Ticket #</th>
                            <th className="p-3">Title</th>
                            <th className="p-3">Created</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Priority</th>
                            <th className="p-3">Employee</th>
                            <th className="p-3">Manager</th>
                            <th className="p-3">Assigned To</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.length > 0 ? (
                            tickets.map((ticket, idx) => (
                                <tr key={idx} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)]">
                                    <td className="p-3 font-mono text-sm">{ticket.ticketNumber}</td>
                                    <td className="p-3">{ticket.title}</td>
                                    <td className="p-3 text-sm">{new Date(ticket.createdAt).toLocaleString()}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                                            ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                                                ticket.status === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                    <td className="p-3">{ticket.priority}</td>
                                    <td className="p-3">{ticket.employeeName}</td>
                                    <td className="p-3">{ticket.managerName}</td>
                                    <td className="p-3">{ticket.assignedToName}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="p-6 text-center text-[var(--text-muted)]">
                                    No tickets found. Apply filters to see results.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ReportsPage;
