/**
 * SquarePaymentModal
 *
 * Renders the Square Web Payments card form inside a modal.
 * On successful tokenization (nonce), calls the backend to charge the card
 * and finalize the booking/purchase/event.
 *
 * Props:
 *   isOpen         {boolean}  - Whether the modal is visible.
 *   onClose        {fn}       - Called when the user closes/cancels.
 *   onSuccess      {fn}       - Called with the backend response on success.
 *   amount         {number}   - Base amount before tax (in dollars / local currency, e.g. 35.00).
 *   currency       {string}   - ISO 4217 code (default: 'CAD').
 *   tempId         {string}   - The temp_id UUID for this pending booking/purchase.
 *   paymentType    {string}   - 'simulator' | 'package' | 'event'.
 *   description    {string}   - Human-friendly label shown in the modal (e.g. "Simulator Booking - 2 hrs").
 *
 * Tax note:
 *   Nova Scotia HST (14%, effective April 1 2025) is added by the backend on top of the
 *   post-coupon base price.  This modal displays the tax breakdown for transparency.
 *   The `amount` prop must always be the PRE-TAX base price.
 */
import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import { loadSquareSdk } from '../utils/squareSdk';

// -------------------------------------------------------------------------

export default function SquarePaymentModal({
    isOpen,
    onClose,
    onSuccess,
    amount,
    currency = 'CAD',
    tempId,
    paymentType,
    description = 'Payment',
    disableCoupons = false,  // set true for guest flows where coupons are not offered
}) {
    const cardContainerRef = useRef(null);
    const paymentsRef = useRef(null);
    const cardRef = useRef(null);

    const [sdkReady, setSdkReady] = useState(false);
    const [cardMounted, setCardMounted] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [configLoaded, setConfigLoaded] = useState(false);
    const [squareConfig, setSquareConfig] = useState(null);

    // ---- Coupon states --------------------------------------------------
    const [couponCode, setCouponCode] = useState('');
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount_amount, final_amount, ... }
    const [couponError, setCouponError] = useState('');

    // ---- Tax calculation (Nova Scotia HST 14%, effective Apr 1 2025) ------
    // Tax is always applied to the post-coupon base by the backend.
    // We compute it here only for display purposes.
    const TAX_RATE = 0.14;
    const discountedBase = appliedCoupon ? appliedCoupon.final_amount : Number(amount);
    const taxAmount = Math.round(discountedBase * TAX_RATE * 100) / 100;
    const finalChargeAmount = Math.round((discountedBase + taxAmount) * 100) / 100;

    // ---- Step 1: Fetch Square config from backend -----------------------
    useEffect(() => {
        if (!isOpen) return;
        apiClient.get(endpoints.square.config)
            .then(res => {
                setSquareConfig(res.data);
                setConfigLoaded(true);
            })
            .catch(() => {
                setErrorMsg('Failed to load payment configuration. Please try again.');
            });
    }, [isOpen]);

    // ---- Step 2: Load the Square SDK script ----------------------------
    useEffect(() => {
        if (!isOpen || !configLoaded || !squareConfig) return;
        loadSquareSdk(squareConfig.environment)
            .then(() => setSdkReady(true))
            .catch(() => setErrorMsg('Could not load payment SDK. Please check your connection.'));
    }, [isOpen, configLoaded, squareConfig]);

    // ---- Step 3: Initialize Payments & mount card field ----------------
    useEffect(() => {
        if (!isOpen || !sdkReady || !squareConfig || cardMounted) return;
        if (!cardContainerRef.current) return;

        const initSquare = async () => {
            try {
                if (!window.Square) throw new Error('Square SDK not available.');

                const payments = window.Square.payments(
                    squareConfig.application_id,
                    squareConfig.location_id
                );
                paymentsRef.current = payments;

                const card = await payments.card({
                    style: {
                        '.input-container': {
                            borderColor: '#374151',
                            borderRadius: '8px',
                        },
                        '.input-container.is-focus': {
                            borderColor: '#4F7942',
                        },
                        '.input-container.is-error': {
                            borderColor: '#ef4444',
                        },
                        '.message-text': {
                            color: '#6b7280',
                        },
                        '.message-icon': {
                            color: '#6b7280',
                        },
                        input: {
                            backgroundColor: '#1f2937',
                            color: '#f9fafb',
                            fontFamily: 'sans-serif',
                            fontSize: '15px',
                        },
                        'input::placeholder': {
                            color: '#6b7280',
                        },
                    },
                });

                await card.attach(cardContainerRef.current);
                cardRef.current = card;
                setCardMounted(true);
            } catch (err) {
                console.error('Square card mount error:', err);
                setErrorMsg('Failed to initialize card form. Please refresh and try again.');
            }
        };

        initSquare();
    }, [isOpen, sdkReady, squareConfig, cardMounted]);

    // ---- Cleanup when modal closes -------------------------------------
    useEffect(() => {
        if (!isOpen) {
            if (cardRef.current) {
                try { cardRef.current.destroy(); } catch (_) { }
                cardRef.current = null;
            }
            setCardMounted(false);
            setSdkReady(false);
            setConfigLoaded(false);
            setSquareConfig(null);
            setErrorMsg('');
            setSuccessMsg('');
            setProcessingPayment(false);
            // Reset coupon
            setCouponCode('');
            setAppliedCoupon(null);
            setCouponError('');
        }
    }, [isOpen]);

    // ---- Coupon validation handler -------------------------------------
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setValidatingCoupon(true);
        setCouponError('');
        setAppliedCoupon(null);

        try {
            const response = await apiClient.post(endpoints.coupons.validate, {
                code: couponCode,
                amount: amount,
                payment_type: paymentType,
            });
            setAppliedCoupon(response.data);
        } catch (err) {
            const msg = err.response?.data?.error || 'Invalid coupon code.';
            setCouponError(msg);
        } finally {
            setValidatingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponError('');
    };

    // ---- Pay button handler -------------------------------------------
    const handlePay = async () => {
        if (!cardRef.current) return;
        setErrorMsg('');
        setProcessingPayment(true);

        try {
            // Tokenize the card → get a nonce (source_id)
            const tokenResult = await cardRef.current.tokenize();
            if (tokenResult.status !== 'OK') {
                const msgs = tokenResult.errors?.map(e => e.message).join(', ') || 'Card tokenization failed.';
                setErrorMsg(msgs);
                setProcessingPayment(false);
                return;
            }

            const sourceId = tokenResult.token;

            // Call backend to charge + finalize
            const response = await apiClient.post(endpoints.square.initiatePayment, {
                source_id: sourceId,
                temp_id: tempId,
                payment_type: paymentType,
                amount: amount,
                currency: currency,
                coupon_code: appliedCoupon ? appliedCoupon.code : null,
            });

            setSuccessMsg('Payment successful! Your booking is confirmed.');
            setTimeout(() => {
                if (onSuccess) onSuccess(response.data);
            }, 1500);

        } catch (err) {
            const msg = err.response?.data?.error || 'Payment failed. Please try again.';
            setErrorMsg(msg);
            setProcessingPayment(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-card shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-primary px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-white text-xl font-bold">Secure Payment</h2>
                        <p className="text-white/80 text-sm mt-0.5">{description}</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={processingPayment}
                        className="text-white/70 hover:text-white transition-colors disabled:opacity-40"
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Price Breakdown */}
                    <div className="bg-background rounded-button border border-border divide-y divide-border overflow-hidden">
                        {/* Base price row */}
                        <div className="px-4 py-3 flex items-center justify-between">
                            <span className="text-text-secondary text-sm">Base Price</span>
                            <span className="text-text-primary font-medium">${Number(amount).toFixed(2)}</span>
                        </div>

                        {/* Coupon discount row */}
                        {appliedCoupon && (
                            <div className="px-4 py-3 flex items-center justify-between bg-green-50/10">
                                <span className="text-green-600 text-sm flex items-center gap-1.5 font-medium">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    Discount ({appliedCoupon.code})
                                </span>
                                <span className="text-green-600 font-bold">-${appliedCoupon.discount_amount.toFixed(2)}</span>
                            </div>
                        )}

                        {/* HST tax row */}
                        <div className="px-4 py-3 flex items-center justify-between">
                            <span className="text-text-secondary text-sm flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                                </svg>
                                HST (14%) — Nova Scotia
                            </span>
                            <span className="text-text-primary font-medium">+${taxAmount.toFixed(2)}</span>
                        </div>

                        {/* Total row */}
                        <div className="px-4 py-3 flex items-center justify-between bg-surface/40">
                            <span className="text-text-primary text-sm font-bold">Total to Pay</span>
                            <span className="text-text-primary text-2xl font-bold flex items-baseline gap-1.5">
                                ${Number(finalChargeAmount).toFixed(2)}
                                <span className="text-sm font-normal text-text-secondary">{currency}</span>
                            </span>
                        </div>
                    </div>

                    {/* Coupon Section */}
                    {!successMsg && !disableCoupons && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-text-primary">
                                Have a coupon?
                            </label>

                            {!appliedCoupon ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter code"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        disabled={validatingCoupon || processingPayment}
                                        className="flex-1 px-3 py-2 bg-background border border-border rounded-button text-sm uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                    />
                                    <button
                                        onClick={handleApplyCoupon}
                                        disabled={!couponCode || validatingCoupon || processingPayment}
                                        className="px-4 py-2 bg-background border border-border rounded-button text-sm font-semibold hover:bg-surface transition-colors disabled:opacity-50"
                                    >
                                        {validatingCoupon ? '...' : 'Apply'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border border-primary/20 rounded-button">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 bg-primary text-white rounded-md">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-bold text-primary">{appliedCoupon.code}</span>
                                        <span className="text-xs text-text-secondary italic">Applied!</span>
                                    </div>
                                    <button
                                        onClick={handleRemoveCoupon}
                                        disabled={processingPayment}
                                        className="text-text-secondary hover:text-danger p-1 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                            {couponError && (
                                <p className="text-xs text-danger font-medium">{couponError}</p>
                            )}
                        </div>
                    )}

                    {/* Success state */}
                    {successMsg && (
                        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-button px-4 py-3">
                            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="text-green-800 text-sm font-medium">{successMsg}</p>
                        </div>
                    )}

                    {/* Error display */}
                    {errorMsg && !successMsg && (
                        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-button px-4 py-3">
                            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-red-700 text-sm">{errorMsg}</p>
                        </div>
                    )}

                    {/* Square card form */}
                    {!successMsg && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Card Details
                                </label>
                                {!cardMounted && !errorMsg && (
                                    <div className="h-14 flex items-center justify-center border border-border rounded-button bg-background">
                                        <div className="flex items-center gap-2 text-text-secondary text-sm">
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Loading secure card form...
                                        </div>
                                    </div>
                                )}
                                {/* Square mounts the card UI here */}
                                <div ref={cardContainerRef} id="square-card-container" />
                            </div>

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

                            {/* Actions */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={onClose}
                                    disabled={processingPayment}
                                    className="flex-1 px-4 py-3 rounded-button border border-border text-text-primary text-sm font-medium hover:bg-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePay}
                                    disabled={processingPayment || !cardMounted}
                                    className="flex-1 px-4 py-3 rounded-button bg-primary text-white text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processingPayment ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            </svg>
                                            Pay ${Number(finalChargeAmount).toFixed(2)}
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
