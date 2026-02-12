// @ts-ignore
import apiClient from '../api/apiClient';
import { ServiceNode, User, NodeHealthLog, NodeStatistics, HealthStatusSummary } from '../types';

// Use the centralized apiClient
const api = apiClient;

// Service Node API
export const serviceNodeApi = {
  getAll: () => api.get<ServiceNode[]>('/service-nodes'),
  getById: (id: number) => api.get<ServiceNode>(`/service-nodes/${id}`),
  getByNodeId: (nodeId: string) => api.get<ServiceNode>(`/service-nodes/node/${nodeId}`),
  create: (node: ServiceNode) => api.post<ServiceNode>('/service-nodes', node),
  update: (id: number, node: ServiceNode) => api.put<ServiceNode>(`/service-nodes/${id}`, node),
  delete: (id: number) => api.delete(`/service-nodes/${id}`),
  getByStatus: (status: string) => api.get<ServiceNode[]>(`/service-nodes/status/${status}`),
  getByType: (type: string) => api.get<ServiceNode[]>(`/service-nodes/type/${type}`),
  getByEnvironment: (environment: string) => api.get<ServiceNode[]>(`/service-nodes/environment/${environment}`),
  getStatistics: () => api.get<NodeStatistics>('/service-nodes/stats'),
  getByTypeStats: () => api.get<Record<string, number>>('/service-nodes/stats/by-type'),
  getByEnvironmentStats: () => api.get<Record<string, number>>('/service-nodes/stats/by-environment'),
  runHealthCheck: (id: number) => api.post(`/service-nodes/${id}/health-check`),
  runBulkHealthCheck: () => api.post('/service-nodes/bulk-health-check'),
};

// User API
export const userApi = {
  getAll: () => api.get<User[]>('/users'),
  getById: (id: number) => api.get<User>(`/users/${id}`),
  getByUsername: (username: string) => api.get<User>(`/users/username/${username}`),
  create: (user: User) => api.post<User>('/users', user),
  update: (id: number, user: User) => api.put<User>(`/users/${id}`, user),
  delete: (id: number) => api.delete(`/users/${id}`),
  getByRole: (role: string) => api.get<User[]>(`/users/role/${role}`),
  getByDepartment: (department: string) => api.get<User[]>(`/users/department/${department}`),
  getActive: () => api.get<User[]>('/users/active'),
};

// Health Log API
export const healthLogApi = {
  getAll: () => api.get<NodeHealthLog[]>('/health-logs'),
  getByServiceNodeId: (serviceNodeId: number) => api.get<NodeHealthLog[]>(`/health-logs/node/${serviceNodeId}`),
  create: (log: NodeHealthLog) => api.post<NodeHealthLog>('/health-logs', log),
  logHealthCheck: (serviceNodeId: number, status: string, responseTime?: number, errorMessage?: string, details?: string, checkedBy?: string) =>
    api.post<NodeHealthLog>(`/health-logs/check/${serviceNodeId}`, null, {
      params: { status, responseTime, errorMessage, details, checkedBy }
    }),
  getRecent: (serviceNodeId: number, hours: number = 24) =>
    api.get<NodeHealthLog[]>(`/health-logs/node/${serviceNodeId}/recent`, { params: { hours } }),
  getCriticalCount: (serviceNodeId: number, hours: number = 24) =>
    api.get<number>(`/health-logs/node/${serviceNodeId}/critical-count`, { params: { hours } }),
  getStatusSummary: (hours: number = 24) =>
    api.get<HealthStatusSummary>('/health-logs/stats/summary', { params: { hours } }),
};

// Report API
export const reportApi = {
  getTickets: (filter: any) => api.get('/admin/reports/tickets', { params: filter }),
  exportTickets: (filter: any, format: 'excel' | 'csv' = 'excel') => {
    const url = format === 'csv' ? '/admin/reports/tickets/export/csv' : '/admin/reports/tickets/export';
    return api.get(url, {
      params: { ...filter },
      responseType: 'blob', // Important for file download
    });
  },
};


// Legacy Ticket API (keeping for backward compatibility)
export const ticketApi = {
  getAll: () => api.get('/tickets'),
  create: (ticket: any) => api.post('/tickets', ticket),
};

export default api;
