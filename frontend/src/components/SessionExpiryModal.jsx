import React, { useState, useEffect } from 'react';

/**
 * Session Expiry Warning Modal
 * 
 * Shows a warning when the user's session is about to expire due to inactivity.
 * Provides options to extend the session or logout.
 */
const SessionExpiryModal = ({ isVisible, remainingSeconds, onStayLoggedIn, onLogout }) => {
    const [countdown, setCountdown] = useState(remainingSeconds);

    useEffect(() => {
        setCountdown(remainingSeconds);
    }, [remainingSeconds]);

    useEffect(() => {
        if (!isVisible || countdown <= 0) return;

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isVisible, countdown]);

    if (!isVisible) return null;

    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            data-testid="session-expiry-modal"
        >
            <div className="bg-[var(--bg-card)] rounded-xl shadow-2xl border border-[var(--border-color)] p-8 max-w-md w-full mx-4">
                {/* Warning Icon */}
                <div className="flex items-center justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <svg
                            className="w-8 h-8 text-orange-600 dark:text-orange-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-[var(--text-primary)] text-center mb-3">
                    Session Expiring Soon
                </h2>

                {/* Message */}
                <p
                    className="text-[var(--text-secondary)] text-center mb-6"
                    data-testid="session-expiry-message"
                >
                    Your session will expire in <strong className="text-[var(--accent)]">
                        {minutes}:{seconds.toString().padStart(2, '0')}
                    </strong> due to inactivity.
                </p>

                {/* Countdown Progress Bar */}
                <div className="mb-6">
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
                            style={{ width: `${(countdown / remainingSeconds) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onLogout}
                        className="flex-1 px-4 py-3 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors font-medium"
                        data-testid="logout-btn"
                    >
                        Logout
                    </button>
                    <button
                        onClick={onStayLoggedIn}
                        className="flex-1 btn-primary py-3 font-semibold"
                        data-testid="stay-logged-in-btn"
                    >
                        Stay Logged In
                    </button>
                </div>

                {/* Info Text */}
                <p className="text-xs text-[var(--text-muted)] text-center mt-4">
                    Click "Stay Logged In" to extend your session, or "Logout" to end your session now.
                </p>
            </div>
        </div>
    );
};

export default SessionExpiryModal;
