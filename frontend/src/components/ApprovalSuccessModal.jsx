import React from 'react';

const ApprovalSuccessModal = ({ open, ticketNumber, timestamp, onOk }) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" aria-hidden="true" />

            {/* Modal Dialog */}
            <div className="relative bg-[var(--bg-card)] rounded-lg shadow-xl max-w-md w-full p-6 text-center transform transition-all scale-100 border border-[var(--border-subtle)]" role="dialog" aria-modal="true">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 mb-4">
                    <svg className="h-6 w-6 text-green-600 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h3 className="text-lg leading-6 font-medium text-[var(--text-primary)] mb-2">
                    Ticket Approved
                </h3>

                <div className="mt-2 px-2 py-3 bg-[var(--bg-muted)] rounded text-left border border-[var(--border-subtle)]">
                    <p className="text-sm text-[var(--text-secondary)]">
                        This ticket has been forwarded as approved to the IT team.
                    </p>
                    <div className="mt-3 border-t border-[var(--border-subtle)] pt-3 text-sm">
                        <div className="flex justify-between py-1">
                            <span className="font-medium text-[var(--text-secondary)]">Ticket No:</span>
                            <span className="font-bold text-[var(--text-primary)]">{ticketNumber}</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span className="font-medium text-[var(--text-secondary)]">Time:</span>
                            <span className="font-bold text-[var(--text-primary)]">{timestamp}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    <button
                        type="button"
                        className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-[var(--accent)] border border-transparent rounded-md shadow-sm hover:bg-[var(--accent-2)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] sm:text-sm"
                        onClick={onOk}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApprovalSuccessModal;
