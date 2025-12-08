import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getStaff, getStaffAvailability, updateStaffAvailability, getStaffDayAvailability, updateStaffDayAvailability, setSelectedStaff } from '../store/slices/adminSlice';
import { Plus, Trash2, ArrowLeft, ChevronDown } from 'lucide-react';
import { localTimeToUTC, utcTimeToLocal } from '../utils/timezone';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';

const DAYS_OF_WEEK = [
    { value: 0, label: 'Monday' },
    { value: 1, label: 'Tuesday' },
    { value: 2, label: 'Wednesday' },
    { value: 3, label: 'Thursday' },
    { value: 4, label: 'Friday' },
    { value: 5, label: 'Saturday' },
    { value: 6, label: 'Sunday' },
];

const FILTER_OPTIONS = [
    { value: 'all', label: 'All Availability' },
    { value: 'weekly', label: 'Weekly Recurring' },
    { value: 'day_specific', label: 'Day-Specific' },
];

function StaffAvailability() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const { popup, openPopup, closePopup } = usePopup();
    const { list: staff, loading, selectedStaff, availability, dayAvailability } = useAppSelector((state) => state.admin.staff);
    
    // Filter state
    const [filter, setFilter] = useState('all');
    
    // Add form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [availabilityType, setAvailabilityType] = useState(null); // 'weekly' or 'day_specific'
    const [newAvailability, setNewAvailability] = useState({ 
        day_of_week: '', 
        date: '',
        start_time: '09:00', 
        end_time: '17:00' 
    });
    const [addingAvailability, setAddingAvailability] = useState(false);
    
    // Dropdown ref for add button
    const addDropdownRef = useRef(null);
    const [showAddDropdown, setShowAddDropdown] = useState(false);

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
            dispatch(getStaffDayAvailability({ staffId: selectedStaff.id }));
        }
    }, [dispatch, selectedStaff]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (addDropdownRef.current && !addDropdownRef.current.contains(event.target)) {
                setShowAddDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleStaffSelect = (staffId) => {
        const staffMember = staff.find(s => s.id === staffId);
        dispatch(setSelectedStaff(staffMember));
        setShowAddForm(false);
        setAvailabilityType(null);
        setShowAddDropdown(false);
    };

    const handleAddTypeSelect = (type) => {
        setAvailabilityType(type);
        setShowAddForm(true);
        setShowAddDropdown(false);
        // Reset form
        setNewAvailability({ 
            day_of_week: '', 
            date: '',
            start_time: '09:00', 
            end_time: '17:00' 
        });
    };

    const handleAddAvailability = async () => {
        if (!selectedStaff) return;
        
        if (availabilityType === 'weekly') {
            if (newAvailability.day_of_week === '') {
                openPopup({
                    type: 'warning',
                    title: 'Select a day',
                    message: 'Please select a day of the week before adding availability.',
                });
                return;
            }

            const availabilityArray = Array.isArray(availability) ? availability : [];
            
            // Check if this day and start_time already exists
            const exists = availabilityArray.some(avail => 
                avail.day_of_week === parseInt(newAvailability.day_of_week) && 
                avail.start_time === localTimeToUTC(newAvailability.start_time)
            );
            
            if (exists) {
                openPopup({
                    type: 'warning',
                    title: 'Slot already exists',
                    message: 'This day and time slot already exists. Please choose a different start time.',
                });
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

            setAddingAvailability(true);
            try {
                await dispatch(updateStaffAvailability({ 
                    staffId: selectedStaff.id, 
                    availabilityData: updatedAvailability 
                }));

                // Reset form
                setNewAvailability({ 
                    day_of_week: '', 
                    date: '',
                    start_time: '09:00', 
                    end_time: '17:00' 
                });
                setShowAddForm(false);
                setAvailabilityType(null);
            } finally {
                setAddingAvailability(false);
            }
        } else if (availabilityType === 'day_specific') {
            if (!newAvailability.date) {
                openPopup({
                    type: 'warning',
                    title: 'Select a date',
                    message: 'Please select a date before adding availability.',
                });
                return;
            }

            const dayAvailabilityArray = Array.isArray(dayAvailability) ? dayAvailability : [];
            
            // Check if this date and start_time already exists
            const exists = dayAvailabilityArray.some(avail => 
                avail.date === newAvailability.date && 
                avail.start_time === localTimeToUTC(newAvailability.start_time)
            );
            
            if (exists) {
                openPopup({
                    type: 'warning',
                    title: 'Slot already exists',
                    message: 'This date and time slot already exists. Please choose a different start time.',
                });
                return;
            }

            // Convert local times to UTC before sending
            const updatedDayAvailability = [
                ...dayAvailabilityArray,
                {
                    date: newAvailability.date,
                    start_time: localTimeToUTC(newAvailability.start_time),
                    end_time: localTimeToUTC(newAvailability.end_time)
                }
            ];

            setAddingAvailability(true);
            try {
                await dispatch(updateStaffDayAvailability({ 
                    staffId: selectedStaff.id, 
                    availabilityData: updatedDayAvailability 
                }));

                // Reset form
                setNewAvailability({ 
                    day_of_week: '', 
                    date: '',
                    start_time: '09:00', 
                    end_time: '17:00' 
                });
                setShowAddForm(false);
                setAvailabilityType(null);
            } finally {
                setAddingAvailability(false);
            }
        }
    };

    const handleUpdateAvailability = async (availabilityId, field, value, isDaySpecific = false) => {
        if (!selectedStaff) return;
        
        if (isDaySpecific) {
            const dayAvailabilityArray = Array.isArray(dayAvailability) ? dayAvailability : [];
            const updatedValue = (field === 'start_time' || field === 'end_time') 
                ? localTimeToUTC(value) 
                : value;
            
            const updatedDayAvailability = dayAvailabilityArray.map(avail => 
                avail.id === availabilityId
                    ? { ...avail, [field]: updatedValue }
                    : avail
            );
            
            await dispatch(updateStaffDayAvailability({ 
                staffId: selectedStaff.id, 
                availabilityData: updatedDayAvailability 
            }));
        } else {
            const availabilityArray = Array.isArray(availability) ? availability : [];
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
        }
    };

    const handleDeleteAvailability = async (availabilityId, isDaySpecific = false) => {
        if (!selectedStaff) return;
        
        const typeLabel = isDaySpecific ? 'day-specific' : 'weekly recurring';
        openPopup({
            type: 'warning',
            title: 'Delete availability?',
            message: `This will remove the selected ${typeLabel} availability slot for this staff member.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                if (isDaySpecific) {
                    const dayAvailabilityArray = Array.isArray(dayAvailability) ? dayAvailability : [];
                    const updatedDayAvailability = dayAvailabilityArray.filter(avail => avail.id !== availabilityId);
                    
                    await dispatch(updateStaffDayAvailability({ 
                        staffId: selectedStaff.id, 
                        availabilityData: updatedDayAvailability 
                    }));
                } else {
                    const availabilityArray = Array.isArray(availability) ? availability : [];
                    const updatedAvailability = availabilityArray.filter(avail => avail.id !== availabilityId);
                    
                    await dispatch(updateStaffAvailability({ 
                        staffId: selectedStaff.id, 
                        availabilityData: updatedAvailability 
                    }));
                }
            },
        });
    };

    // Combine and format all availability
    const availabilityArray = Array.isArray(availability) ? availability : [];
    const dayAvailabilityArray = Array.isArray(dayAvailability) ? dayAvailability : [];
    
    // Format weekly availability with type indicator
    const weeklyFormatted = availabilityArray.map(avail => ({
        ...avail,
        type: 'weekly',
        displayKey: `weekly-${avail.id}`,
        sortKey: `${avail.day_of_week}-${avail.start_time}`
    }));
    
    // Format day-specific availability with type indicator
    const daySpecificFormatted = dayAvailabilityArray.map(avail => ({
        ...avail,
        type: 'day_specific',
        displayKey: `day-${avail.id}`,
        sortKey: `${avail.date}-${avail.start_time}`
    }));
    
    // Combine all availability
    const allAvailability = [...weeklyFormatted, ...daySpecificFormatted];
    
    // Filter based on selected filter
    const filteredAvailability = filter === 'all' 
        ? allAvailability 
        : allAvailability.filter(avail => avail.type === filter);
    
    // Sort combined list
    const sortedAvailability = [...filteredAvailability].sort((a, b) => {
        if (a.type !== b.type) {
            // Day-specific first, then weekly
            if (a.type === 'day_specific' && b.type === 'weekly') return -1;
            if (a.type === 'weekly' && b.type === 'day_specific') return 1;
        }
        return a.sortKey.localeCompare(b.sortKey);
    });

    // Format date for display
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    const getDayName = (dayOfWeek) => {
        return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || '';
    };

    return (
        <div>
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
                            Availability for {selectedStaff.first_name} {selectedStaff.last_name}
                        </h2>
                        <div className="flex items-center gap-4">
                            {/* Filter Dropdown */}
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                            >
                                {FILTER_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value} className="text-gray-900">
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            
                            {/* Add Button with Dropdown */}
                            <div className="relative" ref={addDropdownRef}>
                                <button
                                    onClick={() => setShowAddDropdown(!showAddDropdown)}
                                    className="flex items-center space-x-2 bg-primary hover:bg-primary-light text-white font-semibold py-2 px-4 rounded-lg transition duration-200 whitespace-nowrap"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span className="whitespace-nowrap">Add Availability</span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showAddDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {showAddDropdown && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                        <div className="py-1">
                                            <button
                                                onClick={() => handleAddTypeSelect('weekly')}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                            >
                                                <div className="font-medium">Weekly Recurring</div>
                                                <div className="text-xs text-gray-500">Repeats every week</div>
                                            </button>
                                            <button
                                                onClick={() => handleAddTypeSelect('day_specific')}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                                            >
                                                <div className="font-medium">Day-Specific</div>
                                                <div className="text-xs text-gray-500">One-time availability</div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Add Availability Form */}
                    {showAddForm && (
                        <div className={`mb-6 p-4 rounded-lg border ${availabilityType === 'weekly' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Add New {availabilityType === 'weekly' ? 'Weekly Recurring' : 'Day-Specific'} Availability
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {availabilityType === 'weekly' ? (
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
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            value={newAvailability.date}
                                            onChange={(e) => setNewAvailability({ ...newAvailability, date: e.target.value })}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                                        />
                                    </div>
                                )}
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
                                        disabled={addingAvailability}
                                        className={`flex-1 ${availabilityType === 'weekly' ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300' : 'bg-green-600 hover:bg-green-700 disabled:bg-green-300'} disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition duration-200`}
                                    >
                                        {addingAvailability ? 'Adding...' : 'Add'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setAvailabilityType(null);
                                            setNewAvailability({ day_of_week: '', date: '', start_time: '09:00', end_time: '17:00' });
                                        }}
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Combined Availability List */}
                    {loading ? (
                        <TableSkeleton rows={5} cols={5} />
                    ) : sortedAvailability.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-lg mb-4">
                                No availability added yet. Add availability using the button above.
                            </p>
                            <button
                                onClick={() => setShowAddDropdown(true)}
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
                                            Type
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date / Day
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
                                        <tr key={avail.displayKey} className="hover:bg-gray-50">
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    avail.type === 'weekly' 
                                                        ? 'bg-blue-100 text-blue-800' 
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {avail.type === 'weekly' ? 'Weekly' : 'Day-Specific'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                {avail.type === 'weekly' ? (
                                                    <select
                                                        value={avail.day_of_week}
                                                        onChange={(e) => handleUpdateAvailability(avail.id, 'day_of_week', e.target.value, false)}
                                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                                    >
                                                        {DAYS_OF_WEEK.map(day => (
                                                            <option key={day.value} value={day.value} className="text-gray-900">
                                                                {day.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div>
                                                        <input
                                                            type="date"
                                                            value={avail.date}
                                                            onChange={(e) => handleUpdateAvailability(avail.id, 'date', e.target.value, true)}
                                                            min={new Date().toISOString().split('T')[0]}
                                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                                                        />
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {formatDate(avail.date)}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <input
                                                    type="time"
                                                    value={utcTimeToLocal(avail.start_time) || '09:00'}
                                                    onChange={(e) => handleUpdateAvailability(avail.id, 'start_time', e.target.value, avail.type === 'day_specific')}
                                                    className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 ${
                                                        avail.type === 'weekly' 
                                                            ? 'focus:ring-blue-500' 
                                                            : 'focus:ring-green-500'
                                                    }`}
                                                />
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <input
                                                    type="time"
                                                    value={utcTimeToLocal(avail.end_time) || '17:00'}
                                                    onChange={(e) => handleUpdateAvailability(avail.id, 'end_time', e.target.value, avail.type === 'day_specific')}
                                                    className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 ${
                                                        avail.type === 'weekly' 
                                                            ? 'focus:ring-blue-500' 
                                                            : 'focus:ring-green-500'
                                                    }`}
                                                />
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleDeleteAvailability(avail.id, avail.type === 'day_specific')}
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

                    {/* Statistics Summary */}
                    {!loading && sortedAvailability.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center">
                                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                                    <span className="text-sm text-gray-600">
                                        Weekly Recurring: {weeklyFormatted.length} slot{weeklyFormatted.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                                    <span className="text-sm text-gray-600">
                                        Day-Specific: {daySpecificFormatted.length} slot{daySpecificFormatted.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className="inline-block w-3 h-3 rounded-full bg-gray-500 mr-2"></span>
                                    <span className="text-sm text-gray-600">
                                        Total: {sortedAvailability.length} slot{sortedAvailability.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <PopupMessage
                open={popup.open}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                confirmText={popup.confirmText}
                cancelText={popup.cancelText}
                showCancel={popup.showCancel}
                onConfirm={popup.onConfirm ? async () => {
                    const action = popup.onConfirm;
                    closePopup();
                    if (action) {
                        await action();
                    }
                } : closePopup}
                onClose={closePopup}
            />
        </div>
    );
}

export default StaffAvailability;