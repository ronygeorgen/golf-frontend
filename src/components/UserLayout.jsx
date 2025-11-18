import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { LogOut, Calendar, Home, User, ChevronDown, Settings } from 'lucide-react';

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

    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/portal') return 'My Portal';
        if (path === '/calendar') return 'My Calendar';
        if (path === '/booking') return 'Book a Session';
        return 'Dashboard';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-md border-b border-gray-200 w-full">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Left side - Logo/Title */}
                        <div className="flex items-center space-x-4">
                            <h1 className="text-xl font-bold text-blue-700">Golf Booking</h1>
                            <div className="hidden md:block h-6 w-px bg-gray-300"></div>
                            <h2 className="text-lg font-semibold text-gray-700">
                                {getPageTitle()}
                            </h2>
                        </div>

                        {/* Right side - Navigation and Actions */}
                        <div className="flex items-center space-x-4">
                            {/* Navigation Links */}
                            <nav className="hidden md:flex items-center space-x-2">
                                <button
                                    onClick={() => navigate('/portal')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        location.pathname === '/portal'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <div className="flex items-center space-x-1">
                                        <Home className="w-4 h-4" />
                                        <span>Portal</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => navigate('/booking')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        location.pathname === '/booking'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    Book Session
                                </button>
                                <button
                                    onClick={() => navigate('/calendar')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        location.pathname === '/calendar'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <div className="flex items-center space-x-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>Calendar</span>
                                    </div>
                                </button>
                            </nav>

                            {/* User Dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm font-semibold">
                                            {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                                        </span>
                                    </div>
                                    <div className="hidden md:flex flex-col items-start">
                                        <span className="text-sm font-medium text-gray-700">
                                            {user?.first_name || user?.email || 'User'}
                                        </span>
                                        {user?.email && user?.first_name && (
                                            <span className="text-xs text-gray-500">{user.email}</span>
                                        )}
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                                        {/* User Info Section */}
                                        <div className="px-4 py-3 border-b border-gray-200">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-sm font-semibold">
                                                        {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {user?.first_name || user?.username || 'User'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {user?.email || ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="py-1">
                                            {isAdmin && (
                                                <button
                                                    onClick={() => {
                                                        navigate('/admin');
                                                        setDropdownOpen(false);
                                                    }}
                                                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                    <span>Switch to Admin</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    handleLogout();
                                                    setDropdownOpen(false);
                                                }}
                                                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
            <main>
                <Outlet />
            </main>
        </div>
    );
}

export default UserLayout;

