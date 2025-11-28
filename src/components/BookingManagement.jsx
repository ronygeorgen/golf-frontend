import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getBookings, updateBookingStatus, adminCancelBooking } from '../store/slices/adminSlice';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';

function BookingManagement() {
    const dispatch = useAppDispatch();
    const { popup, openPopup, closePopup } = usePopup();
    const { list: bookings, loading, pagination } = useAppSelector((state) => state.admin.bookings);
    
    const [filter, setFilter] = useState('all');
    const [dateRange, setDateRange] = useState({
        start_date: '',
        end_date: ''
    });
    const [bookingType, setBookingType] = useState('all');
    const [page, setPage] = useState(1);
    const pageSize = pagination?.pageSize || 10;
    const totalCount = pagination?.count ?? bookings.length;
    const totalPages = pagination?.totalPages || 1;
    const handlePopupConfirm = async () => {
        const action = popup.onConfirm;
        closePopup();
        if (action) {
            await action();
        }
    };

    useEffect(() => {
        dispatch(getBookings({ filter, dateRange, page, bookingType }));
    }, [dispatch, filter, dateRange, page, bookingType]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [totalPages]);

    const handleStatusUpdate = async (booking, newStatus) => {
        if (newStatus === booking.status) {
            return;
        }
        if (newStatus === 'cancelled') {
            openPopup({
                type: 'warning',
                title: 'Cancel booking?',
                message: 'This will apply the 24-hour override and issue the appropriate credit to the client.',
                confirmText: 'Yes, cancel',
                cancelText: 'Keep booking',
                showCancel: true,
                onConfirm: async () => {
                    const result = await dispatch(adminCancelBooking({ bookingId: booking.id, forceOverride: true }));
                    if (adminCancelBooking.rejected.match(result)) {
                        openPopup({
                            type: 'error',
                            title: 'Cancellation failed',
                            message: result.payload?.error || 'Unable to cancel booking.',
                        });
                    } else {
                        dispatch(getBookings({ filter, dateRange, page, bookingType }));
                        openPopup({
                            type: 'success',
                            title: 'Booking cancelled',
                            message: result.payload?.message || 'The booking was cancelled successfully.',
                        });
                    }
                },
            });
            return;
        }
        await dispatch(updateBookingStatus({ bookingId: booking.id, status: newStatus }));
    };

    const handleDateFilterChange = () => {
        setPage(1);
        dispatch(getBookings({ filter, dateRange, page: 1, bookingType }));
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

    const formatCurrency = (value) => {
        if (value === null || value === undefined) {
            return null;
        }
        const numberValue = Number(value);
        if (Number.isNaN(numberValue)) {
            return null;
        }
        return `$${numberValue.toFixed(2)}`;
    };

    const renderPrice = (booking) => {
        if (booking.booking_type === 'simulator' && booking.uses_simulator_credit) {
            return <span className="text-purple-700 font-semibold">Credit Applied</span>;
        }
        const price = booking.total_price ?? booking.coaching_session_price;
        const formatted = formatCurrency(price);
        return formatted || '—';
    };

    return (
        <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <select 
                            value={filter} 
                            onChange={(e) => {
                                setFilter(e.target.value);
                                setPage(1);
                            }}
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
                                onChange={(e) => {
                                    setDateRange({...dateRange, start_date: e.target.value});
                                    setPage(1);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <input
                                type="date"
                                value={dateRange.end_date}
                                onChange={(e) => {
                                    setDateRange({...dateRange, end_date: e.target.value});
                                    setPage(1);
                                }}
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
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <span className="text-sm font-medium text-gray-700">Booking Type</span>
                            <div className="inline-flex rounded-full border border-gray-300 bg-white shadow-sm text-xs font-medium">
                                {['all', 'simulator', 'coaching'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            setBookingType(type);
                                            setPage(1);
                                        }}
                                        className={`px-3 py-1 rounded-full transition ${
                                            bookingType === type
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
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
                                        Package Info
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
                                                    <div className="space-y-1">
                                                        <div>{`Bay ${booking.simulator_details?.bay_number}`}</div>
                                                    </div>
                                                ) : (
                                                    booking.coach_details ? 
                                                        `${booking.coach_details.first_name} ${booking.coach_details.last_name}` :
                                                        'Any Coach'
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {booking.booking_type === 'coaching' && booking.package_purchase_details ? (
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-gray-900">
                                                            {booking.package_purchase_details.purchase_name || booking.package_details?.title || 'N/A'}
                                                        </div>
                                                        <div>
                                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                                                booking.purchase_type_label === 'Personal' ? 'bg-blue-100 text-blue-800' :
                                                                booking.purchase_type_label === 'Gifted' ? 'bg-purple-100 text-purple-800' :
                                                                booking.purchase_type_label === 'Organization' ? 'bg-green-100 text-green-800' :
                                                                booking.purchase_type_label === 'Transferred' ? 'bg-orange-100 text-orange-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                                {booking.purchase_type_label || 'Personal'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {renderPrice(booking)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <select
                                                    value={booking.status}
                                                    onChange={(e) => handleStatusUpdate(booking, e.target.value)}
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
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4">
                    <p className="text-sm text-gray-600">
                        Showing{' '}
                        {totalCount === 0
                            ? '0'
                            : `${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, totalCount)}`}
                        {' '}of {totalCount} bookings
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={page <= 1}
                            className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm font-medium text-gray-700">
                            Page {pagination?.page || page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((prev) => prev + 1)}
                            disabled={page >= totalPages}
                            className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
                <PopupMessage
                    open={popup.open}
                    type={popup.type}
                    title={popup.title}
                    message={popup.message}
                    confirmText={popup.confirmText}
                    cancelText={popup.cancelText}
                    showCancel={popup.showCancel}
                    onConfirm={popup.onConfirm ? handlePopupConfirm : closePopup}
                    onClose={closePopup}
                />
            </div>
    );
}

export default BookingManagement;
