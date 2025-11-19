import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getSimulators, getSimulatorAvailability, updateSimulatorAvailability, setSelectedSimulator } from '../store/slices/adminSlice';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
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

function SimulatorAvailability() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const { popup, openPopup, closePopup } = usePopup();
    const { list: simulators, loading } = useAppSelector((state) => state.admin.simulators);
    const { selectedSimulator, availability } = useAppSelector((state) => state.admin.simulators);
    const [showAddDay, setShowAddDay] = useState(false);
    const [newAvailability, setNewAvailability] = useState({ 
        day_of_week: '', 
        start_time: '09:00', 
        end_time: '17:00' 
    });

    useEffect(() => {
        dispatch(getSimulators());
    }, [dispatch]);

    // If ID is in URL, select that simulator
    useEffect(() => {
        if (id && simulators.length > 0) {
            const simulator = simulators.find(s => s.id === parseInt(id));
            if (simulator) {
                dispatch(setSelectedSimulator(simulator));
            }
        }
    }, [id, simulators, dispatch]);

    useEffect(() => {
        if (selectedSimulator) {
            dispatch(getSimulatorAvailability({ simulatorId: selectedSimulator.id }));
        }
    }, [dispatch, selectedSimulator]);

    const handleSimulatorSelect = (simulatorId) => {
        const simulator = simulators.find(s => s.id === simulatorId);
        dispatch(setSelectedSimulator(simulator));
        setShowAddDay(false);
    };

    const handleAddAvailability = async () => {
        if (!selectedSimulator) return;
        
        if (newAvailability.day_of_week === '') {
            openPopup({
                type: 'warning',
                title: 'Select a day',
                message: 'Please choose a day of the week before adding availability.',
            });
            return;
        }

        const availabilityArray = selectedSimulator.id in availability 
            ? availability[selectedSimulator.id] 
            : [];
        
        // Check if this day and start_time already exists
        const exists = availabilityArray.some(avail => 
            avail.day_of_week === parseInt(newAvailability.day_of_week) && 
            avail.start_time === localTimeToUTC(newAvailability.start_time)
        );
        
        if (exists) {
            openPopup({
                type: 'warning',
                title: 'Slot already exists',
                message: 'This day and time slot already exists. Please choose a different time.',
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
        
        await dispatch(updateSimulatorAvailability({ 
            simulatorId: selectedSimulator.id, 
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
        if (!selectedSimulator) return;
        
        const availabilityArray = selectedSimulator.id in availability 
            ? availability[selectedSimulator.id] 
            : [];
        
        // Convert local time to UTC if it's a time field
        const updatedValue = (field === 'start_time' || field === 'end_time') 
            ? localTimeToUTC(value) 
            : field === 'day_of_week' ? parseInt(value) : value;
        
        const updatedAvailability = availabilityArray.map(avail => 
            avail.id === availabilityId
                ? { ...avail, [field]: updatedValue }
                : avail
        );
        
        await dispatch(updateSimulatorAvailability({ 
            simulatorId: selectedSimulator.id, 
            availabilityData: updatedAvailability 
        }));
    };

    const handleDeleteAvailability = async (availabilityId) => {
        if (!selectedSimulator) return;
        
        openPopup({
            type: 'warning',
            title: 'Delete availability?',
            message: 'This will remove the selected availability slot for this simulator.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                const availabilityArray = selectedSimulator.id in availability 
                    ? availability[selectedSimulator.id] 
                    : [];
                const updatedAvailability = availabilityArray.filter(avail => avail.id !== availabilityId);
                
                await dispatch(updateSimulatorAvailability({ 
                    simulatorId: selectedSimulator.id, 
                    availabilityData: updatedAvailability 
                }));
            },
        });
    };

    const availabilityArray = selectedSimulator && selectedSimulator.id in availability
        ? availability[selectedSimulator.id]
        : [];
    
    // Sort by day_of_week, then by start_time
    const sortedAvailability = [...availabilityArray].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) {
            return a.day_of_week - b.day_of_week;
        }
        return a.start_time.localeCompare(b.start_time);
    });

    return (
        <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigate('/admin/simulators')}
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back to Simulators</span>
                    </button>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Simulator:
                    </label>
                    <select 
                        onChange={(e) => {
                            const simulatorId = parseInt(e.target.value);
                            handleSimulatorSelect(simulatorId);
                            navigate(`/admin/simulators/${simulatorId}/availability`);
                        }}
                        value={selectedSimulator?.id || ''}
                        className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    >
                        <option value="" className="text-gray-900">Choose a simulator</option>
                        {simulators.map(simulator => (
                            <option key={simulator.id} value={simulator.id} className="text-gray-900">
                                {simulator.name} (Bay {simulator.bay_number})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedSimulator && (
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-0">
                            Weekly Recurring Availability for {selectedSimulator.name} (Bay {selectedSimulator.bay_number})
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

export default SimulatorAvailability;

