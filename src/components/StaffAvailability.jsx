import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getStaff, getStaffAvailability, updateStaffAvailability, setSelectedStaff } from '../store/slices/adminSlice';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { localTimeToUTC, utcTimeToLocal } from '../utils/timezone';
import { TableSkeleton } from './skeletons/SkeletonLoader';

const DAYS_OF_WEEK = [
    { value: 0, label: 'Monday' },
    { value: 1, label: 'Tuesday' },
    { value: 2, label: 'Wednesday' },
    { value: 3, label: 'Thursday' },
    { value: 4, label: 'Friday' },
    { value: 5, label: 'Saturday' },
    { value: 6, label: 'Sunday' },
];

function StaffAvailability() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const { list: staff, loading, selectedStaff, availability } = useAppSelector((state) => state.admin.staff);
    const [showAddDay, setShowAddDay] = useState(false);
    const [newAvailability, setNewAvailability] = useState({ 
        day_of_week: '', 
        start_time: '09:00', 
        end_time: '17:00' 
    });

    useEffect(() => {
        dispatch(getStaff());
    }, [dispatch]);

    // If ID is in URL, select that staff member
    useEffect(() => {
        if (id && staff.length > 0) {
            const staffMember = staff.find(s => s.id === parseInt(id));
            if (staffMember) {
                dispatch(setSelectedStaff(staffMember));
            }
        }
    }, [id, staff, dispatch]);

    useEffect(() => {
        if (selectedStaff) {
            dispatch(getStaffAvailability({ staffId: selectedStaff.id }));
        }
    }, [dispatch, selectedStaff]);

    const handleStaffSelect = (staffId) => {
        const staffMember = staff.find(s => s.id === staffId);
        dispatch(setSelectedStaff(staffMember));
        setShowAddDay(false);
    };

    const handleAddAvailability = async () => {
        if (!selectedStaff) return;
        
        if (newAvailability.day_of_week === '') {
            alert('Please select a day of week');
            return;
        }

        const availabilityArray = Array.isArray(availability) ? availability : [];
        
        // Check if this day and start_time already exists
        const exists = availabilityArray.some(avail => 
            avail.day_of_week === parseInt(newAvailability.day_of_week) && 
            avail.start_time === localTimeToUTC(newAvailability.start_time)
        );
        
        if (exists) {
            alert('This day and time slot already exists. Please select a different time.');
            return;
        }

        // Convert local times to UTC before sending
        const updatedAvailability = [
            ...availabilityArray,
            {
                day_of_week: parseInt(newAvailability.day_of_week),
                start_time: localTimeToUTC(newAvailability.start_time),
                end_time: localTimeToUTC(newAvailability.end_time)
            }
        ];
        
        await dispatch(updateStaffAvailability({ 
            staffId: selectedStaff.id, 
            availabilityData: updatedAvailability 
        }));

        // Reset form
        setNewAvailability({ 
            day_of_week: '', 
            start_time: '09:00', 
            end_time: '17:00' 
        });
        setShowAddDay(false);
    };

    const handleUpdateAvailability = async (availabilityId, field, value) => {
        if (!selectedStaff) return;
        
        const availabilityArray = Array.isArray(availability) ? availability : [];
        
        // Convert local time to UTC if it's a time field
        const updatedValue = (field === 'start_time' || field === 'end_time') 
            ? localTimeToUTC(value) 
            : field === 'day_of_week' ? parseInt(value) : value;
        
        const updatedAvailability = availabilityArray.map(avail => 
            avail.id === availabilityId
                ? { ...avail, [field]: updatedValue }
                : avail
        );
        
        await dispatch(updateStaffAvailability({ 
            staffId: selectedStaff.id, 
            availabilityData: updatedAvailability 
        }));
    };

    const handleDeleteAvailability = async (availabilityId) => {
        if (!selectedStaff) return;
        
        if (!window.confirm('Are you sure you want to delete this availability?')) {
            return;
        }

        const availabilityArray = Array.isArray(availability) ? availability : [];
        const updatedAvailability = availabilityArray.filter(avail => avail.id !== availabilityId);
        
        await dispatch(updateStaffAvailability({ 
            staffId: selectedStaff.id, 
            availabilityData: updatedAvailability 
        }));
    };

    const availabilityArray = Array.isArray(availability) ? availability : [];
    
    // Sort by day_of_week, then by start_time
    const sortedAvailability = [...availabilityArray].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) {
            return a.day_of_week - b.day_of_week;
        }
        return a.start_time.localeCompare(b.start_time);
    });

    return (
        <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => navigate('/admin/staff')}
                        className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition duration-200"
                        title="Back to Staff Management"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Staff Member:
                        </label>
                        <select 
                            onChange={(e) => {
                                const staffId = parseInt(e.target.value);
                                if (staffId) {
                                    navigate(`/admin/staff/${staffId}/availability`);
                                } else {
                                    navigate('/admin/staff/availability');
                                }
                            }}
                            value={selectedStaff?.id || ''}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        >
                            <option value="" className="text-gray-900">Choose a staff member</option>
                            {staff.map(staffMember => (
                                <option key={staffMember.id} value={staffMember.id} className="text-gray-900">
                                    {staffMember.first_name} {staffMember.last_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {selectedStaff && (
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-0">
                            Weekly Recurring Availability for {selectedStaff.first_name} {selectedStaff.last_name}
                        </h2>
                        <button
                            onClick={() => setShowAddDay(true)}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add Availability</span>
                        </button>
                    </div>

                    {/* Add Availability Form */}
                    {showAddDay && (
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Weekly Availability</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Day of Week
                                    </label>
                                    <select
                                        value={newAvailability.day_of_week}
                                        onChange={(e) => setNewAvailability({ ...newAvailability, day_of_week: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    >
                                        <option value="" className="text-gray-900">Select day</option>
                                        {DAYS_OF_WEEK.map(day => (
                                            <option key={day.value} value={day.value} className="text-gray-900">
                                                {day.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={newAvailability.start_time}
                                        onChange={(e) => setNewAvailability({ ...newAvailability, start_time: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        End Time
                                    </label>
                                    <input
                                        type="time"
                                        value={newAvailability.end_time}
                                        onChange={(e) => setNewAvailability({ ...newAvailability, end_time: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="flex items-end space-x-2">
                                    <button
                                        onClick={handleAddAvailability}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                                    >
                                        Add
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowAddDay(false);
                                            setNewAvailability({ day_of_week: '', start_time: '09:00', end_time: '17:00' });
                                        }}
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Availability List */}
                    {loading ? (
                        <TableSkeleton rows={5} cols={4} />
                    ) : sortedAvailability.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-lg mb-4">
                                No weekly availability added yet. Add recurring availability that will repeat every week.
                            </p>
                            <button
                                onClick={() => setShowAddDay(true)}
                                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Add First Availability</span>
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Day of Week
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Start Time
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            End Time
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedAvailability.map((avail) => (
                                        <tr key={avail.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                <select
                                                    value={avail.day_of_week}
                                                    onChange={(e) => handleUpdateAvailability(avail.id, 'day_of_week', e.target.value)}
                                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                                >
                                                    {DAYS_OF_WEEK.map(day => (
                                                        <option key={day.value} value={day.value} className="text-gray-900">
                                                            {day.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <input
                                                    type="time"
                                                    value={utcTimeToLocal(avail.start_time) || '09:00'}
                                                    onChange={(e) => handleUpdateAvailability(avail.id, 'start_time', e.target.value)}
                                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <input
                                                    type="time"
                                                    value={utcTimeToLocal(avail.end_time) || '17:00'}
                                                    onChange={(e) => handleUpdateAvailability(avail.id, 'end_time', e.target.value)}
                                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleDeleteAvailability(avail.id)}
                                                    className="inline-flex items-center space-x-1 text-red-600 hover:text-red-800 transition-colors"
                                                    title="Delete this availability"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                    <span className="text-sm">Delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default StaffAvailability;
