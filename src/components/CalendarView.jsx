import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment-timezone';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getCalendarBookings, checkClosedDate, checkSpecialEventsOnDate } from '../store/slices/bookingSlice';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import axios from '../api/axios';
import { endpoints } from '../api/endpoints';
import { formatLocalTime, formatLocalDate, getTimezoneAbbreviation, getTodayInTimezone } from '../utils/timezoneUtils';
import Button from './ui/Button';
import DateInput from './ui/DateInput';
import BookForClientModal from './BookForClientModal';
import { UserPlus } from 'lucide-react';

const localizer = momentLocalizer(moment);

function CalendarView({ isUserView = false, coachId = null, staffName = null }) {
    const dispatch = useAppDispatch();
    const { calendarEvents: events, loading: bookingsLoading, availability } = useAppSelector((state) => state.admin?.bookings?.list ? { calendarEvents: [], ...state.booking } : state.booking); // Handle potential state structure mismatch if needed, but existing code uses state.booking
    const { user, locationTimezone } = useAppSelector((state) => state.auth);
    const tz = locationTimezone || 'America/Halifax'; // DST-aware IANA timezone
    const { popup, openPopup, closePopup } = usePopup();



    const [view, setView] = useState('month'); // Default to month view
    const [date, setDate] = useState(() => {
        // Initialize with center's today so users in different timezones see the correct "today"
        const todayStr = getTodayInTimezone(locationTimezone || 'America/Halifax');
        return moment.tz(todayStr, locationTimezone || 'America/Halifax').toDate();
    });
    const [calendarType, setCalendarType] = useState('all'); // 'all', 'simulator', 'coaching', or 'special_event'
    const [showCancelledOnly, setShowCancelledOnly] = useState(false); // New state to toggle cancelled bookings

    // Special Events State
    const [specialEvents, setSpecialEvents] = useState([]);
    const [specialEventsLoading, setSpecialEventsLoading] = useState(false);

    // Simulators State
    const [simulators, setSimulators] = useState([]);
    const [simulatorsLoading, setSimulatorsLoading] = useState(false);

    // Reschedule State
    const [rescheduleState, setRescheduleState] = useState({
        open: false,
        booking: null,
        date: '',
        selectedSlot: null,
        loading: false,
        error: null,
        info: null
    });
    const [availableSlots, setAvailableSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [showBookForClientModal, setShowBookForClientModal] = useState(false);

    const canViewSpecialEvents = user && (user.role === 'admin' || user.role === 'staff' || user.is_superuser);
    // For calendar pages (/calendar, /admin/calendar): only superadmins and admins can book for clients
    // For coaching-sessions calendar (/coaching-sessions/calendar): superadmins, admins, and staffs can book
    const isCoachingSessionsCalendar = isUserView && coachId && user && user.id === parseInt(coachId);
    const canBookForClients = user && (
        isCoachingSessionsCalendar
            ? (user.role === 'admin' || user.role === 'staff' || user.is_superuser) // coaching-sessions calendar
            : (user.role === 'admin' || user.is_superuser) // regular calendar pages
    );

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

    const fetchSimulators = async () => {
        setSimulatorsLoading(true);
        try {
            const response = await axios.get(endpoints.simulators.active);
            setSimulators(response.data);
        } catch (error) {
            console.error("Failed to fetch simulators", error);
        } finally {
            setSimulatorsLoading(false);
        }
    };

    useEffect(() => {
        fetchSimulators();
    }, []);

    useEffect(() => {
        // Calculate date range based on current view using the center's timezone boundaries
        const y = date.getFullYear();
        const m = date.getMonth();
        const d = date.getDate();

        let startDate, endDate;

        if (view === 'month') {
            // For month view, get start and end of the month
            startDate = moment.tz([y, m], tz).toDate();
            endDate = moment.tz([y, m], tz).endOf('month').toDate();
        }
        else if (view === 'day') {
            // For day view, get start and end of the day
            startDate = moment.tz([y, m, d], tz).toDate();
            endDate = moment.tz([y, m, d], tz).endOf('day').toDate();
        } else {
            // Default to month if view is unknown
            startDate = moment.tz([y, m], tz).toDate();
            endDate = moment.tz([y, m], tz).endOf('month').toDate();
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
        // Clear any previous errors and info in the reschedule modal state
        setRescheduleState(prev => ({ ...prev, error: null, info: null }));

        try {
            // First check special events for this date
            await dispatch(checkSpecialEventsOnDate(dateStr));

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

            // Check for partial closures and show info (not blocking)
            if (closedDateResult.has_partial_closure && closedDateResult.partial_closures) {
                const closureMessages = closedDateResult.partial_closures.map(closure => {
                    const startTime = formatLocalTime(closure.start_time, tz);
                    const endTime = formatLocalTime(closure.end_time, tz);
                    return `${startTime} - ${endTime}`;
                }).join(', ');
                // Set as info message (not error) - slots will still be filtered by availability check
                setRescheduleState(prev => ({
                    ...prev,
                    info: `Note: Facility will be closed ${closureMessages} on this date. These time slots will not be available.`
                }));
            }

            let response;
            if (booking.type === 'simulator' || booking.booking_type === 'simulator') {
                response = await axios.get(endpoints.bookings.checkSimulatorAvailability, {
                    params: {
                        date: dateStr,
                        duration: booking.duration_minutes || 60,
                        simulator_count: 1, // Assuming 1 for reschedule for now
                        exclude_booking_id: booking.id // Exclude current booking when rescheduling
                    }
                });
            } else {
                // Coaching
                response = await axios.get(endpoints.bookings.checkCoachingAvailability, {
                    params: {
                        date: dateStr,
                        package_id: booking.package?.id,
                        coach_id: booking.coach?.id, // Keep same coach
                        duration: booking.duration_minutes,
                        exclude_booking_id: booking.id // Exclude current booking when rescheduling
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
            const errorData = error.response?.data || {};
            // Handle non_field_errors (from serializer validation)
            let errorMsg = errorData.error || errorData.detail || errorData.message || 'Failed to reschedule booking.';
            if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors) && errorData.non_field_errors.length > 0) {
                errorMsg = errorData.non_field_errors[0];
            } else if (errorData.non_field_errors && typeof errorData.non_field_errors === 'string') {
                errorMsg = errorData.non_field_errors;
            }
            const isLockError = errorData.lock_applies;

            // Handle 24h lock override for admins (though this shouldn't happen now after backend fix)
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
                            const errData = err.response?.data || {};
                            // Handle non_field_errors (from serializer validation)
                            let errMsg = errData.error || errData.detail || errData.message || 'Failed to force reschedule.';
                            if (errData.non_field_errors && Array.isArray(errData.non_field_errors) && errData.non_field_errors.length > 0) {
                                errMsg = errData.non_field_errors[0];
                            } else if (errData.non_field_errors && typeof errData.non_field_errors === 'string') {
                                errMsg = errData.non_field_errors;
                            }
                            openPopup({ type: 'error', title: 'Error', message: errMsg });
                            setRescheduleState(prev => ({ ...prev, loading: false, error: errMsg }));
                        }
                    }
                });
            } else {
                // Show error in the modal and also as a popup for visibility
                setRescheduleState(prev => ({ ...prev, loading: false, error: errorMsg }));
                openPopup({
                    type: 'error',
                    title: 'Reschedule Failed',
                    message: errorMsg
                });
            }
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
                    message: `${errorMsg}\n\nThis booking is within the 24-hour window. Do you want to give the customer credit?`,
                    customActions: [
                        {
                            label: 'Yes, Refund Credit',
                            variant: 'primary',
                            onClick: async () => {
                                try {
                                    await axios.post(endpoints.bookings.cancel(bookingId), { force_override: true, refund_credit: true });
                                    openPopup({ type: 'success', title: 'Cancelled', message: 'Booking cancelled with credit override.' });
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
                        },
                        {
                            label: 'No, Cancel Without Refund',
                            variant: 'danger',
                            onClick: async () => {
                                try {
                                    await axios.post(endpoints.bookings.cancel(bookingId), { force_override: true, refund_credit: false });
                                    openPopup({ type: 'success', title: 'Cancelled', message: 'Booking cancelled without refund.' });
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
                        },
                        {
                            label: 'Cancel',
                            variant: 'secondary',
                            shouldClose: true
                        }
                    ]
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

    const getSpecialEventConflict = (slot, booking) => {
        if (!availability?.specialEventsOnDate || availability.specialEventsOnDate.length === 0) return null;

        const duration = booking?.duration_minutes || 60;
        const durationMs = duration * 60000;
        const slotStart = new Date(slot.start_time);
        const slotEnd = new Date(slotStart.getTime() + durationMs);
        const dateToCheck = rescheduleState.date;

        for (const event of availability.specialEventsOnDate) {
            if (!event.start_time || !event.end_time) continue;

            const [startH, startM, startS] = event.start_time.split(':').map(Number);
            const [endH, endM, endS] = event.end_time.split(':').map(Number);

            // Use event.date if available, otherwise fallback to the current reschedule date
            const dateToUse = event.date || dateToCheck;
            if (!dateToUse) continue;

            const [year, month, day] = dateToUse.split('-').map(Number);

            // Construct event start/end times in UTC
            const eventStart = new Date(Date.UTC(year, month - 1, day, startH, startM, startS || 0));
            let eventEnd = new Date(Date.UTC(year, month - 1, day, endH, endM, endS || 0));

            // Handle event crossing midnight: increment day for end time if it's earlier than or equal to start
            if (eventEnd <= eventStart) {
                eventEnd.setUTCDate(eventEnd.getUTCDate() + 1);
            }

            // Check for overlap:
            // Block if the requested slot's interval [slotStart, slotEnd) 
            // overlaps with the event's interval [eventStart, eventEnd).
            if (slotStart < eventEnd && slotEnd > eventStart) {
                return event;
            }
        }
        return null;
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
            const data = response.data;
            setSpecialEvents(Array.isArray(data) ? data : data?.results || []);
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
            backgroundColor = '#000000'; // Black for TPI assessment
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
                        <span className="font-semibold">Simulator:</span> {event.simulator?.name || `Bay ${event.simulator?.bay_number || 'N/A'}`}
                    </p>
                ) : (
                    <>
                        <p>
                            <span className="font-semibold">Coach:</span> {event.coach?.first_name || 'Any'} {event.coach?.last_name || ''}
                        </p>
                        {event.simulator && (
                            <p>
                                <span className="font-semibold">Assigned Bay:</span> {event.simulator.name}
                            </p>
                        )}
                    </>
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

    // Transform events for calendar - convert UTC to Halifax timezone
    console.log('🔍 DEBUG: Calendar Transformation Started');
    console.log('📊 Redux Events Count:', events.length);
    console.log('📊 Calendar Type:', calendarType);
    console.log('📊 Show Cancelled Only:', showCancelledOnly);
    console.log('📊 Raw Events:', events);

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
            // Convert UTC booking times to center's local timezone "fake local" for display
            // This ensures vertical positioning works correctly in the browser's grid
            const startTimeMoment = moment.tz(booking.start_time, tz);
            const endTimeMoment = moment.tz(booking.end_time, tz);

            // Create Date objects that represent the "Halifax" time in the BROWSER's local zone
            const startTime = new Date(startTimeMoment.format('YYYY-MM-DDTHH:mm:ss'));
            const endTime = new Date(endTimeMoment.format('YYYY-MM-DDTHH:mm:ss'));

            // Enhanced Title Logic
            let title;
            const clientFullName = booking.client_details
                ? `${booking.client_details.first_name} ${booking.client_details.last_name || ''}`.trim()
                : 'N/A';

            const coachFullName = booking.coach_details
                ? `${booking.coach_details.first_name} ${booking.coach_details.last_name || ''}`.trim()
                : 'Any Coach';

            const simBayInfo = booking.simulator_details
                ? `Bay ${booking.simulator_details.bay_number} - ${booking.simulator_details.name}`
                : null;

            if (booking.booking_type === 'simulator') {
                title = clientFullName;
            } else {
                title = clientFullName;
            }

            // Determine resource ID for day view
            let resourceId = null;
            if (view === 'day') {
                if (booking.booking_type === 'simulator') {
                    resourceId = `simulator-${booking.simulator_details?.id}`;
                } else {
                    // Coaching or TPI
                    resourceId = 'coaching-bay';
                }
            }

            return {
                id: booking.id,
                title: title,
                start: startTime,
                end: endTime,
                resourceId: resourceId,
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

    // Transform Special Events - they are already naive local strings
    // Create accurate local datetime objects without shifting
    const transformedSpecialEvents = specialEvents.flatMap(event => {
        const [year, month, day] = event.date.split('-').map(Number);
        const [startHours, startMinutes] = event.start_time.split(':').map(Number);
        const [endHours, endMinutes] = event.end_time.split(':').map(Number);

        // Create browser-local dates that perfectly match the intended wall-clock time
        const localStart = new Date(year, month - 1, day, startHours, startMinutes);
        let localEnd = new Date(year, month - 1, day, endHours, endMinutes);

        // Handle midnight crossover
        if (localEnd <= localStart) {
            localEnd = new Date(localEnd.getTime() + 24 * 60 * 60 * 1000);
        }

        const baseEvent = {
            id: `special-${event.display_id}`,
            title: event.title,
            resourceId: view === 'day' ? 'special-events' : null,
            type: 'special_event',
            is_special_event: true,
            original_event: event,
            status: 'confirmed',
            allDay: false,
        };

        // Check if event crosses midnight (date part of start != date part of end)
        if (localStart.getDate() !== localEnd.getDate()) {
            const splitEvents = [];

            // Part 1: Start to End of Day 1 (23:59:59)
            const endOfDay1 = new Date(localStart);
            endOfDay1.setHours(23, 59, 59, 999);

            splitEvents.push({
                ...baseEvent,
                start: localStart,
                end: endOfDay1,
            });

            // Part 2: Start of Day 2 (00:00:00) to End
            const startOfDay2 = new Date(localEnd);
            startOfDay2.setHours(0, 0, 0, 0);

            // Only add part 2 if it has duration
            if (localEnd > startOfDay2) {
                splitEvents.push({
                    ...baseEvent,
                    id: `${baseEvent.id}-part2`, // Unique ID for the second part
                    start: startOfDay2,
                    end: localEnd,
                });
            }

            return splitEvents;
        }

        // No split needed
        return [{
            ...baseEvent,
            start: localStart,
            end: localEnd,
        }];
    });

    console.log('✅ Transformed Events Count:', transformedEvents.length);
    console.log('✅ Transformed Events:', transformedEvents);

    const displayedEvents = calendarType === 'all'
        ? (showCancelledOnly ? transformedEvents : [...transformedEvents, ...transformedSpecialEvents])
        : (calendarType === 'special_event' ? transformedSpecialEvents : transformedEvents);

    console.log('🎯 Final Displayed Events Count:', displayedEvents.length);
    console.log('🎯 Final Displayed Events:', displayedEvents);

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

    // Prepare Resources for Day View
    const resources = view === 'day' ? [
        ...simulators
            .filter(sim => !sim.is_coaching_bay)
            .sort((a, b) => a.bay_number - b.bay_number)
            .map(sim => ({
                id: `simulator-${sim.id}`,
                title: sim.name
            })),
        {
            id: 'coaching-bay',
            title: simulators.find(sim => sim.is_coaching_bay)?.name || 'Coaching Bay Simulator'
        },
        {
            id: 'special-events',
            title: 'Special Events'
        }
    ] : null;

    return (
        <div className="p-4 md:p-6 lg:p-8 w-full">
            <style>{`
                /* Resource Header Styles */
                .rbc-time-view .rbc-header {
                    border-bottom: 2px solid #e2e8f0;
                    padding: 12px 4px;
                    font-weight: 700;
                    color: #1e293b;
                    background: #f8fafc;
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    letter-spacing: 0.05em;
                }
                /* Resource Column Borders */
                .rbc-time-header-content > .rbc-row.rbc-time-header-cell {
                    border-left: 1px solid #e2e8f0;
                }
                .rbc-time-content > .rbc-day-slot {
                    border-left: 1px solid #e2e8f0;
                }
            `}</style>
            <div className="w-full">
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-1">
                                {staffName ? `${staffName}'s Coaching Sessions Calendar` : isUserView ? 'My Bookings Calendar' : 'Bookings Calendar'}
                            </h1>
                            {tz && (
                                <p className="text-sm font-medium text-text-muted mt-1 bg-surface-light inline-block px-2 py-1 rounded-md border border-border/50">
                                    <span className="mr-1">🕒</span> All times shown in {getTimezoneAbbreviation(tz)} Time
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto justify-end mt-4 md:mt-0">
                            {canBookForClients && (
                                <Button
                                    onClick={() => setShowBookForClientModal(true)}
                                    variant="primary"
                                    className="flex items-center gap-2 whitespace-nowrap"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    <span className="hidden sm:inline">+Book for clients</span>
                                    <span className="sm:hidden">+Book</span>
                                </Button>
                            )}
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
                            min={moment(date).set({ hour: 5, minute: 0 }).toDate()} // Start view at 5 AM for better focus
                            max={moment(date).set({ hour: 23, minute: 59 }).toDate()}
                            views={['month', 'day']} // Allow month and day views - week view is disabled
                            resources={resources}
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
                                    <div className="w-4 h-4 rounded-full bg-[#000000]"></div>
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
                customActions={popup.customActions}
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
                                <DateInput
                                    value={rescheduleState.date}
                                    min={getTodayInTimezone(tz)}
                                    onChange={(val) => setRescheduleState(prev => ({ ...prev, date: val, selectedSlot: null }))}
                                    placeholder="Select new date"
                                    className="px-3 py-2 border border-border rounded-lg bg-background"
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
                                            const conflict = getSpecialEventConflict(slot, rescheduleState.booking);
                                            const disabled = !!conflict;

                                            return (
                                                <button
                                                    key={slot.start_time}
                                                    onClick={() => !disabled && setRescheduleState(prev => ({ ...prev, selectedSlot: slot }))}
                                                    disabled={disabled}
                                                    title={disabled ? (conflict ? 'Blocked by Special Event: ' + conflict.title : 'Details not available') : ''}
                                                    className={`px-2 py-2 text-sm rounded-lg border transition-all ${disabled
                                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed decoration-slice'
                                                        : isSelected
                                                            ? 'bg-primary text-white border-primary'
                                                            : 'bg-background text-text-primary border-border hover:border-primary'
                                                        }`}
                                                >
                                                    {formatLocalTime(slot.start_time, tz)}
                                                    {conflict && (
                                                        <div className="text-xs text-red-500 font-bold block mt-1">
                                                            {conflict.title}
                                                        </div>
                                                    )}
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
                            {rescheduleState.info && (
                                <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-lg">
                                    {rescheduleState.info}
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

            {/* Book for Client Modal */}
            {canBookForClients && (
                <BookForClientModal
                    isOpen={showBookForClientModal}
                    onClose={() => setShowBookForClientModal(false)}
                    onBookingSuccess={() => {
                        // Refresh calendar after successful booking
                        dispatch(getCalendarBookings({
                            startDate: moment(date).startOf('month').toDate(),
                            endDate: moment(date).endOf('month').toDate(),
                            bookingType: calendarType === 'all' ? null : calendarType,
                            coachId: coachId,
                            status: showCancelledOnly ? 'cancelled' : null
                        }));
                    }}
                />
            )}
        </div>
    );
}

export default CalendarView;
