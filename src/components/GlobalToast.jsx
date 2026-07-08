import React, { useState, useEffect, useCallback } from 'react';
import toastEmitter from '../utils/toastEmitter';
import Toast from './ui/Toast';

/**
 * GlobalToast — mounts once at the app root.
 * Listens to the toastEmitter event-bus and renders a Toast when fired.
 * Works from anywhere: axios interceptors, utility functions, etc.
 */
function GlobalToast() {
    const [toast, setToast] = useState(null);

    const hide = useCallback(() => setToast(null), []);

    useEffect(() => {
        const unsubscribe = toastEmitter.subscribe(({ type, message, duration }) => {
            setToast({ type, message, duration });
        });
        return unsubscribe;
    }, []);

    if (!toast) return null;

    return (
        <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={hide}
        />
    );
}

export default GlobalToast;
