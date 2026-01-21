import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getStaff } from '../store/slices/adminSlice';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import { TableSkeleton } from '../components/skeletons/SkeletonLoader';
import Button from '../components/ui/Button';
import { Eye, Package as PackageIcon, X, ArrowLeft } from 'lucide-react';
import useToast from '../hooks/useToast';
import Toast from '../components/ui/Toast';
import DateRangePicker from '../components/DateRangePicker';

function StaffReferrals() {
    const { id: initialId } = useParams();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const { list: staffList, loading: staffListLoading } = useAppSelector((state) => state.admin.staff);
    
    const [selectedStaffId, setSelectedStaffId] = useState(initialId || '');
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
    const [totalSales, setTotalSales] = useState('0.00');
    const [staffName, setStaffName] = useState('');
    const [dateRange, setDateRange] = useState({
        from_date: '',
        to_date: ''
    });
    const dateFilterTimeoutRef = useRef(null);

    // Fetch staff list on mount
    useEffect(() => {
        dispatch(getStaff());
    }, [dispatch]);

    // Update selected staff ID when URL param changes
    useEffect(() => {
        if (initialId) {
            setSelectedStaffId(initialId);
        }
    }, [initialId]);

    const fetchReferrals = async (pageNum = 1) => {
        if (!selectedStaffId) return;
        
        try {
            setLoading(true);
            // Clear previous data immediately to show loading state
            setMembers([]);
            setTotalReferrals(0);
            setTotalSales('0.00');
            
            const params = {
                page: pageNum
            };
            
            // Add date filters if provided - convert to UTC
            if (dateRange.from_date) {
                // Treat the selected date as UTC at start of day (00:00:00 UTC)
                // Format: YYYY-MM-DD -> YYYY-MM-DDTHH:mm:ss.sssZ
                params.from_date = `${dateRange.from_date}T00:00:00.000Z`;
            }
            if (dateRange.to_date) {
                // Treat the selected date as UTC at end of day (23:59:59.999 UTC)
                // Format: YYYY-MM-DD -> YYYY-MM-DDTHH:mm:ss.sssZ
                params.to_date = `${dateRange.to_date}T23:59:59.999Z`;
            }
            
            const response = await apiClient.get(endpoints.admin.staff.referrals(selectedStaffId), {
                params
            });
            
            const data = response.data;
            // Always update state, even if empty - ensure we use the actual response data
            const membersList = Array.isArray(data.members) ? data.members : (Array.isArray(data.results) ? data.results : []);
            setMembers(membersList);
            setTotalReferrals(data.total_referrals !== undefined ? data.total_referrals : (data.count !== undefined ? data.count : 0));
            setTotalSales(data.total_sales !== undefined ? data.total_sales : '0.00');
            setPagination({
                count: data.count !== undefined ? data.count : 0,
                total_pages: data.total_pages !== undefined ? data.total_pages : 1,
                current_page: data.current_page !== undefined ? data.current_page : pageNum,
                page_size: data.page_size !== undefined ? data.page_size : 10
            });
            
            // Fetch staff details
            fetchStaffDetails();
        } catch (error) {
            console.error('Error fetching referrals:', error);
            showError('Failed to load staff referrals');
            // Clear state on error
            setMembers([]);
            setTotalReferrals(0);
            setTotalSales('0.00');
        } finally {
            setLoading(false);
        }
    };

    const fetchStaffDetails = async () => {
        if (!selectedStaffId) return;
        
        try {
            const response = await apiClient.get(endpoints.admin.staff.detail(selectedStaffId));
            if (response.data) {
                setStaffName(`${response.data.first_name} ${response.data.last_name}`);
            }
        } catch (error) {
            console.error('Error fetching staff details:', error);
        }
    };

    // Fetch referrals when staff changes
    useEffect(() => {
        if (selectedStaffId) {
            setPage(1);
            fetchReferrals(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStaffId]);

    // Fetch when both dates are selected (no debounce needed since user completes selection)
    useEffect(() => {
        if (!selectedStaffId) return;
        
        // Only fetch if both dates are provided
        if (dateRange.from_date && dateRange.to_date) {
            // Clear existing timeout
            if (dateFilterTimeoutRef.current) {
                clearTimeout(dateFilterTimeoutRef.current);
            }
            
            // Clear state immediately to show loading
            setLoading(true);
            setMembers([]);
            setTotalReferrals(0);
            setTotalSales('0.00');
            
            // Fetch immediately when both dates are selected
            setPage(1);
            fetchReferrals(1);
        } else if (!dateRange.from_date && !dateRange.to_date) {
            // If both dates are cleared, fetch without date filter
            setPage(1);
            fetchReferrals(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange.from_date, dateRange.to_date]);

    // Fetch referrals when page changes
    useEffect(() => {
        if (selectedStaffId) {
            fetchReferrals(page);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const handleStaffChange = (staffId) => {
        setSelectedStaffId(staffId);
        navigate(`/admin/staff/${staffId}/referrals`);
    };

    const clearDateFilter = () => {
        setDateRange({ from_date: '', to_date: '' });
        setPage(1);
    };

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
                        <div className="flex-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                                Staff Referrals
                            </h1>
                        </div>
                    </div>
                    
                    {/* Staff Selector */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Select Staff Member
                        </label>
                        <select
                            value={selectedStaffId}
                            onChange={(e) => handleStaffChange(e.target.value)}
                            className="w-full md:w-auto px-4 py-2 border border-border rounded-button bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                            disabled={staffListLoading}
                        >
                            <option value="">Select a staff member</option>
                            {staffList.map((staff) => (
                                <option key={staff.id} value={staff.id}>
                                    {staff.first_name} {staff.last_name} ({staff.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range Filter */}
                    {selectedStaffId && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Filter by Date Range
                            </label>
                            <DateRangePicker
                                value={dateRange}
                                onChange={(newRange) => {
                                    setDateRange(newRange);
                                }}
                                onClear={clearDateFilter}
                            />
                        </div>
                    )}

                    {/* Stats Cards */}
                    {selectedStaffId && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-primary-light/10 border border-primary-light/20 rounded-card p-4">
                                <p className="text-sm text-text-secondary mb-1">Total Referrals</p>
                                <p className="text-2xl font-bold text-primary">{totalReferrals}</p>
                                <p className="text-xs text-text-secondary mt-1">
                                    Number of clients referred by this staff member
                                </p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-card p-4">
                                <p className="text-sm text-text-secondary mb-1">Total Sales</p>
                                <p className="text-2xl font-bold text-green-600">
                                    ${parseFloat(totalSales).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-text-secondary mt-1">
                                    Total sales amount from referred packages
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {selectedStaffId ? (
                    <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                        {loading ? (
                            <TableSkeleton />
                        ) : members.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-text-secondary">No referrals found</p>
                                {(dateRange.from_date || dateRange.to_date) && (
                                    <p className="text-sm text-text-secondary mt-2">
                                        Try adjusting your date filter
                                    </p>
                                )}
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
                ) : (
                    <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                        <div className="text-center py-12">
                            <p className="text-text-secondary text-lg">Please select a staff member to view referrals</p>
                        </div>
                    </div>
                )}
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




