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
    User,
    ShieldCheck,
    Link2,
    ChevronDown,
    Home,
    Settings,
    UserCog,
    Clock,
    CalendarOff,
    MapPin,
    Megaphone,
    Ticket
} from 'lucide-react';
import logo from '../assets/hole9golf-logo.png';

function AdminLayout() {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [manageMenuOpen, setManageMenuOpen] = useState(false);
    const [bookingsMenuOpen, setBookingsMenuOpen] = useState(false);
    const [isInIframe, setIsInIframe] = useState(false);
    const dropdownRef = useRef(null);
    const manageMenuRef = useRef(null);
    const bookingsMenuRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);

    // Detect if page is loaded in an iframe
    useEffect(() => {
        setIsInIframe(window.self !== window.top);
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
            if (manageMenuRef.current && !manageMenuRef.current.contains(event.target)) {
                setManageMenuOpen(false);
            }
            if (bookingsMenuRef.current && !bookingsMenuRef.current.contains(event.target)) {
                setBookingsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const isAdmin = user?.role === 'admin' || user?.is_superuser === true;
    const isSuperadmin = user?.role === 'superadmin';

    // Navigation structure with grouped items
    const navigationItems = {
        dashboard: { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        manage: {
            label: 'Manage',
            icon: Settings,
            items: [
                { path: '/admin/users', label: 'Manage Users', icon: UserCog },
                { path: '/admin/staff', label: isSuperadmin ? 'Manage Admin' : 'Manage Staff', icon: Users },
                { path: '/admin/simulators', label: 'Manage Simulators', icon: Gamepad2 },
                { path: '/admin/packages', label: 'Manage Coaching/Combo Packages', icon: Package },
                { path: '/admin/simulator-packages', label: 'Manage Simulator Only Packages', icon: Clock },
                { path: '/admin/special-events', label: 'Manage Special Events', icon: CalendarDays },
                ...((isAdmin || isSuperadmin) ? [{ path: '/admin/banners', label: 'Manage Banners', icon: Megaphone }] : []),
                { path: '/admin/closed-days', label: 'Manage Closed Days', icon: CalendarOff },
                { path: '/admin/liability-waiver', label: 'Manage Liability Waiver', icon: ShieldCheck },
                { path: '/admin/coupons', label: 'Manage Coupons', icon: Ticket },
                ...(isSuperadmin ? [{ path: '/admin/ghl-locations', label: 'Manage GHL Locations', icon: MapPin }] : []),
            ]
        },
        bookings: {
            label: 'Bookings',
            icon: Calendar,
            items: [
                { path: '/admin/bookings', label: 'View Bookings', icon: Calendar },
                { path: '/admin/calendar', label: 'Calendar View', icon: CalendarDays },
            ]
        },
        overrides: { path: '/admin/overrides', label: 'Admin Overrides', icon: ShieldCheck },
    };

    const isActive = (path) => {
        if (path === '/admin') {
            return location.pathname === '/admin';
        }
        return location.pathname.startsWith(path);
    };

    // Check if any item in a group is active
    const isGroupActive = (items) => {
        return items.some(item => isActive(item.path));
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

        // Check manage items
        const manageItem = navigationItems.manage.items.find(item => isActive(item.path));
        if (manageItem) return manageItem.label;

        // Check bookings items
        const bookingItem = navigationItems.bookings.items.find(item => isActive(item.path));
        if (bookingItem) return bookingItem.label;

        // Check standalone items
        if (isActive(navigationItems.dashboard.path)) return 'Dashboard';
        if (isActive(navigationItems.overrides.path)) return 'Admin Overrides';
        if (isActive('/admin/ghl-locations')) return 'GHL Location Management';

        return 'Admin Dashboard';
    };

    const handleNavClick = (path) => {
        navigate(path);
        setManageMenuOpen(false);
        setBookingsMenuOpen(false);
        setDropdownOpen(false);
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Top Navigation Bar */}
            <header className="bg-surface shadow-sm border-b border-border sticky top-0 z-50 w-full">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Left side - Logo (clickable) - Hidden in iframe */}
                        {!isInIframe && (
                            <button
                                onClick={() => navigate('/admin')}
                                className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity"
                            >
                                <img
                                    src={logo}
                                    alt="Hole 9 Golf Logo"
                                    className="h-10 sm:h-8 md:h-10 w-auto object-contain"
                                />
                                <h1 className="text-lg sm:text-xl font-bold text-primary hidden sm:block">
                                    Admin Panel
                                </h1>
                            </button>
                        )}

                        {/* Center - Main Navigation Links (Desktop) */}
                        <nav className="hidden lg:flex items-center space-x-1 flex-1 justify-center max-w-4xl mx-4">
                            {/* Dashboard */}
                            <button
                                onClick={() => handleNavClick(navigationItems.dashboard.path)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive(navigationItems.dashboard.path)
                                    ? 'bg-gradient-to-r from-primary-light/20 to-primary-light/10 text-primary shadow-md font-semibold'
                                    : 'text-text-primary hover:bg-background'
                                    }`}
                            >
                                <navigationItems.dashboard.icon className="w-4 h-4" />
                                <span className="text-sm font-medium">{navigationItems.dashboard.label}</span>
                            </button>

                            {/* Manage Dropdown */}
                            <div className="relative" ref={manageMenuRef}>
                                <button
                                    onClick={() => {
                                        setManageMenuOpen(!manageMenuOpen);
                                        setBookingsMenuOpen(false);
                                    }}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${isGroupActive(navigationItems.manage.items)
                                        ? 'bg-gradient-to-r from-primary-light/20 to-primary-light/10 text-primary shadow-md font-semibold'
                                        : 'text-text-primary hover:bg-background'
                                        }`}
                                >
                                    <navigationItems.manage.icon className="w-4 h-4" />
                                    <span className="text-sm font-medium">{navigationItems.manage.label}</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${manageMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Manage Dropdown Menu */}
                                {manageMenuOpen && (
                                    <div className="absolute top-full left-0 mt-1 min-w-56 w-auto bg-surface rounded-card shadow-card border border-border py-2 z-[60] whitespace-nowrap">
                                        {navigationItems.manage.items.map((item) => {
                                            const active = isActive(item.path);
                                            return (
                                                <button
                                                    key={item.path}
                                                    onClick={() => handleNavClick(item.path)}
                                                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${active
                                                        ? 'bg-primary-light/10 text-primary font-semibold'
                                                        : 'text-text-primary hover:bg-background'
                                                        }`}
                                                >
                                                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                                                        <item.icon className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-left flex-1">{item.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Bookings Dropdown */}
                            <div className="relative" ref={bookingsMenuRef}>
                                <button
                                    onClick={() => {
                                        setBookingsMenuOpen(!bookingsMenuOpen);
                                        setManageMenuOpen(false);
                                    }}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${isGroupActive(navigationItems.bookings.items)
                                        ? 'bg-gradient-to-r from-primary-light/20 to-primary-light/10 text-primary shadow-md font-semibold'
                                        : 'text-text-primary hover:bg-background'
                                        }`}
                                >
                                    <navigationItems.bookings.icon className="w-4 h-4" />
                                    <span className="text-sm font-medium">{navigationItems.bookings.label}</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${bookingsMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Bookings Dropdown Menu */}
                                {bookingsMenuOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-56 bg-surface rounded-card shadow-card border border-border py-2 z-[60]">
                                        {navigationItems.bookings.items.map((item) => {
                                            const active = isActive(item.path);
                                            return (
                                                <button
                                                    key={item.path}
                                                    onClick={() => handleNavClick(item.path)}
                                                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${active
                                                        ? 'bg-primary-light/10 text-primary font-semibold'
                                                        : 'text-text-primary hover:bg-background'
                                                        }`}
                                                >
                                                    <item.icon className="w-4 h-4" />
                                                    <span>{item.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Admin Overrides */}
                            <button
                                onClick={() => handleNavClick(navigationItems.overrides.path)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive(navigationItems.overrides.path)
                                    ? 'bg-gradient-to-r from-primary-light/20 to-primary-light/10 text-primary shadow-md font-semibold'
                                    : 'text-text-primary hover:bg-background'
                                    }`}
                            >
                                <navigationItems.overrides.icon className="w-4 h-4" />
                                <span className="text-sm font-medium">{navigationItems.overrides.label}</span>
                            </button>
                        </nav>

                        {/* Mobile Navigation - Show Dashboard only when in iframe */}
                        {isInIframe && (
                            <nav className="lg:hidden flex items-center flex-1 justify-center">
                                <button
                                    onClick={() => handleNavClick(navigationItems.dashboard.path)}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${isActive(navigationItems.dashboard.path)
                                        ? 'bg-gradient-to-r from-primary-light/20 to-primary-light/10 text-primary shadow-md font-semibold'
                                        : 'text-text-primary hover:bg-background'
                                        }`}
                                >
                                    <navigationItems.dashboard.icon className="w-5 h-5" />
                                    <span className="text-sm font-medium">{navigationItems.dashboard.label}</span>
                                </button>
                            </nav>
                        )}

                        {/* Right side - User Profile Dropdown */}
                        <div className="flex items-center space-x-4">
                            {isAdmin && (
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        className="flex items-center space-x-2 px-3 py-2 rounded-button hover:bg-background transition-colors"
                                    >
                                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm font-semibold">
                                                {user?.first_name?.[0] || user?.email?.[0] || 'A'}
                                            </span>
                                        </div>
                                        <div className="hidden lg:flex flex-col items-start">
                                            <span className="text-sm font-medium text-text-primary">
                                                {user?.first_name || user?.username || 'Admin'}
                                            </span>
                                            {user?.email && user?.first_name && (
                                                <span className="text-xs text-text-secondary">{user.email}</span>
                                            )}
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {dropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-64 bg-surface rounded-card shadow-card border border-border py-2 z-[60] max-h-[calc(100vh-80px)] overflow-y-auto">
                                            {/* User Info Section */}
                                            <div className="px-4 py-3 border-b border-border">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                                        <span className="text-white text-sm font-semibold">
                                                            {user?.first_name?.[0] || user?.email?.[0] || 'A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-text-primary truncate">
                                                            {user?.first_name || user?.username || 'Admin'}
                                                        </p>
                                                        <p className="text-xs text-text-secondary truncate">
                                                            {user?.email || ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Navigation Items - Mobile Only */}
                                            <div className="lg:hidden py-1 border-b border-border">
                                                {/* Manage Section */}
                                                <div className="px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                                    {navigationItems.manage.label}
                                                </div>
                                                {navigationItems.manage.items.map((item) => {
                                                    const active = isActive(item.path);
                                                    return (
                                                        <button
                                                            key={item.path}
                                                            onClick={() => handleNavClick(item.path)}
                                                            className={`w-full flex items-center space-x-3 px-4 py-2 pl-8 text-sm transition-colors ${active
                                                                ? 'bg-primary-light/10 text-primary font-semibold'
                                                                : 'text-text-primary hover:bg-background'
                                                                }`}
                                                        >
                                                            <item.icon className="w-4 h-4" />
                                                            <span>{item.label}</span>
                                                        </button>
                                                    );
                                                })}

                                                {/* Bookings Section */}
                                                <div className="px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider mt-2">
                                                    {navigationItems.bookings.label}
                                                </div>
                                                {navigationItems.bookings.items.map((item) => {
                                                    const active = isActive(item.path);
                                                    return (
                                                        <button
                                                            key={item.path}
                                                            onClick={() => handleNavClick(item.path)}
                                                            className={`w-full flex items-center space-x-3 px-4 py-2 pl-8 text-sm transition-colors ${active
                                                                ? 'bg-primary-light/10 text-primary font-semibold'
                                                                : 'text-text-primary hover:bg-background'
                                                                }`}
                                                        >
                                                            <item.icon className="w-4 h-4" />
                                                            <span>{item.label}</span>
                                                        </button>
                                                    );
                                                })}

                                                {/* Admin Overrides */}
                                                <button
                                                    onClick={() => handleNavClick(navigationItems.overrides.path)}
                                                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors mt-2 ${isActive(navigationItems.overrides.path)
                                                        ? 'bg-primary-light/10 text-primary font-semibold'
                                                        : 'text-text-primary hover:bg-background'
                                                        }`}
                                                >
                                                    <navigationItems.overrides.icon className="w-4 h-4" />
                                                    <span>{navigationItems.overrides.label}</span>
                                                </button>
                                            </div>

                                            {/* User Menu Items */}
                                            <div className="py-1">
                                                <button
                                                    onClick={() => {
                                                        navigate('/portal');
                                                        setDropdownOpen(false);
                                                    }}
                                                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-text-primary hover:bg-background transition-colors"
                                                >
                                                    <Home className="w-4 h-4" />
                                                    <span>Switch to User Side</span>
                                                </button>
                                                {isSuperadmin && (
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
                                                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
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
                                    <div className="hidden md:flex items-center space-x-2 text-sm text-text-secondary">
                                        <User className="w-4 h-4" />
                                        <span>{user?.first_name || user?.username || 'User'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="min-h-[calc(100vh-64px)]">
                <div className="px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8 pt-4 md:pt-6 w-full">
                    {/* Page Title */}
                    <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-6">
                        {getPageTitle()}
                    </h1>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default AdminLayout;
