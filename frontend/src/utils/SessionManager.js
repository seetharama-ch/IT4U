/**
 * Session Manager - Handles idle timeout and session expiry warnings
 * 
 * Features:
 * - Tracks user activity (mouse, keyboard, scroll)
 * - Shows warning 2 minutes before 30-minute timeout
 * - Provides "Stay Logged In" to refresh session
 * - Broadcasts logout/refresh events across tabs via BroadcastChannel
 */

class SessionManager {
    constructor() {
        // Configurable timeouts (can be overridden for testing)
        this.IDLE_TIMEOUT = window.IT4U_TEST_SESSION_TIMEOUT || (30 * 60 * 1000); // 30 minutes
        this.WARNING_TIME = window.IT4U_TEST_WARNING_TIME || (28 * 60 * 1000); // 28 minutes (2 min warning)

        this.idleTimer = null;
        this.warningTimer = null;
        this.isWarningVisible = false;
        this.warningCallback = null;
        this.logoutCallback = null;

        // Multi-tab coordination
        this.channel = typeof BroadcastChannel !== 'undefined'
            ? new BroadcastChannel('it4u-session')
            : null;

        this.activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        this.boundResetIdleTimer = this.resetIdleTimer.bind(this);
        this.boundHandleBroadcast = this.handleBroadcast.bind(this);
    }

    /**
     * Initialize session tracking
     * @param {Function} warningCallback - Called when warning should be shown
     * @param {Function} logoutCallback - Called when auto-logout occurs
     */
    start(warningCallback, logoutCallback) {
        this.warningCallback = warningCallback;
        this.logoutCallback = logoutCallback;

        // Listen for user activity
        this.activityEvents.forEach(event => {
            window.addEventListener(event, this.boundResetIdleTimer, { passive: true });
        });

        // Listen for route changes (activity indicator)
        window.addEventListener('popstate', this.boundResetIdleTimer);

        // Listen for cross-tab messages
        if (this.channel) {
            this.channel.onmessage = this.boundHandleBroadcast;
        }

        // Start the idle timer
        this.resetIdleTimer();

        console.log('[SessionManager] Started - Idle timeout:', this.IDLE_TIMEOUT / 60000, 'min');
    }

    /**
     * Stop session tracking and cleanup
     */
    stop() {
        this.activityEvents.forEach(event => {
            window.removeEventListener(event, this.boundResetIdleTimer);
        });
        window.removeEventListener('popstate', this.boundResetIdleTimer);

        if (this.idleTimer) clearTimeout(this.idleTimer);
        if (this.warningTimer) clearTimeout(this.warningTimer);

        if (this.channel) {
            this.channel.close();
        }

        console.log('[SessionManager] Stopped');
    }

    /**
     * Reset idle timer on user activity
     */
    resetIdleTimer() {
        // Clear existing timers
        if (this.idleTimer) clearTimeout(this.idleTimer);
        if (this.warningTimer) clearTimeout(this.warningTimer);

        // Hide warning if visible
        if (this.isWarningVisible) {
            this.isWarningVisible = false;
            if (this.warningCallback) {
                this.warningCallback({ type: 'HIDE' });
            }
        }

        // Set warning timer (28 minutes)
        this.warningTimer = setTimeout(() => {
            this.showWarning();
        }, this.WARNING_TIME);

        // Set auto-logout timer (30 minutes)
        this.idleTimer = setTimeout(() => {
            this.handleAutoLogout();
        }, this.IDLE_TIMEOUT);
    }

    /**
     * Show session expiry warning
     */
    showWarning() {
        if (!this.isWarningVisible && this.warningCallback) {
            this.isWarningVisible = true;
            const remainingTime = Math.ceil((this.IDLE_TIMEOUT - this.WARNING_TIME) / 1000); // seconds
            this.warningCallback({
                type: 'SHOW',
                remainingSeconds: remainingTime
            });
            console.log('[SessionManager] Warning shown - Session expires in', remainingTime, 'seconds');
        }
    }

    /**
     * Handle auto-logout when timer expires
     */
    handleAutoLogout() {
        console.log('[SessionManager] Auto-logout triggered');
        if (this.logoutCallback) {
            this.logoutCallback();
        }

        // Broadcast logout to other tabs
        this.broadcast({ type: 'LOGOUT' });
    }

    /**
     * Extend session (called when user clicks "Stay Logged In")
     * @returns {Promise} - Resolves when session is refreshed
     */
    async extendSession() {
        try {
            // Call /api/auth/me to verify session is still valid
            // This also extends the backend session timeout
            const response = await fetch('/api/auth/me', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Session refresh failed');
            }

            const data = await response.json();

            if (!data.authenticated) {
                throw new Error('Session expired');
            }

            // Reset idle timer
            this.resetIdleTimer();

            // Broadcast session extension to other tabs
            this.broadcast({ type: 'SESSION_EXTENDED' });

            console.log('[SessionManager] Session extended successfully');
            return true;
        } catch (error) {
            console.error('[SessionManager] Session extension failed:', error);
            throw error;
        }
    }

    /**
     * Broadcast message to other tabs
     * @param {Object} message - Message to broadcast
     */
    broadcast(message) {
        if (this.channel) {
            try {
                this.channel.postMessage(message);
                console.log('[SessionManager] Broadcast:', message.type);
            } catch (error) {
                console.error('[SessionManager] Broadcast failed:', error);
            }
        }
    }

    /**
     * Handle messages from other tabs
     * @param {MessageEvent} event - Broadcast message
     */
    handleBroadcast(event) {
        const { type } = event.data;

        console.log('[SessionManager] Received broadcast:', type);

        switch (type) {
            case 'LOGOUT':
                // Another tab logged out - logout this tab too
                if (this.logoutCallback) {
                    this.logoutCallback();
                }
                break;

            case 'SESSION_EXTENDED':
                // Another tab extended session - reset our timer
                this.resetIdleTimer();
                break;

            default:
                console.warn('[SessionManager] Unknown broadcast type:', type);
        }
    }

    /**
     * Manual logout (called by app)
     */
    logout() {
        this.broadcast({ type: 'LOGOUT' });
        this.stop();
    }
}

// Export singleton instance
export default new SessionManager();
