import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getCoachingSessionsByCoach, getCalendarBookings } from '../store/slices/bookingSlice';
import { useNavigate } from 'react-router-dom';
import { BookingCardSkeleton } from '../components/skeletons/SkeletonLoader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

function StaffCoachingSessions() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { user } = useAppSelector((state) => state.auth);
    const { upcomingBookings, completedBookings, loading, upcomingPagination, completedPagination } = useAppSelector((state) => state.booking);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState('upcoming'); // 'upcoming' or 'completed'

    const isUpcoming = filter === 'upcoming';
    const currentBookings = isUpcoming ? upcomingBookings : completedBookings;
    const currentPagination = isUpcoming ? upcomingPagination : completedPagination;
    const totalPages = currentPagination?.totalPages || 1;
    const pageSize = currentPagination?.pageSize || 5;
    const totalCount = currentPagination?.count ?? currentBookings.length;

    useEffect(() => {
        // Fetch coaching sessions where current user is the coach
        dispatch(getCoachingSessionsByCoach({ page, filter }));
    }, [dispatch, page, filter]);

    useEffect(() => {
        if (page > totalPages && totalPages > 0) {
            setPage(totalPages);
        }
    }, [totalPages]);

    useEffect(() => {
        // Reset to page 1 when filter changes
        setPage(1);
    }, [filter]);

    const handleViewCalendar = () => {
        navigate('/coaching-sessions/calendar');
    };

    const handleSubmitFeedback = (clientEmail) => {
        const baseUrl = 'https://api.leadconnectorhq.com/widget/form/BC73Onhy5eT0yKDPHKln';
        const url = clientEmail ? `${baseUrl}?email=${encodeURIComponent(clientEmail)}` : baseUrl;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 w-full">
            <div className="w-full">
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                                My Coaching Sessions
                            </h1>
                            <p className="text-text-secondary mt-2">
                                View your coaching sessions where clients have booked you as their coach
                            </p>
                        </div>
                        <Button
                            onClick={handleViewCalendar}
                            variant="primary"
                        >
                            View on Calendar
                        </Button>
                    </div>
                </div>

                <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                        <h2 className="text-xl font-bold text-text-primary">
                            {isUpcoming ? 'Upcoming' : 'Completed'} Coaching Sessions
                        </h2>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setFilter('upcoming')}
                                variant={isUpcoming ? 'primary' : 'secondary'}
                                className="px-4 py-2"
                            >
                                Upcoming
                            </Button>
                            <Button
                                onClick={() => setFilter('completed')}
                                variant={!isUpcoming ? 'primary' : 'secondary'}
                                className="px-4 py-2"
                            >
                                Completed
                            </Button>
                        </div>
                    </div>
                    {loading ? (
                        <BookingCardSkeleton count={3} />
                    ) : currentBookings.length > 0 ? (
                        <div className="space-y-4">
                            {currentBookings.map(booking => (
                                <div key={booking.id} className="border border-border rounded-card p-4 hover:shadow-card-hover transition duration-200 bg-surface">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-text-primary">
                                                Coaching Session
                                            </h3>
                                            <div className="mt-2 space-y-1">
                                                <p className="text-sm text-text-secondary">
                                                    <span className="font-medium">Client:</span> {booking.client_details?.first_name} {booking.client_details?.last_name} ({booking.client_details?.email})
                                                </p>
                                                <p className="text-sm text-text-secondary">
                                                    <span className="font-medium">Date:</span> {new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                </p>
                                                <p className="text-sm text-text-secondary">
                                                    <span className="font-medium">Start:</span> {new Date(booking.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                </p>
                                                <p className="text-sm text-text-secondary">
                                                    <span className="font-medium">End:</span> {new Date(booking.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                </p>
                                                <p className="text-sm text-text-secondary">
                                                    <span className="font-medium">Duration:</span> {booking.duration_minutes >= 60 ? `${Math.floor(booking.duration_minutes / 60)}h ${booking.duration_minutes % 60 > 0 ? booking.duration_minutes % 60 + 'min' : ''}`.trim() : `${booking.duration_minutes}min`}
                                                </p>
                                                {booking.package_details && (
                                                    <p className="text-sm text-text-secondary">
                                                        <span className="font-medium">Package:</span> {booking.package_details.title}
                                                    </p>
                                                )}
                                                {booking.package_purchase_details && booking.purchase_type_label && (
                                                    <p className="text-sm">
                                                        <Badge status={
                                                            booking.purchase_type_label === 'Personal' ? 'personal' :
                                                            booking.purchase_type_label === 'Gifted' ? 'pending' :
                                                            booking.purchase_type_label === 'Organization' ? 'confirmed' :
                                                            'pending'
                                                        }>
                                                            {booking.purchase_type_label}
                                                        </Badge>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Badge status={
                                                booking.status === 'confirmed' ? 'confirmed' :
                                                booking.status === 'pending' ? 'pending' :
                                                booking.status === 'completed' ? 'completed' :
                                                'no_show'
                                            }>
                                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                            </Badge>
                                            {!isUpcoming && (booking.status === 'completed' || new Date(booking.start_time) < new Date()) && (
                                                <Button
                                                    onClick={() => handleSubmitFeedback(booking.client_details?.email)}
                                                    variant="primary"
                                                    className="mt-2 text-xs px-3 py-1 whitespace-nowrap"
                                                >
                                                    Submit Feedback
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-text-secondary">No {isUpcoming ? 'upcoming' : 'completed'} coaching sessions</p>
                        </div>
                    )}
                    {!loading && (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-6">
                            <p className="text-sm text-text-secondary">
                                Showing{' '}
                                {totalCount === 0
                                    ? '0'
                                    : `${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, totalCount)}`} of {totalCount} sessions
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
                                    Page {page} of {totalPages}
                                </span>
                                <Button
                                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={page >= totalPages}
                                    variant="secondary"
                                    className="px-3 py-1"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default StaffCoachingSessions;



