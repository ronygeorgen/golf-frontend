import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getBookings, updateBookingStatus, adminCancelBooking } from '../store/slices/adminSlice';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import Button from './ui/Button';
import Badge from './ui/Badge';

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

    const getStatusBadge = (status) => {
        const statusMap = {
            confirmed: 'confirmed',
            completed: 'completed',
            cancelled: 'cancelled',
            no_show: 'no_show'
        };
        return statusMap[status] || 'pending';
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
        <div>
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <select 
                            value={filter} 
                            onChange={(e) => {
                                setFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="all">All Bookings</option>
                            <option value="today">Today</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        
                        <div className="flex flex-col sm:flex-row gap-2 flex-1">
                            <input
                                type="date"
                                value={dateRange.start_date}
                                onChange={(e) => {
                                    setDateRange({...dateRange, start_date: e.target.value});
                                    setPage(1);
                                }}
                            />
                            <input
                                type="date"
                                value={dateRange.end_date}
                                onChange={(e) => {
                                    setDateRange({...dateRange, end_date: e.target.value});
                                    setPage(1);
                                }}
                            />
                            <Button 
                                onClick={handleDateFilterChange}
                                variant="primary"
                            >
                                Apply
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Bookings Table */}
                {loading ? (
                    <TableSkeleton rows={5} cols={8} />
                ) : (
                    <div className="bg-surface rounded-card shadow-card overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
                            <span className="text-sm font-medium text-text-primary">Booking Type</span>
                            <div className="inline-flex rounded-full border border-border bg-surface shadow-sm text-xs font-medium">
                                {['all', 'simulator', 'coaching'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            setBookingType(type);
                                            setPage(1);
                                        }}
                                        className={`px-3 py-1 rounded-full transition ${
                                            bookingType === type
                                                ? 'bg-primary text-white'
                                                : 'text-text-secondary hover:bg-background'
                                        }`}
                                    >
                                        {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {bookings.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-text-secondary text-lg">No bookings found.</p>
                            </div>
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
                                        Resource
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Package Info
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Price
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {bookings.map(booking => {
                                    const { date, time } = formatDateTime(booking.start_time);
                                    return (
                                        <tr key={booking.id} className="hover:bg-background">
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-text-primary">
                                                    {booking.client_details?.first_name} {booking.client_details?.last_name}
                                                </div>
                                                <div className="text-sm text-text-secondary">
                                                    {booking.client_details?.phone}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <Badge status={booking.booking_type === 'simulator' ? 'pending' : 'personal'}>
                                                    {booking.booking_type}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm text-text-primary">{date}</div>
                                                <div className="text-sm text-text-secondary">{time}</div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                                                {booking.duration_minutes} min
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
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
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                                                {booking.booking_type === 'coaching' && booking.package_purchase_details ? (
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-text-primary">
                                                            {booking.package_purchase_details.purchase_name || booking.package_details?.title || 'N/A'}
                                                        </div>
                                                        <div>
                                                            <Badge status={
                                                                booking.purchase_type_label === 'Personal' ? 'personal' :
                                                                booking.purchase_type_label === 'Gifted' ? 'pending' :
                                                                booking.purchase_type_label === 'Organization' ? 'confirmed' :
                                                                'pending'
                                                            }>
                                                                {booking.purchase_type_label || 'Personal'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-text-secondary/50">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                                                {renderPrice(booking)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <select
                                                    value={booking.status}
                                                    onChange={(e) => handleStatusUpdate(booking, e.target.value)}
                                                    className="text-xs font-semibold rounded-badge px-2 py-1 border border-border focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="confirmed">Confirmed</option>
                                                    <option value="completed">Completed</option>
                                                    <option value="cancelled">Cancelled</option>
                                                    <option value="no_show">No Show</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex gap-2">
                                                    <button 
                                                        className="text-primary hover:text-primary-light transition-colors"
                                                        onClick={() => {/* View details */}}
                                                    >
                                                        View
                                                    </button>
                                                    <button 
                                                        className="text-accent hover:text-accent-dark transition-colors"
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
                    <p className="text-sm text-text-secondary">
                        Showing{' '}
                        {totalCount === 0
                            ? '0'
                            : `${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, totalCount)}`}
                        {' '}of {totalCount} bookings
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={page <= 1}
                            variant="secondary"
                            className="px-3 py-1"
                        >
                            Previous
                        </Button>
                        <span className="text-sm font-medium text-text-primary">
                            Page {pagination?.page || page} of {totalPages}
                        </span>
                        <Button
                            onClick={() => setPage((prev) => prev + 1)}
                            disabled={page >= totalPages}
                            variant="secondary"
                            className="px-3 py-1"
                        >
                            Next
                        </Button>
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
