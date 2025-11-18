import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getBookings, updateBookingStatus } from '../store/slices/adminSlice';
import { TableSkeleton } from './skeletons/SkeletonLoader';

function BookingManagement() {
    const dispatch = useAppDispatch();
    const { list: bookings, loading } = useAppSelector((state) => state.admin.bookings);
    
    const [filter, setFilter] = useState('all');
    const [dateRange, setDateRange] = useState({
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        dispatch(getBookings({ filter, dateRange }));
    }, [dispatch, filter, dateRange]);

    const handleStatusUpdate = async (bookingId, newStatus) => {
        await dispatch(updateBookingStatus({ bookingId, status: newStatus }));
        // No need to refetch - Redux already updates the state optimistically
    };

    const handleDateFilterChange = () => {
        dispatch(getBookings({ filter, dateRange }));
    };

    const formatDateTime = (dateTimeStr) => {
        const date = new Date(dateTimeStr);
        return {
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const getStatusColor = (status) => {
        const colors = {
            confirmed: 'bg-green-100 text-green-800 border-green-200',
            completed: 'bg-blue-100 text-blue-800 border-blue-200',
            cancelled: 'bg-red-100 text-red-800 border-red-200',
            no_show: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getTypeColor = (type) => {
        return type === 'simulator' 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-indigo-100 text-indigo-800';
    };

    return (
        <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <select 
                            value={filter} 
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        >
                            <option value="all" className="text-gray-900">All Bookings</option>
                            <option value="today" className="text-gray-900">Today</option>
                            <option value="upcoming" className="text-gray-900">Upcoming</option>
                            <option value="completed" className="text-gray-900">Completed</option>
                            <option value="cancelled" className="text-gray-900">Cancelled</option>
                        </select>
                        
                        <div className="flex flex-col sm:flex-row gap-2 flex-1">
                            <input
                                type="date"
                                value={dateRange.start_date}
                                onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <input
                                type="date"
                                value={dateRange.end_date}
                                onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button 
                                onClick={handleDateFilterChange}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bookings Table */}
                {loading ? (
                    <TableSkeleton rows={5} cols={8} />
                ) : (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        {bookings.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500 text-lg">No bookings found.</p>
                            </div>
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
                                        Resource
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Price
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {bookings.map(booking => {
                                    const { date, time } = formatDateTime(booking.start_time);
                                    return (
                                        <tr key={booking.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {booking.client_details?.first_name} {booking.client_details?.last_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {booking.client_details?.phone}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(booking.booking_type)}`}>
                                                    {booking.booking_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{date}</div>
                                                <div className="text-sm text-gray-500">{time}</div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {booking.duration_minutes} min
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {booking.booking_type === 'simulator' ? (
                                                    `Bay ${booking.simulator_details?.bay_number}`
                                                ) : (
                                                    booking.coach_details ? 
                                                        `${booking.coach_details.first_name} ${booking.coach_details.last_name}` :
                                                        'Any Coach'
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                ${booking.total_price}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <select
                                                    value={booking.status}
                                                    onChange={(e) => handleStatusUpdate(booking.id, e.target.value)}
                                                    className={`text-xs font-semibold rounded px-2 py-1 border ${getStatusColor(booking.status)} focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white`}
                                                >
                                                    <option value="confirmed" className="text-gray-900">Confirmed</option>
                                                    <option value="completed" className="text-gray-900">Completed</option>
                                                    <option value="cancelled" className="text-gray-900">Cancelled</option>
                                                    <option value="no_show" className="text-gray-900">No Show</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex gap-2">
                                                    <button 
                                                        className="text-blue-600 hover:text-blue-900"
                                                        onClick={() => {/* View details */}}
                                                    >
                                                        View
                                                    </button>
                                                    <button 
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                        onClick={() => {/* Edit booking */}}
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
    );
}

export default BookingManagement;
