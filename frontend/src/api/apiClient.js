import axios from 'axios';
import { debugLog, debugError } from '../utils/debug';

// Simple UUID generator fallback if v4 not installed, but usually it is or we use simple random
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const getCorrelationId = () => {
    let cid = sessionStorage.getItem('x-correlation-id');
    if (!cid) {
        cid = generateUUID();
        sessionStorage.setItem('x-correlation-id', cid);
    }
    return cid;
};

// Create a single axios instance for the entire app
const apiClient = axios.create({
    baseURL: '/api', // Relative path to proxy or same-origin backend
    withCredentials: true, // Important for Spring Session cookies
    headers: {
        'Content-Type': 'application/json',
    },
    // Explicitly handle 204/empty responses to prevent JSON parse errors
    transformResponse: [(data) => {
        if (data === undefined || data === null || data === '') return data; // Return as-is for empty/204
        if (typeof data === 'string') {
            try {
                // Only attempt parse if it looks like JSON
                if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
                    return JSON.parse(data);
                }
                return data;
            } catch (e) {
                return data; // Return raw text if not JSON
            }
        }
        return data;
    }],
});

// Request Interceptor: Add CID and Log
apiClient.interceptors.request.use((config) => {
    const cid = getCorrelationId();
    config.headers['X-Correlation-Id'] = cid;
    debugLog(`API Request: ${config.method.toUpperCase()} ${config.url}`, config.data ? config.data : '');
    return config;
}, (error) => {
    debugError('API Request Error:', error);
    return Promise.reject(error);
});

// Response interceptor to handle 401s globally + Logging
apiClient.interceptors.response.use(
    (response) => {
        const { status, config } = response;
        const duration = response.headers['x-response-time'] || '?'; // If we had timing header
        debugLog(`API Response: ${status} ${config.method.toUpperCase()} ${config.url}`);
        return response;
    },
    (error) => {
        const { response, config } = error;
        const status = response?.status;
        // Prioritize Backend Request ID (from filter) over CID
        const requestId = response?.headers['x-request-id'] || response?.data?.requestId || response?.headers['x-correlation-id'];

        // Attach requestId to response data if it's an object, so UI components can display it easily
        if (response?.data && typeof response.data === 'object' && !response.data.requestId) {
            response.data.requestId = requestId;
        }

        const cid = response?.headers['x-correlation-id'];

        debugError(`API Error ${status} on ${config?.method?.toUpperCase()} ${config?.url} [cid=${cid}]`, response?.data);

        // ONLY logout on 401 if it's an Auth endpoint failure (session died)
        // OR login failed.
        // For other endpoints (data fetch etc), maybe just show Toast (handled by caller or global error UI).
        if (status === 401) {
            const isAuthEndpoint = config.url && (config.url.includes('/auth/me') || config.url.includes('/auth/check'));

            // If the check-session endpoint fails
            if (isAuthEndpoint) {
                // Retry ONCE to handle transient session hiccups (race conditions etc)
                if (!config._retry) {
                    config._retry = true;
                    // Wait 500ms then retry
                    return new Promise(resolve => {
                        setTimeout(() => resolve(apiClient(config)), 500);
                    });
                }

                // Dispatch global event for AuthContext to handle (clearing user, redirecting)
                if (typeof window !== 'undefined') {
                    // Prevent infinite loops if we are already on login
                    if (!window.location.pathname.includes('/login')) {
                        console.error('[Auto-Logout] Session validation failed 401 after retry');
                        window.dispatchEvent(new Event('auth:unauthorized'));
                    }
                }
            } else {
                // Determine if we should really stay logged in?
                // If a normal API 401s, usually session is dead too.
                // BUT user asked to "NOT hard logout" immediately.
                // We'll trust that the AuthProvider polling (/auth/me) will eventually catch the dead session
                // and trigger the logout via the block above.
                // So here, we do NOTHING (except log).
                debugError('Non-critical 401. Waiting for Auth Provider to verify session.');
            }
        }

        // NEVER logout on 200/400/403/500
        return Promise.reject(error);
    }
);

export default apiClient;
