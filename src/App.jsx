import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { getProfile, autoLogin } from './store/slices/authSlice';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import GuestLanding from './pages/GuestLanding';
import PaymentSuccess from './pages/PaymentSuccess';
import GuestCoachingBooking from './pages/GuestCoachingBooking';
import Booking from './pages/Booking';
import ClientPortal from './pages/ClientPortal';
import AdminDashboard from './pages/AdminDashboard';
import BookingManagement from './components/BookingManagement';
import StaffManagement from './components/StaffManagement';
import StaffAvailability from './components/StaffAvailability';
import SimulatorManagement from './components/SimulatorManagement';
import SimulatorAvailability from './components/SimulatorAvailability';
import PackageManagement from './components/PackageManagement';
import SimulatorPackageManagement from './components/SimulatorPackageManagement';
import UserManagement from './components/UserManagement';
import CalendarView from './components/CalendarView';
import AdminLayout from './components/AdminLayout';
import UserLayout from './components/UserLayout';
import AdminOverrides from './components/AdminOverrides';
import SpecialEventsManagement from './components/SpecialEventsManagement';
import ClosedDaysManagement from './components/ClosedDaysManagement';
import GHLLocationManagement from './components/GHLLocationManagement';
import EventRegistrations from './pages/EventRegistrations';
import Packages from './pages/Packages';
import SpecialEvents from './pages/SpecialEvents';
import PersonalPurchases from './pages/PersonalPurchases';
import OrganizationPurchases from './pages/OrganizationPurchases';
import TransferSessions from './pages/TransferSessions';
import StaffCoachingSessions from './pages/StaffCoachingSessions';
import StaffCoachingSessionsAdmin from './pages/StaffCoachingSessionsAdmin';
import StaffCoachingSessionsCalendar from './pages/StaffCoachingSessionsCalendar';
import StaffCoachingSessionsCalendarAdmin from './pages/StaffCoachingSessionsCalendarAdmin';
import StaffReferrals from './pages/StaffReferrals';
import Profile from './pages/Profile';
import MemberList from './pages/MemberList';

