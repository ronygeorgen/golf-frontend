import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { subscribeMembership, getMyMemberships } from '../store/slices/membershipSlice';
import { endpoints } from '../api/endpoints';
import apiClient from '../api/axios';
import { loadSquareSdk } from '../utils/squareSdk';

/**
 * Modal for subscribing to a membership package.
 * Renders a Square card form, tokenizes the card, and calls the subscribe endpoint.
 */
function MembershipSubscribeModal({ isOpen, onClose, package: pkg, locationId, onSuccess }) {
    const dispatch = useAppDispatch();
    const { subscribing, error } = useAppSelector((state) => state.memberships);
    const [step, setStep] = useState('details'); // 'details' | 'payment' | 'success'
    const [squareLoaded, setSquareLoaded] = useState(false);
    const [squareCard, setSquareCard] = useState(null);
    const [sqAppId, setSqAppId] = useState('');
    const [sqLocationId, setSqLocationId] = useState('');
    const [sqEnvironment, setSqEnvironment] = useState('sandbox');
    const [taxRate, setTaxRate] = useState(0.14);
    const [paymentError, setPaymentError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const cardContainerRef = useRef(null);
    const paymentsRef = useRef(null);

    // ---- Coupon states --------------------------------------------------
    const [couponCode, setCouponCode] = useState('');
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');

    // Fetch Square config (application_id, location_id, environment)
    useEffect(() => {
        if (!isOpen || !locationId) return;
        apiClient.get(`${endpoints.square.config}?location_id=${locationId}`)
            .then(({ data }) => {
                setSqAppId(data.application_id || data.app_id || '');
                setSqLocationId(data.location_id || '');
                setSqEnvironment(data.environment || 'sandbox');
                if (data.tax_rate !== undefined) setTaxRate(data.tax_rate);
            })
            .catch(() => {});
    }, [isOpen, locationId]);

    // Load the correct Square Web Payments SDK (sandbox vs production)
    useEffect(() => {
        if (step !== 'payment' || !sqAppId || !sqLocationId) return;

        loadSquareSdk(sqEnvironment)
            .then(() => setSquareLoaded(true))
            .catch(() => setPaymentError('Could not load payment SDK. Please check your connection.'));
    }, [step, sqAppId, sqLocationId, sqEnvironment]);

    useEffect(() => {
        if (!squareLoaded || !sqAppId || !sqLocationId || step !== 'payment') return;
        if (!cardContainerRef.current) return;

        let card;
        const attachCard = async () => {
            try {
                if (!window.Square) throw new Error('Square SDK not available.');
                const payments = window.Square.payments(sqAppId, sqLocationId);
                paymentsRef.current = payments;
                card = await payments.card({
                    style: {
                        '.input-container': { borderColor: '#374151', borderRadius: '8px' },
                        '.input-container.is-focus': { borderColor: '#4F7942' },
                        '.input-container.is-error': { borderColor: '#ef4444' },
                        '.message-text': { color: '#6b7280' },
                        '.message-icon': { color: '#6b7280' },
                        input: {
                            backgroundColor: '#1f2937',
                            color: '#f9fafb',
                            fontFamily: 'sans-serif',
                            fontSize: '15px',
                        },
                        'input::placeholder': { color: '#6b7280' },
                    },
                });
                await card.attach(cardContainerRef.current);
                setSquareCard(card);
            } catch (e) {
                console.error('Square card mount error:', e);
                setPaymentError('Failed to load payment form. Please refresh and try again.');
            }
        };
        attachCard();
        return () => { if (card) { card.destroy?.().catch(() => {}); } };
    }, [squareLoaded, sqAppId, sqLocationId, step]);


    const handleApplyCoupon = async () => {
        if (!couponCode.trim() || !pkg) return;
        setValidatingCoupon(true);
        setCouponError('');
        setAppliedCoupon(null);
        try {
            const response = await apiClient.post(endpoints.coupons.validate, {
                code: couponCode,
                amount: Number(pkg.price || 0),
                payment_type: 'package',
                package_id: pkg.id,
            });
            setAppliedCoupon(response.data);
        } catch (err) {
            setCouponError(err.response?.data?.error || 'Invalid coupon code.');
        } finally {
            setValidatingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponError('');
    };

    const handleSubscribe = async () => {
        if (!squareCard) return;
        setPaymentError('');
        setSubmitting(true);
        try {
            const result = await squareCard.tokenize();
            if (result.status !== 'OK') {
                setPaymentError(result.errors?.[0]?.message || 'Card tokenization failed.');
                setSubmitting(false);
                return;
            }
            const res = await dispatch(subscribeMembership({
                source_id: result.token,
                package_id: pkg.id,
                location_id: locationId,
                ...(appliedCoupon ? { coupon_code: appliedCoupon.code } : {}),
            }));
            if (subscribeMembership.fulfilled.match(res)) {
                dispatch(getMyMemberships());
                setStep('success');
                if (onSuccess) onSuccess();
            } else {
                setPaymentError(res.payload?.error || 'Subscription failed. Please try again.');
            }
        } catch (e) {
            setPaymentError('An unexpected error occurred.');
        }
        setSubmitting(false);
    };

    const handleClose = () => {
        setStep('details');
        setSquareLoaded(false);
        setSquareCard(null);
        setPaymentError('');
        setCouponCode('');
        setAppliedCoupon(null);
        setCouponError('');
        onClose();
    };

    if (!isOpen || !pkg) return null;

    const basePrice = Number(pkg.price || 0);
    const discountedBase = appliedCoupon ? appliedCoupon.final_amount : basePrice;
    const taxAmount = Math.round(discountedBase * taxRate * 100) / 100;
    const totalMonthlyPrice = Math.round((discountedBase + taxAmount) * 100) / 100;

    const renderSuccessDetails = () => {
        const details = [];
        if (pkg.monthly_hours && parseFloat(pkg.monthly_hours) > 0) {
            details.push(`${pkg.monthly_hours} simulator hours`);
        }
        if (pkg.monthly_sessions && parseInt(pkg.monthly_sessions, 10) > 0) {
            details.push(`${pkg.monthly_sessions} sessions`);
        }
        if (pkg.monthly_simulator_hours && parseFloat(pkg.monthly_simulator_hours) > 0) {
            details.push(`${pkg.monthly_simulator_hours} simulator hours`);
        }
        if (pkg.monthly_category_hours && parseFloat(pkg.monthly_category_hours) > 0) {
            details.push(`${pkg.monthly_category_hours} category asset hours`);
        }
        
        if (details.length === 0) {
            return "Your membership hours/sessions are ready to use.";
        }
        
        if (details.length === 1) {
            return <>Your <strong>{details[0]}</strong> are ready to use.</>;
        }
        
        if (details.length === 2) {
            return <>Your <strong>{details[0]}</strong> and <strong>{details[1]}</strong> are ready to use.</>;
        }
        
        return <>Your <strong>{details.slice(0, -1).join(', ')}, and {details[details.length - 1]}</strong> are ready to use.</>;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-surface rounded-card shadow-2xl w-full max-w-md z-10 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">🔁</span>
                                <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Monthly Membership</span>
                            </div>
                            <h2 className="text-xl font-bold text-white">{pkg.title}</h2>
                        </div>
                        <button onClick={handleClose} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
                    </div>
                </div>

                <div className="p-6">
                    {/* STEP: details */}
                    {step === 'details' && (
                        <div className="space-y-4">
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-text-secondary">Base Price</span>
                                    <span className="text-sm font-medium text-text-primary">${basePrice.toFixed(2)}/mo</span>
                                </div>
                                {appliedCoupon && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-green-600">Coupon Discount</span>
                                        <span className="text-sm font-semibold text-green-600">-${Number(appliedCoupon.discount_amount).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-text-secondary">Tax ({(taxRate * 100).toFixed(2).replace(/\.00$/, '')}%)</span>
                                    <span className="text-sm font-medium text-text-primary">+${taxAmount.toFixed(2)}/mo</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-primary/20 pt-2">
                                    <span className="text-sm font-bold text-primary">Total Monthly Price</span>
                                    <span className="text-2xl font-bold text-primary">${totalMonthlyPrice.toFixed(2)}<span className="text-sm font-normal text-primary-light">/mo</span></span>
                                </div>

                                {pkg.monthly_hours !== undefined && pkg.monthly_hours !== null && parseFloat(pkg.monthly_hours) > 0 && (
                                    <div className="flex items-center justify-between border-t border-primary/10 pt-2">
                                        <span className="text-sm text-text-secondary">Simulator hours/month</span>
                                        <span className="text-lg font-semibold text-text-primary">{pkg.monthly_hours} hrs</span>
                                    </div>
                                )}
                                {pkg.monthly_sessions !== undefined && pkg.monthly_sessions !== null && parseInt(pkg.monthly_sessions, 10) > 0 && (
                                    <div className="flex items-center justify-between border-t border-primary/10 pt-2">
                                        <span className="text-sm text-text-secondary">Coaching sessions/month</span>
                                        <span className="text-lg font-semibold text-text-primary">{pkg.monthly_sessions} sessions</span>
                                    </div>
                                )}
                                {pkg.monthly_simulator_hours !== undefined && pkg.monthly_simulator_hours !== null && parseFloat(pkg.monthly_simulator_hours) > 0 && (
                                    <div className="flex items-center justify-between border-t border-primary/10 pt-2">
                                        <span className="text-sm text-text-secondary">Simulator hours/month</span>
                                        <span className="text-lg font-semibold text-text-primary">{pkg.monthly_simulator_hours} hrs</span>
                                    </div>
                                )}
                                {pkg.monthly_category_hours !== undefined && pkg.monthly_category_hours !== null && parseFloat(pkg.monthly_category_hours) > 0 && (
                                    <div className="flex items-center justify-between border-t border-primary/10 pt-2">
                                        <span className="text-sm text-text-secondary">Category asset hours/month</span>
                                        <span className="text-lg font-semibold text-text-primary">{pkg.monthly_category_hours} hrs</span>
                                    </div>
                                )}
                                
                                <div className="flex items-center justify-between border-t border-primary/10 pt-2">
                                    <span className="text-sm text-text-secondary">Hours/sessions carry-over</span>
                                    <span className="text-sm font-medium text-status-cancelled-text">No — resets monthly</span>
                                </div>
                            </div>
                            <div className="bg-background rounded-xl p-4 border border-border">
                                <p className="text-xs text-text-secondary leading-relaxed">
                                    By subscribing, your card will be charged <strong>${totalMonthlyPrice.toFixed(2)}</strong> today and automatically every month.
                                    You can cancel anytime from your memberships panel. Unused hours and sessions do not carry over.
                                </p>
                            </div>
                            {/* Coupon Section */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Have a coupon?</p>
                                {appliedCoupon ? (
                                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                                        <div>
                                            <span className="text-sm font-bold text-green-700">{appliedCoupon.code}</span>
                                            <span className="text-xs text-green-600 ml-2">-${Number(appliedCoupon.discount_amount).toFixed(2)} off</span>
                                        </div>
                                        <button onClick={handleRemoveCoupon} className="text-xs text-green-600 hover:text-red-500 font-medium transition-colors">Remove</button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                            onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                                            placeholder="Coupon code"
                                            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-text-primary outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                                        />
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={validatingCoupon || !couponCode.trim()}
                                            className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                                        >
                                            {validatingCoupon ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                )}
                                {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                            </div>

                            <button
                                onClick={() => setStep('payment')}
                                className="w-full py-3 bg-primary text-white rounded-button font-semibold hover:bg-primary/90 transition-all"
                            >
                                Continue to Payment
                            </button>
                        </div>
                    )}

                    {/* STEP: payment */}
                    {step === 'payment' && (
                        <div className="space-y-4">
                            <p className="text-sm text-text-secondary">Enter your card details to start your membership.</p>
                            <div ref={cardContainerRef} className="min-h-[100px] border border-border rounded-xl p-3 bg-background" />
                            
                            {/* Security badge */}
                            <div className="flex items-center gap-2 text-text-secondary text-xs">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span>Your payment is encrypted and secured by Square.</span>
                            </div>

                            {/* Refund policy notice */}
                            <div className="flex items-start gap-2 bg-amber-50/60 border border-amber-200/70 rounded-button px-3 py-2.5">
                                <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    <span className="font-semibold">All sales are final.</span>{' '}
                                    Please see our terms &amp; conditions on our website for our full refund policy.
                                </p>
                            </div>

                            {paymentError && (
                                <p className="text-sm text-status-cancelled-text bg-status-cancelled-bg rounded-lg px-3 py-2">{paymentError}</p>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('details')}
                                    className="flex-1 py-3 border border-border text-text-primary rounded-button font-medium hover:bg-background transition-all"
                                    disabled={submitting || subscribing}
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSubscribe}
                                    disabled={!squareCard || submitting || subscribing}
                                    className="flex-1 py-3 bg-primary text-white rounded-button font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {(submitting || subscribing) ? 'Processing...' : `Subscribe · $${totalMonthlyPrice.toFixed(2)}/mo`}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP: success */}
                    {step === 'success' && (
                        <div className="text-center space-y-4 py-4">
                            <div className="text-5xl">✅</div>
                            <h3 className="text-xl font-bold text-text-primary">You're subscribed!</h3>
                            <p className="text-sm text-text-secondary">
                                {renderSuccessDetails()} They reset automatically every month.
                            </p>
                            <button
                                onClick={handleClose}
                                className="w-full py-3 bg-primary text-white rounded-button font-semibold hover:bg-primary/90 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MembershipSubscribeModal;
