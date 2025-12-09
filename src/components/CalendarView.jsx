import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getCalendarBookings } from '../store/slices/bookingSlice';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';

const localizer = momentLocalizer(moment);

function CalendarView({ isUserView = false, coachId = null, staffName = null }) {
    const dispatch = useAppDispatch();
    const { calendarEvents: events, loading } = useAppSelector((state) => state.booking);
    const { popup, openPopup, closePopup } = usePopup();
    
    const [view, setView] = useState('week');
    const [date, setDate] = useState(new Date());
    const [calendarType, setCalendarType] = useState(coachId ? 'coaching' : 'simulator'); // 'simulator' or 'coaching'
    const handlePopupConfirm = async () => {
        const action = popup.onConfirm;
        closePopup();
        if (action) {
            await action();
        }
    };

    useEffect(() => {
        const startOfWeek = moment(date).startOf('week').toDate();
        const endOfWeek = moment(date).endOf('week').toDate();
        dispatch(getCalendarBookings({ 
            startDate: startOfWeek, 
            endDate: endOfWeek,
            bookingType: calendarType,
            coachId: coachId 
        }));
    }, [dispatch, date, calendarType, coachId]);

    const eventStyleGetter = (event) => {
        // Use design system colors
        let backgroundColor = '#1B3D2C'; // primary-light for simulator
        
        // For simulator calendar, use primary-light; for coaching calendar, use primary
        if (calendarType === 'coaching') {
            backgroundColor = '#0F2A1D'; // primary
        } else {
            backgroundColor = '#1B3D2C'; // primary-light
        }
        
        if (event.status === 'cancelled') {
            backgroundColor = '#DC2626'; // danger
        } else if (event.status === 'completed') {
            backgroundColor = '#374151'; // no_show text color (gray)
        }
        
        return {
            style: {
                backgroundColor,
                borderRadius: '5px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    const handleSelectEvent = (event) => {
        const details = (
            <div className="space-y-1 text-sm leading-5">
                {!isUserView && (
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
        setView(newView);
    };

    // Transform events for calendar - convert UTC to local time
    // Backend already filters by booking_type, but we keep this filter as safety measure
    const calendarEvents = events
        .filter(booking => booking.booking_type === calendarType)
        .map(booking => {
            // Parse UTC times from backend (ISO 8601 format) and convert to local time
            // Backend sends UTC times, moment.utc() parses them and .local() converts to user's timezone
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
                status: booking.status
            };
        });

    return (
        <div className="p-4 md:p-6 lg:p-8 w-full">
            <div className="w-full">
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-4 md:mb-0">
                            {staffName ? `${staffName}'s Coaching Sessions Calendar` : isUserView ? 'My Bookings Calendar' : 'Bookings Calendar'}
                        </h1>
                        {!coachId && (
                            <div className="flex flex-col gap-4 w-full md:w-auto">
                                {/* Calendar Type Toggle */}
                                <div className="flex items-center justify-between gap-2 sm:gap-4 bg-background rounded-2xl p-1.5 sm:p-2 shadow-inner">
                                    <button
                                        onClick={() => setCalendarType('simulator')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 group ${
                                            calendarType === 'simulator'
                                                ? 'bg-primary-light text-white shadow-md scale-[1.02]'
                                                : 'text-text-secondary hover:bg-surface'
                                        }`}
                                        title="Normal Simulator Calendar"
                                    >
                                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary-light flex-shrink-0"></span>
                                        <span className="text-xs sm:text-sm font-medium">Simulators</span>
                                    </button>
                                    <button
                                        onClick={() => setCalendarType('coaching')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 group ${
                                            calendarType === 'coaching'
                                                ? 'bg-primary text-white shadow-md scale-[1.02]'
                                                : 'text-text-secondary hover:bg-surface'
                                        }`}
                                        title="Coaching Simulator Calendar"
                                    >
                                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary flex-shrink-0"></span>
                                        <span className="text-xs sm:text-sm font-medium">Coaching</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 relative">
                    <div style={{ height: '600px', position: 'relative' }}>
                        <Calendar
                            localizer={localizer}
                            events={loading ? [] : calendarEvents}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            onSelectEvent={handleSelectEvent}
                            onNavigate={handleNavigate}
                            onView={handleView}
                            view={view}
                            date={date}
                            eventPropGetter={eventStyleGetter}
                            step={30}
                            timeslots={2}
                            min={new Date(0, 0, 0, 0, 0, 0)}
                            max={new Date(0, 0, 0, 23, 59, 0)}
                            messages={{
                                next: "Next",
                                previous: "Prev",
                                today: "Today",
                                month: "Month",
                                week: "Week",
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
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mt-6">
                    <div className="flex flex-wrap gap-4 md:gap-6">
                        {[
                            { color: calendarType === 'simulator' ? 'bg-primary-light' : 'bg-primary', label: calendarType === 'simulator' ? 'Simulator Bookings' : 'Coaching Sessions' },
                            { color: 'bg-danger', label: 'Cancelled' },
                            { color: 'bg-status-no_show-text', label: 'Completed' },
                        ].map((item, idx) => (
                            <div key={idx} className="group relative flex items-center">
                                <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
                                <div className="opacity-0 group-hover:opacity-100 transition duration-200 absolute top-full mt-2 px-2 py-1 rounded bg-text-primary text-white text-xs whitespace-nowrap">
                                    {item.label}
                                </div>
                            </div>
                        ))}
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
