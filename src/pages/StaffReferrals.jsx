import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import { TableSkeleton } from '../components/skeletons/SkeletonLoader';
import Button from '../components/ui/Button';
import { Eye, Package as PackageIcon, X, ArrowLeft } from 'lucide-react';
import useToast from '../hooks/useToast';
import Toast from '../components/ui/Toast';

function StaffReferrals() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast, showSuccess, showError, hideToast } = useToast();
    
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showPackagesListModal, setShowPackagesListModal] = useState(false);
    const [selectedMemberPackages, setSelectedMemberPackages] = useState([]);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        count: 0,
        total_pages: 1,
        current_page: 1,
        page_size: 10
    });
    const [totalReferrals, setTotalReferrals] = useState(0);
    const [staffName, setStaffName] = useState('');

    const fetchReferrals = async (pageNum = 1) => {
        try {
            setLoading(true);
            const response = await apiClient.get(endpoints.admin.staff.referrals(id), {
                params: {
                    page: pageNum
                }
            });
            
            const data = response.data;
            setMembers(data.members || data.results || []);
            setTotalReferrals(data.total_referrals || data.count || 0);
            setPagination({
                count: data.count || 0,
                total_pages: data.total_pages || 1,
                current_page: data.current_page || pageNum,
                page_size: data.page_size || 10
            });
            
            // Try to get staff name from first member if available
            if (data.members && data.members.length > 0) {
                // We'll need to fetch staff details separately
                fetchStaffDetails();
            }
        } catch (error) {
            console.error('Error fetching referrals:', error);
            showError('Failed to load staff referrals');
        } finally {
            setLoading(false);
        }
    };

    const fetchStaffDetails = async () => {
        try {
            const response = await apiClient.get(endpoints.admin.staff.detail(id));
            if (response.data) {
                setStaffName(`${response.data.first_name} ${response.data.last_name}`);
            }
        } catch (error) {
            console.error('Error fetching staff details:', error);
        }
    };

    // Fetch referrals when component mounts or page changes
    useEffect(() => {
        if (id) {
            fetchReferrals(page);
            fetchStaffDetails();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, id]);

    const handleViewMember = (member) => {
        setSelectedMember(member);
        setShowModal(true);
    };

    const handleViewPackages = (member) => {
        if (member.staff_referred_purchases && member.staff_referred_purchases.length > 0) {
            setSelectedMemberPackages(member.staff_referred_purchases);
            setShowPackagesListModal(true);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedMember(null);
    };

    const closePackagesListModal = () => {
        setShowPackagesListModal(false);
        setSelectedMemberPackages([]);
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 w-full">
            <div className="w-full">
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Button
                            onClick={() => navigate('/admin/staff')}
                            variant="secondary"
                            className="p-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                                Staff Referrals
                            </h1>
                            {staffName && (
                                <p className="text-text-secondary mt-1">
                                    {staffName}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="bg-primary-light/10 border border-primary-light/20 rounded-card p-4">
                            <p className="text-lg font-semibold text-text-primary">
                                Total Referrals: <span className="text-primary">{totalReferrals}</span>
                            </p>
                            <p className="text-sm text-text-secondary mt-1">
                                Number of clients referred by this staff member
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                    {loading ? (
                        <TableSkeleton />
                    ) : members.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-text-secondary">No referrals found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Name</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Email</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Phone</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Staff Referred Packages</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map((member) => (
                                        <tr key={member.id} className="border-b border-border hover:bg-background transition-colors">
                                            <td className="py-3 px-4 text-sm text-text-primary">
                                                {member.first_name} {member.last_name}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-text-primary">{member.email}</td>
                                            <td className="py-3 px-4 text-sm text-text-primary">{member.phone}</td>
                                            <td 
                                                className="py-3 px-4 text-sm text-text-primary cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => handleViewPackages(member)}
                                            >
                                                {member.staff_referred_purchases && member.staff_referred_purchases.length > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="inline-block px-2 py-1 bg-primary-light/10 text-primary text-xs rounded-button">
                                                            {member.staff_referred_purchases[0].purchase_name}
                                                        </span>
                                                        {member.staff_referred_purchases.length > 1 && (
                                                            <span className="text-text-secondary">+{member.staff_referred_purchases.length - 1} more</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-text-secondary">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Button
                                                    onClick={() => handleViewMember(member)}
                                                    variant="secondary"
                                                    className="px-3 py-1 text-sm"
                                                >
                                                    <Eye className="w-4 h-4 inline mr-1" />
                                                    View
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {!loading && members.length > 0 && (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-6 pt-6 border-t border-border">
                            <p className="text-sm text-text-secondary">
                                Showing{' '}
                                {pagination.count === 0
                                    ? '0'
                                    : `${(page - 1) * pagination.page_size + 1} - ${Math.min(page * pagination.page_size, pagination.count)}`} of {pagination.count} referrals
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                    disabled={page <= 1}
                                    variant="secondary"
                                    className="px-3 py-1"
                                >
                                    Previous
                                </Button>
                                <span className="text-sm font-medium text-text-primary">
                                    Page {page} of {pagination.total_pages}
                                </span>
                                <Button
                                    onClick={() => setPage((prev) => Math.min(pagination.total_pages, prev + 1))}
                                    disabled={page >= pagination.total_pages}
                                    variant="secondary"
                                    className="px-3 py-1"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Member Details Modal */}
            {showModal && selectedMember && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-card shadow-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-text-primary">
                                    {selectedMember.first_name} {selectedMember.last_name}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-text-secondary hover:text-text-primary"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-sm font-medium text-text-secondary">Email</label>
                                    <p className="text-text-primary">{selectedMember.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-text-secondary">Phone</label>
                                    <p className="text-text-primary">{selectedMember.phone}</p>
                                </div>

                                <div className="border-t border-border pt-4 mt-4">
                                    <h3 className="text-lg font-semibold text-text-primary mb-3">Custom Fields</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-text-secondary">Total Coaching Sessions</label>
                                            <p className="text-text-primary">{selectedMember.custom_fields?.total_coaching_session || '0'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-text-secondary">Total Simulator Hours</label>
                                            <p className="text-text-primary">{selectedMember.custom_fields?.total_simulator_hour || '0'}</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-sm font-medium text-text-secondary">Last Active Package</label>
                                            <p className="text-text-primary">{selectedMember.custom_fields?.last_active_package || 'None'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-border pt-4 mt-4">
                                    <h3 className="text-lg font-semibold text-text-primary mb-3">Staff Referred Packages</h3>
                                    {selectedMember.staff_referred_purchases && selectedMember.staff_referred_purchases.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedMember.staff_referred_purchases.map((purchase) => (
                                                <div key={purchase.id} className="p-3 bg-background rounded-card">
                                                    <p className="font-medium text-text-primary">{purchase.purchase_name}</p>
                                                    <p className="text-sm text-text-secondary">
                                                        Purchased: {new Date(purchase.purchased_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-text-secondary">No packages referred yet</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button
                                    onClick={closeModal}
                                    variant="secondary"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Packages List Modal */}
            {showPackagesListModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-card shadow-card max-w-md w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-text-primary">Staff Referred Packages</h2>
                                <button
                                    onClick={closePackagesListModal}
                                    className="text-text-secondary hover:text-text-primary"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {selectedMemberPackages.length > 0 ? (
                                    selectedMemberPackages.map((purchase) => (
                                        <div key={purchase.id} className="p-3 bg-background rounded-card border border-border">
                                            <p className="font-medium text-text-primary">{purchase.purchase_name}</p>
                                            {purchase.purchased_at && (
                                                <p className="text-sm text-text-secondary mt-1">
                                                    Purchased: {new Date(purchase.purchased_at).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-text-secondary text-center py-4">No packages found</p>
                                )}
                            </div>

                            <div className="flex justify-end mt-6">
                                <Button
                                    onClick={closePackagesListModal}
                                    variant="secondary"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast && toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={hideToast}
                />
            )}
        </div>
    );
}

export default StaffReferrals;
