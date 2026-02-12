import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const checkAuth = async () => {
        try {
            // Check if we have a valid session via /api/auth/me
            const { data } = await apiClient.get('/auth/me');
            if (data && data.authenticated) {
                setUser(data);
            } else {
                setUser(null);
            }
        } catch (err) {
            // ONLY logout on 401 (handled by interceptor usually, but here checking explicitly)
            if (err.response?.status === 401) {
                setUser(null);
            }
            // DO NOTHING on other errors (403, 500, Network Error)
            // This prevents auto-logout when backend is unreachable or returns other errors
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();

        // Listen for global 401 events from apiClient
        const handleUnauthorized = () => {
            setUser(null);
            navigate('/login');
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, [navigate]);

    const login = (userData) => {
        // Optimistically set user, though usually we'd re-fetch /auth/me
        setUser(userData);
    };

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (e) {
            console.error("Logout failed on backend", e);
        }
        setUser(null);
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, checkAuth, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
