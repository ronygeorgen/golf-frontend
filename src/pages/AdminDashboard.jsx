import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getDashboardStats, getRecentBookings } from '../store/slices/adminSlice';
import { StatsSkeleton, TableSkeleton } from '../components/skeletons/SkeletonLoader';

function AdminDashboard() {
    const dispatch = useAppDispatch();
    const { stats, recentBookings, loading } = useAppSelector((state) => state.admin.dashboard);

    useEffect(() => {
        dispatch(getDashboardStats());
        dispatch(getRecentBookings());
    }, [dispatch]);

    const getStatusColor = (status) => {
        const colors = {
            confirmed: 'bg-green-100 text-green-800',
            completed: 'bg-blue-100 text-blue-800',
            cancelled: 'bg-red-100 text-red-800',
            no_show: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getTypeColor = (type) => {
        return type === 'simulator' 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-indigo-100 text-indigo-800';
    };

    return (
        <div className="max-w-7xl mx-auto">
            {loading ? (
                <>
                    <StatsSkeleton count={4} />
                    <div className="mt-6 md:mt-8">
                        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6 md:mb-8">
                            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-4 md:mb-6"></div>
                            <TableSkeleton rows={5} cols={5} />
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
                        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Bookings</h3>
                            <p className="text-3xl font-bold text-gray-900">{stats?.total_bookings || 0}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                            <h3 className="text-sm font-medium text-gray-600 mb-2">Today's Bookings</h3>
                            <p className="text-3xl font-bold text-gray-900">{stats?.today_bookings || 0}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                            <h3 className="text-sm font-medium text-gray-600 mb-2">Active Simulators</h3>
                            <p className="text-3xl font-bold text-gray-900">{stats?.active_simulators || 0}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
                            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Revenue</h3>
                            <p className="text-3xl font-bold text-gray-900">${stats?.total_revenue || 0}</p>
                        </div>
                    </div>

                    {/* Recent Bookings */}
                    <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6 md:mb-8">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
                            Recent Bookings
                        </h2>
                        {recentBookings.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No recent bookings</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Client
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date & Time
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Duration
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {recentBookings.map(booking => (
                                            <tr key={booking.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {booking.client_details?.first_name} {booking.client_details?.last_name}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(booking.booking_type)}`}>
                                                        {booking.booking_type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(booking.start_time).toLocaleDateString()} {' '}
                                                    {new Date(booking.start_time).toLocaleTimeString()}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {booking.duration_minutes} min
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                                                        {booking.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default AdminDashboard;
