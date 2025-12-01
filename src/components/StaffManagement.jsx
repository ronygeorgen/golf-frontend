import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getStaff, createStaff, updateStaff, deleteStaff } from '../store/slices/adminSlice';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import Button from './ui/Button';
import Badge from './ui/Badge';

function StaffManagement() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { popup, openPopup, closePopup } = usePopup();
    const { list: staff, loading } = useAppSelector((state) => state.admin.staff);
    const modalRef = useRef(null);
    
    const [showForm, setShowForm] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'staff'
    });
    const [submitLoading, setSubmitLoading] = useState(false);
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

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowForm(false);
                setEditingStaff(null);
                setFormData({ first_name: '', last_name: '', email: '', phone: '', role: 'staff' });
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
            if (editingStaff) {
                await dispatch(updateStaff({ id: editingStaff.id, staffData: formData }));
            } else {
                await dispatch(createStaff(formData));
            }
            setShowForm(false);
            setEditingStaff(null);
            setFormData({ first_name: '', last_name: '', email: '', phone: '', role: 'staff' });
            // No need to refetch - Redux already updates the state optimistically
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
            role: staffMember.role
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
                await dispatch(deleteStaff(staffId));
            },
        });
    };

    return (
        <>
        <div className="max-w-7xl mx-auto">
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <Button 
                            onClick={() => setShowForm(true)}
                            variant="primary"
                        >
                            Add Staff Member
                        </Button>
                    </div>
                </div>

                {/* Staff Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(3px)' }} onClick={() => {
                        setShowForm(false);
                        setEditingStaff(null);
                        setFormData({ first_name: '', last_name: '', email: '', phone: '', role: 'staff' });
                    }}>
                        <div ref={modalRef} className="bg-surface rounded-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-text-primary mb-6">
                                    {editingStaff ? 'Edit Staff' : 'Add Staff'}
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
                                                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
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
                                                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
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
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Role
                                        </label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                                        >
                                            <option value="staff">Staff</option>
                                            <option value="admin">Admin</option>
                                        </select>
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
                                                : `${editingStaff ? 'Update' : 'Create'} Staff`}
                                        </Button>
                                        <Button 
                                            type="button" 
                                            variant="secondary"
                                            className="flex-1"
                                            onClick={() => {
                                                setShowForm(false);
                                                setEditingStaff(null);
                                                setFormData({ first_name: '', last_name: '', email: '', phone: '', role: 'staff' });
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
                                                        <button 
                                                            className="text-primary hover:text-primary-light transition-colors"
                                                            onClick={() => handleEdit(staffMember)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button 
                                                            className="text-danger hover:text-danger-light transition-colors"
                                                            onClick={() => handleDelete(staffMember.id)}
                                                        >
                                                            Delete
                                                        </button>
                                                        <button 
                                                            className="text-status-personal-text hover:text-status-personal-text/80 transition-colors"
                                                            onClick={() => navigate(`/admin/staff/${staffMember.id}/availability`)}
                                                        >
                                                            Availability
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
        </>
    );
}

export default StaffManagement;
