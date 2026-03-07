import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import axios from '../api/axios';
import { endpoints } from '../api/endpoints';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import Button from './ui/Button';
import DateInput from './ui/DateInput';
import Badge from './ui/Badge';
import { Edit, Trash2, CalendarOff } from 'lucide-react';
import { localToUTCIso, formatLocalTime, formatLocalDate } from '../utils/timezoneUtils';

const RECURRENCE_TYPES = [
    { value: 'one_time', label: 'One Time (Specific Date Only)' },
    { value: 'weekly', label: 'Weekly Recurring' },
    { value: 'yearly', label: 'Yearly Recurring' },
];

function ClosedDaysManagement() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const { locationTimezone } = useAppSelector((state) => state.auth);
    const tz = locationTimezone || 'America/Halifax'; // DST-aware IANA timezone
    const modalRef = useRef(null);

    const [closedDays, setClosedDays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingClosedDay, setEditingClosedDay] = useState(null);

    const emptyForm = {
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        recurrence: 'one_time',
        is_active: true,
    };
    const [formData, setFormData] = useState(emptyForm);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [fullDayClosure, setFullDayClosure] = useState(true);

    useEffect(() => {
        fetchClosedDays();
    }, []);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowForm(false);
                setEditingClosedDay(null);
                setFormData(emptyForm);
                setFullDayClosure(true);
            }
        };

        if (showForm) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showForm]);

    const fetchClosedDays = async () => {
        setLoading(true);
        try {
            const response = await axios.get(endpoints.admin.closedDays.list);
            setClosedDays(response.data);
        } catch (error) {
            console.error('Error fetching closed days:', error);
            showError('Failed to load closed days');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Convert center local date + time to UTC for storage.
     * Uses DST-aware Intl API via localToUTCIso — NO fixed offsets.
     */
    const convertLocalDateTimeToUTC = (date, time) => {
        if (!date || !time) return { date: date || '', time: time || '' };
        const utcIso = localToUTCIso(date, time, tz);
        if (!utcIso) return { date, time };
        const utcDt = new Date(utcIso);
        return {
            date: utcDt.toISOString().split('T')[0],
            time: `${String(utcDt.getUTCHours()).padStart(2, '0')}:${String(utcDt.getUTCMinutes()).padStart(2, '0')}`
        };
    };

    /**
     * Convert UTC date + time back to center local timezone for display/editing.
     */
    const convertUTCDateTimeToLocal = (utcDate, utcTime) => {
        if (!utcDate || !utcTime) return { date: utcDate || '', time: utcTime || '' };

        // Ensure time has seconds for valid ISO string
        const timeStr = typeof utcTime === 'string' ? utcTime : String(utcTime || '');
        const timePart = timeStr.split(':').length === 2 ? `${timeStr}:00` : timeStr;
        const utcIso = `${utcDate}T${timePart}Z`;

        const dt = new Date(utcIso);

        if (isNaN(dt.getTime())) {
            console.error("Invalid UTC datetime constructed:", utcIso);
            return { date: utcDate, time: utcTime?.slice(0, 5) || '' };
        }
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false,
        });
        const parts = formatter.formatToParts(dt);
        const get = (type) => parts.find(p => p.type === type)?.value || '00';
        return {
            date: `${get('year')}-${get('month')}-${get('day')}`,
            time: `${get('hour').replace('24', '00')}:${get('minute')}`
        };
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        const submitData = {
            ...formData,
        };

        let startDateUTC = formData.start_date;
        let endDateUTC = formData.end_date || formData.start_date;

        // Only include time fields if not full day closure
        if (!fullDayClosure && formData.start_time && formData.end_time) {
            // Convert start time from center local tz to UTC (DST-aware)
            const startUTC = convertLocalDateTimeToUTC(formData.start_date, formData.start_time);
            startDateUTC = startUTC.date;
            submitData.start_time = startUTC.time;

            // Convert end time from center local tz to UTC
            const endDateForConversion = formData.end_date || formData.start_date;
            const endUTC = convertLocalDateTimeToUTC(endDateForConversion, formData.end_time);
            endDateUTC = endUTC.date;
            submitData.end_time = endUTC.time;
        } else {
            // For full day closures, convert 00:00 and 23:59 local time to UTC
            const startOfDayUTC = convertLocalDateTimeToUTC(formData.start_date, '00:00');
            startDateUTC = startOfDayUTC.date;
            submitData.start_time = startOfDayUTC.time;

            const endDateForConversion = formData.end_date || formData.start_date;
            const endOfDayUTC = convertLocalDateTimeToUTC(endDateForConversion, '23:59');
            endDateUTC = endOfDayUTC.date;
            submitData.end_time = endOfDayUTC.time;
        }

        submitData.start_date = startDateUTC;
        submitData.end_date = endDateUTC;

        await processSubmission(submitData);
    };

    const processSubmission = async (data) => {
        setSubmitLoading(true);
        try {
            if (editingClosedDay) {
                await axios.patch(endpoints.admin.closedDays.update(editingClosedDay.id), data);
            } else {
                await axios.post(endpoints.admin.closedDays.create, data);
            }
            setShowForm(false);
            setEditingClosedDay(null);
            setFormData(emptyForm);
            setFullDayClosure(true);
            await fetchClosedDays();
            showSuccess(editingClosedDay ? 'Closed day updated successfully' : 'Closed day created successfully');
            closePopup(); // Ensure any open popups are closed
        } catch (error) {
            console.error('Error saving closed day:', error);
            // Check for detailed conflict message
            const conflictMessage = error.response?.data?.start_date?.[0] ||
                error.response?.data?.end_date?.[0] ||
                error.response?.data?.error ||
                error.response?.data?.date?.[0] ||
                error.response?.data?.start_time?.[0] ||
                error.response?.data?.end_time?.[0] ||
                'Failed to save closed day';

            const hasConflicts = error.response?.data?.conflicts === true ||
                (Array.isArray(error.response?.data?.conflicts) && (error.response?.data?.conflicts[0] === true || error.response?.data?.conflicts[0] === 'True'));

            // Show error in a popup if it's a detailed conflict message (contains newlines) or a conflict flag
            if (hasConflicts || conflictMessage.includes('\n') || conflictMessage.includes('•')) {
                openPopup({
                    type: hasConflicts ? 'warning' : 'error',
                    title: hasConflicts ? 'Conflicts Detected' : 'Cannot Create Closed Day',
                    message: conflictMessage,
                    showCancel: hasConflicts,
                    confirmText: hasConflicts ? 'Force Override' : 'OK',
                    cancelText: 'Cancel',
                    onConfirm: hasConflicts ? () => {
                        // Retry with force_override
                        closePopup();
                        processSubmission({ ...data, force_override: true });
                    } : closePopup,
                });
            } else {
                showError(conflictMessage);
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEdit = (closedDay) => {
        setEditingClosedDay(closedDay);

        // Convert UTC dates/times back to Halifax for editing
        let startDateHalifax = closedDay.start_date || '';
        let endDateHalifax = closedDay.end_date || closedDay.start_date || '';
        let startTimeHalifax = '';
        let endTimeHalifax = '';
        let isFullDay = false;

        if (closedDay.start_time && closedDay.end_time) {
            // Convert start time from UTC to center local timezone
            const startLocal = convertUTCDateTimeToLocal(closedDay.start_date, closedDay.start_time);
            startDateHalifax = startLocal.date;
            startTimeHalifax = startLocal.time;

            // Convert end time from UTC to center local timezone
            const endDateForConversion = closedDay.end_date || closedDay.start_date;
            const endLocal = convertUTCDateTimeToLocal(endDateForConversion, closedDay.end_time);
            endDateHalifax = endLocal.date;
            endTimeHalifax = endLocal.time;

            // Check if this represents a full day in local tz (00:00 to 23:59)
            if (startTimeHalifax === '00:00' && endTimeHalifax === '23:59' &&
                startDateHalifax === endDateHalifax) {
                isFullDay = true;
            }
        } else {
            // Old format: no times stored, definitely a full day closure
            isFullDay = true;
        }

        setFullDayClosure(isFullDay);

        setFormData({
            title: closedDay.title || '',
            description: closedDay.description || '',
            start_date: startDateHalifax,
            end_date: endDateHalifax,
            start_time: startTimeHalifax,
            end_time: endTimeHalifax,
            recurrence: closedDay.recurrence || 'one_time',
            is_active: closedDay.is_active !== undefined ? closedDay.is_active : true,
        });
        setShowForm(true);
    };

    const handleDelete = (closedDay) => {
        openPopup({
            type: 'warning',
            title: 'Confirm Delete',
            message: `Are you sure you want to delete "${closedDay.title}"?`,
            showCancel: true,
            confirmText: 'Yes, Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                closePopup();
                try {
                    await axios.delete(endpoints.admin.closedDays.delete(closedDay.id));
                    fetchClosedDays();
                    showSuccess('Closed day deleted successfully');
                } catch (error) {
                    console.error('Error deleting closed day:', error);
                    showError('Failed to delete closed day');
                }
            },
        });
    };

    /**
     * Format UTC date to display
     * For date-only fields (full day closures), display as-is
     * For dates with times, the date has already been adjusted to UTC during conversion
     */
    const formatDate = (utcDateString) => {
        if (!utcDateString) return '';
        const [year, month, day] = utcDateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    /**
     * Format UTC time to display in center's local timezone (DST-aware)
     */
    const formatTime = (utcTimeString, utcDateString) => {
        if (!utcTimeString || !utcDateString) return '';
        const timeStr = typeof utcTimeString === 'string' ? utcTimeString : String(utcTimeString || '');
        const timePart = timeStr.split(':').length === 2 ? `${timeStr}:00` : timeStr;
        const utcIso = `${utcDateString}T${timePart}Z`;
        return formatLocalTime(utcIso, tz, { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatRecurrence = (recurrence) => {
        const type = RECURRENCE_TYPES.find(t => t.value === recurrence);
        return type ? type.label : recurrence;
    };

    if (loading) {
        return <TableSkeleton />;
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary">Manage Closed Days</h1>
                <Button
                    onClick={() => {
                        setEditingClosedDay(null);
                        setFormData(emptyForm);
                        setFullDayClosure(true);
                        setShowForm(true);
                    }}
                    variant="primary"
                >
                    Add Closed Day
                </Button>
            </div>

            {/* Closed Days Table */}
            <div className="bg-surface rounded-card shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-background border-b border-border">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date Range</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Time Range</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Recurrence</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {closedDays.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-text-secondary">
                                        No closed days configured
                                    </td>
                                </tr>
                            ) : (
                                closedDays.map((closedDay) => (
                                    <tr key={closedDay.id} className="hover:bg-background transition-colors">
                                        {(() => {
                                            const startLocal = convertUTCDateTimeToLocal(closedDay.start_date, closedDay.start_time || '00:00');
                                            const endDateForDisplay = closedDay.end_date || closedDay.start_date;
                                            const endLocal = convertUTCDateTimeToLocal(endDateForDisplay, closedDay.end_time || '23:59');
                                            const isFullDay = startLocal.time === '00:00' && endLocal.time === '23:59' && startLocal.date === endLocal.date;

                                            return (
                                                <>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-text-primary">{closedDay.title}</div>
                                                        {closedDay.description && (
                                                            <div className="text-xs text-text-secondary mt-1">{closedDay.description}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-text-primary">
                                                            {formatLocalDate(new Date(`${startLocal.date}T12:00:00`), tz)}
                                                            {startLocal.date !== endLocal.date && (
                                                                <> - {formatLocalDate(new Date(`${endLocal.date}T12:00:00`), tz)}</>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-text-primary">
                                                            {isFullDay ? (
                                                                <span className="text-text-secondary">Full Day</span>
                                                            ) : (
                                                                <>
                                                                    {formatLocalTime(`${closedDay.start_date}T${(closedDay.start_time || '00:00').split(':').length === 2 ? (closedDay.start_time || '00:00') + ':00' : (closedDay.start_time || '00:00')}Z`, tz)} - {formatLocalTime(`${endDateForDisplay}T${(closedDay.end_time || '23:59').split(':').length === 2 ? (closedDay.end_time || '23:59') + ':00' : (closedDay.end_time || '23:59')}Z`, tz)}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </>
                                            );
                                        })()}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-text-primary">{formatRecurrence(closedDay.recurrence)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge
                                                variant={closedDay.is_active ? 'danger' : 'secondary'}
                                            >
                                                {closedDay.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(closedDay)}
                                                    className="text-primary hover:text-primary-light transition-colors p-1 rounded-md hover:bg-background"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(closedDay)}
                                                    className="text-danger hover:text-danger-dark transition-colors p-1 rounded-md hover:bg-background"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div
                        ref={modalRef}
                        className="bg-surface rounded-card shadow-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-border">
                            <h2 className="text-xl font-bold text-text-primary">
                                {editingClosedDay ? 'Edit Closed Day' : 'Add Closed Day'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Title <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                    placeholder="e.g., Holiday, Maintenance, etc."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                    rows="3"
                                    placeholder="Additional details about the closure"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        Start Date <span className="text-danger">*</span>
                                    </label>
                                    <DateInput
                                        value={formData.start_date}
                                        onChange={(val) => setFormData({ ...formData, start_date: val })}
                                        placeholder="Start date"
                                        className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        End Date <span className="text-danger">*</span>
                                    </label>
                                    <DateInput
                                        value={formData.end_date}
                                        onChange={(val) => setFormData({ ...formData, end_date: val })}
                                        placeholder="End date"
                                        className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                    <p className="text-xs text-text-secondary mt-1">Same as start date for single day</p>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 mb-2">
                                    <input
                                        type="checkbox"
                                        checked={fullDayClosure}
                                        onChange={(e) => {
                                            setFullDayClosure(e.target.checked);
                                            if (e.target.checked) {
                                                setFormData({ ...formData, start_time: '', end_time: '' });
                                            }
                                        }}
                                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                    />
                                    <span className="text-sm font-medium text-text-primary">Full Day Closure</span>
                                </label>
                            </div>

                            {!fullDayClosure && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Start Time
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.start_time}
                                            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            End Time
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.end_time}
                                            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Recurrence <span className="text-danger">*</span>
                                </label>
                                <select
                                    value={formData.recurrence}
                                    onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                >
                                    {RECURRENCE_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-text-secondary mt-1">
                                    {formData.recurrence === 'one_time' && 'Closure applies only to the specified date(s)'}
                                    {formData.recurrence === 'weekly' && 'Closure repeats every week on the same day of week'}
                                    {formData.recurrence === 'yearly' && 'Closure repeats every year on the same date'}
                                </p>
                            </div>

                            <div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                    />
                                    <span className="text-sm font-medium text-text-primary">Active</span>
                                </label>
                                <p className="text-xs text-text-secondary mt-1">Inactive closures won't block bookings</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingClosedDay(null);
                                        setFormData(emptyForm);
                                        setFullDayClosure(true);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={submitLoading}
                                >
                                    {submitLoading ? 'Saving...' : editingClosedDay ? 'Update' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <PopupMessage {...popup} onClose={closePopup} />
            {toast && <Toast {...toast} onClose={hideToast} />}
        </div>
    );
}

export default ClosedDaysManagement;

