import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getPackageUsageDetails } from '../store/slices/coachingSlice';
import Button from './ui/Button';
import Badge from './ui/Badge';

function PackageUsageDetails({ purchase, isOpen, onClose }) {
    const dispatch = useAppDispatch();
    const { usageDetails, usageDetailsLoading } = useAppSelector((state) => state.coaching);

    useEffect(() => {
        if (isOpen && purchase) {
            dispatch(getPackageUsageDetails({ purchaseId: purchase.id }));
        }
    }, [isOpen, purchase, dispatch]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-4 overflow-y-auto">
            <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl p-6 my-auto max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-semibold text-text-primary">
                        Usage Details - {purchase?.purchase_name || 'Group Package'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {usageDetailsLoading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="text-text-secondary mt-4">Loading usage details...</p>
                    </div>
                ) : usageDetails ? (
                    <div className="space-y-6">
                        {/* Summary */}
                        <div className="bg-background rounded-card p-4 border border-border">
                            <h4 className="text-lg font-semibold text-text-primary mb-3">Package Summary</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-text-secondary">Package</p>
                                    <p className="font-semibold text-text-primary">{usageDetails.package_title}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-text-secondary">Sessions Used</p>
                                    <p className="font-semibold text-text-primary">
                                        {usageDetails.sessions_used} / {usageDetails.sessions_total}
                                    </p>
                                </div>
                                {usageDetails.simulator_hours_total > 0 && (
                                    <div>
                                        <p className="text-sm text-text-secondary">Simulator Hours Used</p>
                                        <p className="font-semibold text-text-primary">
                                            {usageDetails.simulator_hours_used.toFixed(2)} / {usageDetails.simulator_hours_total.toFixed(2)} hrs
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm text-text-secondary">Remaining</p>
                                    <p className="font-semibold text-text-primary">
                                        {usageDetails.sessions_remaining} sessions
                                        {usageDetails.simulator_hours_total > 0 && (
                                            <span>, {usageDetails.simulator_hours_remaining.toFixed(2)} hrs</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Coaching Sessions Usage */}
                        {usageDetails.coaching_usage && usageDetails.coaching_usage.length > 0 && (
                            <div>
                                <h4 className="text-lg font-semibold text-text-primary mb-3">Coaching Sessions Usage</h4>
                                <div className="space-y-4">
                                    {usageDetails.coaching_usage.map((userUsage, index) => (
                                        <div key={index} className="bg-background rounded-card p-4 border border-border">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <p className="font-semibold text-text-primary">{userUsage.user_name}</p>
                                                    <p className="text-sm text-text-secondary">{userUsage.user_email}</p>
                                                </div>
                                                <Badge variant="accent">
                                                    {userUsage.sessions_used} session{userUsage.sessions_used !== 1 ? 's' : ''} used
                                                </Badge>
                                            </div>
                                            <div className="space-y-2">
                                                {userUsage.bookings.map((booking, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 bg-surface rounded-card text-sm">
                                                        <div>
                                                            <p className="text-text-primary">
                                                                {new Date(booking.date).toLocaleDateString('en-US', {
                                                                    weekday: 'short',
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    timeZone: 'America/Halifax'
                                                                })} at {new Date(booking.date).toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                    hour12: true,
                                                                    timeZone: 'America/Halifax'
                                                                })}
                                                            </p>
                                                            {booking.coach && (
                                                                <p className="text-text-secondary text-xs">Coach: {booking.coach}</p>
                                                            )}
                                                        </div>
                                                        <Badge status={
                                                            booking.status === 'confirmed' ? 'confirmed' :
                                                                booking.status === 'completed' ? 'completed' :
                                                                    booking.status === 'cancelled' ? 'cancelled' :
                                                                        'no_show'
                                                        }>
                                                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Simulator Hours Usage */}
                        {usageDetails.simulator_usage && usageDetails.simulator_usage.length > 0 && (
                            <div>
                                <h4 className="text-lg font-semibold text-text-primary mb-3">Simulator Hours Usage</h4>
                                <div className="space-y-4">
                                    {usageDetails.simulator_usage.map((userUsage, index) => (
                                        <div key={index} className="bg-background rounded-card p-4 border border-border">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <p className="font-semibold text-text-primary">{userUsage.user_name}</p>
                                                    <p className="text-sm text-text-secondary">{userUsage.user_email}</p>
                                                </div>
                                                <Badge variant="accent">
                                                    {userUsage.hours_used.toFixed(2)} hours used
                                                </Badge>
                                            </div>
                                            <div className="space-y-2">
                                                {userUsage.bookings.map((booking, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 bg-surface rounded-card text-sm">
                                                        <div>
                                                            <p className="text-text-primary">
                                                                {new Date(booking.date).toLocaleDateString('en-US', {
                                                                    weekday: 'short',
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    timeZone: 'America/Halifax'
                                                                })} at {new Date(booking.date).toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                    hour12: true,
                                                                    timeZone: 'America/Halifax'
                                                                })}
                                                            </p>
                                                            <p className="text-text-secondary text-xs">
                                                                Duration: {booking.duration_minutes} min
                                                                {booking.simulator && ` • Simulator: ${booking.simulator}`}
                                                            </p>
                                                        </div>
                                                        <Badge status={
                                                            booking.status === 'confirmed' ? 'confirmed' :
                                                                booking.status === 'completed' ? 'completed' :
                                                                    booking.status === 'cancelled' ? 'cancelled' :
                                                                        'no_show'
                                                        }>
                                                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* No Usage Message */}
                        {(!usageDetails.coaching_usage || usageDetails.coaching_usage.length === 0) &&
                            (!usageDetails.simulator_usage || usageDetails.simulator_usage.length === 0) && (
                                <div className="text-center py-8 text-text-secondary">
                                    <p>No usage recorded yet for this package.</p>
                                </div>
                            )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-text-secondary">
                        <p>Unable to load usage details.</p>
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <Button onClick={onClose} variant="secondary">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default PackageUsageDetails;



