import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { endpoints } from '../api/endpoints';
import { LogOut, Calendar, Home, User, ChevronDown, Settings, Link2 } from 'lucide-react';
import logo from '../assets/hole9golf-logo.png';

function UserLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const isAdmin = user?.role === 'admin' || user?.is_superuser === true;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        await dispatch(logout());
        navigate('/signin');
    };

    const handleGHLOnboard = () => {
        const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
        const onboardURL = `${baseURL}${endpoints.ghl.onboard}`;
        window.open(onboardURL, '_blank', 'noopener,noreferrer');
    };

    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/portal') return 'My Portal';
        if (path === '/calendar') return 'My Calendar';
        if (path === '/booking') return 'Book a Session';
        if (path === '/packages') return 'Packages & Gifts';
        return 'Dashboard';
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-surface shadow-sm border-b border-border sticky top-0 z-50 w-full">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        {/* Left side - Logo/Title */}
                        <div className="flex items-center space-x-2 md:space-x-4">
                            <div className="bg-white p-1 rounded-md">
                                <img 
                                    src={logo} 
                                    alt="Hole 9 Golf Logo" 
                                    className="h-6 w-auto md:h-10 object-contain"
                                />
                            </div>
                            <div className="hidden md:block h-6 w-px bg-border"></div>
                            <h2 className="text-sm md:text-lg font-semibold text-text-primary">
                                {getPageTitle()}
                            </h2>
                        </div>

                        {/* Right side - Navigation and Actions */}
                        <div className="flex items-center space-x-4">
                            {/* Navigation Links */}
                            <nav className="hidden md:flex items-center space-x-2">
                                <button
                                    onClick={() => navigate('/portal')}
                                    className={`px-3 py-2 rounded-button text-sm font-medium transition-colors ${
                                        location.pathname === '/portal'
                                            ? 'bg-primary-light text-white'
                                            : 'text-text-secondary hover:bg-background'
                                    }`}
                                >
                                    <div className="flex items-center space-x-1">
                                        <Home className="w-4 h-4" />
                                        <span>Portal</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => navigate('/booking')}
                                    className={`px-3 py-2 rounded-button text-sm font-medium transition-colors ${
                                        location.pathname === '/booking'
                                            ? 'bg-primary-light text-white'
                                            : 'text-text-secondary hover:bg-background'
                                    }`}
                                >
                                    Book Session
                                </button>
                                <button
                                    onClick={() => navigate('/calendar')}
                                    className={`px-3 py-2 rounded-button text-sm font-medium transition-colors ${
                                        location.pathname === '/calendar'
                                            ? 'bg-primary-light text-white'
                                            : 'text-text-secondary hover:bg-background'
                                    }`}
                                >
                                    <div className="flex items-center space-x-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>Calendar</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => navigate('/packages')}
                                    className={`px-3 py-2 rounded-button text-sm font-medium transition-colors ${
                                        location.pathname === '/packages'
                                            ? 'bg-primary-light text-white'
                                            : 'text-text-secondary hover:bg-background'
                                    }`}
                                >
                                    Packages
                                </button>
                            </nav>

                            {/* User Dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-button hover:bg-background transition-colors"
                                >
                                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm font-semibold">
                                            {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                                        </span>
                                    </div>
                                    <div className="hidden md:flex flex-col items-start">
                                        <span className="text-sm font-medium text-text-primary">
                                            {user?.first_name || user?.email || 'User'}
                                        </span>
                                        {user?.email && user?.first_name && (
                                            <span className="text-xs text-text-secondary">{user.email}</span>
                                        )}
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-surface rounded-card shadow-card border border-border py-2 z-[60]">
                                        {/* User Info Section */}
                                        <div className="px-4 py-3 border-b border-border">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                                    <span className="text-white text-sm font-semibold">
                                                        {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-text-primary truncate">
                                                        {user?.first_name || user?.username || 'User'}
                                                    </p>
                                                    <p className="text-xs text-text-secondary truncate">
                                                        {user?.email || ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="py-1">
                                            {/* Mobile Navigation Links - Only visible on mobile */}
                                            <div className="md:hidden border-b border-border pb-2 mb-2">
                                                <button
                                                    onClick={() => {
                                                        navigate('/portal');
                                                        setDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                                                        location.pathname === '/portal'
                                                            ? 'bg-primary-light text-white font-medium'
                                                            : 'text-text-primary hover:bg-background'
                                                    }`}
                                                >
                                                    <Home className="w-4 h-4" />
                                                    <span>Portal</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        navigate('/booking');
                                                        setDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                                                        location.pathname === '/booking'
                                                            ? 'bg-primary-light text-white font-medium'
                                                            : 'text-text-primary hover:bg-background'
                                                    }`}
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Book Session</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        navigate('/calendar');
                                                        setDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                                                        location.pathname === '/calendar'
                                                            ? 'bg-primary-light text-white font-medium'
                                                            : 'text-text-primary hover:bg-background'
                                                    }`}
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Calendar</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        navigate('/packages');
                                                        setDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                                                        location.pathname === '/packages'
                                                            ? 'bg-primary-light text-white font-medium'
                                                            : 'text-text-primary hover:bg-background'
                                                    }`}
                                                >
                                                    <User className="w-4 h-4" />
                                                    <span>Packages</span>
                                                </button>
                                            </div>

                                            {/* Admin Options */}
                                            {isAdmin && (
                                                <button
                                                    onClick={() => {
                                                        navigate('/admin');
                                                        setDropdownOpen(false);
                                                    }}
                                                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-text-primary hover:bg-background transition-colors"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                    <span>Switch to Admin</span>
                                                </button>
                                            )}
                                            {isAdmin && (
                                                <button
                                                    onClick={() => {
                                                        handleGHLOnboard();
                                                        setDropdownOpen(false);
                                                    }}
                                                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-text-primary hover:bg-background transition-colors"
                                                >
                                                    <Link2 className="w-4 h-4" />
                                                    <span>Onboard GHL</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    handleLogout();
                                                    setDropdownOpen(false);
                                                }}
                                                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-danger hover:bg-red-50 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-0">
                <Outlet />
            </main>
        </div>
    );
}

export default UserLayout;

