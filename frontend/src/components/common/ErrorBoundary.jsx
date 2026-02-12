import React from "react";

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("UI Crash caught by ErrorBoundary:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
                    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-red-200 dark:border-red-900">
                        <div className="p-6">
                            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">Something went wrong</h2>
                            <p className="text-sm text-center text-gray-600 dark:text-gray-300 mb-6">
                                The application encountered an unexpected error.
                            </p>

                            <div className="bg-red-50 dark:bg-red-900/20 rounded p-3 mb-6 overflow-auto max-h-40 text-left">
                                <code className="text-xs text-red-800 dark:text-red-300 font-mono whitespace-pre-wrap">
                                    {this.state.error && this.state.error.toString()}
                                </code>
                            </div>

                            <div className="flex justify-center">
                                <button
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                    onClick={() => window.location.reload()}
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
