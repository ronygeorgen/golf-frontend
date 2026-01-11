import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { endpoints } from '../api/endpoints';
import { useAppSelector } from '../store/hooks';
import { utcTimeToLocal } from '../utils/timezone';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import PopupMessage from '../components/PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from '../components/ui/Toast';
import { EventCardSkeleton } from '../components/skeletons/SkeletonLoader';
import { Calendar, Clock, Users, CheckCircle, XCircle } from 'lucide-react';


function SpecialEvents() {
    const { user } = useAppSelector((state) => state.auth);
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState({});

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const response = await axios.get(endpoints.specialEvents.upcoming);
            setEvents(response.data);
        } catch (error) {
            console.error('Error fetching events:', error);
            showError('Failed to load special events');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = (eventId) => {
        openPopup({
            type: 'warning',
            title: 'Confirm Registration',
            message: 'Are you sure you want to register for this event?',
            showCancel: true,
            confirmText: 'Yes, Register',
            cancelText: 'Cancel',
            onConfirm: async () => {
                closePopup();
                setRegistering({ ...registering, [eventId]: true });
                try {
                    await axios.post(endpoints.specialEvents.register(eventId));
                    showSuccess('Successfully registered for the event!');
                    fetchEvents(); // Refresh to update registration status
                } catch (error) {
                    console.error('Error registering:', error);
                    showError(error.response?.data?.error || 'Failed to register for event');
                } finally {
                    setRegistering({ ...registering, [eventId]: false });
                }
            },
        });
    };

    const handleCancelRegistration = (eventId) => {
        openPopup({
            type: 'warning',
            title: 'Cancel Registration?',
            message: 'Are you sure you want to cancel your registration for this event?',
            showCancel: true,
            confirmText: 'Yes, Cancel',
            cancelText: 'Keep Registration',
            onConfirm: async () => {
                closePopup();
                setRegistering({ ...registering, [eventId]: true });
                try {
                    await axios.post(endpoints.specialEvents.cancelRegistration(eventId));
                    showSuccess('Registration cancelled successfully');
                    fetchEvents(); // Refresh to update registration status
                } catch (error) {
                    console.error('Error cancelling registration:', error);
                    showError(error.response?.data?.error || 'Failed to cancel registration');
                } finally {
                    setRegistering({ ...registering, [eventId]: false });
                }
            },
        });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
                <div className="mb-6">
                    <div className="h-9 w-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-2"></div>
                    <div className="h-5 w-96 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                </div>
                <EventCardSkeleton count={3} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-text-primary mb-2">Special Events</h1>
                <p className="text-text-secondary">Discover and register for upcoming special events</p>
            </div>

            {events.length === 0 ? (
                <div className="bg-surface rounded-card shadow-card border border-border p-12 text-center">
                    <Calendar className="w-16 h-16 text-text-secondary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-text-primary mb-2">No Upcoming Events</h3>
                    <p className="text-text-secondary">Check back later for new events!</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {events.map((event) => {
                        const isRegistered = event.user_registered;
                        const isShowedUp = event.user_registration_status === 'showed_up';
                        const isFull = event.is_full;
                        const canRegister = !isRegistered && !isFull && event.available_spots > 0;

                        return (
                            <div
                                key={event.id}
                                className="bg-surface rounded-card shadow-card border border-border p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h2 className="text-2xl font-bold text-text-primary mb-2">
                                                    {event.title}
                                                    {event.is_private && (
                                                        <Badge variant="warning" className="ml-2 text-xs uppercase tracking-wider">
                                                            Private
                                                        </Badge>
                                                    )}
                                                </h2>
                                            </div>
                                            {isShowedUp && (
                                                <Badge variant="success" className="flex items-center gap-1">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Attended
                                                </Badge>
                                            )}
                                            {isRegistered && !isShowedUp && (
                                                <Badge variant="success" className="flex items-center gap-1">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Registered
                                                </Badge>
                                            )}
                                        </div>

                                        {event.description && (
                                            <p className="text-text-secondary mb-4">{event.description}</p>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="flex items-center gap-2 text-text-secondary">
                                                <Calendar className="w-5 h-5" />
                                                <span className="font-medium">Date:</span>
                                                <span>{formatDate(event.next_occurrence_date || event.date)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-text-secondary">
                                                <Clock className="w-5 h-5" />
                                                <span className="font-medium">Time:</span>
                                                <span>
                                                    {utcTimeToLocal(event.start_time)} - {utcTimeToLocal(event.end_time)}
                                                </span>
                                            </div>
                                            {event.show_price && event.price && (
                                                <div className="flex items-center gap-2 text-text-secondary">
                                                    <span className="font-medium">Price:</span>
                                                    <span className="font-semibold text-text-primary">
                                                        ${parseFloat(event.price).toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-text-secondary">
                                                <Users className="w-5 h-5" />
                                                <span className="font-medium">Capacity:</span>
                                                <span>
                                                    {event.registered_count || 0} / {event.max_capacity} registered
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-text-secondary">Available Spots:</span>
                                                <Badge variant={event.available_spots > 0 ? 'success' : 'danger'}>
                                                    {event.available_spots} remaining
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {!isShowedUp && (
                                        <div className="flex flex-col gap-2 md:min-w-[180px]">
                                            {isRegistered ? (
                                                <Button
                                                    variant="danger"
                                                    onClick={() => handleCancelRegistration(event.id)}
                                                    disabled={registering[event.id]}
                                                    loading={registering[event.id]}
                                                    className="w-full py-1.5 text-xs flex items-center justify-center gap-1"
                                                >
                                                    {registering[event.id] ? (
                                                        'Cancelling...'
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-3 h-3" />
                                                            <span>Cancel Registration</span>
                                                        </>
                                                    )}
                                                </Button>
                                            ) : isFull ? (
                                                <Button variant="secondary" disabled className="w-full py-2 text-sm">
                                                    Event Full
                                                </Button>
                                            ) : canRegister ? (
                                                <Button
                                                    onClick={() => handleRegister(event.id)}
                                                    disabled={registering[event.id]}
                                                    loading={registering[event.id]}
                                                    className="w-full py-1.5 text-xs flex items-center justify-center gap-1"
                                                >
                                                    {registering[event.id] ? (
                                                        'Registering...'
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="w-3 h-3" />
                                                            <span>Register Now</span>
                                                        </>
                                                    )}
                                                </Button>
                                            ) : (
                                                <Button variant="secondary" disabled className="w-full py-2 text-sm">
                                                    Registration Closed
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={hideToast}
                />
            )}
            <PopupMessage
                open={popup.open}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                confirmText={popup.confirmText}
                cancelText={popup.cancelText}
                showCancel={popup.showCancel}
                onConfirm={popup.onConfirm}
                onClose={closePopup}
            />
        </div>
    );
}

export default SpecialEvents;

