import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getPackages, createPackage, updatePackage, deletePackage } from '../store/slices/adminSlice';
import { getStaff } from '../store/slices/adminSlice';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Edit, Power, PowerOff, Trash2, X, Users, FileText } from 'lucide-react';

function PackageManagement() {
    const dispatch = useAppDispatch();
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const { list: packages, loading: packagesLoading } = useAppSelector((state) => state.admin.packages);
    const { list: staff } = useAppSelector((state) => state.admin.staff);
    const modalRef = useRef(null);
    
    const [showForm, setShowForm] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);
    const emptyForm = {
        title: '',
        description: '',
        price: '',
        staff_members: [],
        session_count: 5,
        session_duration_minutes: 60,
        simulator_hours: 0,
        redirect_url: '',
        is_active: true,
        is_tpi_assessment: false
    };
    const [formData, setFormData] = useState(emptyForm);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [togglingActive, setTogglingActive] = useState({});
    const [deleting, setDeleting] = useState({});
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [selectedPackageStaff, setSelectedPackageStaff] = useState([]);
    const [showDescriptionModal, setShowDescriptionModal] = useState(false);
    const [selectedDescription, setSelectedDescription] = useState('');
    const [selectedPackageTitle, setSelectedPackageTitle] = useState('');
    const handlePopupConfirm = async () => {
        const action = popup.onConfirm;
        closePopup();
        if (action) {
            await action();
        }
    };

    useEffect(() => {
        dispatch(getPackages());
        dispatch(getStaff());
    }, [dispatch]);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowForm(false);
                setEditingPackage(null);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Filter out null, undefined, or invalid staff member IDs
        const cleanedStaffMembers = formData.staff_members.filter(
            id => id !== null && id !== undefined && !isNaN(id)
        );
        
        const cleanedFormData = {
            ...formData,
            staff_members: cleanedStaffMembers
        };

        setSubmitLoading(true);
        try {
            if (editingPackage) {
                const result = await dispatch(updatePackage({ id: editingPackage.id, packageData: cleanedFormData }));
                if (updatePackage.fulfilled.match(result)) {
                    showSuccess('Package updated successfully');
                    setShowForm(false);
                    setEditingPackage(null);
                    setFormData(emptyForm);
                } else {
                    showError(result.payload?.error || 'Failed to update package');
                }
            } else {
                const result = await dispatch(createPackage(cleanedFormData));
                if (createPackage.fulfilled.match(result)) {
                    showSuccess('Package created successfully');
                    setShowForm(false);
                    setEditingPackage(null);
                    setFormData(emptyForm);
                } else {
                    showError(result.payload?.error || 'Failed to create package');
                }
            }
        } catch (error) {
            showError('An unexpected error occurred');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEdit = (pkg) => {
        setEditingPackage(pkg);
        // Safely extract staff member IDs from staff_members_details (full objects) or staff_members (IDs)
        const staffMembers = pkg.staff_members_details || pkg.staff_members || [];
        const staffMemberIds = staffMembers
            .map(staff => {
                // If staff is an object, get the id, otherwise it's already an ID
                return typeof staff === 'object' ? staff?.id : staff;
            })
            .filter(id => id !== null && id !== undefined && !isNaN(id));
        
        setFormData({
            title: pkg.title,
            description: pkg.description,
            price: pkg.price,
            staff_members: staffMemberIds,
            session_count: pkg.session_count || 1,
            session_duration_minutes: pkg.session_duration_minutes || 60,
            simulator_hours: pkg.simulator_hours || 0,
            redirect_url: pkg.redirect_url || '',
            is_active: pkg.is_active,
            is_tpi_assessment: pkg.is_tpi_assessment || false
        });
        setShowForm(true);
    };

    const handleStaffSelection = (staffId) => {
        const updatedStaff = formData.staff_members.includes(staffId)
            ? formData.staff_members.filter(id => id !== staffId)
            : [...formData.staff_members, staffId];
        
        setFormData({...formData, staff_members: updatedStaff});
    };

    const handleToggleActive = async (packageId, isActive) => {
        setTogglingActive({ ...togglingActive, [packageId]: true });
        try {
            const result = await dispatch(updatePackage({ id: packageId, packageData: { is_active: !isActive } }));
            if (updatePackage.fulfilled.match(result)) {
                showSuccess(`Package ${!isActive ? 'activated' : 'deactivated'} successfully`);
            } else {
                showError(result.payload?.error || `Failed to ${!isActive ? 'activate' : 'deactivate'} package`);
            }
        } catch (error) {
            showError('An unexpected error occurred');
        } finally {
            setTogglingActive({ ...togglingActive, [packageId]: false });
        }
    };

    const handleDelete = async (packageId) => {
        openPopup({
            type: 'warning',
            title: 'Delete package?',
            message: 'This will remove the package and its assigned staff.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                closePopup();
                setDeleting({ ...deleting, [packageId]: true });
                try {
                    const result = await dispatch(deletePackage(packageId));
                    if (deletePackage.fulfilled.match(result)) {
                        showSuccess('Package deleted successfully');
                    } else {
                        showError(result.payload?.error || 'Failed to delete package');
                    }
                } catch (error) {
                    showError('An unexpected error occurred');
                } finally {
                    setDeleting({ ...deleting, [packageId]: false });
                }
            },
        });
    };

    const truncateUrl = (url, maxLength = 15) => {
        try {
          // Remove protocol (http:// or https://)
          const noProtocol = url.replace(/^https?:\/\//, '');
      
          // If noProtocol is shorter than maxLength, just return it
          if (noProtocol.length <= maxLength) return noProtocol;
      
          // Truncate with ellipsis, preserving start and some of the path
          return noProtocol.slice(0, maxLength - 3) + '...';
        } catch {
          return url;
        }
      }
      

    return (
        <>
        <div>
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <Button 
                            onClick={() => setShowForm(true)}
                            variant="primary"
                        >
                            Add Package
                        </Button>
                    </div>
                </div>

                {/* Package Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(3px)' }} onClick={() => {
                        setShowForm(false);
                        setEditingPackage(null);
                        setFormData(emptyForm);
                    }}>
                        <div ref={modalRef} className="bg-surface rounded-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-text-primary mb-6">
                                    {editingPackage ? 'Edit Package' : 'Add Package'}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Package Title
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                            rows="4"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Price ($)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-2">
                                                Sessions Included
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.session_count}
                                                onChange={(e) => setFormData({...formData, session_count: parseInt(e.target.value, 10) || 1})}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-2">
                                                Session Duration (minutes)
                                            </label>
                                            <input
                                                type="number"
                                                min="15"
                                                step="15"
                                                value={formData.session_duration_minutes}
                                                onChange={(e) => setFormData({...formData, session_duration_minutes: parseInt(e.target.value, 10) || 60})}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Simulator Hours Included
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={formData.simulator_hours}
                                            onChange={(e) => setFormData({...formData, simulator_hours: parseFloat(e.target.value) || 0})}
                                        />
                                        <p className="mt-1 text-xs text-text-secondary">
                                            Number of simulator hours included in this package (for simulator bookings)
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Redirect URL (Optional)
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.redirect_url}
                                            onChange={(e) => setFormData({...formData, redirect_url: e.target.value})}
                                            placeholder="https://example.com/redirect"
                                        />
                                        <p className="mt-1 text-xs text-text-secondary">
                                            URL to redirect users to after purchasing this package
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Assigned Staff
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-border rounded-lg p-4">
                                            {staff.map(staffMember => (
                                                <label key={staffMember.id} className="flex items-center space-x-2 cursor-pointer hover:bg-background p-2 rounded transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.staff_members.includes(staffMember.id)}
                                                        onChange={() => handleStaffSelection(staffMember.id)}
                                                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                                    />
                                                    <span className="text-sm text-text-primary">
                                                        {staffMember.first_name} {staffMember.last_name}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                            className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                        />
                                        <label className="ml-2 text-sm font-medium text-text-primary">
                                            Active
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_tpi_assessment}
                                            onChange={(e) => setFormData({...formData, is_tpi_assessment: e.target.checked})}
                                            className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                        />
                                        <label className="ml-2 text-sm font-medium text-text-primary">
                                            TPI Assessment Package (Non-transferable, personal use only)
                                        </label>
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <Button 
                                            type="submit" 
                                            disabled={submitLoading}
                                            variant="primary"
                                            className="flex-1"
                                        >
                                            {submitLoading
                                                ? (editingPackage ? 'Updating...' : 'Creating...')
                                                : `${editingPackage ? 'Update' : 'Create'} Package`}
                                        </Button>
                                        <Button 
                                            type="button" 
                                            variant="secondary"
                                            className="flex-1"
                                            onClick={() => {
                                                setShowForm(false);
                                                setEditingPackage(null);
                                                setFormData(emptyForm);
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

                {/* Packages List */}
                {packagesLoading ? (
                    <TableSkeleton rows={5} cols={6} />
                ) : (
                    <div className="bg-surface rounded-card shadow-card overflow-hidden">
                        {packages.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-text-secondary text-lg">No packages found. Add your first package.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-background">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Title
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Description
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Price
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Sessions
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Session Length
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Simulator Hours
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Redirect URL
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Staff Members
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-surface divide-y divide-border">
                                        {packages.map(pkg => (
                                            <tr key={pkg.id} className="hover:bg-background transition-colors">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                                                    {pkg.title}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-text-secondary max-w-xs">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDescription(pkg.description || 'No description available');
                                                            setSelectedPackageTitle(pkg.title);
                                                            setShowDescriptionModal(true);
                                                        }}
                                                        className="text-text-secondary hover:text-primary transition-colors cursor-pointer text-left truncate block w-full"
                                                        title="Click to view full description"
                                                    >
                                                        {pkg.description || <span className="text-text-secondary italic">No description</span>}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-accent">
                                                    ${pkg.price}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary">
                                                    {pkg.session_count}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary">
                                                    {pkg.session_duration_minutes} min
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary">
                                                    {pkg.simulator_hours || 0} hrs
                                                </td>
                                                <td className="px-4 py-4 text-sm text-text-primary max-w-xs truncate">
                                                    {pkg.redirect_url ? (
                                                        <a 
                                                            href={pkg.redirect_url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:text-primary-light underline transition-colors"
                                                        >
                                                            {truncateUrl(pkg.redirect_url, 20)}
                                                        </a>
                                                    ) : (
                                                        <span className="text-text-secondary">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {pkg.staff_members_details && pkg.staff_members_details.length > 0 ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedPackageStaff(pkg.staff_members_details);
                                                                setShowStaffModal(true);
                                                            }}
                                                            className="text-primary hover:text-primary-light transition-colors cursor-pointer text-sm"
                                                            title="Click to view all staff members"
                                                        >
                                                            {pkg.staff_members_details[0].first_name} {pkg.staff_members_details[0].last_name}
                                                            {pkg.staff_members_details.length > 1 && ' ...'}
                                                        </button>
                                                    ) : (
                                                        <span className="text-text-secondary text-sm">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <Badge status={pkg.is_active ? 'confirmed' : 'cancelled'}>
                                                        {pkg.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex gap-2">
                                                        <button 
                                                            className="text-primary hover:text-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            onClick={() => handleEdit(pkg)}
                                                            disabled={togglingActive[pkg.id] || deleting[pkg.id]}
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            className={`${
                                                                pkg.is_active 
                                                                    ? 'text-accent hover:text-accent-dark' 
                                                                    : 'text-status-confirmed-text hover:text-status-confirmed-text/80'
                                                            } transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                                                            onClick={() => handleToggleActive(pkg.id, pkg.is_active)}
                                                            disabled={togglingActive[pkg.id] || deleting[pkg.id]}
                                                            title={pkg.is_active ? 'Deactivate' : 'Activate'}
                                                        >
                                                            {togglingActive[pkg.id] ? (
                                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                            ) : pkg.is_active ? (
                                                                <PowerOff className="w-4 h-4" />
                                                            ) : (
                                                                <Power className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                        <button 
                                                            className="text-danger hover:text-danger-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            onClick={() => handleDelete(pkg.id)}
                                                            disabled={togglingActive[pkg.id] || deleting[pkg.id]}
                                                            title="Delete"
                                                        >
                                                            {deleting[pkg.id] ? (
                                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </button>
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

            {/* Staff Members Modal */}
            {showStaffModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowStaffModal(false)}>
                    <div className="bg-surface rounded-card shadow-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Staff Members
                            </h2>
                            <button
                                onClick={() => setShowStaffModal(false)}
                                className="text-text-secondary hover:text-text-primary transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {selectedPackageStaff.length > 0 ? (
                                selectedPackageStaff.map((staff, index) => (
                                    <div
                                        key={staff.id}
                                        className="flex items-center gap-3 p-3 bg-background rounded-button border border-border hover:border-primary transition-colors"
                                    >
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-text-primary">
                                                {staff.first_name} {staff.last_name}
                                            </p>
                                            {staff.email && (
                                                <p className="text-xs text-text-secondary mt-1">{staff.email}</p>
                                            )}
                                        </div>
                                        <Badge status="pending">Staff</Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-text-secondary text-center py-4">No staff members assigned</p>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <Button
                                variant="secondary"
                                onClick={() => setShowStaffModal(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Description Modal */}
            {showDescriptionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDescriptionModal(false)}>
                    <div className="bg-surface rounded-card shadow-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Package Description
                            </h2>
                            <button
                                onClick={() => setShowDescriptionModal(false)}
                                className="text-text-secondary hover:text-text-primary transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="mb-4">
                            <p className="text-sm font-medium text-text-secondary mb-1">Package:</p>
                            <p className="text-lg font-semibold text-text-primary">{selectedPackageTitle}</p>
                        </div>
                        <div className="bg-background rounded-button border border-border p-4">
                            <p className="text-text-primary whitespace-pre-wrap break-words">
                                {selectedDescription}
                            </p>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <Button
                                variant="secondary"
                                onClick={() => setShowDescriptionModal(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default PackageManagement;
