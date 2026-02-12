import React from "react";

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught error:', error, info);
        this.setState({ error, info });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, info: null });
        window.location.href = '/app/admin';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                    <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
                        <div className="text-center">
                            {/* Error Icon */}
                            <svg
                                className="mx-auto h-16 w-16 text-red-500 mb-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>

                            {/* Error Title */}
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Something went wrong
                            </h2>

                            {/* Error Message */}
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                An unexpected error occurred. Please try returning to the dashboard.
                            </p>

                            {/* Error Details (Development Only) */}
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <details className="mb-6 text-left">
                                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
                                        Error Details (Development)
                                    </summary>
                                    <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto max-h-48 text-red-600">
                                        {this.state.error.toString()}
                                        {this.state.info && this.state.info.componentStack}
                                    </pre>
                                </details>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <button
                                    onClick={this.handleReset}
                                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                >
                                    Go to Dashboard
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors dark:bg-gray-700 dark:text-gray-300"
                                >
                                    Reload Page
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

