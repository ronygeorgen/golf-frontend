import { useState, useCallback } from 'react';

const defaultState = {
    open: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false,
    onConfirm: null,
};

export function usePopup() {
    const [popup, setPopup] = useState(defaultState);

    const openPopup = useCallback((options = {}) => {
        setPopup({
            ...defaultState,
            open: true,
            ...options,
        });
    }, []);

    const closePopup = useCallback(() => {
        setPopup(defaultState);
    }, []);

    return {
        popup,
        openPopup,
        closePopup,
    };
}

export default usePopup;

