import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import Footer from './Footer';

const Login = () => {
    const navigate = useNavigate();
    const { login, user } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    React.useEffect(() => {
        if (user) {
            let path = '/';
            switch (user.role) {
                case 'ADMIN': path = '/app/admin'; break;
                case 'MANAGER': path = '/app/manager'; break;
                case 'IT_SUPPORT': path = '/app/it-support'; break;
                case 'EMPLOYEE': path = '/app/employee'; break;
                default: path = '/';
            }
            navigate(path);
        }
    }, [user, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        const { username, password } = formData;

        // EMERGENCY BYPASS REMOVED: Always authenticate with backend
        // if (username === 'admin' && password === 'password') { ... }

        try {
            const response = await apiClient.post('/auth/login', { username, password });

            if (response.data) {
                login(response.data);
                navigate('/');
            }
        } catch (err) {
            console.error("Login error:", err);
            if (err.response && err.response.data) {
                // Determine if data is a string (message) or object
                const msg = typeof err.response.data === 'string'
                    ? err.response.data
                    : (err.response.data.message || 'Login failed');
                setError(msg);
            } else {
                setError('Invalid username or password');
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--bg-page)] transition-colors duration-300">
            <div className="flex-grow flex items-center justify-center px-4">
                <div className="w-full max-w-[440px] card bg-[var(--bg-card)] shadow-lg rounded-xl border border-[var(--border-subtle)] p-8 transition-all duration-300">
                    {/* Header Section */}
                    <div className="flex flex-col items-center mb-8">
                        <img
                            src="/geosoft-logo.png"
                            alt="Geosoft"
                            className="w-[120px] h-auto mb-4"
                        />
                        <h2 className="text-2xl font-bold text-[var(--accent)] tracking-tight">
                            IT4U
                        </h2>
                        <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-widest mt-1">
                            Support in your fingertips
                        </p>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] text-center">
                            Sign in to your account
                        </h3>
                    </div>

                    <form className="space-y-5" onSubmit={handleLogin} data-testid="login-form">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm text-center border border-red-200 dark:border-red-800" data-testid="login-error">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                                    Username
                                </label>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    className="input-field w-full"
                                    placeholder="Enter your username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    data-testid="username-input"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="input-field w-full"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    data-testid="password-input"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full btn-primary h-12 text-[15px] font-semibold shadow-sm"
                            data-testid="login-submit"
                        >
                            Login with Username/Password
                        </button>
                    </form>

                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[var(--border-subtle)]"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-[var(--bg-card)] text-[var(--text-muted)]">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <a
                                href="/oauth2/authorization/azure"
                                className="w-full flex items-center justify-center px-4 py-2.5 border border-[var(--border-subtle)] rounded-lg shadow-sm bg-[var(--bg-card)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)]"
                            >
                                <img src="/geosoft-logo.png" alt="Geosoft" className="h-5 w-auto mr-2" />
                                Sign in to GeosoftGlobal.com
                            </a>
                        </div>
                    </div>


                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Login;
