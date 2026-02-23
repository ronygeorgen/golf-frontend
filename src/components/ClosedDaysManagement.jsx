import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import axios from '../api/axios';
import { endpoints } from '../api/endpoints';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Edit, Trash2, CalendarOff } from 'lucide-react';

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
     * Convert Halifax date and time to UTC for storage
     * Handles date shift when time crosses midnight in UTC
     */
    const convertHalifaxDateTimeToUTC = (date, time) => {
        if (!date || !time) return { date: date || '', time: time || '' };

        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);

        // Halifax timezone: AST = UTC-4 (4 hours behind UTC)
        const HALIFAX_OFFSET_HOURS = -4;

        // Create UTC date with Halifax time values
        const halifaxDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes));

        // Convert Halifax time to UTC by subtracting the offset
        // Example: 8PM Halifax (20:00) + 4 hours = 00:00 UTC (next day)
        const utcDateTime = new Date(halifaxDateTime.getTime() - (HALIFAX_OFFSET_HOURS * 60 * 60 * 1000));

        return {
            date: utcDateTime.toISOString().split('T')[0],
            time: `${utcDateTime.getUTCHours().toString().padStart(2, '0')}:${utcDateTime.getUTCMinutes().toString().padStart(2, '0')}`
        };
    };

    /**
     * Convert UTC date and time back to Halifax for display/editing
     */
    const convertUTCDateTimeToHalifax = (utcDate, utcTime) => {
        if (!utcDate || !utcTime) return { date: utcDate || '', time: utcTime || '' };

        const [year, month, day] = utcDate.split('-').map(Number);
        const [hours, minutes] = utcTime.split(':').map(Number);

        // Halifax timezone: AST = UTC-4
        const HALIFAX_OFFSET_HOURS = -4;

        // Create UTC datetime
        const utcDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes));

        // Convert UTC to Halifax time by adding the offset
        // Example: 00:00 UTC - 4 hours = 20:00 previous day (Halifax)
        const halifaxDateTime = new Date(utcDateTime.getTime() + (HALIFAX_OFFSET_HOURS * 60 * 60 * 1000));

        return {
            date: `${halifaxDateTime.getUTCFullYear()}-${String(halifaxDateTime.getUTCMonth() + 1).padStart(2, '0')}-${String(halifaxDateTime.getUTCDate()).padStart(2, '0')}`,
            time: `${String(halifaxDateTime.getUTCHours()).padStart(2, '0')}:${String(halifaxDateTime.getUTCMinutes()).padStart(2, '0')}`
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
            // Convert start time from Halifax to UTC
            const startUTC = convertHalifaxDateTimeToUTC(formData.start_date, formData.start_time);
            startDateUTC = startUTC.date;
            submitData.start_time = startUTC.time;

            // Convert end time from Halifax to UTC
            // Use start_date for end time conversion if end_date is same as start_date
            const endDateForConversion = formData.end_date || formData.start_date;
            const endUTC = convertHalifaxDateTimeToUTC(endDateForConversion, formData.end_time);
            endDateUTC = endUTC.date;
            submitData.end_time = endUTC.time;
        } else {
            // For full day closures, we still need to convert to UTC
            // A full day in Halifax (00:00-23:59) = 04:00 UTC to 03:59 UTC next day
            // We store it as a time range (00:00-23:59) in UTC to ensure accurate blocking
            // Convert start of day (00:00 Halifax) to UTC
            const startOfDayUTC = convertHalifaxDateTimeToUTC(formData.start_date, '00:00');
            startDateUTC = startOfDayUTC.date;
            submitData.start_time = startOfDayUTC.time;
            
            // Convert end of day (23:59 Halifax) to UTC
            const endDateForConversion = formData.end_date || formData.start_date;
            const endOfDayUTC = convertHalifaxDateTimeToUTC(endDateForConversion, '23:59');
            endDateUTC = endOfDayUTC.date;
            submitData.end_time = endOfDayUTC.time;
            
            // Note: Even though it's a "full day" closure from user's perspective,
            // we store it with times in UTC so the backend can accurately check
            // if a booking datetime falls within the closed period
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
            // Convert start time from UTC to Halifax
            const startHalifax = convertUTCDateTimeToHalifax(closedDay.start_date, closedDay.start_time);
            startDateHalifax = startHalifax.date;
            startTimeHalifax = startHalifax.time;

            // Convert end time from UTC to Halifax
            const endDateForConversion = closedDay.end_date || closedDay.start_date;
            const endHalifax = convertUTCDateTimeToHalifax(endDateForConversion, closedDay.end_time);
            endDateHalifax = endHalifax.date;
            endTimeHalifax = endHalifax.time;
            
            // Check if this represents a full day in Halifax (00:00 to 23:59)
            // Note: The dates might be different if it crosses midnight in UTC
            // But in Halifax, if times are 00:00 and 23:59, it's a full day
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
     * Format UTC time to display in Halifax timezone
     */
    const formatTime = (utcTimeString, utcDateString) => {
        if (!utcTimeString || !utcDateString) return '';
        
        const [year, month, day] = utcDateString.split('-').map(Number);
        const [hours, minutes] = utcTimeString.split(':').map(Number);
        
        // Create UTC datetime
        const utcDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes));
        
        // Format in Halifax timezone
        return utcDateTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false,
            timeZone: 'America/Halifax' 
        });
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
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-text-primary">{closedDay.title}</div>
                                            {closedDay.description && (
                                                <div className="text-xs text-text-secondary mt-1">{closedDay.description}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-text-primary">
                                                {formatDate(closedDay.start_date)}
                                                {closedDay.end_date && closedDay.end_date !== closedDay.start_date && (
                                                    <> - {formatDate(closedDay.end_date)}</>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-text-primary">
                                                {closedDay.start_time && closedDay.end_time ? (
                                                    (() => {
                                                        // Convert to Halifax to check if it's a full day
                                                        const startHalifax = convertUTCDateTimeToHalifax(closedDay.start_date, closedDay.start_time);
                                                        const endDateForCheck = closedDay.end_date || closedDay.start_date;
                                                        const endHalifax = convertUTCDateTimeToHalifax(endDateForCheck, closedDay.end_time);
                                                        
                                                        // If it's 00:00 to 23:59 on the same Halifax date, show as "Full Day"
                                                        if (startHalifax.time === '00:00' && endHalifax.time === '23:59' && 
                                                            startHalifax.date === endHalifax.date) {
                                                            return <span className="text-text-secondary">Full Day</span>;
                                                        }
                                                        
                                                        // Otherwise show the time range in Halifax
                                                        return (
                                                            <>
                                                                {formatTime(closedDay.start_time, closedDay.start_date)} - {formatTime(closedDay.end_time, endDateForCheck)}
                                                            </>
                                                        );
                                                    })()
                                                ) : (
                                                    <span className="text-text-secondary">Full Day</span>
                                                )}
                                            </div>
                                        </td>
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
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                        style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', minHeight: 44, fontSize: 16 }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        End Date <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                        style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', minHeight: 44, fontSize: 16 }}
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

