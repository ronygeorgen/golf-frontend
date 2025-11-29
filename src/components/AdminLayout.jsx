import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { endpoints } from '../api/endpoints';
import { 
    LayoutDashboard, 
    Users, 
    Gamepad2, 
    Package, 
    Calendar, 
    CalendarDays, 
    LogOut, 
    Menu, 
    X,
    User,
    ShieldCheck,
    Link2,
    ChevronDown,
    Home
} from 'lucide-react';
import logo from '../assets/hole9golf-logo.png';

function AdminLayout() {
    // Load sidebar state from localStorage, default to true (open)
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('adminSidebarOpen');
        return saved !== null ? saved === 'true' : true;
    });
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);

    // Save sidebar state to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('adminSidebarOpen', sidebarOpen.toString());
    }, [sidebarOpen]);

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

    const menuItems = [
        { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/staff', label: 'Manage Staff', icon: Users },
        { path: '/admin/simulators', label: 'Manage Simulators', icon: Gamepad2 },
        { path: '/admin/packages', label: 'Manage Packages', icon: Package },
        { path: '/admin/bookings', label: 'View Bookings', icon: Calendar },
        { path: '/admin/calendar', label: 'Calendar View', icon: CalendarDays },
        { path: '/admin/overrides', label: 'Admin Overrides', icon: ShieldCheck },
    ];

    const isActive = (path) => {
        if (path === '/admin') {
            return location.pathname === '/admin';
        }
        return location.pathname.startsWith(path);
    };

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
        const activeItem = menuItems.find(item => isActive(item.path));
        return activeItem ? activeItem.label : 'Admin Dashboard';
    };

    const isAdmin = user?.role === 'admin' || user?.is_superuser === true;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 w-full">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        {/* Left side - Logo */}
                        <div className="flex items-center space-x-3">
                            <img 
                                src={logo} 
                                alt="Hole 9 Golf Logo" 
                                className="h-10 w-auto object-contain"
                            />
                            <h1 className="text-xl font-bold text-blue-700">
                                Admin Panel
                            </h1>
                        </div>

                        {/* Right side - Actions */}
                        <div className="flex items-center space-x-4">
                            {/* User Dropdown */}
                            {isAdmin && (
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm font-semibold">
                                                {user?.first_name?.[0] || user?.email?.[0] || 'A'}
                                            </span>
                                        </div>
                                        <div className="hidden md:flex flex-col items-start">
                                            <span className="text-sm font-medium text-gray-700">
                                                {user?.first_name || user?.username || 'Admin'}
                                            </span>
                                            {user?.email && user?.first_name && (
                                                <span className="text-xs text-gray-500">{user.email}</span>
                                            )}
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {dropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[60]">
                                            {/* User Info Section */}
                                            <div className="px-4 py-3 border-b border-gray-200">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-sm font-semibold">
                                                            {user?.first_name?.[0] || user?.email?.[0] || 'A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">
                                                            {user?.first_name || user?.username || 'Admin'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {user?.email || ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Menu Items */}
                                            <div className="py-1">
                                                <button
                                                    onClick={() => {
                                                        navigate('/portal');
                                                        setDropdownOpen(false);
                                                    }}
                                                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                >
                                                    <Home className="w-4 h-4" />
                                                    <span>Switch to User Side</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleGHLOnboard();
                                                        setDropdownOpen(false);
                                                    }}
                                                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                >
                                                    <Link2 className="w-4 h-4" />
                                                    <span>Onboard GHL</span>
                                                </button>
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
                            )}

                            {/* User Info (fallback for non-admin) */}
                            {!isAdmin && (
                                <div className="flex items-center space-x-3">
                                    <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                                        <User className="w-4 h-4" />
                                        <span>{user?.first_name || user?.username || 'User'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex pt-14">
            {/* Sidebar */}
            <aside
                className={`bg-white text-blue-700 transition-all duration-300 ease-in-out ${
                    sidebarOpen ? 'w-64' : 'w-20'
                } fixed z-40 shadow-xl border-r border-gray-200`}
                style={{ top: '56px', height: 'calc(100vh - 56px)', overflowY: 'auto' }}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        {sidebarOpen && (
                            <h2 className="text-xl font-bold text-blue-700">Admin Panel</h2>
                        )}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 rounded-lg hover:bg-blue-50 text-blue-700 transition-colors"
                            aria-label="Toggle sidebar"
                        >
                            {sidebarOpen ? (
                                <X className="w-6 h-6" />
                            ) : (
                                <Menu className="w-6 h-6" />
                            )}
                        </button>
                    </div>

                    {/* Navigation Menu */}
                    <nav className="flex-1 overflow-y-auto p-4">
                        <ul className="space-y-2">
                            {menuItems.map((item) => {
                                const active = isActive(item.path);
                                return (
                                    <li key={item.path}>
                                        <button
                                            onClick={() => navigate(item.path)}
                                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                                                active
                                                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 shadow-md font-semibold border-l-4 border-blue-600'
                                                    : 'text-blue-700 hover:bg-blue-50'
                                            }`}
                                            title={!sidebarOpen ? item.label : ''}
                                        >
                                            <item.icon className="w-5 h-5 flex-shrink-0" />
                                            {sidebarOpen && (
                                                <span className="font-medium">{item.label}</span>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Logout Button */}
                    <div className="p-4 border-t border-gray-200">
                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-blue-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ${
                                !sidebarOpen ? 'justify-center' : ''
                            }`}
                            title={!sidebarOpen ? 'Logout' : ''}
                        >
                            <LogOut className="w-5 h-5 flex-shrink-0" />
                            {sidebarOpen && <span className="font-medium">Logout</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main
                className={`flex-1 transition-all duration-300 ease-in-out min-h-[calc(100vh-56px)] ${
                    sidebarOpen ? 'ml-64' : 'ml-20'
                }`}
            >
                {/* Mobile Menu Button */}
                <div className="lg:hidden fixed top-[60px] left-4 z-40">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 bg-white hover:bg-blue-50 text-blue-700 rounded-lg shadow-lg border border-gray-200 transition-colors"
                        aria-label="Toggle sidebar"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8 pt-4 md:pt-6 w-full">
                    {/* Page Title */}
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                        {getPageTitle()}
                    </h1>
                    <Outlet />
                </div>
            </main>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
                    style={{ top: '56px' }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            </div>
        </div>
    );
}

export default AdminLayout;

