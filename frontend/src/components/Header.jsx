import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const Header = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (!user) return null;

    const isActive = (path) => {
        return location.pathname === path
            ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-elevated)]'
            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]';
    };

    return (
        <nav data-testid="app-header" className="bg-[var(--card-bg)] shadow-md border-b border-[var(--border-color)] sticky top-0 z-50 transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Left: Branding */}
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-3">
                            <img src="/geosoft-logo.png" alt="Geosoft" className="h-9 w-auto" />
                            <div className="flex flex-col border-l-2 border-[var(--border-color)] pl-3 h-8 justify-center hidden sm:flex">
                                <span className="text-lg font-bold text-[var(--color-primary)] leading-none">
                                    IT4U
                                </span>
                                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider leading-none mt-1">
                                    Support Portal
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Center: Navigation (Desktop) */}
                    <div className="hidden md:flex md:space-x-8 items-center">
                        <Link to="/app" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full transition-colors ${isActive('/app') || isActive('/app/employee') || isActive('/app/manager') || isActive('/app/it-support') || isActive('/app/admin') ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-elevated)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'}`}>
                            Dashboard
                        </Link>
                        <Link to="/app/tickets/new" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full transition-colors ${isActive('/app/tickets/new')}`}>
                            Report Issue
                        </Link>
                        <Link to="/app/kb" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full transition-colors ${isActive('/app/kb')}`}>
                            Knowledge Base
                        </Link>
                        {user.role === 'ADMIN' && (
                            <>
                                <Link to="/app/admin/diagnostics" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full transition-colors ${isActive('/app/admin/diagnostics')}`}>
                                    Diagnostics
                                </Link>
                                <Link to="/app/admin/email-audit" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full transition-colors ${isActive('/app/admin/email-audit')}`}>
                                    Email Audits
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Right: User & Actions */}
                    <div className="flex items-center space-x-4">
                        <ThemeToggle />

                        {/* Desktop User Menu */}
                        <div className="ml-3 relative hidden md:block">
                            <div>
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="max-w-xs bg-[var(--bg-surface)] flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] p-1 pr-3 border border-[var(--border-subtle)]"
                                    id="user-menu-button"
                                    data-testid="user-menu"
                                    aria-expanded="false"
                                    aria-haspopup="true"
                                >
                                    <span className="sr-only">Open user menu</span>
                                    <div className="h-8 w-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold uppercase">
                                        {user.username.charAt(0)}
                                    </div>
                                    <span className="ml-3 font-medium text-[var(--text-main)] truncate max-w-[100px]">
                                        {user.username}
                                    </span>
                                    <svg className="ml-2 h-4 w-4 text-[var(--text-muted)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>

                            {/* Dropdown */}
                            {isProfileOpen && (
                                <div
                                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-[var(--card-bg)] ring-1 ring-black ring-opacity-5 focus:outline-none border border-[var(--border-color)]"
                                    role="menu"
                                    aria-orientation="vertical"
                                    aria-labelledby="user-menu-button"
                                    tabIndex="-1"
                                >
                                    <div className="px-4 py-2 border-b border-[var(--border-color)]">
                                        <p className="text-sm text-[var(--text-main)] font-medium">Signed in as</p>
                                        <p className="text-xs text-[var(--text-muted)] truncate font-mono">{user.role}</p>
                                    </div>
                                    <Link to="/" className="block px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-color)]" role="menuitem" tabIndex="-1" onClick={() => setIsProfileOpen(false)}>Your Profile</Link>
                                    <Link to="/" className="block px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-color)]" role="menuitem" tabIndex="-1" onClick={() => setIsProfileOpen(false)}>Settings</Link>
                                    <button
                                        onClick={() => { setIsProfileOpen(false); logout(); }}
                                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        role="menuitem"
                                        data-testid="logout-btn"
                                        tabIndex="-1"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="-mr-2 flex items-center md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                type="button"
                                className="inline-flex items-center justify-center p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-color)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--primary)]"
                                aria-controls="mobile-menu"
                                aria-expanded="false"
                            >
                                <span className="sr-only">Open main menu</span>
                                {!isMobileMenuOpen ? (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                ) : (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-[var(--card-bg)] border-b border-[var(--border-color)]" id="mobile-menu">
                    <div className="pt-2 pb-3 space-y-1">
                        <Link to="/app" className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/app') || isActive('/app/employee') || isActive('/app/manager') || isActive('/app/it-support') || isActive('/app/admin') ? 'border-[var(--primary)] text-[var(--primary)] bg-green-50' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-color)] hover:border-gray-300'}`} onClick={() => setIsMobileMenuOpen(false)}>
                            Dashboard
                        </Link>
                        <Link to="/app/tickets/new" className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/app/tickets/new') ? 'border-[var(--primary)] text-[var(--primary)] bg-green-50' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-color)] hover:border-gray-300'}`} onClick={() => setIsMobileMenuOpen(false)}>
                            Report Issue
                        </Link>
                        <Link to="/app/kb" className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/app/kb') ? 'border-[var(--primary)] text-[var(--primary)] bg-green-50' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-color)] hover:border-gray-300'}`} onClick={() => setIsMobileMenuOpen(false)}>
                            Knowledge Base
                        </Link>
                    </div>
                    <div className="pt-4 pb-4 border-t border-[var(--border-color)]">
                        <div className="flex items-center px-4">
                            <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold uppercase">
                                    {user.username.charAt(0)}
                                </div>
                            </div>
                            <div className="ml-3">
                                <div className="text-base font-medium text-[var(--text-main)]">{user.username}</div>
                                <div className="text-sm font-medium text-[var(--text-muted)]">{user.role}</div>
                            </div>
                        </div>
                        <div className="mt-3 space-y-1">
                            <button onClick={() => { setIsMobileMenuOpen(false); logout(); }} className="block w-full text-left px-4 py-2 text-base font-medium text-red-600 hover:text-red-800 hover:bg-[var(--bg-color)]">
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Header;
