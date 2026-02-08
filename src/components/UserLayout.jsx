import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout, getProfile } from '../store/slices/authSlice';
import { LogOut, Calendar, Home, User, ChevronDown, Settings, Users, Package, UserCheck, AlertCircle } from 'lucide-react';
import logo from '../assets/hole9golf-logo.png';
import DOBPopup from './DOBPopup';
import LiabilityWaiverPopup from './LiabilityWaiverPopup';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import { getActiveWaiver, checkWaiverAcceptance } from '../store/slices/authSlice';

function UserLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { toast, showError, hideToast } = useToast();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [packagesMenuOpen, setPackagesMenuOpen] = useState(false);
    const [coachingSessionsMenuOpen, setCoachingSessionsMenuOpen] = useState(false);
    const [showDOBPopup, setShowDOBPopup] = useState(false);
    const [showWaiverPopup, setShowWaiverPopup] = useState(false);
    const [activeWaiver, setActiveWaiver] = useState(null);
    const dropdownRef = useRef(null);
    const packagesMenuRef = useRef(null);
    const coachingSessionsMenuRef = useRef(null);

    const isAdmin = user?.role === 'admin' || user?.is_superuser === true;
    const isStaff = user?.role === 'staff';
    const isStaffOrAdmin = isStaff || isAdmin;

    const isClientBooking = location.pathname === '/booking' && location.state?.client;

    const handleNavigation = (path) => {
        if (isClientBooking && path.includes('/packages')) {
            showError('Cannot access packages while booking for a client. Please reset booking flow first.');
            return;
        }

        navigate(path);
        setDropdownOpen(false);
        setPackagesMenuOpen(false);
        setCoachingSessionsMenuOpen(false);
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
            if (packagesMenuRef.current && !packagesMenuRef.current.contains(event.target)) {
                setPackagesMenuOpen(false);
            }
            if (coachingSessionsMenuRef.current && !coachingSessionsMenuRef.current.contains(event.target)) {
                setCoachingSessionsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Check for liability waiver acceptance
    useEffect(() => {
        const checkWaiver = async () => {
            if (!user) return;
            
            const waiverPopupShown = sessionStorage.getItem('waiverPopupShown');
            if (waiverPopupShown === 'true') return; // Already shown in this session
            
            try {
                // Get active waiver
                const waiverResult = await dispatch(getActiveWaiver());
                if (getActiveWaiver.fulfilled.match(waiverResult) && waiverResult.payload.waiver) {
                    const waiver = waiverResult.payload.waiver;
                    setActiveWaiver(waiver);
                    
                    // Check if user has accepted
                    const acceptanceResult = await dispatch(checkWaiverAcceptance());
                    if (checkWaiverAcceptance.fulfilled.match(acceptanceResult)) {
                        const acceptance = acceptanceResult.payload;
                        
                        // Show popup if waiver exists and user hasn't accepted or content changed
                        if (acceptance.waiver_exists && acceptance.needs_acceptance) {
                            const timer = setTimeout(() => {
                                setShowWaiverPopup(true);
                                sessionStorage.setItem('waiverPopupShown', 'true');
                            }, 500);
                            return () => clearTimeout(timer);
                        }
                    }
                }
            } catch (error) {
                console.error('Error checking waiver:', error);
            }
        };
        
        if (user && location.pathname !== '/profile') {
            checkWaiver();
        }
    }, [user, location.pathname, dispatch]);

    // Check for missing DOB only once per session (not on every reload)
    // This should run AFTER waiver popup is handled
    useEffect(() => {
        // Don't show DOB popup if waiver popup is showing
        if (showWaiverPopup) return;
        
        // Check if we've already shown the popup in this session
        const dobPopupShown = sessionStorage.getItem('dobPopupShown');

        if (user && !user.date_of_birth && location.pathname !== '/profile' && !dobPopupShown) {
            // Small delay to ensure layout is rendered, and don't show on profile page
            const timer = setTimeout(() => {
                setShowDOBPopup(true);
                sessionStorage.setItem('dobPopupShown', 'true');
            }, 1000);
            return () => clearTimeout(timer);
        } else if (user && user.date_of_birth) {
            // Close popup if DOB is now set and clear the flag
            setShowDOBPopup(false);
            sessionStorage.removeItem('dobPopupShown');
        }
    }, [user, location.pathname, showWaiverPopup]);

    const handleLogout = async () => {
        await dispatch(logout());
        navigate('/signin');
    };

    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/portal') return 'My Portal';
        if (path === '/calendar') return 'My Calendar';
        if (path === '/booking') return 'Book a Session';
        if (path === '/packages') return 'Packages & Gifts';
        if (path === '/special-events') return 'Special Events';
        if (path === '/profile') return 'Profile';
        if (path === '/coaching-sessions' || path.startsWith('/coaching-sessions')) return 'My Coaching Sessions';
        if (path === '/member-list') return 'Member List';
        return 'Dashboard';
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-surface shadow-sm border-b border-border sticky top-0 z-50 w-full">
                <div className="max-w-full px-4 sm:px-6 lg:px-8 mx-auto">
                    <div className="flex items-center justify-between h-14 w-full">
                        {/* Left side - Logo/Title */}
                        <div className="flex items-center space-x-2 md:space-x-4">
                            <div className="bg-white p-1 rounded-md">
                                <img
                                    src={logo}
                                    alt="Hole 9 Golf Logo"
                                    className="h-10 w-auto md:h-10 object-contain"
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
                                {/* My Coaching Sessions Dropdown - Staff/Admin Only */}
                                {isStaffOrAdmin && (
                                    <div className="relative" ref={coachingSessionsMenuRef}>
                                        <button
                                            onClick={() => setCoachingSessionsMenuOpen(!coachingSessionsMenuOpen)}
                                            className={`flex items-center space-x-1 px-3 py-2 rounded-button text-sm font-medium transition-colors ${location.pathname === '/coaching-sessions' || location.pathname.startsWith('/coaching-sessions') || location.pathname === '/member-list'
                                                ? 'bg-primary-light text-white'
                                                : 'text-text-secondary hover:bg-background'
                                                }`}
                                        >
                                            <Users className="w-4 h-4" />
                                            <span>Manage</span>
                                            <ChevronDown className={`w-3 h-3 transition-transform ${coachingSessionsMenuOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* My Coaching Sessions Dropdown Menu */}
                                        {coachingSessionsMenuOpen && (
                                            <div className="absolute top-full left-0 mt-1 min-w-56 w-auto bg-surface rounded-card shadow-card border border-border py-2 z-[60] whitespace-nowrap">
                                                <button
                                                    onClick={() => handleNavigation('/coaching-sessions')}
                                                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${location.pathname === '/coaching-sessions' || (location.pathname.startsWith('/coaching-sessions') && location.pathname !== '/member-list')
                                                        ? 'bg-primary-light/10 text-primary font-semibold'
                                                        : 'text-text-primary hover:bg-background'
                                                        }`}
                                                >
                                                    <Users className="w-4 h-4" />
                                                    <span>My Coaching Sessions</span>
                                                </button>
                                                <button
                                                    onClick={() => handleNavigation('/member-list')}
                                                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${location.pathname === '/member-list'
                                                        ? 'bg-primary-light/10 text-primary font-semibold'
                                                        : 'text-text-primary hover:bg-background'
                                                        }`}
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                    <span>Member List</span>
                                                </button>
                                                {/* Button Removed */}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <button
                                    onClick={() => handleNavigation('/portal')}
                                    className={`px-3 py-2 rounded-button text-sm font-medium transition-colors ${location.pathname === '/portal'
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
                                    onClick={() => handleNavigation('/booking')}
                                    className={`px-3 py-2 rounded-button text-sm font-medium transition-colors ${location.pathname === '/booking'
                                        ? 'bg-primary-light text-white'
                                        : 'text-text-secondary hover:bg-background'
                                        }`}
                                >
                                    Book Session
                                </button>
                                <button
                                    onClick={() => handleNavigation('/calendar')}
                                    className={`px-3 py-2 rounded-button text-sm font-medium transition-colors ${location.pathname === '/calendar'
                                        ? 'bg-primary-light text-white'
                                        : 'text-text-secondary hover:bg-background'
                                        }`}
                                >
                                    <div className="flex items-center space-x-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>Calendar</span>
                                    </div>
                                </button>
                                {/* Packages Dropdown */}
                                <div className="relative" ref={packagesMenuRef}>
                                    <button
                                        onClick={() => setPackagesMenuOpen(!packagesMenuOpen)}
                                        className={`flex items-center space-x-1 px-3 py-2 rounded-button text-sm font-medium transition-colors ${location.pathname === '/packages'
                                            ? 'bg-primary-light text-white'
                                            : 'text-text-secondary hover:bg-background'
                                            }`}
                                    >
                                        <Package className="w-4 h-4" />
                                        <span>Packages</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform ${packagesMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Packages Dropdown Menu */}
                                    {packagesMenuOpen && (
                                        <div className="absolute top-full left-0 mt-1 min-w-56 w-auto bg-surface rounded-card shadow-card border border-border py-2 z-[60] whitespace-nowrap">
                                            <button
                                                onClick={() => handleNavigation('/packages?view=packages')}
                                                className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${location.pathname === '/packages' && (!location.search || location.search.includes('view=packages'))
                                                    ? 'bg-primary-light/10 text-primary font-semibold'
                                                    : 'text-text-primary hover:bg-background'
                                                    }`}
                                            >
                                                <Package className="w-4 h-4" />
                                                <span>Purchase Packages</span>
                                            </button>
                                            <button
                                                onClick={() => handleNavigation('/packages?view=purchases')}
                                                className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${location.pathname === '/packages' && location.search.includes('view=purchases')
                                                    ? 'bg-primary-light/10 text-primary font-semibold'
                                                    : 'text-text-primary hover:bg-background'
                                                    }`}
                                            >
                                                <User className="w-4 h-4" />
                                                <span>Manage Purchased Packages</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleNavigation('/special-events')}
                                    className={`px-3 py-2 rounded-button text-sm font-medium transition-colors ${location.pathname === '/special-events'
                                        ? 'bg-primary-light text-white'
                                        : 'text-text-secondary hover:bg-background'
                                        }`}
                                >
                                    Special Events
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
                                                {isStaffOrAdmin && (
                                                    <>
                                                        <button
                                                            onClick={() => handleNavigation('/coaching-sessions')}
                                                            className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${location.pathname === '/coaching-sessions' || (location.pathname.startsWith('/coaching-sessions') && location.pathname !== '/member-list')
                                                                ? 'bg-primary-light text-white font-medium'
                                                                : 'text-text-primary hover:bg-background'
                                                                }`}
                                                        >
                                                            <Users className="w-4 h-4" />
                                                            <span>My Coaching Sessions</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleNavigation('/member-list')}
                                                            className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${location.pathname === '/member-list'
                                                                ? 'bg-primary-light text-white font-medium'
                                                                : 'text-text-primary hover:bg-background'
                                                                }`}
                                                        >
                                                            <UserCheck className="w-4 h-4" />
                                                            <span>Member List</span>
                                                        </button>
                                                        {/* Button Removed */}
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleNavigation('/portal')}
                                                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${location.pathname === '/portal'
                                                        ? 'bg-primary-light text-white font-medium'
                                                        : 'text-text-primary hover:bg-background'
                                                        }`}
                                                >
                                                    <Home className="w-4 h-4" />
                                                    <span>Portal</span>
                                                </button>
                                                <button
                                                    onClick={() => handleNavigation('/booking')}
                                                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${location.pathname === '/booking'
                                                        ? 'bg-primary-light text-white font-medium'
                                                        : 'text-text-primary hover:bg-background'
                                                        }`}
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Book Session</span>
                                                </button>
                                                <button
                                                    onClick={() => handleNavigation('/calendar')}
                                                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${location.pathname === '/calendar'
                                                        ? 'bg-primary-light text-white font-medium'
                                                        : 'text-text-primary hover:bg-background'
                                                        }`}
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Calendar</span>
                                                </button>
                                                {/* Packages Dropdown for Mobile */}
                                                <div className="border-b border-border pb-2 mb-2">
                                                    <button
                                                        onClick={() => handleNavigation('/packages?view=packages')}
                                                        className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${location.pathname === '/packages' && (!location.search || location.search.includes('view=packages'))
                                                            ? 'bg-primary-light text-white font-medium'
                                                            : 'text-text-primary hover:bg-background'
                                                            }`}
                                                    >
                                                        <Package className="w-4 h-4" />
                                                        <span>Purchase Packages</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleNavigation('/packages?view=purchases')}
                                                        className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${location.pathname === '/packages' && location.search.includes('view=purchases')
                                                            ? 'bg-primary-light text-white font-medium'
                                                            : 'text-text-primary hover:bg-background'
                                                            }`}
                                                    >
                                                        <User className="w-4 h-4" />
                                                        <span>Manage Purchased Packages</span>
                                                    </button>
                                                </div>
                                                {/* Member List is already shown in the isStaffOrAdmin block above */}
                                                <button
                                                    onClick={() => handleNavigation('/special-events')}
                                                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${location.pathname === '/special-events'
                                                        ? 'bg-primary-light text-white font-medium'
                                                        : 'text-text-primary hover:bg-background'
                                                        }`}
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Special Events</span>
                                                </button>
                                            </div>

                                            {/* Admin Options */}
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleNavigation('/admin')}
                                                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-text-primary hover:bg-background transition-colors"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                    <span>Switch to Admin</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleNavigation('/profile')}
                                                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-text-primary hover:bg-background transition-colors"
                                            >
                                                <User className="w-4 h-4" />
                                                <span>Profile</span>
                                            </button>
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

            {/* Running Banner */}
            <div
                onClick={() => navigate('/special-events')}
                className="bg-blue-100 hover:bg-blue-200 text-blue-900 py-1.5 cursor-pointer overflow-hidden whitespace-nowrap sticky top-14 z-40 border-b border-blue-300/30 shadow-sm transition-colors"
            >
                <div className="animate-marquee-seamless">
                    {[1, 2, 3, 4].map((i) => (
                        <span key={i} className="px-8 font-bold text-sm md:text-base uppercase tracking-wider whitespace-nowrap flex items-center justify-center gap-2">
                            "Super Bowl Party Tonight! Come and join us!"
                        </span>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <main className="pt-0">
                <Outlet />
            </main>

            <LiabilityWaiverPopup
                isOpen={showWaiverPopup}
                onClose={() => {
                    setShowWaiverPopup(false);
                    // After waiver is accepted, check for DOB popup
                    if (user && !user.date_of_birth) {
                        const dobPopupShown = sessionStorage.getItem('dobPopupShown');
                        if (!dobPopupShown) {
                            setTimeout(() => {
                                setShowDOBPopup(true);
                                sessionStorage.setItem('dobPopupShown', 'true');
                            }, 500);
                        }
                    }
                }}
                waiver={activeWaiver}
            />
            <DOBPopup
                isOpen={showDOBPopup}
                onClose={() => {
                    setShowDOBPopup(false);
                    // Refresh user data only if DOB was actually updated
                    if (user && !user.date_of_birth) {
                        dispatch(getProfile());
                    }
                }}
                onSkip={() => {
                    setShowDOBPopup(false);
                    // Don't refresh on skip - user data hasn't changed
                }}
            />
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={hideToast}
                />
            )}
        </div>
    );
}

export default UserLayout;

