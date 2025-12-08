import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const TYPE_CONFIG = {
    success: {
        icon: CheckCircle,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-400',
        textColor: 'text-green-700',
        iconColor: 'text-green-400',
    },
    error: {
        icon: XCircle,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-400',
        textColor: 'text-red-700',
        iconColor: 'text-red-400',
    },
    warning: {
        icon: AlertTriangle,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-400',
        textColor: 'text-yellow-700',
        iconColor: 'text-yellow-400',
    },
    info: {
        icon: Info,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-400',
        textColor: 'text-blue-700',
        iconColor: 'text-blue-400',
    },
};

function Toast({ message, type = 'info', onClose, duration = 5000 }) {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
    const Icon = config.icon;

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    return (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
            <div className={`${config.bgColor} ${config.borderColor} border-l-4 p-4 rounded-lg shadow-lg max-w-md`}>
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <Icon className={`h-5 w-5 ${config.iconColor}`} />
                    </div>
                    <div className="ml-3 flex-1">
                        <p className={`text-sm ${config.textColor}`}>{message}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                        <button
                            onClick={onClose}
                            className={`inline-flex ${config.iconColor} hover:opacity-70 focus:outline-none transition-opacity`}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Toast;

