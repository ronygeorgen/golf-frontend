import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import logo from '../assets/hole9golf-logo.png';

function PaymentSuccess() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, token } = useAppSelector((state) => state.auth);
    
    useEffect(() => {
        // Check if user is logged in
        if (!user || !token) {
            // User is a guest - redirect to login with success message
            const message = searchParams.get('message') || 'Package purchased successfully! Please login to access your package.';
            navigate(`/signin?purchase_success=true&message=${encodeURIComponent(message)}`, { replace: true });
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

