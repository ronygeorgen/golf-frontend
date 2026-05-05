import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signupWithoutOTP } from '../store/slices/authSlice';
import { createTempPurchase } from '../store/slices/coachingSlice';
// import logo from '../assets/hole9golf-logo.png';
import Button from '../components/ui/Button';
import useToast from '../hooks/useToast';
import Toast from '../components/ui/Toast';
import usePopup from '../hooks/usePopup';
import PopupMessage from '../components/PopupMessage';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import SquarePaymentModal from '../components/SquarePaymentModal';

function GuestLanding() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const { popup, openPopup, closePopup } = usePopup();

    // Logo shown only after registration, resolved from the selected location
    const [selectedLogoUrl, setSelectedLogoUrl] = useState(null);
    const currentLogo = selectedLogoUrl;

    const [step, setStep] = useState('booking-type'); // 'booking-type', 'coaching-package-question', 'tpi-packages', 'registration'
    const [selectedBookingType, setSelectedBookingType] = useState(null); // 'simulator' or 'coaching'
    const [hasPackage, setHasPackage] = useState(null); // true or false
    const [showRegistrationModal, setShowRegistrationModal] = useState(false);
    const [tpiPackages, setTpiPackages] = useState([]);
    const [loadingPackages, setLoadingPackages] = useState(false);
    const [locations, setLocations] = useState([]);
    const [loadingLocations, setLoadingLocations] = useState(true);
    const [registrationData, setRegistrationData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        ghl_location_id: ''
    });
    const [registering, setRegistering] = useState(false);
    const [registeredPhone, setRegisteredPhone] = useState(null); // Store phone after successful registration
    const [phoneError, setPhoneError] = useState(''); // Phone validation error

    // Square payment modal state
    const [squarePayment, setSquarePayment] = useState({
        isOpen: false,
        tempId: null,
        amount: null,
        packageTitle: '',
    });

    // Fetch GHL locations on component mount
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                setLoadingLocations(true);
                const response = await apiClient.get(endpoints.auth.ghlLocations);
                if (response.data && response.data.locations) {
                    setLocations(response.data.locations);
                }
            } catch (error) {
                console.error('Failed to fetch GHL locations:', error);
                // Don't show error to user, just continue without location dropdown
            } finally {
                setLoadingLocations(false);
            }
        };
        fetchLocations();
    }, []);

    // Fetch TPI assessment packages
    const fetchTpiPackages = async () => {
        try {
            setLoadingPackages(true);
            const response = await apiClient.get(endpoints.coaching.packages);
            const packages = response.data.results || response.data || [];
            // Filter only TPI assessment packages
            const tpiPackages = packages.filter(pkg => pkg.is_tpi_assessment === true);
            setTpiPackages(tpiPackages);
        } catch (error) {
            console.error('Failed to fetch TPI packages:', error);
            showError('Failed to load packages. Please try again.');
        } finally {
            setLoadingPackages(false);
        }
    };

    const handleBookingTypeSelect = (type) => {
        setSelectedBookingType(type);
        if (type === 'simulator') {
            // Show registration modal for simulator
            setShowRegistrationModal(true);
        } else if (type === 'coaching') {
            // Ask about existing package
            setStep('coaching-package-question');
        }
    };

    const handlePackageQuestion = (hasPackage) => {
        setHasPackage(hasPackage);
        if (hasPackage) {
            // Redirect to login with toast message
            navigate('/signin', {
                state: {
                    message: 'Please login and use your package for booking.'
                }
            });
        } else {
            // Fetch TPI packages and show registration
            fetchTpiPackages();
            setStep('tpi-packages');
            setShowRegistrationModal(true);
        }
    };

    const handlePhoneChange = (e) => {
        const value = e.target.value;
        // Only allow digits
        const digitsOnly = value.replace(/\D/g, '');
        // Limit to 10 digits
        const limitedDigits = digitsOnly.slice(0, 10);

        setRegistrationData({
            ...registrationData,
            phone: limitedDigits
        });

        // Clear error when user starts typing
        if (phoneError) {
            setPhoneError('');
        }
    };

    const handleRegistrationSubmit = async (e) => {
        e.preventDefault();
        setRegistering(true);

        // Validate phone number - must be exactly 10 digits
        if (!registrationData.phone || registrationData.phone.length !== 10) {
            setPhoneError('Phone number must be exactly 10 digits');
            showError('Please enter a valid 10-digit phone number');
            setRegistering(false);
            return;
        }

        // Validate that location is selected (mandatory)
        if (!registrationData.ghl_location_id) {
            showError('Please select a location');
            setRegistering(false);
            return;
        }

        try {
            // Use signup without OTP - pass booking_type to determine if we should log them in
            const result = await dispatch(signupWithoutOTP({
                ...registrationData,
                role: 'client',
                booking_type: selectedBookingType  // 'simulator' or 'coaching'
            }));

            if (signupWithoutOTP.fulfilled.match(result)) {
                setShowRegistrationModal(false);

                if (selectedBookingType === 'simulator') {
                    // For simulator, user is logged in - redirect to booking page
                    showSuccess('Registration successful! You can now book a simulator session.');
                    // Navigate to booking page with simulator tab active
                    navigate('/booking?tab=simulator', {
                        state: {
                            message: 'Book simulator session'
                        }
                    });
                } else if (selectedBookingType === 'coaching') {
                    // For coaching, user remains a guest - show TPI packages
                    showSuccess('Registration successful! You can now purchase a TPI Assessment package.');
                    // Store the registered phone number for purchase
                    setRegisteredPhone(registrationData.phone);
                    // Resolve and store the location logo
                    const matchedLocation = locations.find(l => l.location_id === registrationData.ghl_location_id);
                    setSelectedLogoUrl(matchedLocation?.logo_url || null);
                    // Stay on TPI packages page
                    setStep('tpi-packages');
                }
            } else {
                // Check if account already exists
                const errorData = result.payload;
                const emailError = errorData?.email?.[0] || errorData?.email;
                const phoneError = errorData?.phone?.[0] || errorData?.phone;

                if (emailError && emailError.toLowerCase().includes('already exists')) {
                    openPopup({
                        type: 'warning',
                        title: 'Account Already Exists',
                        message: 'An account with this email already exists. Please login to continue.',
                        confirmText: 'Login Now',
                        showCancel: true,
                        cancelText: 'Cancel',
                        onConfirm: () => {
                            navigate('/signin', {
                                state: {
                                    message: 'Please login to book a simulator session.'
                                }
                            });
                        }
                    });
                } else if (phoneError && phoneError.toLowerCase().includes('already exists')) {
                    openPopup({
                        type: 'warning',
                        title: 'Account Already Exists',
                        message: 'An account with this phone number already exists. Please login to continue.',
                        confirmText: 'Login Now',
                        showCancel: true,
                        cancelText: 'Cancel',
                        onConfirm: () => {
                            navigate('/signin', {
                                state: {
                                    message: 'Please login to book a simulator session.'
                                }
                            });
                        }
                    });
                } else {
                    const errorMsg = errorData?.error || errorData?.message ||
                        emailError || phoneError ||
                        'Registration failed. Please try again.';
                    showError(errorMsg);
                }
            }
        } catch (error) {
            // Check if it's an account exists error in the catch block too
            const errorData = error.response?.data;
            const emailError = errorData?.email?.[0] || errorData?.email;
            const phoneError = errorData?.phone?.[0] || errorData?.phone;

            if (emailError && emailError.toLowerCase().includes('already exists')) {
                openPopup({
                    type: 'warning',
                    title: 'Account Already Exists',
                    message: 'An account with this email already exists. Please login to continue.',
                    confirmText: 'Login Now',
                    showCancel: true,
                    cancelText: 'Cancel',
                    onConfirm: () => {
                        navigate('/signin', {
                            state: {
                                message: 'Please login to book a simulator session.'
                            }
                        });
                    }
                });
            } else if (phoneError && phoneError.toLowerCase().includes('already exists')) {
                openPopup({
                    type: 'warning',
                    title: 'Account Already Exists',
                    message: 'An account with this phone number already exists. Please login to continue.',
                    confirmText: 'Login Now',
                    showCancel: true,
                    cancelText: 'Cancel',
                    onConfirm: () => {
                        navigate('/signin', {
                            state: {
                                message: 'Please login to book a simulator session.'
                            }
                        });
                    }
                });
            } else {
                showError('Registration failed. Please try again.');
            }
        } finally {
            setRegistering(false);
        }
    };

    const handleBuyTpiPackage = async (pkg) => {
        // Check if user has registered
        if (!registeredPhone) {
            showError('Please complete registration first');
            setShowRegistrationModal(true);
            return;
        }

        // Check if package has redirect_url
        if (!pkg.redirect_url) {
            showError('This package is not available for purchase at the moment.');
            return;
        }

        try {
            // Create temp purchase for guest user
            const tempResult = await dispatch(createTempPurchase({
                packageId: pkg.id,
                buyerPhone: registeredPhone,
                purchaseType: 'normal',
                recipients: [],
                packageType: 'coaching'
            }));

            if (createTempPurchase.fulfilled.match(tempResult)) {
                const tempId = tempResult.payload.temp_id;
                // Square: open the payment modal
                setSquarePayment({
                    isOpen: true,
                    tempId: tempId,
                    amount: pkg.price,
                    packageTitle: pkg.title,
                });
            } else {
                const errorMsg = tempResult.payload?.error || 'Unable to create purchase. Please try again.';
                showError(errorMsg);
            }
        } catch (error) {
            showError('Failed to initiate purchase. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header: logo (after registration) on left, Login on right */}
            <header className="bg-surface shadow-sm border-b border-border sticky top-0 z-50 w-full">
                <div className="max-w-full px-4 sm:px-6 lg:px-8 mx-auto">
                    <div className="flex items-center justify-between h-14 w-full">
                        {/* Logo — only visible after guest registers and a logo is set */}
                        {currentLogo ? (
                            <div className="bg-white p-1 rounded-md">
                                <img
                                    src={currentLogo}
                                    alt="Company Logo"
                                    className="h-10 w-auto object-contain max-w-[180px]"
                                />
                            </div>
                        ) : (
                            <div />
                        )}
                        <button
                            onClick={() => navigate('/signin')}
                            className="px-4 py-2 rounded-button text-sm font-medium transition-colors bg-primary text-white hover:bg-primary-light"
                        >
                            Login
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex items-center justify-center p-4 min-h-[calc(100vh-3.5rem)]">
                <div className="w-full max-w-2xl">
                    {/* Logo shown in the header after registration */}

                    {step === 'booking-type' && (
                        <div className="bg-surface rounded-card shadow-card p-8 text-center">
                            <h1 className="text-3xl font-bold text-text-primary mb-6">
                                Welcome to Hole 9 Golf
                            </h1>
                            <p className="text-lg text-text-secondary mb-8">
                                Would you like to book:
                            </p>
                            <div className="space-y-4">
                                <Button
                                    onClick={() => handleBookingTypeSelect('coaching')}
                                    variant="primary"
                                    className="w-full py-4 text-lg"
                                >
                                    1. Coaching Session
                                </Button>
                                <Button
                                    onClick={() => handleBookingTypeSelect('simulator')}
                                    variant="accent"
                                    className="w-full py-4 text-lg"
                                >
                                    2. Simulator
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'coaching-package-question' && (
                        <div className="bg-surface rounded-card shadow-card p-8 text-center">
                            <h2 className="text-2xl font-bold text-text-primary mb-6">
                                Do you have any coaching package currently?
                            </h2>
                            <div className="space-y-4">
                                <Button
                                    onClick={() => handlePackageQuestion(true)}
                                    variant="primary"
                                    className="w-full py-4 text-lg"
                                >
                                    Yes
                                </Button>
                                <Button
                                    onClick={() => handlePackageQuestion(false)}
                                    variant="secondary"
                                    className="w-full py-4 text-lg"
                                >
                                    No
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'tpi-packages' && (
                        <div className="bg-surface rounded-card shadow-card p-8">
                            <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">
                                TPI Assessment Packages
                            </h2>
                            {loadingPackages ? (
                                <div className="text-center py-8">
                                    <p className="text-text-secondary">Loading packages...</p>
                                </div>
                            ) : tpiPackages.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-text-secondary">No TPI Assessment packages available at the moment.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {tpiPackages.map((pkg) => (
                                        <div
                                            key={pkg.id}
                                            className="border border-border rounded-card p-6 bg-background"
                                        >
                                            <h3 className="text-xl font-semibold text-text-primary mb-2">
                                                {pkg.title}
                                            </h3>
                                            <p className="text-text-secondary mb-4">
                                                {pkg.description}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-2xl font-bold text-primary">
                                                    ${pkg.price}
                                                </span>
                                                <Button
                                                    onClick={() => handleBuyTpiPackage(pkg)}
                                                    variant="primary"
                                                >
                                                    Buy for Myself
                                                </Button>
                                            </div>
                                            <p className="text-sm text-text-secondary mt-2 italic">
                                                * This package is non-transferable and for personal use only.
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Registration Modal */}
                    {showRegistrationModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-surface rounded-card shadow-card w-full max-w-md p-6">
                                <h3 className="text-xl font-bold text-text-primary mb-4">
                                    {selectedBookingType === 'simulator'
                                        ? 'Complete Your Booking'
                                        : 'Get Started with TPI Assessment'}
                                </h3>
                                <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-2">
                                                First Name
                                            </label>
                                            <input
                                                type="text"
                                                value={registrationData.first_name}
                                                onChange={(e) => setRegistrationData({
                                                    ...registrationData,
                                                    first_name: e.target.value
                                                })}
                                                className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-2">
                                                Last Name
                                            </label>
                                            <input
                                                type="text"
                                                value={registrationData.last_name}
                                                onChange={(e) => setRegistrationData({
                                                    ...registrationData,
                                                    last_name: e.target.value
                                                })}
                                                className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
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
                                            value={registrationData.email}
                                            onChange={(e) => setRegistrationData({
                                                ...registrationData,
                                                email: e.target.value
                                            })}
                                            className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Phone Number <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={registrationData.phone}
                                            onChange={handlePhoneChange}
                                            placeholder="Enter 10-digit phone number"
                                            maxLength={10}
                                            className={`w-full px-4 py-3 border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary ${phoneError ? 'border-danger' : 'border-border'
                                                }`}
                                            required
                                        />
                                        {phoneError && (
                                            <p className="text-danger text-sm mt-1">{phoneError}</p>
                                        )}
                                        {registrationData.phone && registrationData.phone.length < 10 && (
                                            <p className="text-text-secondary text-xs mt-1">
                                                {10 - registrationData.phone.length} digits remaining
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Select Location <span className="text-danger">*</span>
                                        </label>
                                        {loadingLocations ? (
                                            <div className="w-full px-4 py-3 border border-border rounded-button bg-background text-text-secondary text-center">
                                                Loading locations...
                                            </div>
                                        ) : (
                                            <select
                                                value={registrationData.ghl_location_id}
                                                onChange={(e) => setRegistrationData({
                                                    ...registrationData,
                                                    ghl_location_id: e.target.value
                                                })}
                                                className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                                required
                                            >
                                                <option value="">Select a location</option>
                                                {locations.map((location) => (
                                                    <option key={location.location_id} value={location.location_id}>
                                                        {location.display_name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setShowRegistrationModal(false);
                                                if (step === 'tpi-packages') {
                                                    setStep('coaching-package-question');
                                                }
                                            }}
                                            variant="secondary"
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={registering}
                                            variant="primary"
                                            className="flex-1"
                                        >
                                            {registering ? 'Submitting...' : 'Submit'}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {toast && (
                <div className="fixed top-4 right-4 z-50">
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={hideToast}
                    />
                </div>
            )}

            <PopupMessage
                open={popup.open}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                confirmText={popup.confirmText}
                cancelText={popup.cancelText}
                showCancel={popup.showCancel}
                onConfirm={popup.onConfirm ? () => {
                    if (popup.onConfirm) popup.onConfirm();
                    closePopup();
                } : closePopup}
                onClose={closePopup}
            />

            {/* Square Payment Modal */}
            <SquarePaymentModal
                isOpen={squarePayment.isOpen}
                onClose={() => setSquarePayment({ isOpen: false, tempId: null, amount: null, packageTitle: '' })}
                onSuccess={() => {
                    setSquarePayment({ isOpen: false, tempId: null, amount: null, packageTitle: '' });
                    openPopup({
                        type: 'success',
                        title: 'Purchase Successful!',
                        message: 'Your package has been purchased! You can now book your coaching session.',
                        confirmText: 'Book Now',
                        showCancel: false,
                        onConfirm: () => navigate(`/guest-booking?phone=${encodeURIComponent(registeredPhone)}&message=${encodeURIComponent('Package purchased successfully! Please book your coaching session.')}`)
                    });
                }}
                tempId={squarePayment.tempId}
                amount={squarePayment.amount}
                currency="CAD"
                paymentType="package"
                description={squarePayment.packageTitle}
                disableCoupons={true}
            />

        </div>
    );
}

export default GuestLanding;

