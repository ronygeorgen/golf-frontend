import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import logo from '../assets/hole9golf-logo.png';

function PaymentSuccess() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, token } = useAppSelector((state) => state.auth);
    
    useEffect(() => {
        const message = searchParams.get('message');
        const phone = searchParams.get('phone');
        
        // Check if user is logged in
        if (!user || !token) {
            // User is a guest - check if we have phone for guest booking
            if (phone) {
                // Redirect to guest booking page
                const redirectUrl = message 
                    ? `/guest-booking?phone=${encodeURIComponent(phone)}&message=${encodeURIComponent(message)}`
                    : `/guest-booking?phone=${encodeURIComponent(phone)}`;
                navigate(redirectUrl, { replace: true });
            } else {
                // No phone - redirect to login with success message
                const defaultMessage = message || 'Package purchased successfully! Please login to access your package.';
                navigate(`/signin?purchase_success=true&message=${encodeURIComponent(defaultMessage)}`, { replace: true });
            }
        } else {
            // User is logged in - redirect to packages page
            navigate('/packages?view=purchases', { replace: true });
        }
    }, [user, token, navigate, searchParams]);
    
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="text-center">
                <img 
                    src={logo} 
                    alt="Hole 9 Golf Logo" 
                    className="h-20 w-auto object-contain mx-auto mb-4"
                />
                <p className="text-text-secondary">Processing your payment...</p>
            </div>
        </div>
    );
}

export default PaymentSuccess;

