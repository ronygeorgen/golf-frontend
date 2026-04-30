import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getStaff, createStaff, updateStaff, deleteStaff } from '../store/slices/adminSlice';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import Button from './ui/Button';
import DateInput from './ui/DateInput';
import Badge from './ui/Badge';
import { Edit, Trash2, Calendar, Users, UserCheck, Layers } from 'lucide-react';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';

function StaffManagement() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showError, showSuccess, hideToast } = useToast();
    const { list: staff, loading } = useAppSelector((state) => state.admin.staff);
    const { user } = useAppSelector((state) => state.auth);
    const modalRef = useRef(null);

    const isSuperadmin = user?.role === 'superadmin';

    const [showForm, setShowForm] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: isSuperadmin ? 'admin' : 'staff',
        date_of_birth: '',
        ghl_location_id: '',
        calendar_color: '#2563EB'
    });
    const [ghlLocations, setGhlLocations] = useState([]);
    const [loadingLocations, setLoadingLocations] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Phase D: categories modal
    const [catModalStaff, setCatModalStaff] = useState(null);   // staff row being edited
    const [allCategories, setAllCategories] = useState([]);
    const [assignedCatIds, setAssignedCatIds] = useState([]);   // currently checked IDs
    const [catLoading, setCatLoading] = useState(false);
    const [catSaving, setCatSaving] = useState(false);

    const openCatModal = async (staffMember) => {
        setCatModalStaff(staffMember);
        setCatLoading(true);
        try {
            const [catsRes, assignedRes] = await Promise.all([
                apiClient.get(endpoints.categories.active),
                apiClient.get(endpoints.admin.staff.categories(staffMember.id)),
            ]);
            setAllCategories(Array.isArray(catsRes.data) ? catsRes.data : []);
            const ids = Array.isArray(assignedRes.data)
                ? assignedRes.data.map((a) => a.category_id)
                : [];
            setAssignedCatIds(ids);
        } catch {
            showError('Failed to load categories');
            setCatModalStaff(null);
        } finally {
            setCatLoading(false);
        }
    };

    const toggleCatId = (id) => {
        setAssignedCatIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const saveCatAssignments = async () => {
        if (!catModalStaff) return;
        setCatSaving(true);
        try {
            await apiClient.put(endpoints.admin.staff.categories(catModalStaff.id), {
                category_ids: assignedCatIds,
            });
            showSuccess('Categories updated');
            setCatModalStaff(null);
            dispatch(getStaff());
        } catch {
            showError('Failed to save categories');
        } finally {
            setCatSaving(false);
        }
    };

    const handlePopupConfirm = async () => {
        const action = popup.onConfirm;
        closePopup();
        if (action) {
            await action();
        }
    };

    useEffect(() => {
        dispatch(getStaff());
    }, [dispatch]);

    // Fetch GHL locations if superadmin
    useEffect(() => {
        const fetchGhlLocations = async () => {
            if (isSuperadmin) {
                try {
                    setLoadingLocations(true);
                    const response = await apiClient.get(endpoints.ghl.admin.locations);
                    if (response.data && response.data.locations) {
                        setGhlLocations(response.data.locations);
                    }
                } catch (error) {
                    console.error('Failed to fetch GHL locations:', error);
                } finally {
                    setLoadingLocations(false);
                }
            }
        };
        fetchGhlLocations();
    }, [isSuperadmin]);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowForm(false);
                setEditingStaff(null);
                setFormData({ first_name: '', last_name: '', email: '', phone: '', role: 'staff', date_of_birth: '' });
            }
        };

        if (showForm) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showForm]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            // For superadmin creating admin, ensure location_id is provided
            if (isSuperadmin && !editingStaff && !formData.ghl_location_id) {
                showError('Please select a location for the admin.');
                setSubmitLoading(false);
                return;
            }

            const submitData = { ...formData };
            // Remove location_id from formData if not superadmin (regular admin uses their own location)
            if (!isSuperadmin) {
                delete submitData.ghl_location_id;
            }

            let result;
            if (editingStaff) {
                result = await dispatch(updateStaff({ id: editingStaff.id, staffData: submitData }));
            } else {
                result = await dispatch(createStaff(submitData));
            }

            // Check if the action was successful
            if (editingStaff ? updateStaff.fulfilled.match(result) : createStaff.fulfilled.match(result)) {
                showSuccess(editingStaff ? 'Staff member updated successfully!' : 'Staff member created successfully!');
                setShowForm(false);
                setEditingStaff(null);
                setFormData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    phone: '',
                    role: isSuperadmin ? 'admin' : 'staff',
                    date_of_birth: '',
                    ghl_location_id: '',
                    calendar_color: '#2563EB'
                });
                // No need to refetch - Redux already updates the state optimistically
            } else if (editingStaff ? updateStaff.rejected.match(result) : createStaff.rejected.match(result)) {
                // Handle error - parse error message from payload
                let errorMessage = 'An error occurred. Please try again.';

                if (result.payload) {
                    // Handle different error response formats
                    if (typeof result.payload === 'string') {
                        errorMessage = result.payload;
                    } else if (Array.isArray(result.payload)) {
                        errorMessage = result.payload.join(' ');
                    } else if (typeof result.payload === 'object') {
                        // Handle object with field errors like { phone: "error message", email: "error message" }
                        const errorMessages = [];
                        for (const [key, value] of Object.entries(result.payload)) {
                            if (Array.isArray(value)) {
                                errorMessages.push(...value);
                            } else if (typeof value === 'string') {
                                errorMessages.push(value);
                            }
                        }
                        errorMessage = errorMessages.length > 0
                            ? errorMessages.join('. ')
                            : result.payload.error || result.payload.detail || result.payload.message || errorMessage;
                    }
                }

                showError(errorMessage);
            }
        } catch (error) {
            // Handle unexpected errors
            showError(error.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEdit = (staffMember) => {
        setEditingStaff(staffMember);
        setFormData({
            first_name: staffMember.first_name,
            last_name: staffMember.last_name,
            email: staffMember.email,
            phone: staffMember.phone,
            role: staffMember.role || 'staff',
            date_of_birth: staffMember.date_of_birth || '',
            ghl_location_id: staffMember.ghl_location_id || '',
            calendar_color: staffMember.calendar_color || '#2563EB'
        });
        setShowForm(true);
    };

    const handleDelete = async (staffId) => {
        openPopup({
            type: 'warning',
            title: 'Delete staff?',
            message: 'This will permanently remove the staff member and their availability.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                setDeletingId(staffId);
                try {
                    const result = await dispatch(deleteStaff(staffId));
                    if (deleteStaff.fulfilled.match(result)) {
                        closePopup();
                    }
                } catch (error) {
                    console.error('Error deleting staff:', error);
                } finally {
                    setDeletingId(null);
                }
            },
        });
    };

    return (
        <>
            <div>
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <Button
                            onClick={() => {
                                setFormData({
                                    first_name: '',
                                    last_name: '',
                                    email: '',
                                    phone: '',
                                    role: isSuperadmin ? 'admin' : 'staff',
                                    date_of_birth: '',
                                    ghl_location_id: '',
                                    calendar_color: '#2563EB'
                                });
                                setShowForm(true);
                            }}
                            variant="primary"
                        >
                            {isSuperadmin ? 'Add Admin' : (user?.role === 'admin' ? 'Add Staff' : 'Add Staff Member')}
                        </Button>
                    </div>
                </div>

                {/* Staff Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(3px)' }} onClick={() => {
                        setShowForm(false);
                        setEditingStaff(null);
                        setFormData({ first_name: '', last_name: '', email: '', phone: '', role: 'staff', date_of_birth: '', calendar_color: '#2563EB' });
                    }}>
                        <div ref={modalRef} className="bg-surface rounded-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-text-primary mb-6">
                                    {editingStaff ?
                                        (isSuperadmin ? 'Edit Admin' : (user?.role === 'admin' ? 'Edit Staff' : 'Edit Staff')) :
                                        (isSuperadmin ? 'Add Admin' : (user?.role === 'admin' ? 'Add Staff' : 'Add Staff'))}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-2">
                                                First Name
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.first_name}
                                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-2">
                                                Last Name
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.last_name}
                                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Phone
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                    {(isSuperadmin || user?.role === 'admin') ? (
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-2">
                                                Role
                                            </label>
                                            <select
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                            >
                                                <option value="staff">Staff Member</option>
                                                <option value="admin">Administrator</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-2">
                                                Role
                                            </label>
                                            <div className="w-full px-4 py-3 border border-border rounded-button bg-muted text-text-secondary select-none">
                                                {formData.role === 'admin' ? 'Administrator' : 'Staff Member'}
                                            </div>
                                        </div>
                                    )}
                                    {isSuperadmin && !editingStaff && (
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-2">
                                                Location <span className="text-danger">*</span>
                                            </label>
                                            {loadingLocations ? (
                                                <div className="w-full px-4 py-3 border border-border rounded-button bg-background text-text-secondary text-center">
                                                    Loading locations...
                                                </div>
                                            ) : (
                                                <select
                                                    value={formData.ghl_location_id}
                                                    onChange={(e) => setFormData({ ...formData, ghl_location_id: e.target.value })}
                                                    className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                                    required
                                                >
                                                    <option value="">Select a location</option>
                                                    {ghlLocations.map((location) => (
                                                        <option key={location.location_id} value={location.location_id}>
                                                            {location.company_name || location.location_id}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Date of Birth <span className="text-text-secondary text-xs">(Optional)</span>
                                        </label>
                                        <DateInput
                                            value={formData.date_of_birth}
                                            onChange={(val) => setFormData({ ...formData, date_of_birth: val })}
                                            max={new Date().toISOString().split('T')[0]}
                                            placeholder="Select date of birth"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Calendar Color
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={formData.calendar_color}
                                                onChange={(e) => setFormData({ ...formData, calendar_color: e.target.value })}
                                                className="w-12 h-10 p-1 rounded border border-border cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={formData.calendar_color}
                                                onChange={(e) => setFormData({ ...formData, calendar_color: e.target.value })}
                                                className="flex-1"
                                                placeholder="#000000"
                                            />
                                        </div>
                                        <p className="text-xs text-text-secondary mt-1">This color will represent the coach on the bookings calendar.</p>
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <Button
                                            type="submit"
                                            disabled={submitLoading}
                                            variant="primary"
                                            className="flex-1"
                                        >
                                            {submitLoading
                                                ? (editingStaff ? 'Updating...' : 'Creating...')
                                                : `${editingStaff ? 'Update' : 'Create'} ${isSuperadmin ? 'Admin' : (user?.role === 'admin' ? 'Staff' : 'Staff')}`}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="flex-1"
                                            onClick={() => {
                                                setShowForm(false);
                                                setEditingStaff(null);
                                                setFormData({
                                                    first_name: '',
                                                    last_name: '',
                                                    email: '',
                                                    phone: '',
                                                    role: isSuperadmin ? 'admin' : 'staff',
                                                    date_of_birth: '',
                                                    ghl_location_id: '',
                                                    calendar_color: '#2563EB'
                                                });
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Staff List */}
                {loading ? (
                    <TableSkeleton rows={5} cols={5} />
                ) : (
                    <div className="bg-surface rounded-card shadow-card overflow-hidden">
                        {staff.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-text-secondary text-lg">No staff members found. Add your first staff member.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-background">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Email
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Phone
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Role
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Color
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-surface divide-y divide-border">
                                        {staff.map(staffMember => (
                                            <tr key={staffMember.id} className="hover:bg-background transition-colors">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                                                    {staffMember.first_name} {staffMember.last_name}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                                                    {staffMember.email}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                                                    {staffMember.phone}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <Badge status={staffMember.role === 'admin' ? 'personal' : 'pending'}>
                                                        {staffMember.role}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-4 h-4 rounded-full border border-border shadow-sm"
                                                            style={{ backgroundColor: staffMember.calendar_color || '#2563EB' }}
                                                        />
                                                        <span className="text-xs text-text-secondary uppercase font-mono">
                                                            {staffMember.calendar_color || '#2563EB'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex gap-2">
                                                        <div className="relative group">
                                                            <button
                                                                className="p-2 text-primary hover:text-primary-light hover:bg-primary-light/10 rounded-button transition-colors"
                                                                onClick={() => handleEdit(staffMember)}
                                                                aria-label="Edit staff member"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                                                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                                                                    Edit
                                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                                                        <div className="border-4 border-transparent border-t-gray-900"></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="relative group">
                                                            <button
                                                                className="p-2 text-danger hover:text-danger-light hover:bg-danger/10 rounded-button transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                onClick={() => handleDelete(staffMember.id)}
                                                                disabled={deletingId === staffMember.id}
                                                                aria-label="Delete staff member"
                                                            >
                                                                {deletingId === staffMember.id ? (
                                                                    <div className="w-4 h-4 border-2 border-danger border-t-transparent rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <Trash2 className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                                                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                                                                    Delete
                                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                                                        <div className="border-4 border-transparent border-t-gray-900"></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="relative group">
                                                            <button
                                                                className="p-2 text-status-personal-text hover:text-status-personal-text/80 hover:bg-status-personal-bg/20 rounded-button transition-colors"
                                                                onClick={() => navigate(`/admin/staff/${staffMember.id}/availability`)}
                                                                aria-label="Add and view availability"
                                                            >
                                                                <Calendar className="w-4 h-4" />
                                                            </button>
                                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                                                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                                                                    Add and view availability
                                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                                                        <div className="border-4 border-transparent border-t-gray-900"></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="relative group">
                                                            <button
                                                                className="p-2 text-status-confirmed-text hover:text-status-confirmed-text/80 hover:bg-status-confirmed-bg/20 rounded-button transition-colors"
                                                                onClick={() => navigate(`/admin/staff/${staffMember.id}/coaching-sessions`)}
                                                                aria-label={`View ${staffMember.first_name}'s coaching sessions`}
                                                            >
                                                                <Users className="w-4 h-4" />
                                                            </button>
                                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                                                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                                                                    View {staffMember.first_name}'s coaching sessions
                                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                                                        <div className="border-4 border-transparent border-t-gray-900"></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="relative group">
                                                            <button
                                                                className="p-2 text-status-pending-text hover:text-status-pending-text/80 hover:bg-status-pending-bg/20 rounded-button transition-colors"
                                                                onClick={() => openCatModal(staffMember)}
                                                                aria-label="Manage service categories"
                                                            >
                                                                <Layers className="w-4 h-4" />
                                                            </button>
                                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                                                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                                                                    Manage categories
                                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                                                        <div className="border-4 border-transparent border-t-gray-900"></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="relative group">
                                                            <button
                                                                className="p-2 text-primary hover:text-primary-light hover:bg-primary-light/10 rounded-button transition-colors"
                                                                onClick={() => navigate(`/admin/staff/${staffMember.id}/referrals`)}
                                                                aria-label="View staff referrals"
                                                            >
                                                                <UserCheck className="w-4 h-4" />
                                                            </button>
                                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                                                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                                                                    View staff referrals
                                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                                                        <div className="border-4 border-transparent border-t-gray-900"></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
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
            <PopupMessage
                open={popup.open}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                confirmText={popup.confirmText}
                cancelText={popup.cancelText}
                showCancel={popup.showCancel}
                onConfirm={popup.onConfirm ? handlePopupConfirm : closePopup}
                onClose={closePopup}
            />
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={hideToast}
                />
            )}

            {/* Phase D: Staff Categories Modal */}
            {catModalStaff && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-card shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <Layers className="w-5 h-5" />
                                Categories — {catModalStaff.first_name} {catModalStaff.last_name}
                            </h3>
                            <button
                                onClick={() => setCatModalStaff(null)}
                                className="text-text-secondary hover:text-text-primary transition-colors"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {catLoading ? (
                                <p className="text-sm text-text-secondary text-center py-4">Loading…</p>
                            ) : allCategories.length === 0 ? (
                                <p className="text-sm text-text-secondary text-center py-4">
                                    No active categories found. Create categories first in Manage → Manage Categories.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-xs text-text-secondary mb-3">
                                        Select the service categories this staff member can deliver.
                                    </p>
                                    {allCategories.map((cat) => (
                                        <label
                                            key={cat.id}
                                            className="flex items-center gap-3 p-3 rounded-button border border-border hover:bg-background cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={assignedCatIds.includes(cat.id)}
                                                onChange={() => toggleCatId(cat.id)}
                                                className="w-4 h-4 accent-primary"
                                            />
                                            <span className="text-sm font-medium text-text-primary">{cat.name}</span>
                                            {cat.customer_label && cat.customer_label !== cat.name && (
                                                <span className="text-xs text-text-secondary">({cat.customer_label})</span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-border flex gap-3">
                            <button
                                disabled={catSaving || catLoading}
                                onClick={saveCatAssignments}
                                className="flex-1 py-2.5 px-4 rounded-button bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {catSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                                onClick={() => setCatModalStaff(null)}
                                className="flex-1 py-2.5 px-4 rounded-button border border-border text-text-primary font-semibold hover:bg-background transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default StaffManagement;
