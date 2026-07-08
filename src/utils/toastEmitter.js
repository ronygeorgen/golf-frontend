/**
 * A tiny event-bus for triggering global toast notifications from outside React
 * (e.g., axios interceptors, utility functions).
 *
 * Usage:
 *   import toastEmitter from './utils/toastEmitter';
 *   toastEmitter.emit('error', 'Something went wrong.');
 *   toastEmitter.emit('success', 'Saved!');
 */

const listeners = new Set();

const toastEmitter = {
    /** Register a listener. Returns an unsubscribe function. */
    subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },

    /** Fire a toast: type = 'success' | 'error' | 'warning' | 'info' */
    emit(type, message, duration = 6000) {
        listeners.forEach((fn) => fn({ type, message, duration }));
    },
};

export default toastEmitter;
