import apiClient from './api/apiClient';

// Export the centralized client as 'api' for backward compatibility or direct usage
export const api = apiClient;

export const API_URL = '/api';

// Optional: Wrappers if needed, but components should use apiClient.get directly
export const getTickets = async () => {
    try {
        const response = await apiClient.get('/tickets');
        return response.data;
    } catch (error) {
        console.error("Error fetching tickets", error);
        return [];
    }
};

export const createTicket = async (ticketData) => {
    try {
        const response = await apiClient.post('/tickets', ticketData);
        return response.data;
    } catch (error) {
        console.error("Error creating ticket", error);
        throw error;
    }
};

// Deprecated interceptor setup (handled in apiClient.js now)
export const setupInterceptors = (logCallback) => {
    // No-op or migration notice
    console.warn("setupInterceptors in api.js is deprecated. Interceptors are configured in apiClient.js");
};
