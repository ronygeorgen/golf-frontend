import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getCalendarBookings } from '../store/slices/bookingSlice';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import axios from '../api/axios';
import { endpoints } from '../api/endpoints';

const localizer = momentLocalizer(moment);

function CalendarView({ isUserView = false, coachId = null, staffName = null }) {
    const dispatch = useAppDispatch();
    const { calendarEvents: events, loading: bookingsLoading } = useAppSelector((state) => state.booking);
    const { user } = useAppSelector((state) => state.auth);
    const { popup, openPopup, closePopup } = usePopup();

    const [view, setView] = useState('month'); // Default to month view
    const [date, setDate] = useState(new Date());
    const [calendarType, setCalendarType] = useState(coachId ? 'coaching' : 'simulator'); // 'simulator', 'coaching', or 'special_event'

    // Special Events State
    const [specialEvents, setSpecialEvents] = useState([]);
    const [specialEventsLoading, setSpecialEventsLoading] = useState(false);

    const canViewSpecialEvents = user && (user.role === 'admin' || user.role === 'staff' || user.is_superuser);

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

        if (calendarType === 'special_event') {
            if (canViewSpecialEvents) {
                fetchSpecialEvents(startDate, endDate);
            }
        } else {
            dispatch(getCalendarBookings({
                startDate,
                endDate,
                bookingType: calendarType,
                coachId: coachId
            }));
        }

    }, [dispatch, date, calendarType, coachId, view]); // Removed showSpecialEvents

    const fetchSpecialEvents = async (startDate, endDate) => {
        setSpecialEventsLoading(true);
        try {
            const startDateStr = moment(startDate).format('YYYY-MM-DD');
            const endDateStr = moment(endDate).format('YYYY-MM-DD');

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
        // Use design system colors
        let backgroundColor = '#1B3D2C'; // primary-light for simulator

        if (event.is_special_event) {
            backgroundColor = '#F59E0B'; // Amber-500 for special events
        } else if (event.is_tpi_assessment) {
            backgroundColor = '#9333EA'; // purple-600 for TPI assessment
        } else {
            // For simulator calendar, use primary-light; for coaching calendar, use primary
            if (calendarType === 'coaching') {
                backgroundColor = '#0F2A1D'; // primary
            } else {
                backgroundColor = '#1B3D2C'; // primary-light
            }
        }

        if (event.status === 'cancelled') {
            backgroundColor = '#DC2626'; // danger
        } else if (event.status === 'completed') {
            backgroundColor = '#374151'; // no_show text color (gray)
        }

        const baseStyle = {
            backgroundColor,
            borderRadius: '5px',
            opacity: 0.8,
            color: 'white',
            border: '0px',
            display: 'block'
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
            message: details,
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
        .filter(booking => booking.booking_type === calendarType)
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
                package: booking.coaching_package_details,
                total_price: booking.total_price,
                status: booking.status,
                is_tpi_assessment: booking.is_tpi_assessment || false
            };
        });

    // Transform Special Events
    const transformedSpecialEvents = specialEvents.map(event => {
        // Construct full datetime string in UTC then convert to local
        const startDateTimeStr = `${event.date}T${event.start_time}`;
        const endDateTimeStr = `${event.date}T${event.end_time}`;

        return {
            id: `special-${event.display_id}`,
            title: `Special: ${event.title}`,
            start: moment.utc(startDateTimeStr).local().toDate(),
            end: moment.utc(endDateTimeStr).local().toDate(),
            type: 'special_event',
            is_special_event: true,
            original_event: event,
            status: 'confirmed', // Placeholder
        };
    });

    const displayedEvents = calendarType === 'special_event' ? transformedSpecialEvents : transformedEvents;
    const loading = calendarType === 'special_event' ? specialEventsLoading : bookingsLoading;

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
                            <div className="flex items-center justify-between gap-2 sm:gap-4 bg-background rounded-2xl p-1.5 sm:p-2 shadow-inner">
                                {/* Simulator and Coaching Buttons - always show unless in staff view where sim might be hidden */}
                                {!coachId && (
                                    <button
                                        onClick={() => setCalendarType('simulator')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 group ${calendarType === 'simulator'
                                            ? 'bg-primary-light text-white shadow-md scale-[1.02]'
                                            : 'text-text-secondary hover:bg-surface'
                                            }`}
                                        title="Simulator Calendar"
                                    >
                                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary-light flex-shrink-0"></span>
                                        <span className="text-xs sm:text-sm font-medium">Simulators</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => setCalendarType('coaching')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 group ${calendarType === 'coaching'
                                        ? 'bg-primary text-white shadow-md scale-[1.02]'
                                        : 'text-text-secondary hover:bg-surface'
                                        }`}
                                    title="Coaching Calendar"
                                >
                                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary flex-shrink-0"></span>
                                    <span className="text-xs sm:text-sm font-medium">Coaching</span>
                                </button>

                                {canViewSpecialEvents && (
                                    <button
                                        onClick={() => setCalendarType('special_event')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 group ${calendarType === 'special_event'
                                            ? 'bg-amber-500 text-white shadow-md scale-[1.02]'
                                            : 'text-text-secondary hover:bg-surface'
                                            }`}
                                        title="Special Events Calendar"
                                    >
                                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500 flex-shrink-0"></span>
                                        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Special Events</span>
                                    </button>
                                )}
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
                                    {calendarType === 'simulator' ? 'Loading Simulator Bookings...' :
                                        calendarType === 'coaching' ? 'Loading Coaching Sessions...' :
                                            'Loading Special Events...'}
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
                                <div className="group relative flex items-center">
                                    <div className={`w-4 h-4 rounded-full ${calendarType === 'simulator' ? 'bg-primary-light' : 'bg-primary'}`}></div>
                                    <div className="ml-2 text-sm text-text-secondary">{calendarType === 'simulator' ? 'Simulator Bookings' : 'Coaching Sessions'}</div>
                                </div>
                                <div className="group relative flex items-center">
                                    <div className="w-4 h-4 rounded-full bg-purple-600"></div>
                                    <div className="ml-2 text-sm text-text-secondary">TPI Assessment</div>
                                </div>
                                <div className="group relative flex items-center">
                                    <div className="w-4 h-4 rounded-full bg-danger"></div>
                                    <div className="ml-2 text-sm text-text-secondary">Cancelled</div>
                                </div>
                                <div className="group relative flex items-center">
                                    <div className="w-4 h-4 rounded-full bg-status-no_show-text"></div>
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
        </div>
    );
}

export default CalendarView;
