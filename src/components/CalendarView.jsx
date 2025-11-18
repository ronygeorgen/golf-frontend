import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getCalendarBookings } from '../store/slices/bookingSlice';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

function CalendarView({ isUserView = false }) {
    const dispatch = useAppDispatch();
    const { calendarEvents: events, loading } = useAppSelector((state) => state.booking);
    
    const [view, setView] = useState('week');
    const [date, setDate] = useState(new Date());
    const [calendarType, setCalendarType] = useState('simulator'); // 'simulator' or 'coaching'

    useEffect(() => {
        const startOfWeek = moment(date).startOf('week').toDate();
        const endOfWeek = moment(date).endOf('week').toDate();
        dispatch(getCalendarBookings({ 
            startDate: startOfWeek, 
            endDate: endOfWeek,
            bookingType: calendarType 
        }));
    }, [dispatch, date, calendarType]);

    const eventStyleGetter = (event) => {
        let backgroundColor = '#3174ad';
        
        // For simulator calendar, use blue; for coaching calendar, use green
        if (calendarType === 'coaching') {
            backgroundColor = '#28a745';
        } else {
            backgroundColor = '#3174ad';
        }
        
        if (event.status === 'cancelled') {
            backgroundColor = '#dc3545';
        } else if (event.status === 'completed') {
            backgroundColor = '#6c757d';
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
        if (isUserView) {
            // User view - show their own booking details
            alert(`My Booking Details:
Type: ${event.type === 'simulator' ? 'Simulator' : 'Coaching'}
Time: ${moment(event.start).format('MMM Do YYYY, h:mm a')} - ${moment(event.end).format('h:mm a')}
Status: ${event.status}
${event.type === 'simulator' ? `Bay: ${event.simulator?.bay_number || 'N/A'}` : `Coach: ${event.coach?.first_name || 'Any'} ${event.coach?.last_name || ''}`}
${event.package ? `Package: ${event.package.title || 'N/A'}` : ''}
Price: $${event.total_price || '0'}`);
        } else {
            // Admin view - show all booking details
            alert(`Booking Details:
Client: ${event.client?.first_name || 'N/A'} ${event.client?.last_name || ''}
Type: ${event.type === 'simulator' ? 'Simulator' : 'Coaching'}
Time: ${moment(event.start).format('MMM Do YYYY, h:mm a')} - ${moment(event.end).format('h:mm a')}
Status: ${event.status}
${event.type === 'simulator' ? `Simulator: Bay ${event.simulator?.bay_number || 'N/A'}` : `Coach: ${event.coach?.first_name || 'Any'} ${event.coach?.last_name || ''}`}`);
        }
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
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                        {isUserView && (
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-0">
                                My Bookings Calendar
                            </h1>
                        )}
                        <div className="flex flex-col gap-4 w-full md:w-auto">
                            {/* Calendar Type Toggle */}
                            <div className="flex items-center justify-between gap-4 bg-gray-100 rounded-2xl p-2 shadow-inner">
                                <button
                                    onClick={() => setCalendarType('simulator')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 group ${
                                        calendarType === 'simulator'
                                            ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                                            : 'text-gray-600 hover:bg-white'
                                    }`}
                                    title="Normal Simulator Calendar"
                                >
                                    <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                                    <span className="hidden sm:inline">Simulators</span>
                                </button>
                                <button
                                    onClick={() => setCalendarType('coaching')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 group ${
                                        calendarType === 'coaching'
                                            ? 'bg-green-600 text-white shadow-md scale-[1.02]'
                                            : 'text-gray-600 hover:bg-white'
                                    }`}
                                    title="Coaching Simulator Calendar"
                                >
                                    <span className="w-3 h-3 rounded-full bg-green-400"></span>
                                    <span className="hidden sm:inline">Coaching</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 md:p-6 relative">
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
                                className="absolute bg-white bg-opacity-95 pointer-events-none z-10"
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
                                <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg"></div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mt-6">
                    <div className="flex flex-wrap gap-4 md:gap-6">
                        {[
                            { color: calendarType === 'simulator' ? 'bg-blue-500' : 'bg-green-500', label: calendarType === 'simulator' ? 'Simulator Bookings' : 'Coaching Sessions' },
                            { color: 'bg-red-500', label: 'Cancelled' },
                            { color: 'bg-gray-500', label: 'Completed' },
                        ].map((item, idx) => (
                            <div key={idx} className="group relative flex items-center">
                                <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
                                <div className="opacity-0 group-hover:opacity-100 transition duration-200 absolute top-full mt-2 px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap">
                                    {item.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CalendarView;
