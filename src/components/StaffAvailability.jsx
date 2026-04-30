/**
 * Staff Availability Management
 *
 * Each staff member can have separate availability settings per service category:
 *   • "General" (null) — applies to all categories that have no specific override
 *   • Per-category — overrides general for that specific booking type
 *
 * The top of the page shows category tabs.  Switching tabs reloads the
 * weekly recurring, day-specific, and blocked-dates data for that scope.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    getStaff,
    getStaffAvailability,
    updateStaffAvailability,
    getStaffDayAvailability,
    updateStaffDayAvailability,
    setSelectedStaff,
    getStaffBlockedDates,
    blockStaffDate,
    unblockStaffDate,
} from '../store/slices/adminSlice';
import { Plus, Trash2, ArrowLeft, ChevronDown } from 'lucide-react';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import DateInput from './ui/DateInput';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';

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
    const { list: staff, loading, selectedStaff, availability, dayAvailability, blockedDates } =
        useAppSelector((s) => s.admin.staff);

    // ── Service categories ───────────────────────────────────────────────── //
    const [serviceCategories, setServiceCategories] = useState([]);

    // activeCategoryId: null = "General (all)", number = specific category
    const [activeCategoryId, setActiveCategoryId] = useState(null);

    const categoryTabs = useMemo(() => {
        const tabs = [{ id: null, label: 'General (All Categories)', isGeneral: true }];
        // Only add truly dynamic categories (non-legacy) as tabs.
        // Legacy types ('coaching', 'simulator') are handled by the existing booking flows
        // which already read from general (null) availability — no per-category tab needed.
        serviceCategories
            .filter((cat) => !cat.legacy_booking_type)
            .forEach((cat) => {
                tabs.push({
                    id: cat.id,
                    label: cat.customer_label || cat.name,
                    isGeneral: false,
                });
            });
        return tabs;
    }, [serviceCategories]);

    const activeTab = categoryTabs.find((t) => t.id === activeCategoryId) || categoryTabs[0];

    // ── Filter / form state ──────────────────────────────────────────────── //
    const [filter, setFilter] = useState('all');
    const [showAddForm, setShowAddForm] = useState(false);
    const [availabilityType, setAvailabilityType] = useState(null);
    const [newAvailability, setNewAvailability] = useState({
        day_of_week: '',
        date: '',
        start_time: '09:00',
        end_time: '17:00',
    });
    const [blockDateData, setBlockDateData] = useState({
        date: '',
        start_time: '',
        end_time: '',
        reason: '',
    });
    const [addingAvailability, setAddingAvailability] = useState(false);

    const addDropdownRef = useRef(null);
    const [showAddDropdown, setShowAddDropdown] = useState(false);

    // ── Load data ────────────────────────────────────────────────────────── //
    useEffect(() => {
        dispatch(getStaff());
        // Load categories
        apiClient
            .get(endpoints.categories.admin.list)
            .then((res) => {
                const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
                setServiceCategories(data.filter((c) => c.is_active));
            })
            .catch(() => { });
    }, [dispatch]);

    useEffect(() => {
        if (id && staff.length > 0) {
            const m = staff.find((s) => s.id === parseInt(id));
            if (m) dispatch(setSelectedStaff(m));
        }
    }, [id, staff, dispatch]);

    // Reload availability when staff or active category changes
    useEffect(() => {
        if (!selectedStaff) return;
        dispatch(getStaffAvailability({ staffId: selectedStaff.id, categoryId: activeCategoryId }));
        dispatch(getStaffDayAvailability({ staffId: selectedStaff.id, categoryId: activeCategoryId }));
        dispatch(getStaffBlockedDates({ staffId: selectedStaff.id, categoryId: activeCategoryId }));
    }, [dispatch, selectedStaff, activeCategoryId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const fn = (e) => {
            if (addDropdownRef.current && !addDropdownRef.current.contains(e.target))
                setShowAddDropdown(false);
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    // ── Handlers ─────────────────────────────────────────────────────────── //
    const handleStaffSelect = (staffId) => {
        const m = staff.find((s) => s.id === staffId);
        dispatch(setSelectedStaff(m));
        setShowAddForm(false);
        setAvailabilityType(null);
        setShowAddDropdown(false);
    };

    const handleAddTypeSelect = (type) => {
        setAvailabilityType(type);
        setShowAddForm(true);
        setShowAddDropdown(false);
        setNewAvailability({ day_of_week: '', date: '', start_time: '09:00', end_time: '17:00' });
        setBlockDateData({ date: '', start_time: '', end_time: '', reason: '' });
    };

    const handleAddAvailability = async () => {
        if (!selectedStaff) return;

        if (availabilityType === 'weekly') {
            if (newAvailability.day_of_week === '') {
                openPopup({ type: 'warning', title: 'Select a day', message: 'Please select a day of the week before adding availability.' });
                return;
            }
            const arr = Array.isArray(availability) ? availability : [];
            if (arr.some(
                (a) =>
                    a.day_of_week === parseInt(newAvailability.day_of_week) &&
                    a.start_time === newAvailability.start_time,
            )) {
                openPopup({ type: 'warning', title: 'Slot already exists', message: 'This day and time slot already exists.' });
                return;
            }
            const updated = [
                ...arr,
                { day_of_week: parseInt(newAvailability.day_of_week), start_time: newAvailability.start_time, end_time: newAvailability.end_time },
            ];
            setAddingAvailability(true);
            try {
                await dispatch(updateStaffAvailability({ staffId: selectedStaff.id, availabilityData: updated, categoryId: activeCategoryId }));
                setNewAvailability({ day_of_week: '', date: '', start_time: '09:00', end_time: '17:00' });
                setShowAddForm(false);
                setAvailabilityType(null);
            } finally {
                setAddingAvailability(false);
            }
        } else if (availabilityType === 'day_specific') {
            if (!newAvailability.date) {
                openPopup({ type: 'warning', title: 'Select a date', message: 'Please select a date before adding availability.' });
                return;
            }
            const arr = Array.isArray(dayAvailability) ? dayAvailability : [];
            if (arr.some((a) => a.date === newAvailability.date && a.start_time === newAvailability.start_time)) {
                openPopup({ type: 'warning', title: 'Slot already exists', message: 'This date and time slot already exists.' });
                return;
            }
            const updated = [
                ...arr,
                { date: newAvailability.date, start_time: newAvailability.start_time, end_time: newAvailability.end_time },
            ];
            setAddingAvailability(true);
            try {
                await dispatch(updateStaffDayAvailability({ staffId: selectedStaff.id, availabilityData: updated, categoryId: activeCategoryId }));
                setNewAvailability({ day_of_week: '', date: '', start_time: '09:00', end_time: '17:00' });
                setShowAddForm(false);
                setAvailabilityType(null);
            } finally {
                setAddingAvailability(false);
            }
        } else if (availabilityType === 'block_date') {
            if (!blockDateData.date) {
                openPopup({ type: 'warning', title: 'Select a date', message: 'Please select a date to block.' });
                return;
            }
            if (
                (blockDateData.start_time && !blockDateData.end_time) ||
                (!blockDateData.start_time && blockDateData.end_time)
            ) {
                openPopup({ type: 'warning', title: 'Invalid Time Range', message: 'Provide both start and end time, or leave both empty for a full-day block.' });
                return;
            }
            if (blockDateData.start_time && blockDateData.end_time && blockDateData.start_time >= blockDateData.end_time) {
                openPopup({ type: 'warning', title: 'Invalid Time Range', message: 'End time must be after start time.' });
                return;
            }
            setAddingAvailability(true);
            try {
                const payload = { staffId: selectedStaff.id, date: blockDateData.date, reason: blockDateData.reason, categoryId: activeCategoryId };
                if (blockDateData.start_time && blockDateData.end_time) {
                    payload.start_time = blockDateData.start_time;
                    payload.end_time = blockDateData.end_time;
                }
                const result = await dispatch(blockStaffDate(payload));
                if (blockStaffDate.fulfilled.match(result)) {
                    const { cancelled_bookings, refunded_sessions, message } = result.payload;
                    openPopup({
                        type: 'success',
                        title: 'Date Blocked Successfully',
                        message: (
                            <div className="space-y-2">
                                <p>{message}</p>
                                {cancelled_bookings > 0 && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                                        <p className="font-semibold text-blue-900">Cancellation Summary:</p>
                                        <ul className="mt-2 space-y-1 text-blue-800">
                                            <li>• Cancelled Bookings: {cancelled_bookings}</li>
                                            <li>• Refunded Sessions: {refunded_sessions}</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ),
                    });
                    setBlockDateData({ date: '', start_time: '', end_time: '', reason: '' });
                    setShowAddForm(false);
                    setAvailabilityType(null);
                } else {
                    openPopup({ type: 'error', title: 'Error', message: result.payload?.error || 'Failed to block date.' });
                }
            } finally {
                setAddingAvailability(false);
            }
        }
    };

    const handleDeleteAvailability = (availabilityId, isDaySpecific) => {
        if (!selectedStaff) return;
        openPopup({
            type: 'warning',
            title: 'Delete availability?',
            message: `This will remove the selected ${isDaySpecific ? 'day-specific' : 'weekly recurring'} availability slot.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                if (isDaySpecific) {
                    const arr = (Array.isArray(dayAvailability) ? dayAvailability : []).filter(
                        (a) => a.id !== availabilityId,
                    );
                    await dispatch(updateStaffDayAvailability({ staffId: selectedStaff.id, availabilityData: arr, categoryId: activeCategoryId }));
                } else {
                    await dispatch(updateStaffAvailability({
                        staffId: selectedStaff.id,
                        availabilityData: [{ id: availabilityId, deleted: true }],
                        categoryId: activeCategoryId,
                    }));
                }
            },
        });
    };

    // ── Derived display data ──────────────────────────────────────────────── //
    const availabilityArray = Array.isArray(availability) ? availability : [];
    const dayAvailabilityArray = Array.isArray(dayAvailability) ? dayAvailability : [];

    const activeBlockedDates = useMemo(() => {
        if (!blockedDates) return [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return blockedDates.filter(bd => {
            const blockDate = new Date(bd.date + 'T00:00:00');
            return blockDate >= today;
        });
    }, [blockedDates]);

    const weeklyFormatted = availabilityArray.map((a) => ({ ...a, type: 'weekly', displayKey: `weekly-${a.id}`, sortKey: `${a.day_of_week}-${a.start_time}` }));
    const daySpecificFormatted = dayAvailabilityArray.map((a) => ({ ...a, type: 'day_specific', displayKey: `day-${a.id}`, sortKey: `${a.date}-${a.start_time}` }));
    const allAvailability = [...weeklyFormatted, ...daySpecificFormatted];
    const filteredAvailability = filter === 'all' ? allAvailability : allAvailability.filter((a) => a.type === filter);
    const sortedAvailability = [...filteredAvailability].sort((a, b) => {
        if (a.type !== b.type) {
            if (a.type === 'day_specific') return -1;
            if (b.type === 'day_specific') return 1;
        }
        return a.sortKey.localeCompare(b.sortKey);
    });

    const formatDate = (d) =>
        new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const getDayName = (n) => DAYS_OF_WEEK.find((d) => d.value === n)?.label || '';

    // ── Render ───────────────────────────────────────────────────────────── //
    return (
        <div>
            {/* Staff selector card */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => navigate('/admin/staff')}
                        className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                        title="Back to Staff Management"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Staff Member:</label>
                        <select
                            onChange={(e) => {
                                const staffId = parseInt(e.target.value);
                                if (staffId) navigate(`/admin/staff/${staffId}/availability`);
                                else navigate('/admin/staff/availability');
                            }}
                            value={selectedStaff?.id || ''}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                        >
                            <option value="">Choose a staff member</option>
                            {staff.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.first_name} {m.last_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {selectedStaff && (
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                            Availability for {selectedStaff.first_name} {selectedStaff.last_name}
                        </h2>
                        <p className="text-sm text-gray-500">
                            Set different availability hours for each service category. "General" applies to all categories that have no specific override.
                        </p>
                    </div>

                    {/* Category tabs */}
                    <div className="mb-6 border-b border-gray-200">
                        <div className="flex flex-wrap gap-1 -mb-px">
                            {categoryTabs.map((tab) => {
                                const isActive = tab.id === activeCategoryId;
                                return (
                                    <button
                                        key={tab.id ?? 'general'}
                                        onClick={() => {
                                            setActiveCategoryId(tab.id);
                                            setShowAddForm(false);
                                            setAvailabilityType(null);
                                        }}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${isActive
                                            ? 'border-blue-600 text-blue-600 bg-blue-50'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            } ${tab.isGeneral ? 'italic' : ''}`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Active category description */}
                    <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <p className="text-sm text-gray-600">
                                {activeTab.isGeneral ? (
                                    <>
                                        <span className="font-semibold">General availability</span> — used for Coaching, Simulator, and any dynamic category that doesn't have its own schedule set.
                                    </>
                                ) : (
                                    <>
                                        <span className="font-semibold">{activeTab.label} availability</span> — overrides general for <span className="font-semibold">{activeTab.label}</span> sessions only. If left empty, general availability is used as a fallback.
                                    </>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            {/* Filter */}
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500"
                            >
                                {FILTER_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>

                            {/* Add dropdown */}
                            <div className="relative" ref={addDropdownRef}>
                                <button
                                    onClick={() => setShowAddDropdown(!showAddDropdown)}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition whitespace-nowrap text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add / Block
                                    <ChevronDown className={`w-3 h-3 transition-transform ${showAddDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                {showAddDropdown && (
                                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                                        <div className="py-1">
                                            <button onClick={() => handleAddTypeSelect('weekly')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
                                                <div className="font-medium">Weekly Recurring</div>
                                                <div className="text-xs text-gray-500">Repeats every week</div>
                                            </button>
                                            <button onClick={() => handleAddTypeSelect('day_specific')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50">
                                                <div className="font-medium">Day-Specific</div>
                                                <div className="text-xs text-gray-500">One-time availability</div>
                                            </button>
                                            <button onClick={() => handleAddTypeSelect('block_date')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 border-t border-gray-100">
                                                <div className="font-medium">Block a Date</div>
                                                <div className="text-xs text-gray-500">Make staff unavailable</div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Add form */}
                    {showAddForm && (
                        <div className={`mb-6 p-4 rounded-lg border ${availabilityType === 'weekly' ? 'bg-blue-50 border-blue-200' :
                            availabilityType === 'day_specific' ? 'bg-green-50 border-green-200' :
                                'bg-red-50 border-red-200'
                            }`}>
                            <h3 className="text-base font-semibold text-gray-900 mb-3">
                                {availabilityType === 'weekly' ? 'Add Weekly Recurring Availability' :
                                    availabilityType === 'day_specific' ? 'Add Day-Specific Availability' :
                                        'Block a Date'}
                                {!activeTab.isGeneral && (
                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                        — for {activeTab.label}
                                    </span>
                                )}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {availabilityType === 'block_date' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date to Block</label>
                                            <DateInput
                                                value={blockDateData.date}
                                                onChange={(v) => setBlockDateData({ ...blockDateData, date: v })}
                                                min={new Date().toISOString().split('T')[0]}
                                                placeholder="Select date"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time <span className="text-gray-400 font-normal">(optional)</span></label>
                                            <input type="time" value={blockDateData.start_time} onChange={(e) => setBlockDateData({ ...blockDateData, start_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
                                            <p className="text-xs text-gray-500 mt-1">Empty = full-day block</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time <span className="text-gray-400 font-normal">(optional)</span></label>
                                            <input type="time" value={blockDateData.end_time} onChange={(e) => setBlockDateData({ ...blockDateData, end_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-gray-400 font-normal">(optional)</span></label>
                                            <input type="text" value={blockDateData.reason} onChange={(e) => setBlockDateData({ ...blockDateData, reason: e.target.value })} placeholder="e.g. Vacation" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {availabilityType === 'weekly' ? (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                                                <select value={newAvailability.day_of_week} onChange={(e) => setNewAvailability({ ...newAvailability, day_of_week: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
                                                    <option value="">Select day</option>
                                                    {DAYS_OF_WEEK.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                                                </select>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                                <DateInput value={newAvailability.date} onChange={(v) => setNewAvailability({ ...newAvailability, date: v })} min={new Date().toISOString().split('T')[0]} placeholder="Select date" />
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                            <input type="time" value={newAvailability.start_time} onChange={(e) => setNewAvailability({ ...newAvailability, start_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                            <input type="time" value={newAvailability.end_time} onChange={(e) => setNewAvailability({ ...newAvailability, end_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                        </div>
                                    </>
                                )}
                                <div className="flex items-end gap-2">
                                    <button
                                        onClick={handleAddAvailability}
                                        disabled={addingAvailability}
                                        className={`flex-1 text-white font-semibold py-2 px-4 rounded-lg transition disabled:cursor-not-allowed text-sm ${availabilityType === 'weekly' ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300' :
                                            availabilityType === 'day_specific' ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-300' :
                                                'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
                                            }`}
                                    >
                                        {addingAvailability ? (availabilityType === 'block_date' ? 'Blocking…' : 'Adding…') : (availabilityType === 'block_date' ? 'Block Date' : 'Add')}
                                    </button>
                                    <button
                                        onClick={() => { setShowAddForm(false); setAvailabilityType(null); }}
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Availability table */}
                    {loading ? (
                        <TableSkeleton rows={5} cols={5} />
                    ) : sortedAvailability.length === 0 ? (
                        <div className="text-center py-10 border border-dashed border-gray-200 rounded-lg">
                            <p className="text-gray-500 mb-3">
                                {activeTab.isGeneral
                                    ? 'No general availability set. Add weekly or day-specific slots above.'
                                    : `No ${activeTab.label}-specific availability set. If left empty, general availability will be used as a fallback.`}
                            </p>
                            <button
                                onClick={() => setShowAddDropdown(true)}
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add First Slot
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['Type', 'Date / Day', 'Start', 'End', 'Actions'].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedAvailability.map((avail) => (
                                        <tr key={avail.displayKey} className="hover:bg-gray-50">
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${avail.type === 'weekly' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                    {avail.type === 'weekly' ? 'Weekly' : 'Day-Specific'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {avail.type === 'weekly' ? (
                                                    <div className="font-medium text-blue-900">{getDayName(avail.day_of_week)}</div>
                                                ) : (
                                                    <div>
                                                        <div className="font-medium text-green-900">{formatDate(avail.date)}</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">{avail.date}</div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{avail.start_time || '09:00'}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{avail.end_time || '17:00'}</td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleDeleteAvailability(avail.id, avail.type === 'day_specific')}
                                                    className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 transition text-sm"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Blocked Dates */}
                    {!loading && activeBlockedDates.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-base font-semibold text-gray-900 mb-3">
                                Blocked Dates
                                {!activeTab.isGeneral && (
                                    <span className="ml-2 text-sm font-normal text-gray-500">— {activeTab.label}</span>
                                )}
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-red-50">
                                        <tr>
                                            {['Date', 'Type / Time', 'Reason', 'Blocked By', 'Actions'].map((h) => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {activeBlockedDates.map((bd) => (
                                            <tr key={bd.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 whitespace-nowrap text-gray-900 font-medium text-sm">
                                                    {new Date(bd.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    {bd.is_full_day_block ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Full Day</span>
                                                    ) : (
                                                        <div>
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Partial Day</span>
                                                            <div className="text-sm text-gray-600 mt-1">{bd.start_time} – {bd.end_time}</div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-600">{bd.reason || '–'}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{bd.created_by_name || 'Admin'}</td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => openPopup({
                                                            type: 'warning',
                                                            title: 'Unblock Date',
                                                            message: `Unblock ${new Date(bd.date + 'T00:00:00').toLocaleDateString()}? Bookings will be allowed again.`,
                                                            customActions: [
                                                                {
                                                                    label: 'Unblock',
                                                                    variant: 'primary',
                                                                    shouldClose: false,
                                                                    onClick: async () => {
                                                                        const r = await dispatch(unblockStaffDate({ staffId: selectedStaff.id, date: bd.date, categoryId: activeCategoryId }));
                                                                        if (unblockStaffDate.fulfilled.match(r)) {
                                                                            openPopup({ type: 'success', title: 'Unblocked', message: r.payload?.message || 'Date unblocked.' });
                                                                        } else {
                                                                            openPopup({ type: 'error', title: 'Error', message: r.payload?.error || 'Failed to unblock.' });
                                                                        }
                                                                    },
                                                                },
                                                                { label: 'Cancel', variant: 'secondary', shouldClose: true },
                                                            ],
                                                        })}
                                                        className="text-red-600 hover:text-red-900 font-medium text-sm"
                                                    >
                                                        Unblock
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Stats footer */}
                    {!loading && sortedAvailability.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                                <span className="text-sm text-gray-600">Weekly: {weeklyFormatted.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                                <span className="text-sm text-gray-600">Day-Specific: {daySpecificFormatted.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
                                <span className="text-sm text-gray-600">Total: {sortedAvailability.length}</span>
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
                customActions={popup.customActions}
                onConfirm={popup.onConfirm ? async () => { const fn = popup.onConfirm; closePopup(); if (fn) await fn(); } : closePopup}
                onClose={closePopup}
            />
        </div>
    );
}

export default StaffAvailability;
