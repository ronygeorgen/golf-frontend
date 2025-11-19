import React from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

const TYPE_CONFIG = {
    success: {
        icon: CheckCircle,
        iconClasses: 'text-green-600 bg-green-100',
        buttonClasses: 'bg-green-600 hover:bg-green-700 text-white',
    },
    warning: {
        icon: AlertTriangle,
        iconClasses: 'text-amber-600 bg-amber-100',
        buttonClasses: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    error: {
        icon: XCircle,
        iconClasses: 'text-red-600 bg-red-100',
        buttonClasses: 'bg-red-600 hover:bg-red-700 text-white',
    },
    info: {
        icon: Info,
        iconClasses: 'text-blue-600 bg-blue-100',
        buttonClasses: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
};

const DEFAULT_TITLES = {
    success: 'Success',
    warning: 'Are you sure?',
    error: 'Something went wrong',
    info: 'Notice',
};

function PopupMessage({
    open,
    type = 'info',
    title,
    message,
    confirmText = 'OK',
    cancelText = 'Cancel',
    showCancel = false,
    onConfirm,
    onClose,
}) {
    if (!open) {
        return null;
    }

    const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
    const Icon = config.icon || Info;

    const handleConfirm = async () => {
        if (onConfirm) {
            await onConfirm();
        } else if (onClose) {
            onClose();
        }
    };

    const handleClose = () => {
        if (onClose) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
                onClick={showCancel ? handleClose : undefined}
            />
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-start gap-4">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-full ${config.iconClasses}`}>
                        <Icon className="h-6 w-6" />
                    </span>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {title || DEFAULT_TITLES[type] || DEFAULT_TITLES.info}
                        </h3>
                        {message && (
                            <p className="mt-1 text-sm text-gray-600">
                                {typeof message === 'string' ? message : message}
                            </p>
                        )}
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    {showCancel && (
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold ${config.buttonClasses}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PopupMessage;

