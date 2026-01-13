import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getCalendarBookings, checkClosedDate } from '../store/slices/bookingSlice';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import axios from '../api/axios';
import { endpoints } from '../api/endpoints';
import { utcTimeToLocal } from '../utils/timezone';
import Button from './ui/Button';

const localizer = momentLocalizer(moment);

function CalendarView({ isUserView = false, coachId = null, staffName = null }) {
    const dispatch = useAppDispatch();
    const { calendarEvents: events, loading: bookingsLoading } = useAppSelector((state) => state.admin?.bookings?.list ? { calendarEvents: [], ...state.booking } : state.booking); // Handle potential state structure mismatch if needed, but existing code uses state.booking
    const { user } = useAppSelector((state) => state.auth);
    const { popup, openPopup, closePopup } = usePopup();

    const [view, setView] = useState('month'); // Default to month view
    const [date, setDate] = useState(new Date());
    const [calendarType, setCalendarType] = useState('all'); // 'all', 'simulator', 'coaching', or 'special_event'
    const [showCancelledOnly, setShowCancelledOnly] = useState(false); // New state to toggle cancelled bookings

    // Special Events State
    const [specialEvents, setSpecialEvents] = useState([]);
    const [specialEventsLoading, setSpecialEventsLoading] = useState(false);

    // Reschedule State
    const [rescheduleState, setRescheduleState] = useState({
        open: false,
        booking: null,
        date: '',
        selectedSlot: null,
        loading: false,
        error: null
    });
    const [availableSlots, setAvailableSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    const canViewSpecialEvents = user && (user.role === 'admin' || user.role === 'staff' || user.is_superuser);

    // Check if user can manage bookings (Admin, Staff, or the Client of the booking)
    const canManageBooking = (booking) => {
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'staff' || user.is_superuser) return true;
        // Check if user is the client of the booking
        return booking.client?.id === user.id;
    };

    const handlePopupConfirm = async () => {
        const action = popup.onConfirm;
        closePopup();
        if (action) {
            await action();
        }
    };

    useEffect(() => {
        // Calculate date range based on current view
        let startDate, endDate;

        if (view === 'month') {
            // For month view, get start and end of the month
            startDate = moment(date).startOf('month').toDate();
            endDate = moment(date).endOf('month').toDate();
        }
        else if (view === 'day') {
            // For day view, get start and end of the day
            startDate = moment(date).startOf('day').toDate();
            endDate = moment(date).endOf('day').toDate();
        } else {
            // Default to month if view is unknown
            startDate = moment(date).startOf('month').toDate();
            endDate = moment(date).endOf('month').toDate();
        }

        if (calendarType === 'special_event' || calendarType === 'all') {
            if (canViewSpecialEvents) {
                fetchSpecialEvents(startDate, endDate);
            }
        }

        if (calendarType !== 'special_event') {
            dispatch(getCalendarBookings({
                startDate,
                endDate,
                bookingType: calendarType === 'all' ? null : calendarType,
                coachId: coachId,
                status: showCancelledOnly ? 'cancelled' : null
            }));
        }

    }, [dispatch, date, calendarType, coachId, view, showCancelledOnly]);

    // Fetch slots when reschedule date changes
    useEffect(() => {
        if (rescheduleState.open && rescheduleState.booking && rescheduleState.date) {
            fetchAvailableSlots(rescheduleState.date, rescheduleState.booking);
        }
    }, [rescheduleState.date, rescheduleState.booking, rescheduleState.open]);

    const fetchAvailableSlots = async (dateStr, booking) => {
        setSlotsLoading(true);
        setAvailableSlots([]);
        // Clear any previous errors in the reschedule modal state
        setRescheduleState(prev => ({ ...prev, error: null }));

        try {
            // First check if the date is closed
            const closedDateResult = await dispatch(checkClosedDate(dateStr)).unwrap();
            if (closedDateResult.is_closed) {
                setRescheduleState(prev => ({
                    ...prev,
                    error: `This date is closed: ${closedDateResult.closure_title || 'Closed for maintenance/holiday'}`
                }));
                setSlotsLoading(false);
                return;
            }

            let response;
            if (booking.type === 'simulator' || booking.booking_type === 'simulator') {
                response = await axios.get(endpoints.bookings.checkSimulatorAvailability, {
                    params: {
                        date: dateStr,
                        duration: booking.duration_minutes || 60,
                        simulator_count: 1 // Assuming 1 for reschedule for now
                    }
                });
            } else {
                // Coaching
                response = await axios.get(endpoints.bookings.checkCoachingAvailability, {
                    params: {
                        date: dateStr,
                        package_id: booking.package?.id,
                        coach_id: booking.coach?.id, // Keep same coach
                        duration: booking.duration_minutes
                    }
                });
            }
            if (response.data && response.data.available_slots) {
                setAvailableSlots(response.data.available_slots);
            }
        } catch (error) {
            console.error("Failed to fetch slots", error);
            // Optionally set error in state
        } finally {
            setSlotsLoading(false);
        }
    };

    const handleRescheduleConfirm = async () => {
        if (!rescheduleState.selectedSlot || !rescheduleState.booking) return;

        const bookingId = rescheduleState.booking.id;
        const slot = rescheduleState.selectedSlot;

        // Prepare payload
        const payload = {
            start_time: slot.start_time,
            end_time: slot.end_time,
            duration_minutes: slot.duration_minutes || rescheduleState.booking.duration_minutes
        };

        setRescheduleState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await axios.post(endpoints.bookings.reschedule(bookingId), payload);

            // Success
            setRescheduleState({
                open: false,
                booking: null,
                date: '',
                selectedSlot: null,
                loading: false,
                error: null
            });

            openPopup({
                type: 'success',
                title: 'Rescheduled',
                message: 'Booking has been successfully rescheduled.',
            });

            // Refresh calendar
            dispatch(getCalendarBookings({
                startDate: moment(date).startOf('month').toDate(),
                endDate: moment(date).endOf('month').toDate(),
                bookingType: calendarType === 'all' ? null : calendarType,
                coachId: coachId,
                status: showCancelledOnly ? 'cancelled' : null
            }));

        } catch (error) {
            console.error("Reschedule failed", error);
            const errorMsg = error.response?.data?.error || 'Failed to reschedule booking.';
            const isLockError = error.response?.data?.lock_applies;

            // Handle 24h lock override for admins
            if (isLockError && (user.role === 'admin' || user.is_superuser)) {
                openPopup({
                    type: 'warning',
                    title: 'Force Reschedule?',
                    message: `${errorMsg}\n\nDo you want to force reschedule this booking?`,
                    confirmText: 'Yes, Force Reschedule',
                    showCancel: true,
                    onConfirm: async () => {
                        try {
                            await axios.post(endpoints.bookings.reschedule(bookingId), { ...payload, force_override: true });
                            setRescheduleState({ open: false, booking: null, date: '', selectedSlot: null, loading: false, error: null });
                            openPopup({ type: 'success', title: 'Rescheduled', message: 'Booking rescheduled with override.' });
                            // Refresh calendar
                            dispatch(getCalendarBookings({
                                startDate: moment(date).startOf('month').toDate(),
                                endDate: moment(date).endOf('month').toDate(),
                                bookingType: calendarType === 'all' ? null : calendarType,
                                coachId: coachId,
                                status: showCancelledOnly ? 'cancelled' : null
                            }));
                        } catch (err) {
                            openPopup({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to force reschedule.' });
                        }
                    }
                });
            } else {
                setRescheduleState(prev => ({ ...prev, loading: false, error: errorMsg }));
            }
            setRescheduleState(prev => ({ ...prev, loading: false }));
        }
    };

    const handleCancelBooking = async (bookingId) => {
        // Confirmation is handled in handleSelectEvent's "Cancel" button action
        // This function performs the actual API call
        try {
            await axios.post(endpoints.bookings.cancel(bookingId));
            openPopup({
                type: 'success',
                title: 'Cancelled',
                message: 'Booking has been cancelled.',
            });
            // Refresh
            dispatch(getCalendarBookings({
                startDate: moment(date).startOf('month').toDate(),
                endDate: moment(date).endOf('month').toDate(),
                bookingType: calendarType === 'all' ? null : calendarType,
                coachId: coachId,
                status: showCancelledOnly ? 'cancelled' : null
            }));
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to cancel booking.';
            const isLockError = error.response?.data?.lock_applies;

            if (isLockError && (user.role === 'admin' || user.is_superuser)) {
                openPopup({
                    type: 'warning',
                    title: 'Force Cancel?',
                    message: `${errorMsg}\n\nDo you want to force cancel this booking?`,
                    confirmText: 'Yes, Force Cancel',
                    showCancel: true,
                    onConfirm: async () => {
                        try {
                            await axios.post(endpoints.bookings.cancel(bookingId), { force_override: true });
                            openPopup({ type: 'success', title: 'Cancelled', message: 'Booking cancelled with override.' });
                            // Refresh
                            dispatch(getCalendarBookings({
                                startDate: moment(date).startOf('month').toDate(),
                                endDate: moment(date).endOf('month').toDate(),
                                bookingType: calendarType === 'all' ? null : calendarType,
                                coachId: coachId,
                                status: showCancelledOnly ? 'cancelled' : null
                            }));
                        } catch (err) {
                            openPopup({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to force cancel.' });
                        }
                    }
                });
            } else {
                openPopup({
                    type: 'error',
                    title: 'Cancellation Failed',
                    message: errorMsg
                });
            }
        }
    };

    const fetchSpecialEvents = async (startDate, endDate) => {
        setSpecialEventsLoading(true);
        try {
            const startDateStr = moment(startDate).subtract(1, 'days').format('YYYY-MM-DD');
            const endDateStr = moment(endDate).add(1, 'days').format('YYYY-MM-DD');

            const response = await axios.get(endpoints.specialEvents.calendarEvents, {
                params: {
                    start_date: startDateStr,
                    end_date: endDateStr
                }
            });
            setSpecialEvents(response.data);
        } catch (error) {
            console.error("Failed to fetch special events", error);
        } finally {
            setSpecialEventsLoading(false);
        }
    };

    const eventStyleGetter = (event) => {
        let backgroundColor = '#475569'; // Default Slate-600

        if (event.is_special_event) {
            backgroundColor = '#F59E0B'; // Amber-500 for special events
        } else if (event.is_tpi_assessment) {
            backgroundColor = '#9333EA'; // Purple-600 for TPI assessment
        } else if (event.type === 'simulator') {
            backgroundColor = '#10B981'; // Emerald-500 for simulator
        } else if (event.type === 'coaching') {
            // Assign highly distinct colors for each staff member
            // Diverse, high-contrast colors for staff (avoiding Green, Amber, Purple, and Red)
            const coachColors = [
                '#2563EB', // Bright Blue
                '#0891B2', // Cyan
                '#4F46E5', // Indigo
                '#D946EF', // Fuchsia
                '#65A30D', // Lime
                '#0369A1', // Sky Blue
                '#7C3AED', // Violet
                '#0D9488', // Teal
                '#334155', // Slate
                '#713F12', // Brown
                '#115E59', // Dark Teal
                '#4338CA', // Blue-Indigo
            ];

            const coachId = event.coach?.id || 0;
            backgroundColor = coachColors[coachId % coachColors.length];
        }

        if (event.status === 'cancelled') {
            backgroundColor = '#DC2626'; // Red-600
        } else if (event.status === 'completed') {
            backgroundColor = '#6B7280'; // Gray-500
        }

        const baseStyle = {
            backgroundColor,
            borderRadius: '6px',
            opacity: 0.9,
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'block',
            fontSize: '0.85rem',
            fontWeight: '500'
        };

        return {
            style: baseStyle
        };
    };

    const handleSelectEvent = (event) => {
        if (event.is_special_event) {
            const details = (
                <div className="space-y-1 text-sm leading-5">
                    <p><span className="font-semibold">Title:</span> {event.original_event.title}</p>
                    <p><span className="font-semibold">Type:</span> {event.original_event.event_type.replace('_', ' ')}</p>
                    <p>
                        <span className="font-semibold">Time:</span>{' '}
                        {moment(event.start).format('MMM Do YYYY, h:mm a')} - {moment(event.end).format('h:mm a')}
                    </p>
                    <p><span className="font-semibold">Capacity:</span> {event.original_event.registered_count || 0} / {event.original_event.max_capacity}</p>
                    {event.original_event.is_private && <p className="text-amber-600 font-semibold">Private Event</p>}
                </div>
            );

            openPopup({
                type: 'info',
                title: 'Special Event Details',
                message: details,
                confirmText: 'Close',
            });
            return;
        }

        const details = (
            <div className="space-y-1 text-sm leading-5">
                {event.client && (
                    <p>
                        <span className="font-semibold">Client:</span>{' '}
                        {event.client?.first_name || 'N/A'} {event.client?.last_name || ''}
                    </p>
                )}
                <p>
                    <span className="font-semibold">Type:</span> {event.type === 'simulator' ? 'Simulator' : 'Coaching'}
                </p>
                <p>
                    <span className="font-semibold">Time:</span>{' '}
                    {moment(event.start).format('MMM Do YYYY, h:mm a')} - {moment(event.end).format('h:mm a')}
                </p>
                <p>
                    <span className="font-semibold">Status:</span> {event.status}
                </p>
                {event.type === 'simulator' ? (
                    <p>
                        <span className="font-semibold">Simulator:</span> Bay {event.simulator?.bay_number || 'N/A'}
                    </p>
                ) : (
                    <p>
                        <span className="font-semibold">Coach:</span> {event.coach?.first_name || 'Any'} {event.coach?.last_name || ''}
                    </p>
                )}
                {event.package && (
                    <p>
                        <span className="font-semibold">Package:</span> {event.package.title || 'N/A'}
                    </p>
                )}
                {event.total_price !== undefined && (
                    <p>
                        <span className="font-semibold">Price:</span> ${event.total_price || 0}
                    </p>
                )}
            </div>
        );

        openPopup({
            type: 'info',
            title: isUserView ? 'My Booking Details' : 'Booking Details',
            message: (
                <div className="flex flex-col gap-4">
                    {details}
                    {canManageBooking(event) && event.status !== 'cancelled' && event.status !== 'completed' && (
                        <div className="flex gap-2 justify-end pt-2 border-t border-border mt-2">
                            {(user.role === 'admin' || user.role === 'staff' || user.is_superuser) && (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        closePopup(); // Close details popup
                                        setRescheduleState({
                                            open: true,
                                            booking: event,
                                            date: moment(event.start).format('YYYY-MM-DD'),
                                            selectedSlot: null,
                                            loading: false,
                                            error: null
                                        });
                                    }}
                                    className="text-sm px-3 py-1"
                                >
                                    Change Time
                                </Button>
                            )}
                            <Button
                                variant="danger"
                                onClick={() => {
                                    closePopup();
                                    openPopup({
                                        type: 'warning',
                                        title: 'Cancel Booking?',
                                        message: 'Are you sure you want to cancel this booking? Credits will be refunded to the client.',
                                        confirmText: 'Yes, Cancel',
                                        showCancel: true,
                                        onConfirm: () => handleCancelBooking(event.id)
                                    });
                                }}
                                className="text-sm px-3 py-1"
                            >
                                Cancel Booking
                            </Button>
                        </div>
                    )}
                </div>
            ),
            confirmText: 'Close',
        });
    };

    const handleNavigate = (newDate) => {
        setDate(newDate);
    };

    const handleView = (newView) => {
        // Allow month and day views - week view is disabled
        if (newView === 'month' || newView === 'day') {
            setView(newView);
        } else {
            // Force month view if any other view is attempted
            setView('month');
        }
    };

    // Handle when a day slot is clicked in month view
    const handleSelectSlot = (slotInfo) => {
        if (view === 'month') {
            // Get all events for the selected day
            const dayEvents = displayedEvents.filter(event => {
                const eventDate = moment(event.start).format('YYYY-MM-DD');
                const slotDate = moment(slotInfo.start).format('YYYY-MM-DD');
                return eventDate === slotDate;
            });

            // If there are multiple bookings, show them in a modal or switch to day view
            if (dayEvents.length > 0) {
                if (dayEvents.length === 1) {
                    // Single event - show its details
                    handleSelectEvent(dayEvents[0]);
                } else {
                    // Multiple events - show all in a modal or switch to day view
                    // Option 1: Switch to day view
                    setDate(slotInfo.start);
                    setView('day');
                }
            }
        }
    };

    // Transform events for calendar - convert UTC to local time
    const transformedEvents = events
        .filter(booking => calendarType === 'all' || booking.booking_type === calendarType)
        .filter(booking => {
            // If showCancelledOnly is true, only show cancelled
            // If showCancelledOnly is false, show everything EXCEPT cancelled
            if (showCancelledOnly) {
                return booking.status === 'cancelled';
            } else {
                return booking.status !== 'cancelled';
            }
        })
        .map(booking => {
            const startTime = moment.utc(booking.start_time).local().toDate();
            const endTime = moment.utc(booking.end_time).local().toDate();

            return {
                id: booking.id,
                title: isUserView
                    ? `${booking.booking_type === 'simulator' ? 'Simulator' : 'Coaching'} - ${booking.booking_type === 'simulator' ? `Bay ${booking.simulator_details?.bay_number || ''}` : booking.coach_details ? `${booking.coach_details.first_name} ${booking.coach_details.last_name}` : 'Any Coach'}`
                    : `${booking.booking_type === 'simulator' ? 'Simulator' : 'Coaching'} - ${booking.client_details?.first_name || 'N/A'}`,
                start: startTime,
                end: endTime,
                resourceId: booking.booking_type === 'simulator' ?
                    `simulator-${booking.simulator_details?.bay_number || ''}` :
                    `coach-${booking.coach_details?.id || 'any'}`,
                type: booking.booking_type,
                client: booking.client_details,
                simulator: booking.simulator_details,
                coach: booking.coach_details,
                package: booking.package_details,
                total_price: booking.total_price,
                status: booking.status,
                duration_minutes: booking.duration_minutes,
                is_tpi_assessment: booking.is_tpi_assessment || false
            };
        });

    // Transform Special Events - convert UTC to local time
    // Match the approach used in SpecialEvents.jsx page
    const transformedSpecialEvents = specialEvents.map(event => {
        // Parse date manually to avoid UTC shift (like formatDate in SpecialEvents.jsx)
        const [year, month, day] = event.date.split('-').map(Number);

        // Convert UTC time to local time using the event date
        const startTimeLocal = utcTimeToLocal(event.start_time);
        const endTimeLocal = utcTimeToLocal(event.end_time);

        // Parse local time components
        const [startHours, startMinutes] = startTimeLocal.split(':').map(Number);
        const [endHours, endMinutes] = endTimeLocal.split(':').map(Number);

        // Create date objects in local timezone using the parsed date and converted time
        const start = new Date(year, month - 1, day, startHours, startMinutes);
        let end = new Date(year, month - 1, day, endHours, endMinutes);

        // If end_time is before or same as start_time, it likely crosses midnight to the next day
        if (end <= start) {
            end = new Date(end.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
        }

        return {
            id: `special-${event.display_id}`,
            title: `Special: ${event.title}`,
            start,
            end,
            allDay: false, // Ensure it shows in the time grid, not the all-day section
            type: 'special_event',
            is_special_event: true,
            original_event: event,
            status: 'confirmed', // Placeholder
        };
    });

    const displayedEvents = calendarType === 'all'
        ? (showCancelledOnly ? transformedEvents : [...transformedEvents, ...transformedSpecialEvents])
        : (calendarType === 'special_event' ? transformedSpecialEvents : transformedEvents);

    const loading = calendarType === 'all'
        ? (bookingsLoading || (canViewSpecialEvents && specialEventsLoading))
        : (calendarType === 'special_event' ? specialEventsLoading : bookingsLoading);

    // Extract unique coaches (with names and IDs) for the legend hover
    const coachList = [];
    const seenCoachIds = new Set();

    events.forEach(booking => {
        if (booking.booking_type === 'coaching' && booking.coach_details?.id) {
            if (!seenCoachIds.has(booking.coach_details.id)) {
                seenCoachIds.add(booking.coach_details.id);
                coachList.push(booking.coach_details);
            }
        }
    });

    const coachColors = [
        '#2563EB', '#0891B2', '#4F46E5', '#D946EF', '#65A30D',
        '#0369A1', '#7C3AED', '#0D9488', '#334155', '#713F12',
        '#115E59', '#4338CA'
    ];

    return (
        <div className="p-4 md:p-6 lg:p-8 w-full">
            <style>{`
                /* Force events to take proper width in day view to prevent overlapping */
                .rbc-day-slot .rbc-event {
                    max-width: 20% !important;
                    margin-right: 4px !important;
                }
                
                /* Override react-big-calendar's default width calculation */
                .rbc-events-container .rbc-event {
                    width: 20% !important;
                }
                
                /* Ensure events in the same time slot are properly spaced */
                .rbc-time-slot .rbc-event-content {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                /* Ensure proper positioning for overlapping events */
                .rbc-day-slot .rbc-events-container {
                    display: flex;
                    gap: 4px;
                }
            `}</style>
            <div className="w-full">
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-4 md:mb-0">
                            {staffName ? `${staffName}'s Coaching Sessions Calendar` : isUserView ? 'My Bookings Calendar' : 'Bookings Calendar'}
                        </h1>
                        <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto justify-end">
                            <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 bg-background/40 backdrop-blur-md rounded-2xl p-1.5 shadow-sm border border-border/40">
                                {/* Type Toggles */}
                                <div className="flex items-center gap-1 p-1 bg-surface/30 rounded-xl border border-border/20">
                                    <button
                                        onClick={() => {
                                            setCalendarType('all');
                                            setShowCancelledOnly(false);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 ${calendarType === 'all' && !showCancelledOnly
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-text-secondary hover:bg-surface'
                                            }`}
                                        title="All active bookings"
                                    >
                                        <span className="text-xs font-semibold">Active</span>
                                    </button>

                                    {!coachId && (
                                        <button
                                            onClick={() => setCalendarType('simulator')}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 ${calendarType === 'simulator'
                                                ? 'bg-primary-light text-white shadow-sm'
                                                : 'text-text-secondary hover:bg-surface'
                                                }`}
                                            title="Simulator Only"
                                        >
                                            <span className="text-xs font-semibold">Simulators</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setCalendarType('coaching')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 ${calendarType === 'coaching'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-text-secondary hover:bg-surface'
                                            }`}
                                        title="Coaching Only"
                                    >
                                        <span className="text-xs font-semibold">Coaching</span>
                                    </button>

                                    {canViewSpecialEvents && (
                                        <button
                                            onClick={() => setCalendarType('special_event')}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 ${calendarType === 'special_event'
                                                ? 'bg-amber-500 text-white shadow-sm'
                                                : 'text-text-secondary hover:bg-surface'
                                                }`}
                                            title="Events Only"
                                        >
                                            <span className="text-xs font-semibold">Events</span>
                                        </button>
                                    )}
                                </div>

                                {/* Cancelled Toggle */}
                                <div className="flex h-full items-center pl-1 border-l border-border/50 ml-1">
                                    <button
                                        onClick={() => {
                                            setShowCancelledOnly(!showCancelledOnly);
                                            // Reset calendarType to all if exploring cancelled for better overview
                                            if (!showCancelledOnly && calendarType === 'special_event') {
                                                setCalendarType('all');
                                            }
                                        }}
                                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all duration-300 ${showCancelledOnly
                                            ? 'bg-danger text-white shadow-sm scale-105'
                                            : 'bg-danger/10 text-danger hover:bg-danger/20'
                                            }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${showCancelledOnly ? 'bg-white' : 'bg-danger'} animate-pulse`}></span>
                                        <span className="text-xs font-bold uppercase tracking-wider">Cancelled</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 relative">
                    <div style={{ height: '600px', position: 'relative' }}>
                        <Calendar
                            localizer={localizer}
                            events={loading ? [] : displayedEvents}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            onSelectEvent={handleSelectEvent}
                            onSelectSlot={handleSelectSlot}
                            selectable={view === 'month'} // Allow selecting day slots in month view
                            onNavigate={handleNavigate}
                            onView={handleView}
                            view={view}
                            date={date}
                            eventPropGetter={eventStyleGetter}
                            step={30}
                            timeslots={2}
                            min={new Date(0, 0, 0, 0, 0, 0)}
                            max={new Date(0, 0, 0, 23, 59, 0)}
                            views={['month', 'day']} // Allow month and day views - week view is disabled
                            messages={{
                                next: "Next",
                                previous: "Prev",
                                today: "Today",
                                month: "Month",
                                // week: "Week", // Week view commented out
                                day: "Day"
                            }}
                        />
                        {loading && (
                            <div
                                className="absolute bg-surface bg-opacity-95 pointer-events-none z-10"
                                style={{
                                    top: '50px',
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <div className="w-full h-full bg-background animate-pulse rounded-lg"></div>
                                <span className="absolute text-primary font-medium">
                                    {showCancelledOnly ? 'Loading Cancelled ' : 'Loading '}
                                    {calendarType === 'all' ? 'All Events...' :
                                        calendarType === 'simulator' ? 'Simulator Bookings...' :
                                            calendarType === 'coaching' ? 'Coaching Sessions...' :
                                                'Special Events...'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mt-6">
                    <div className="flex flex-wrap gap-4 md:gap-6">
                        {calendarType === 'special_event' ? (
                            <div className="group relative flex items-center">
                                <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                                <div className="ml-2 text-sm text-text-secondary">Special Event</div>
                            </div>
                        ) : (
                            <>
                                {(calendarType === 'all' || calendarType === 'simulator') && (
                                    <div className="group relative flex items-center">
                                        <div className="w-4 h-4 rounded-full bg-[#10B981]"></div>
                                        <div className="ml-2 text-sm text-text-secondary">Simulator</div>
                                    </div>
                                )}
                                {(calendarType === 'all' || calendarType === 'coaching') && (
                                    <div className="group relative flex items-center cursor-help">
                                        <div className="w-4 h-4 rounded-full bg-[#334155]"></div>
                                        <div className="ml-2 text-sm text-text-secondary">Coaching (Hover for Staff)</div>

                                        {/* Dynamic Staff Color Tooltip */}
                                        <div className="absolute bottom-full left-0 mb-3 hidden group-hover:block z-[100] bg-surface-light border border-border rounded-xl shadow-2xl p-4 min-w-[240px] backdrop-blur-md bg-opacity-95">
                                            <div className="text-xs font-bold text-text-muted mb-3 uppercase tracking-widest border-b border-border pb-2">
                                                Staff Color Guide
                                            </div>
                                            <div className="space-y-3">
                                                {coachList.length > 0 ? coachList.map(coach => (
                                                    <div key={coach.id} className="flex items-center group/item transition-transform hover:translate-x-1">
                                                        <div
                                                            className="w-4 h-4 rounded-full mr-3 shadow-inner border border-white/10"
                                                            style={{ backgroundColor: coachColors[coach.id % coachColors.length] }}
                                                        ></div>
                                                        <div className="text-sm font-medium text-text-primary">
                                                            {coach.first_name} {coach.last_name}
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="text-sm text-text-muted italic py-2">No active coaching sessions found for selected view</div>
                                                )}
                                            </div>
                                            <div className="mt-3 pt-2 border-t border-border text-[10px] text-text-muted">
                                                Colors are unique per staff member
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {calendarType === 'all' && (
                                    <div className="group relative flex items-center">
                                        <div className="w-4 h-4 rounded-full bg-[#F59E0B]"></div>
                                        <div className="ml-2 text-sm text-text-secondary">Special Event</div>
                                    </div>
                                )}
                                <div className="group relative flex items-center">
                                    <div className="w-4 h-4 rounded-full bg-[#9333EA]"></div>
                                    <div className="ml-2 text-sm text-text-secondary">TPI Assessment</div>
                                </div>
                                <div className="group relative flex items-center">
                                    <div className="w-4 h-4 rounded-full bg-[#DC2626]"></div>
                                    <div className="ml-2 text-sm text-text-secondary">Cancelled</div>
                                </div>
                                <div className="group relative flex items-center">
                                    <div className="w-4 h-4 rounded-full bg-[#6B7280]"></div>
                                    <div className="ml-2 text-sm text-text-secondary">Completed</div>
                                </div>
                            </>
                        )}
                    </div>
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
            {/* Reschedule Modal */}
            {rescheduleState.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => setRescheduleState(prev => ({ ...prev, open: false }))} />
                    <div className="relative w-full max-w-lg rounded-2xl bg-surface p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4 text-text-primary">Reschedule Booking</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Select New Date</label>
                                <input
                                    type="date"
                                    value={rescheduleState.date}
                                    min={moment().format('YYYY-MM-DD')}
                                    onChange={(e) => setRescheduleState(prev => ({ ...prev, date: e.target.value, selectedSlot: null }))}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Available Time Slots</label>
                                {slotsLoading ? (
                                    <div className="py-8 flex justify-center text-text-secondary">Loading slots...</div>
                                ) : availableSlots.length === 0 ? (
                                    <div className="py-4 text-text-secondary italic">No available slots for this date.</div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                                        {availableSlots.map((slot) => {
                                            const isSelected = rescheduleState.selectedSlot?.start_time === slot.start_time;
                                            return (
                                                <button
                                                    key={slot.start_time}
                                                    onClick={() => setRescheduleState(prev => ({ ...prev, selectedSlot: slot }))}
                                                    className={`px-2 py-2 text-sm rounded-lg border transition-all ${isSelected
                                                        ? 'bg-primary text-white border-primary'
                                                        : 'bg-background text-text-primary border-border hover:border-primary'
                                                        }`}
                                                >
                                                    {moment(slot.start_time).format('h:mm a')}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {rescheduleState.error && (
                                <div className="p-3 bg-red-50 text-danger text-sm rounded-lg">
                                    {rescheduleState.error}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <Button
                                    variant="secondary"
                                    onClick={() => setRescheduleState(prev => ({ ...prev, open: false }))}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    disabled={!rescheduleState.selectedSlot || rescheduleState.loading}
                                    onClick={handleRescheduleConfirm}
                                >
                                    {rescheduleState.loading ? 'Updating...' : 'Confirm Change'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CalendarView;
