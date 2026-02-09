import React from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import Button from './ui/Button';

const TYPE_CONFIG = {
    success: {
        icon: CheckCircle,
        iconClasses: 'text-status-confirmed-text bg-status-confirmed-bg',
    },
    warning: {
        icon: AlertTriangle,
        iconClasses: 'text-status-pending-text bg-status-pending-bg',
    },
    error: {
        icon: XCircle,
        iconClasses: 'text-danger bg-red-100',
    },
    info: {
        icon: Info,
        iconClasses: 'text-primary bg-primary-light/20',
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
    customActions,
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
                onClick={showCancel ? handleClose : undefined}
            />
            <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
                <div className="flex items-start gap-4">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-full ${config.iconClasses}`}>
                        <Icon className="h-6 w-6" />
                    </span>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-text-primary">
                            {title || DEFAULT_TITLES[type] || DEFAULT_TITLES.info}
                        </h3>
                        {message && (
                            <div className="mt-1 text-sm text-text-secondary whitespace-pre-line">
                                {typeof message === 'string' ? message : message}
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    {customActions ? (
                        customActions.map((action, index) => (
                            <Button
                                key={index}
                                type="button"
                                onClick={async () => {
                                    if (action.onClick) await action.onClick();
                                    if (action.shouldClose !== false) handleClose();
                                }}
                                variant={action.variant || 'primary'}
                                className={action.className || "px-4 py-2 text-sm"}
                            >
                                {action.label}
                            </Button>
                        ))
                    ) : (
                        <>
                            {showCancel && (
                                <Button
                                    type="button"
                                    onClick={handleClose}
                                    variant="secondary"
                                    className="px-4 py-2 text-sm"
                                >
                                    {cancelText}
                                </Button>
                            )}
                            <Button
                                type="button"
                                onClick={handleConfirm}
                                variant={type === 'error' ? 'danger' : type === 'warning' ? 'accent' : 'primary'}
                                className="px-4 py-2 text-sm"
                            >
                                {confirmText}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PopupMessage;

