import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] p-4">
            <h1 className="text-6xl font-bold mb-4 text-[var(--primary)]">404</h1>
            <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
            <p className="text-[var(--text-muted)] mb-8 text-center max-w-md">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            <Link
                to="/"
                className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
                Back to Home
            </Link>
        </div>
    );
};

export default NotFound;
