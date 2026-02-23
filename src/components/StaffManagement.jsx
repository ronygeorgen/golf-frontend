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
import Badge from './ui/Badge';
import { Edit, Trash2, Calendar, Users, UserCheck } from 'lucide-react';
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
        ghl_location_id: ''
    });
    const [ghlLocations, setGhlLocations] = useState([]);
    const [loadingLocations, setLoadingLocations] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
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
                    ghl_location_id: ''
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
            role: isSuperadmin ? staffMember.role : 'staff', // Regular admin can only edit as staff
            date_of_birth: staffMember.date_of_birth || '',
            ghl_location_id: staffMember.ghl_location_id || ''
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
                                    ghl_location_id: ''
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
                        setFormData({ first_name: '', last_name: '', email: '', phone: '', role: 'staff', date_of_birth: '' });
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
                                    {!isSuperadmin && (
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-2">
                                                Role
                                            </label>
                                            <select
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            >
                                                <option value="staff">Staff</option>
                                            </select>
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
                                        <input
                                            type="date"
                                            value={formData.date_of_birth}
                                            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                            max={new Date().toISOString().split('T')[0]}
                                            className="w-full px-4 py-2 border-2 border-border rounded-[10px] focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-surface"
                                            style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', minHeight: 44, fontSize: 16 }}
                                        />
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
                                                    ghl_location_id: ''
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
        </>
    );
}

export default StaffManagement;
