import React from 'react';
import { useAppSelector } from '../store/hooks';
import CalendarView from '../components/CalendarView';

function StaffCoachingSessionsCalendar() {
    const { user } = useAppSelector((state) => state.auth);
    
    return <CalendarView isUserView={true} coachId={user?.id} staffName={user ? `${user.first_name} ${user.last_name}` : null} />;
}

export default StaffCoachingSessionsCalendar;

