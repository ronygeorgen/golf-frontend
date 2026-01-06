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
import { localTimeToUTC, utcTimeToLocal } from '../utils/timezone';
import { Edit, Trash2 } from 'lucide-react';

const EVENT_TYPES = [
    { value: 'one_time', label: 'One Time' },
    { value: 'weekly', label: 'Weekly Recurring' },
    { value: 'monthly', label: 'Monthly Recurring' },
    { value: 'yearly', label: 'Yearly Recurring' },
];

function SpecialEventsManagement() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const modalRef = useRef(null);
    
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [viewType, setViewType] = useState('upcoming'); // 'upcoming' or 'conducted'
    
    const emptyForm = {
        title: '',
        description: '',
        event_type: 'one_time',
        date: '',
        recurring_end_date: '',
        start_time: '09:00',
        end_time: '17:00',
        max_capacity: 10,
        is_active: true,
        price: '',
        show_price: false,
        is_private: false,
        is_auto_enroll: false
    };
    const [formData, setFormData] = useState(emptyForm);
    const [submitLoading, setSubmitLoading] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, [viewType]);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowForm(false);
                setEditingEvent(null);
                setFormData(emptyForm);
            }
        };

        if (showForm) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showForm]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const response = await axios.get(endpoints.specialEvents.list, {
                params: { view_type: viewType }
            });
            setEvents(response.data);
        } catch (error) {
            console.error('Error fetching events:', error);
            showError('Failed to load special events');
        } finally {
            setLoading(false);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const submitData = {
            ...formData,
            start_time: localTimeToUTC(formData.start_time),
            end_time: localTimeToUTC(formData.end_time),
            price: formData.price ? parseFloat(formData.price) : null,
            // Only include recurring_end_date for recurring events
            recurring_end_date: formData.event_type !== 'one_time' && formData.recurring_end_date ? formData.recurring_end_date : null,
        };

        setSubmitLoading(true);
        try {
            if (editingEvent) {
                await axios.patch(endpoints.specialEvents.update(editingEvent.id), submitData);
            } else {
                await axios.post(endpoints.specialEvents.create, submitData);
            }
            setShowForm(false);
            setEditingEvent(null);
            setFormData(emptyForm);
            await fetchEvents();
            showSuccess(editingEvent ? 'Event updated successfully' : 'Event created successfully');
        } catch (error) {
            console.error('Error saving event:', error);
            showError(error.response?.data?.error || 'Failed to save event');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEdit = (event) => {
        setEditingEvent(event);
        setFormData({
            title: event.title || '',
            description: event.description || '',
            event_type: event.event_type || 'one_time',
            date: event.date || '',
            recurring_end_date: event.recurring_end_date || '',
            start_time: utcTimeToLocal(event.start_time) || '09:00',
            end_time: utcTimeToLocal(event.end_time) || '17:00',
            max_capacity: event.max_capacity || 10,
            is_active: event.is_active !== undefined ? event.is_active : true,
            price: event.price || '',
            show_price: event.show_price !== undefined ? event.show_price : false,
            is_private: event.is_private !== undefined ? event.is_private : false,
            is_auto_enroll: event.is_auto_enroll !== undefined ? event.is_auto_enroll : false
        });
        setShowForm(true);
    };

    const handleDelete = (event) => {
        openPopup({
            type: 'warning',
            title: 'Confirm Delete',
            message: `Are you sure you want to delete "${event.title}"?`,
            showCancel: true,
            confirmText: 'Yes, Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                closePopup();
                try {
                    await axios.delete(endpoints.specialEvents.delete(event.id));
                    fetchEvents();
                    showSuccess('Event deleted successfully');
                } catch (error) {
                    console.error('Error deleting event:', error);
                    showError('Failed to delete event');
                }
            },
        });
    };

    const handleViewRegistrations = (eventId, occurrenceDate) => {
        const url = occurrenceDate 
            ? `/admin/special-events/${eventId}/registrations?occurrence_date=${occurrenceDate}`
            : `/admin/special-events/${eventId}/registrations`;
        navigate(url);
    };

    if (loading) {
        return <TableSkeleton />;
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary">Special Events Management</h1>
                <div className="flex items-center gap-4">
                    {/* View Type Toggle */}
                    <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-1">
                        <button
                            onClick={() => setViewType('upcoming')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                viewType === 'upcoming'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            Upcoming Events
                        </button>
                        <button
                            onClick={() => setViewType('conducted')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                viewType === 'conducted'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            Conducted Events
                        </button>
                    </div>
                    <Button
                        onClick={() => {
                            setEditingEvent(null);
                            setFormData(emptyForm);
                            setShowForm(true);
                        }}
                    >
                        Add Event
                    </Button>
                </div>
            </div>

            {/* Events Table */}
            <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-background border-b border-border">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Title</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Type</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Date</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Time</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Capacity</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Registered</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Status</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Actions</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">View Registrations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {events.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-4 py-8 text-center text-text-secondary">
                                        No events found
                                    </td>
                                </tr>
                            ) : (
                                events.map((event) => (
                                    <tr key={event.display_id || event.id} className="hover:bg-background">
                                        <td className="px-4 py-3 text-sm text-text-primary">{event.title}</td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">
                                            {EVENT_TYPES.find(t => t.value === event.event_type)?.label || event.event_type}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">{event.date}</td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">
                                            {utcTimeToLocal(event.start_time)} - {utcTimeToLocal(event.end_time)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">{event.max_capacity}</td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">
                                            {event.registered_count || 0} / {event.max_capacity}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <Badge variant={event.is_active ? 'success' : 'secondary'}>
                                                    {event.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                                {event.is_private && (
                                                    <Badge variant="warning" className="text-xs">
                                                        Private
                                                    </Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleEdit(event)}
                                                    className="p-1 text-primary hover:bg-primary-light rounded"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(event)}
                                                    className="p-1 text-danger hover:bg-red-50 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleViewRegistrations(event.id, event.date)}
                                                className="text-primary hover:underline text-sm font-medium"
                                            >
                                                View ({event.registered_count || 0})
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div ref={modalRef} className="bg-surface rounded-card shadow-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-text-primary mb-4">
                            {editingEvent ? 'Edit Event' : 'Add New Event'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">
                                        Event Type *
                                    </label>
                                    <select
                                        required
                                        value={formData.event_type}
                                        onChange={(e) => {
                                            const newEventType = e.target.value;
                                            // Clear recurring_end_date when switching to one_time
                                            setFormData({ 
                                                ...formData, 
                                                event_type: newEventType,
                                                recurring_end_date: newEventType === 'one_time' ? '' : formData.recurring_end_date
                                            });
                                        }}
                                        className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                    >
                                        {EVENT_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">
                                        {formData.event_type === 'one_time' ? 'Date *' : 'Start Date *'}
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                    />
                                </div>

                                {/* Recurring End Date - only show for recurring events */}
                                {formData.event_type !== 'one_time' && (
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                            Recurring End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.recurring_end_date}
                                            onChange={(e) => setFormData({ ...formData, recurring_end_date: e.target.value })}
                                            min={formData.date || undefined}
                                            className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                            placeholder="Optional - leave empty for no end date"
                                        />
                                        <p className="text-xs text-text-secondary mt-1">
                                            Optional. Recurring occurrences will stop on this date. Leave empty for no end date.
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                            Start Time *
                                        </label>
                                        <input
                                            type="time"
                                            required
                                            value={formData.start_time}
                                            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                            className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                            End Time *
                                        </label>
                                        <input
                                            type="time"
                                            required
                                            value={formData.end_time}
                                            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                            className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">
                                        Max Capacity *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={formData.max_capacity}
                                        onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">
                                        Price (Optional)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <label className="text-sm text-text-primary">Active</label>
                                            <div className="relative group">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                                        formData.is_active ? 'bg-primary' : 'bg-gray-300'
                                                    }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                                            formData.is_active ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                                    {formData.is_active ? 'No' : 'Yes'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <label className="text-sm text-text-primary">Show Price to Users</label>
                                            <div className="relative group">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, show_price: !formData.show_price })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                                        formData.show_price ? 'bg-primary' : 'bg-gray-300'
                                                    }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                                            formData.show_price ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                                    {formData.show_price ? 'No' : 'Yes'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                            <label className="text-sm text-text-primary">Private Event</label>
                                            <div className="relative group">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, is_private: !formData.is_private })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                                        formData.is_private ? 'bg-primary' : 'bg-gray-300'
                                                    }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                                            formData.is_private ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                                    {formData.is_private ? 'No' : 'Yes'}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-text-secondary">
                                            Private events are only visible to admins. Clients cannot see or register for private events.
                                        </p>
                                    </div>
                                    
                                    {/* Auto Enroll - Only show for weekly and monthly recurring events */}
                                    {(formData.event_type === 'weekly' || formData.event_type === 'monthly') && (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-3">
                                                <label className="text-sm text-text-primary">Auto Enroll</label>
                                                <div className="relative group">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, is_auto_enroll: !formData.is_auto_enroll })}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                                            formData.is_auto_enroll ? 'bg-primary' : 'bg-gray-300'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                                                formData.is_auto_enroll ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                        />
                                                    </button>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                                        {formData.is_auto_enroll ? 'No' : 'Yes'}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-xs text-text-secondary">
                                                When enabled, registered customers will be automatically enrolled for the next occurrence.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingEvent(null);
                                        setFormData(emptyForm);
                                    }}
                                    disabled={submitLoading}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" loading={submitLoading}>
                                    {submitLoading ? (editingEvent ? 'Updating...' : 'Creating...') : (editingEvent ? 'Update' : 'Create')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={hideToast}
                />
            )}
            <PopupMessage
                open={popup.open}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                confirmText={popup.confirmText}
                cancelText={popup.cancelText}
                showCancel={popup.showCancel}
                onConfirm={popup.onConfirm}
                onClose={closePopup}
            />
        </div>
    );
}

export default SpecialEventsManagement;