function ProtectedRoute({ children, allowedRoles }) {
    const dispatch = useAppDispatch();
    const { user, token, loading } = useAppSelector((state) => state.auth);
    
    // Fetch fresh user profile if token exists but user data might be stale
    // Only check once on mount, not on every user update
    useEffect(() => {
        if (token && (!user || !user.hasOwnProperty('is_superuser') || !user.role)) {
            dispatch(getProfile());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]); // Only depend on token, not user - to avoid infinite loop
    
    // Show loading only if we don't have a user yet (initial load)
    // Don't show loading if user exists - let individual components handle their own loading states
    // This prevents the global loader from showing during profile updates
    if (loading && !user) {
        return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-600">Loading...</div></div>;
    }
    
    if (!user || !token) {
        return <Navigate to="/guest" />;
    }
    
    if (allowedRoles) {
        // Check if user has the required role OR is a superuser (for backward compatibility)
        const userRole = user.role || '';
        const hasRole = userRole && allowedRoles.includes(userRole);
        const isSuperuser = user.is_superuser === true; // Explicitly check for true
        
        // Debug logging (remove in production)
        if (allowedRoles.includes('admin')) {
            console.log('Admin route check:', { 
                userRole, 
                hasRole, 
                isSuperuser, 
                user: { role: user.role, is_superuser: user.is_superuser } 
            });
        }
        
        // Superusers can access admin routes, or users with matching role
        if (!hasRole && !(isSuperuser && allowedRoles.includes('admin'))) {
            return <Navigate to="/unauthorized" />;
        }
    }
    
    return children;
}

// Landing page redirect component - redirects staff to coaching-sessions, others to portal
function LandingRedirect() {
    const { user, loading } = useAppSelector((state) => state.auth);
    const navigate = useNavigate();
    
    useEffect(() => {
        console.log('LandingRedirect - useEffect triggered', { 
            loading, 
            hasUser: !!user, 
            userRole: user?.role,
            userObject: user 
        });
        
        // Wait for loading to complete and user to be available with role
        if (!loading && user && user.role) {
            const isStaff = user.role === 'staff';
            const isAdmin = user.role === 'admin' || user.is_superuser === true;
            const redirectPath = (isStaff || isAdmin) ? "/coaching-sessions" : "/portal";
            console.log('LandingRedirect - User role:', user.role, 'isStaff:', isStaff, 'isAdmin:', isAdmin, 'Redirecting to:', redirectPath);
            navigate(redirectPath, { replace: true });
        } else if (!loading && user && !user.role) {
            console.warn('LandingRedirect - User exists but no role property found!', user);
        }
    }, [user, loading, navigate]);
    
    // Show loading while waiting for user data or redirect
    if (loading || !user || !user.role) {
        return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-600">Loading...</div></div>;
    }
    
    // Fallback - should not reach here if useEffect works
    const isStaff = user.role === 'staff';
    const isAdmin = user.role === 'admin' || user.is_superuser === true;
    return <Navigate to={(isStaff || isAdmin) ? "/coaching-sessions" : "/portal"} replace />;
}

function AppContent() {
    const dispatch = useAppDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, token } = useAppSelector((state) => state.auth);
    
    // Check for email query parameter and auto-login if admin
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const email = searchParams.get('email');
        
        if (email) {
            if (!token) {
                // Only attempt auto-login if not already logged in
                dispatch(autoLogin(email)).then((result) => {
                    if (autoLogin.fulfilled.match(result)) {
                        // Auto-login successful, redirect to home page
                        navigate('/', { replace: true });
                    } else {
                        // Auto-login failed (user not admin or not found)
                        console.warn('Auto-login failed:', result.payload?.error || 'Unknown error');
                        // Remove email param even on failure
                        searchParams.delete('email');
                        const newSearch = searchParams.toString();
                        const newUrl = newSearch 
                            ? `${location.pathname}?${newSearch}` 
                            : location.pathname;
                        navigate(newUrl, { replace: true });
                    }
                });
            } else {
                // Already logged in, just remove email param from URL
                searchParams.delete('email');
                const newSearch = searchParams.toString();
                const newUrl = newSearch 
                    ? `${location.pathname}?${newSearch}` 
                    : location.pathname;
                navigate(newUrl, { replace: true });
            }
        }
    }, [location.search, dispatch, navigate, token]);
    
    // Fetch fresh user profile on app load if user exists but data might be stale
    // This is handled by ProtectedRoute now, so we can remove this duplicate
    // useEffect(() => {
    //     if (token && user && !user.hasOwnProperty('is_superuser')) {
    //         dispatch(getProfile());
    //     }
    // }, []); // Only run on mount
    
    return (
        <Routes>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/guest-booking" element={<GuestCoachingBooking />} />
            
            {/* Guest Landing Page - for non-logged-in users */}
            <Route 
                path="/guest" 
                element={
                    !user || !token ? <GuestLanding /> : <Navigate to="/" replace />
                } 
            />
            
            {/* User Routes with UserLayout */}
            <Route 
                path="/" 
                element={
                    <ProtectedRoute>
                        <UserLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<LandingRedirect />} />
                <Route path="portal" element={<ClientPortal />} />
                <Route path="booking" element={<Booking />} />
                <Route path="calendar" element={<CalendarView isUserView={true} />} />
                <Route path="coaching-sessions" element={<StaffCoachingSessions />} />
                <Route path="coaching-sessions/calendar" element={<StaffCoachingSessionsCalendar />} />
                <Route path="packages" element={<Packages />} />
                <Route path="special-events" element={<SpecialEvents />} />
                <Route path="purchases/personal" element={<PersonalPurchases />} />
                <Route path="purchases/organizations" element={<OrganizationPurchases />} />
                <Route path="transfers/sessions" element={<TransferSessions />} />
                <Route path="profile" element={<Profile />} />
                <Route path="member-list" element={<MemberList />} />
            </Route>

            {/* Admin Routes with AdminLayout */}
            <Route 
                path="/admin" 
                element={
                    <ProtectedRoute allowedRoles={['admin', 'staff']}>
                        <AdminLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="staff" element={<StaffManagement />} />
                <Route path="staff/:id/availability" element={<StaffAvailability />} />
                <Route path="staff/:id/coaching-sessions" element={<StaffCoachingSessionsAdmin />} />
                <Route path="staff/:id/coaching-sessions/calendar" element={<StaffCoachingSessionsCalendarAdmin />} />
                <Route path="staff/:id/referrals" element={<StaffReferrals />} />
                <Route path="simulators" element={<SimulatorManagement />} />
                <Route path="simulators/:id/availability" element={<SimulatorAvailability />} />
                <Route path="packages" element={<PackageManagement />} />
                <Route path="simulator-packages" element={<SimulatorPackageManagement />} />
                <Route path="special-events" element={<SpecialEventsManagement />} />
                <Route path="special-events/:eventId/registrations" element={<EventRegistrations />} />
                <Route path="closed-days" element={<ClosedDaysManagement />} />
                <Route path="ghl-locations" element={<GHLLocationManagement />} />
                <Route path="bookings" element={<BookingManagement />} />
                <Route path="calendar" element={<CalendarView />} />
                <Route path="overrides" element={<AdminOverrides />} />
            </Route>

            <Route path="/unauthorized" element={<div className="min-h-screen flex items-center justify-center"><div className="text-red-500 text-xl">Unauthorized Access</div></div>} />
        </Routes>
    );
}

function App() {
    return (
        <Router>
            <div className="App">
                <AppContent />
            </div>
        </Router>
    );
}

export default App;
