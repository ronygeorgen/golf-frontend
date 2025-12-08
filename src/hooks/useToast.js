import { useState, useCallback } from 'react';

function useToast() {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'info', duration = 5000) => {
        setToast({ message, type, duration });
    }, []);

    const showSuccess = useCallback((message, duration = 5000) => {
        showToast(message, 'success', duration);
    }, [showToast]);

    const showError = useCallback((message, duration = 5000) => {
        showToast(message, 'error', duration);
    }, [showToast]);

    const showWarning = useCallback((message, duration = 5000) => {
        showToast(message, 'warning', duration);
    }, [showToast]);

    const showInfo = useCallback((message, duration = 5000) => {
        showToast(message, 'info', duration);
    }, [showToast]);

    const hideToast = useCallback(() => {
        setToast(null);
    }, []);

    return {
        toast,
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        hideToast,
    };
}

export default useToast;

