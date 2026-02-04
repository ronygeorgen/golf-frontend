import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { endpoints } from '../api/endpoints';
import { Loader2 } from 'lucide-react';

export default function StaffDailySchedule({ date }) {
    const [staffSchedules, setStaffSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!date) return;

        const fetchSchedule = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(endpoints.bookings.staffDailySchedule, {
                    params: { date }
                });
                setStaffSchedules(response.data);
            } catch (err) {
                console.error("Failed to fetch staff schedule", err);
                setError("Failed to load staff availability.");
            } finally {
                setLoading(false);
            }
        };
        fetchSchedule();
    }, [date]);

    if (!date) return null;

    if (loading) {
        return (
            <div className="flex justify-center p-4">
                <Loader2 className="animate-spin h-6 w-6 text-primary" />
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 text-sm p-4">{error}</div>;
    }

    if (!staffSchedules.length) {
        return <div className="text-gray-500 text-sm p-4">No staff found active.</div>;
    }

    return (
        <div className="border rounded-md p-4 bg-gray-50 max-h-96 overflow-y-auto">
            <h3 className="font-semibold mb-3">Staff Availability for {date}</h3>
            <div className="space-y-4">
                {staffSchedules.map((staff) => (
                    <div key={staff.id} className="bg-white p-3 rounded shadow-sm border">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-900">{staff.name}</span>
                            <span className={`text-xs px-2 py-1 rounded ${staff.working_hours ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                {staff.working_hours
                                    ? `${staff.working_hours.start.slice(0, 5)} - ${staff.working_hours.end.slice(0, 5)}`
                                    : 'Off Duty'}
                            </span>
                        </div>
                        {staff.bookings && staff.bookings.length > 0 ? (
                            <div className="space-y-1">
                                {staff.bookings.map((booking) => (
                                    <div key={booking.id} className="text-xs bg-blue-50 text-blue-800 p-1 rounded flex justify-between">
                                        <span>
                                            {booking.start_time.slice(11, 16)} - {booking.end_time.slice(11, 16)}
                                        </span>
                                        <span>{booking.client_name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-gray-400 italic">No bookings</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
