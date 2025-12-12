import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { getCoachingSessionsByCoach } from '../store/slices/bookingSlice';
import CalendarView from '../components/CalendarView';

function StaffCoachingSessionsCalendarAdmin() {
    const { id } = useParams();
    const dispatch = useAppDispatch();
    const [staffName, setStaffName] = useState('');

    useEffect(() => {
        if (id) {
            // Fetch first booking to get staff name
            dispatch(getCoachingSessionsByCoach({ coachId: id, page: 1 })).then((result) => {
                if (result.payload?.results?.length > 0) {
                    const firstBooking = result.payload.results[0];
                    if (firstBooking.coach_details) {
                        setStaffName(`${firstBooking.coach_details.first_name} ${firstBooking.coach_details.last_name}`);
                    }
                }
            });
        }
    }, [dispatch, id]);
    
    return <CalendarView coachId={id} staffName={staffName} />;
}

export default StaffCoachingSessionsCalendarAdmin;



