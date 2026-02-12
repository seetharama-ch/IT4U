import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const LogContext = createContext();

export const useLogs = () => useContext(LogContext);

export const LogProvider = ({ children }) => {
    const [logs, setLogs] = useState([]);
    const MAX_LOGS = 100;

    const addLog = useCallback((type, source, message, details = null) => {
        const newLog = {
            id: Date.now() + Math.random(),
            time: new Date().toLocaleTimeString(),
            type: type, // ERROR, WARN, INFO
            source: source, // UI, API
            message: message,
            details: details
        };

        setLogs(prevLogs => {
            const updaetd = [newLog, ...prevLogs];
            return updaetd.slice(0, MAX_LOGS);
        });
    }, []);

    const clearLogs = () => setLogs([]);


    // Global Error Handler & API Interceptor
    useEffect(() => {
        // Setup API Interceptor
        import('../api').then(({ setupInterceptors }) => {
            setupInterceptors(addLog);
        });

        const handleError = (event) => {
            addLog('ERROR', 'UI', event.message, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error ? event.error.toString() : 'Unknown Error'
            });
        };

        const handleRejection = (event) => {
            addLog('ERROR', 'UI', `Unhandled Promise Rejection: ${event.reason}`, event.reason);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, [addLog]);


    return (
        <LogContext.Provider value={{ logs, addLog, clearLogs }}>
            {children}
        </LogContext.Provider>
    );
};
