import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
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
    ShieldCheck
} from 'lucide-react';

function AdminLayout() {
    // Load sidebar state from localStorage, default to true (open)
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('adminSidebarOpen');
        return saved !== null ? saved === 'true' : true;
    });
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);

    // Save sidebar state to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('adminSidebarOpen', sidebarOpen.toString());
    }, [sidebarOpen]);

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

    const getPageTitle = () => {
        const path = location.pathname;
        const activeItem = menuItems.find(item => isActive(item.path));
        return activeItem ? activeItem.label : 'Admin Dashboard';
    };

    const isAdmin = user?.role === 'admin' || user?.is_superuser === true;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-md border-b border-gray-200 z-20">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Left side - Logo */}
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                                <span className="text-white text-xl font-bold">G</span>
                            </div>
                            <h1 className="text-xl font-bold text-blue-700">
                                Golf Booking
                            </h1>
                        </div>

                        {/* Right side - Actions */}
                        <div className="flex items-center space-x-4">
                            {/* Switch to User Side Button (only for admins) */}
                            {isAdmin && (
                                <button
                                    onClick={() => navigate('/portal')}
                                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                                >
                                    Switch to User Side
                                </button>
                            )}

                            {/* User Info */}
                            <div className="flex items-center space-x-3">
                                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                                    <User className="w-4 h-4" />
                                    <span>{user?.first_name || user?.username || 'Admin'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1">
            {/* Sidebar */}
            <aside
                className={`bg-white text-blue-700 transition-all duration-300 ease-in-out ${
                    sidebarOpen ? 'w-64' : 'w-20'
                } fixed z-30 shadow-xl border-r border-gray-200`}
                style={{ top: '64px', height: 'calc(100vh - 64px)' }}
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
            <div
                className={`flex-1 transition-all duration-300 ease-in-out ${
                    sidebarOpen ? 'ml-64' : 'ml-20'
                }`}
                style={{ marginTop: '64px' }}
            >
                {/* Mobile Menu Button */}
                <div className="lg:hidden fixed top-4 left-4 z-30">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 bg-white hover:bg-blue-50 text-blue-700 rounded-lg shadow-lg border border-gray-200 transition-colors"
                        aria-label="Toggle sidebar"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8 pt-2 md:pt-1 w-full">
                    {/* Page Title */}
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                        {getPageTitle()}
                    </h1>
                    <Outlet />
                </div>
            </div>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            </div>
        </div>
    );
}

export default AdminLayout;

