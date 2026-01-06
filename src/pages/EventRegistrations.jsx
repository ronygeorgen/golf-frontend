import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../api/axios';
import { endpoints } from '../api/endpoints';
import { TableSkeleton } from '../components/skeletons/SkeletonLoader';
import PopupMessage from '../components/PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { ArrowLeft, CheckCircle, UserPlus, X, Search, Trash2 } from 'lucide-react';

function EventRegistrations() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const modalRef = useRef(null);
    
    const [event, setEvent] = useState(null);
    const [allRegistrations, setAllRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState({});
    const [removingRegistration, setRemovingRegistration] = useState({});
    const [showCancelled, setShowCancelled] = useState(false); // Toggle for showing cancelled
    
    // Modal state
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [nextOccurrenceDate, setNextOccurrenceDate] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [registeringUser, setRegisteringUser] = useState(false);

    useEffect(() => {
        fetchEventAndRegistrations();
    }, [eventId, searchParams]);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowRegisterModal(false);
                setSearchQuery('');
                setSelectedUserId('');
                setUsers([]);
            }
        };

        if (showRegisterModal) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showRegisterModal]);

    // Debounce search
    useEffect(() => {
        if (!showRegisterModal) return;
        
        const timeoutId = setTimeout(() => {
            if (searchQuery.trim()) {
                fetchUsers(searchQuery);
            } else {
                fetchUsers();
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, showRegisterModal]);

    const fetchEventAndRegistrations = async () => {
        setLoading(true);
        try {
            // Get occurrence_date from query params if available
            const occurrenceDateParam = searchParams.get('occurrence_date');
            
            const registrationsUrl = occurrenceDateParam
                ? `${endpoints.specialEvents.registrations(eventId)}?occurrence_date=${occurrenceDateParam}`
                : endpoints.specialEvents.registrations(eventId);
            
            const [eventResponse, registrationsResponse] = await Promise.all([
                axios.get(endpoints.specialEvents.detail(eventId)),
                axios.get(registrationsUrl)
            ]);
            setEvent(eventResponse.data);
            setAllRegistrations(registrationsResponse.data);
            
            // Use occurrence_date from query params if available, otherwise get next occurrence
            if (occurrenceDateParam) {
                setNextOccurrenceDate(occurrenceDateParam);
            } else if (eventResponse.data.next_occurrence_date) {
                setNextOccurrenceDate(eventResponse.data.next_occurrence_date);
            } else {
                // Fallback to event date if next_occurrence_date is not available
                setNextOccurrenceDate(eventResponse.data.date);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            showError('Failed to load event registrations');
        } finally {
            setLoading(false);
        }
    };
    
    const fetchUsers = async (search = '') => {
        setLoadingUsers(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('page_size', '50'); // Get more users for selection
            
            const response = await axios.get(`${endpoints.admin.users.list}?${params.toString()}`);
            setUsers(response.data.results || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            showError('Failed to load users');
        } finally {
            setLoadingUsers(false);
        }
    };
    
    const resetModalForm = () => {
        setSearchQuery('');
        setSelectedUserId('');
        setUsers([]);
    };
    
    const handleOpenRegisterModal = () => {
        setShowRegisterModal(true);
        fetchUsers();
    };
    
    const handleRegisterUser = async () => {
        if (!selectedUserId) {
            showError('Please select a user to register');
            return;
        }
        
        setRegisteringUser(true);
        try {
            await axios.post(endpoints.specialEvents.registerUser(eventId), {
                user_id: selectedUserId,
                occurrence_date: nextOccurrenceDate || undefined
            });
            await fetchEventAndRegistrations();
            setShowRegisterModal(false);
            resetModalForm();
            showSuccess('User registered successfully');
        } catch (error) {
            console.error('Error registering user:', error);
            showError(error.response?.data?.error || 'Failed to register user');
        } finally {
            setRegisteringUser(false);
        }
    };
    
    // Get next occurrence date for filtering (if needed in future)
    const getNextOccurrenceDate = () => {
        if (!event) return null;
        // For now, we'll show all registrations, but this can be used for filtering
        return event.next_occurrence_date || event.date;
    };

    const handleUpdateStatus = (registrationId) => {
        const registration = allRegistrations.find(r => r.id === registrationId);
        const userName = registration?.user_details?.first_name 
            ? `${registration.user_details.first_name} ${registration.user_details.last_name || ''}`.trim()
            : registration?.user_details?.username 
            ? registration.user_details.username
            : 'this user';
        
        openPopup({
            type: 'warning',
            title: 'Mark as Showed Up',
            message: `Are you sure you want to mark ${userName} as "Showed Up" for this event?`,
            showCancel: true,
            confirmText: 'Yes, Mark as Showed Up',
            cancelText: 'Cancel',
            onConfirm: async () => {
                setUpdatingStatus({ ...updatingStatus, [registrationId]: true });
                try {
                    await axios.patch(
                        endpoints.specialEvents.updateRegistrationStatus(eventId),
                        {
                            registration_id: registrationId,
                            status: 'showed_up'
                        }
                    );
                    await fetchEventAndRegistrations();
                    showSuccess('Registration status updated to "Showed Up"');
                } catch (error) {
                    console.error('Error updating status:', error);
                    showError('Failed to update registration status');
                } finally {
                    setUpdatingStatus({ ...updatingStatus, [registrationId]: false });
                }
            },
        });
    };

    const handleRemoveRegistration = (registrationId) => {
        const registration = allRegistrations.find(r => r.id === registrationId);
        const userName = registration?.user_details?.first_name 
            ? `${registration.user_details.first_name} ${registration.user_details.last_name || ''}`.trim()
            : registration?.user_details?.username 
            ? registration.user_details.username
            : 'this user';
        
        openPopup({
            type: 'warning',
            title: 'Remove Registration',
            message: `Are you sure you want to remove ${userName} from this event? This action cannot be undone.`,
            showCancel: true,
            confirmText: 'Yes, Remove',
            cancelText: 'Cancel',
            onConfirm: async () => {
                setRemovingRegistration({ ...removingRegistration, [registrationId]: true });
                try {
                    await axios.delete(
                        endpoints.specialEvents.removeRegistration(eventId),
                        {
                            data: {
                                registration_id: registrationId
                            }
                        }
                    );
                    await fetchEventAndRegistrations();
                    showSuccess('Registration removed successfully');
                } catch (error) {
                    console.error('Error removing registration:', error);
                    showError(error.response?.data?.error || 'Failed to remove registration');
                } finally {
                    setRemovingRegistration({ ...removingRegistration, [registrationId]: false });
                }
            },
        });
    };

    const handlePopupConfirm = async () => {
        const action = popup.onConfirm;
        closePopup();
        if (action) {
            await action();
        }
    };

    // Filter registrations based on toggle
    const filteredRegistrations = showCancelled
        ? allRegistrations.filter(reg => reg.status === 'cancelled')
        : allRegistrations.filter(reg => reg.status !== 'cancelled');
    
    // Check if we should show Actions column (only for non-cancelled registrations)
    const showActionsColumn = !showCancelled;

    if (loading) {
        return <TableSkeleton />;
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <button
                    onClick={() => navigate('/admin/special-events')}
                    className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Special Events</span>
                </button>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-text-primary">
                        Registrations for "{event?.title}"
                    </h1>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleOpenRegisterModal}
                            className="flex items-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            Register Customer
                        </Button>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-text-secondary font-medium">View:</span>
                            <div className="relative inline-flex bg-background border border-border rounded-lg p-1 shadow-sm">
                                <div
                                    className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] bg-primary rounded-md transition-all duration-300 ease-in-out ${
                                        showCancelled ? 'left-[calc(50%+0.125rem)]' : 'left-1'
                                    }`}
                                />
                                <button
                                    onClick={() => setShowCancelled(false)}
                                    className={`relative z-10 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                                        !showCancelled
                                            ? 'text-white'
                                            : 'text-text-secondary hover:text-text-primary'
                                    }`}
                                >
                                    Registered ({allRegistrations.filter(r => r.status === 'registered' || r.status === 'showed_up').length})
                                </button>
                                <button
                                    onClick={() => setShowCancelled(true)}
                                    className={`relative z-10 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                                        showCancelled
                                            ? 'text-white'
                                            : 'text-text-secondary hover:text-text-primary'
                                    }`}
                                >
                                    Cancelled ({allRegistrations.filter(r => r.status === 'cancelled').length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-background border-b border-border">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">User</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Email</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Phone</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Registered At</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Status</th>
                                {showActionsColumn && (
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredRegistrations.length === 0 ? (
                                <tr>
                                    <td colSpan={showActionsColumn ? 6 : 5} className="px-4 py-8 text-center text-text-secondary">
                                        {showCancelled ? 'No cancelled registrations' : 'No registrations yet'}
                                    </td>
                                </tr>
                            ) : (
                                filteredRegistrations.map((reg) => (
                                    <tr key={reg.id} className="hover:bg-background">
                                        <td className="px-4 py-3 text-sm text-text-primary">
                                            {reg.user_details?.first_name || reg.user_details?.username || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">
                                            {reg.user_details?.email || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">
                                            {reg.user_details?.phone || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">
                                            {new Date(reg.registered_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={reg.status === 'showed_up' ? 'success' : reg.status === 'cancelled' ? 'danger' : 'primary'}>
                                                {reg.status === 'showed_up' ? 'Showed Up' : reg.status === 'cancelled' ? 'Cancelled' : 'Registered'}
                                            </Badge>
                                        </td>
                                        {showActionsColumn && (
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {reg.status === 'registered' && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(reg.id)}
                                                            disabled={updatingStatus[reg.id] || removingRegistration[reg.id]}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-button hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            {updatingStatus[reg.id] ? (
                                                                <>
                                                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                    <span>Updating...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    <span>Mark as Showed Up</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            if (!removingRegistration[reg.id]) {
                                                                handleRemoveRegistration(reg.id);
                                                            }
                                                        }}
                                                        disabled={updatingStatus[reg.id] || removingRegistration[reg.id]}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-button disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        title="Remove Registration"
                                                    >
                                                        {removingRegistration[reg.id] ? (
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
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Register Customer Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div ref={modalRef} className="bg-surface rounded-card shadow-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-text-primary">
                                Register Customer
                            </h2>
                            <button
                                onClick={() => {
                                    setShowRegisterModal(false);
                                    resetModalForm();
                                }}
                                className="text-text-secondary hover:text-text-primary"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Event Date Display (read-only) */}
                            {nextOccurrenceDate && (
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">
                                        Event Date
                                    </label>
                                    <div className="px-3 py-2 border border-border rounded-button bg-background text-text-primary">
                                        {new Date(nextOccurrenceDate).toLocaleDateString('en-US', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </div>
                                </div>
                            )}
                            
                             {/* User Search */}
                             <div>
                                 <label className="block text-sm font-medium text-text-primary mb-1">
                                     Search Customer *
                                 </label>
                                 <input
                                     type="text"
                                     placeholder="Search by name, email, or phone..."
                                     value={searchQuery}
                                     onChange={(e) => setSearchQuery(e.target.value)}
                                     className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                 />
                             </div>
                            
                            {/* User List */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">
                                    Select Customer *
                                </label>
                                <div className="border border-border rounded-button bg-background max-h-60 overflow-y-auto">
                                    {loadingUsers ? (
                                        <div className="px-4 py-8 text-center text-text-secondary">
                                            Loading users...
                                        </div>
                                    ) : users.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-text-secondary">
                                            {searchQuery ? 'No users found' : 'Start typing to search for users'}
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border">
                                            {users.map((user) => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => setSelectedUserId(user.id)}
                                                    className={`w-full text-left px-4 py-3 hover:bg-primary/10 transition-colors ${
                                                        selectedUserId === user.id ? 'bg-primary/20 border-l-4 border-primary' : ''
                                                    }`}
                                                >
                                                    <div className="font-medium text-text-primary">
                                                        {user.first_name || user.username || 'N/A'}
                                                        {user.last_name && ` ${user.last_name}`}
                                                    </div>
                                                    <div className="text-sm text-text-secondary">
                                                        {user.email || 'No email'}
                                                        {user.phone && ` • ${user.phone}`}
                                                    </div>
                                                    {user.role && (
                                                        <div className="text-xs text-text-secondary mt-1">
                                                            Role: {user.role}
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setShowRegisterModal(false);
                                    resetModalForm();
                                }}
                                disabled={registeringUser}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleRegisterUser}
                                disabled={!selectedUserId || registeringUser}
                                loading={registeringUser}
                            >
                                {registeringUser ? (
                                    'Registering...'
                                ) : (
                                    'Register Customer'
                                )}
                            </Button>
                        </div>
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
                onConfirm={popup.onConfirm ? handlePopupConfirm : closePopup}
                onClose={closePopup}
            />
        </div>
    );
}

export default EventRegistrations;

