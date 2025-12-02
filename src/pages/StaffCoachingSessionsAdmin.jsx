import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getCoachingSessionsByCoach } from '../store/slices/bookingSlice';
import { useParams, useNavigate } from 'react-router-dom';
import { BookingCardSkeleton } from '../components/skeletons/SkeletonLoader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

function StaffCoachingSessionsAdmin() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const { upcomingBookings, loading, upcomingPagination } = useAppSelector((state) => state.booking);
    const [page, setPage] = useState(1);
    const [staffName, setStaffName] = useState('');

    const totalPages = upcomingPagination?.totalPages || 1;
    const pageSize = upcomingPagination?.pageSize || 5;
    const totalCount = upcomingPagination?.count ?? upcomingBookings.length;

    useEffect(() => {
        if (id) {
            dispatch(getCoachingSessionsByCoach({ coachId: id, page })).then((result) => {
                // Try to get staff name from first booking if available
                if (result.payload?.results?.length > 0) {
                    const firstBooking = result.payload.results[0];
                    if (firstBooking.coach_details) {
                        setStaffName(`${firstBooking.coach_details.first_name} ${firstBooking.coach_details.last_name}`);
                    }
                }
            });
        }
    }, [dispatch, id, page]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [totalPages]);

    const handleViewCalendar = () => {
        navigate(`/admin/staff/${id}/coaching-sessions/calendar`);
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 w-full">
            <div className="w-full">
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                                {staffName ? `${staffName}'s Coaching Sessions` : 'Staff Coaching Sessions'}
                            </h1>
                            <p className="text-text-secondary mt-2">
                                View upcoming coaching sessions where clients have booked this staff member as their coach
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
                    <h2 className="text-xl font-bold text-text-primary mb-4">Upcoming Coaching Sessions</h2>
                    {loading ? (
                        <BookingCardSkeleton count={3} />
                    ) : upcomingBookings.length > 0 ? (
                        <div className="space-y-4">
                            {upcomingBookings.map(booking => (
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
                                        <div className="flex flex-col items-end gap-2 w-40">
                                            <Badge status={
                                                booking.status === 'confirmed' ? 'confirmed' :
                                                booking.status === 'pending' ? 'pending' :
                                                booking.status === 'completed' ? 'completed' :
                                                'no_show'
                                            }>
                                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-text-secondary">No upcoming coaching sessions for this staff member</p>
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

export default StaffCoachingSessionsAdmin;

