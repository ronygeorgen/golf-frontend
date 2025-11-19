import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { getProfile } from './store/slices/authSlice';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Booking from './pages/Booking';
import ClientPortal from './pages/ClientPortal';
import AdminDashboard from './pages/AdminDashboard';
import BookingManagement from './components/BookingManagement';
import StaffManagement from './components/StaffManagement';
import StaffAvailability from './components/StaffAvailability';
import SimulatorManagement from './components/SimulatorManagement';
import SimulatorAvailability from './components/SimulatorAvailability';
import PackageManagement from './components/PackageManagement';
import CalendarView from './components/CalendarView';
import AdminLayout from './components/AdminLayout';
import UserLayout from './components/UserLayout';
import AdminOverrides from './components/AdminOverrides';

function ProtectedRoute({ children, allowedRoles }) {
    const dispatch = useAppDispatch();
    const { user, token, loading } = useAppSelector((state) => state.auth);
    
    // Fetch fresh user profile if token exists but user data might be stale
    useEffect(() => {
        if (token && (!user || !user.hasOwnProperty('is_superuser'))) {
            dispatch(getProfile());
        }
    }, [token, user, dispatch]);
    
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-600">Loading...</div></div>;
    }
    
    if (!user || !token) {
        return <Navigate to="/signin" />;
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

function App() {
    const dispatch = useAppDispatch();
    const { user, token } = useAppSelector((state) => state.auth);
    
    // Fetch fresh user profile on app load if user exists but data might be stale
    useEffect(() => {
        if (token && user && !user.hasOwnProperty('is_superuser')) {
            dispatch(getProfile());
        }
    }, []); // Only run on mount
    
    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/signup" element={<SignUp />} />
                    
                    {/* User Routes with UserLayout */}
                    <Route 
                        path="/" 
                        element={
                            <ProtectedRoute>
                                <UserLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="/portal" replace />} />
                        <Route path="portal" element={<ClientPortal />} />
                        <Route path="booking" element={<Booking />} />
                        <Route path="calendar" element={<CalendarView isUserView={true} />} />
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
                        <Route path="staff" element={<StaffManagement />} />
                        <Route path="staff/:id/availability" element={<StaffAvailability />} />
                        <Route path="simulators" element={<SimulatorManagement />} />
                        <Route path="simulators/:id/availability" element={<SimulatorAvailability />} />
                        <Route path="packages" element={<PackageManagement />} />
                        <Route path="bookings" element={<BookingManagement />} />
                        <Route path="calendar" element={<CalendarView />} />
                        <Route path="overrides" element={<AdminOverrides />} />
                    </Route>

                    <Route path="/unauthorized" element={<div className="min-h-screen flex items-center justify-center"><div className="text-red-500 text-xl">Unauthorized Access</div></div>} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
