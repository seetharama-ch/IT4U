/**
 * Debug Logging Utility
 * Enables logs only if localStorage 'it4u.debug' is set to 'true'
 */

const isDebugEnabled = () => {
    // TEMPORARY: Force debug logging for SSO investigation
    return true;
    // return localStorage.getItem('it4u.debug') === 'true';
};

export const debugLog = (message, ...args) => {
    if (isDebugEnabled()) {
        console.log(`[DEBUG] ${message}`, ...args);
    }
};

export const debugError = (message, ...args) => {
    // Errors are always logged, but we tag them
    console.error(`[ERROR] ${message}`, ...args);
};

export const debugWarn = (message, ...args) => {
    if (isDebugEnabled()) {
        console.warn(`[WARN] ${message}`, ...args);
    }
};
