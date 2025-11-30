import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getDashboardStats, getRecentBookings } from '../store/slices/adminSlice';
import { StatsSkeleton, TableSkeleton } from '../components/skeletons/SkeletonLoader';
import Badge from '../components/ui/Badge';

function AdminDashboard() {
    const dispatch = useAppDispatch();
    const { stats, recentBookings, loading } = useAppSelector((state) => state.admin.dashboard);

    useEffect(() => {
        dispatch(getDashboardStats());
        dispatch(getRecentBookings());
    }, [dispatch]);

    const getStatusBadge = (status) => {
        const statusMap = {
            confirmed: 'confirmed',
            completed: 'completed',
            cancelled: 'cancelled',
            no_show: 'no_show'
        };
        return statusMap[status] || 'pending';
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
                        <div className="bg-surface rounded-card shadow-card p-6 border-l-4 border-primary">
                            <h3 className="text-sm font-medium text-text-secondary mb-2">Total Bookings</h3>
                            <p className="text-3xl font-bold text-text-primary">{stats?.total_bookings || 0}</p>
                        </div>
                        <div className="bg-surface rounded-card shadow-card p-6 border-l-4 border-status-confirmed-text">
                            <h3 className="text-sm font-medium text-text-secondary mb-2">Today's Bookings</h3>
                            <p className="text-3xl font-bold text-text-primary">{stats?.today_bookings || 0}</p>
                        </div>
                        <div className="bg-surface rounded-card shadow-card p-6 border-l-4 border-status-personal-text">
                            <h3 className="text-sm font-medium text-text-secondary mb-2">Active Simulators</h3>
                            <p className="text-3xl font-bold text-text-primary">{stats?.active_simulators || 0}</p>
                        </div>
                        <div className="bg-surface rounded-card shadow-card p-6 border-l-4 border-accent">
                            <h3 className="text-sm font-medium text-text-secondary mb-2">Total Revenue</h3>
                            <p className="text-3xl font-bold text-text-primary">${stats?.total_revenue || 0}</p>
                        </div>
                    </div>

                    {/* Recent Bookings */}
                    <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6 md:mb-8">
                        <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-4 md:mb-6">
                            Recent Bookings
                        </h2>
                        {recentBookings.length === 0 ? (
                            <p className="text-text-secondary text-center py-8">No recent bookings</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-background">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Client
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Date & Time
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Duration
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-surface divide-y divide-border">
                                        {recentBookings.map(booking => (
                                            <tr key={booking.id} className="hover:bg-background">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                                                    {booking.client_details?.first_name} {booking.client_details?.last_name}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <Badge status={booking.booking_type === 'simulator' ? 'pending' : 'personal'}>
                                                        {booking.booking_type}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                                                    {new Date(booking.start_time).toLocaleDateString()} {' '}
                                                    {new Date(booking.start_time).toLocaleTimeString()}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                                                    {booking.duration_minutes} min
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <Badge status={getStatusBadge(booking.status)}>
                                                        {booking.status}
                                                    </Badge>
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
