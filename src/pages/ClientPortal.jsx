import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getUpcomingBookings } from '../store/slices/bookingSlice';
import { useNavigate } from 'react-router-dom';
import { BookingCardSkeleton } from '../components/skeletons/SkeletonLoader';

function ClientPortal() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { user } = useAppSelector((state) => state.auth);
    const { upcomingBookings, loading } = useAppSelector((state) => state.booking);

    useEffect(() => {
        dispatch(getUpcomingBookings());
    }, [dispatch]);

    return (
        <div className="p-4 md:p-6 lg:p-8 w-full">
            <div className="w-full">
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                            Welcome, {user?.first_name || user?.email}!
                        </h1>
                        <p className="text-gray-600 mt-2">Manage your bookings and profile</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Bookings</h2>
                            {loading ? (
                                <BookingCardSkeleton count={3} />
                            ) : upcomingBookings.length > 0 ? (
                                <div className="space-y-4">
                                    {upcomingBookings.map(booking => (
                                        <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900">
                                                        {booking.booking_type === 'simulator' ? 'Simulator Session' : 'Coaching Session'}
                                                    </h3>
                                                    <div className="mt-2 space-y-1">
                                                        <p className="text-sm text-gray-600">
                                                            <span className="font-medium">Date:</span> {new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            <span className="font-medium">Start:</span> {new Date(booking.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            <span className="font-medium">End:</span> {new Date(booking.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            <span className="font-medium">Duration:</span> {booking.duration_minutes >= 60 ? `${Math.floor(booking.duration_minutes / 60)}h ${booking.duration_minutes % 60 > 0 ? booking.duration_minutes % 60 + 'min' : ''}`.trim() : `${booking.duration_minutes}min`}
                                                        </p>
                                                        {booking.booking_type === 'simulator' && booking.simulator_details && (
                                                            <p className="text-sm text-gray-500">
                                                                <span className="font-medium">Bay:</span> {booking.simulator_details.bay_number} - {booking.simulator_details.name}
                                                            </p>
                                                        )}
                                                        {booking.booking_type === 'coaching' && booking.coach_details && (
                                                            <p className="text-sm text-gray-500">
                                                                <span className="font-medium">Coach:</span> {booking.coach_details.first_name} {booking.coach_details.last_name}
                                                            </p>
                                                        )}
                                                        {booking.booking_type === 'coaching' && booking.package_details && (
                                                            <p className="text-sm text-gray-500">
                                                                <span className="font-medium">Package:</span> {booking.package_details.title}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ml-4 ${
                                                    booking.status === 'confirmed' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : booking.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : booking.status === 'completed'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">No upcoming bookings</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                            <div className="space-y-2">
                                <button
                                    onClick={() => navigate('/booking')}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                                >
                                    Book New Session
                                </button>
                                <button
                                    onClick={() => navigate('/calendar')}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <span>View My Calendar</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ClientPortal;

