import React, { useRef } from 'react';

/**
 * DateInput
 *
 * Wraps a native <input type="date"> with a visible placeholder overlay.
 *
 * Problem: On iOS Safari, an empty date input shows completely blank —
 * no format hint, no placeholder text. This makes the field look broken.
 * Additionally, the native calendar icon bleeds through over the
 * placeholder text on Chrome/Android.
 *
 * Solution:
 * - When empty: text + icon are transparent on the native input, and we
 *   render our own placeholder + custom calendar icon in the overlay.
 * - The native input remains full-size underneath so tapping anywhere
 *   opens the native date picker.
 * - Once a date is selected, the overlay disappears and the native
 *   value + calendar icon show as normal.
 */
function DateInput({
    value,
    onChange,
    min,
    max,
    placeholder = 'Select a date',
    className = '',
    disabled = false,
    onKeyDown,
    onKeyPress,
    onPaste,
    onClick,
    ...rest
}) {
    const inputRef = useRef(null);

    const openPicker = (e) => {
        if (disabled) return;
        try {
            if (inputRef.current?.showPicker) {
                inputRef.current.showPicker();
            }
        } catch (_) {
            // showPicker() may throw on some browsers — ignore
        }
        onClick?.(e);
    };

    const isEmpty = !value;

    return (
        <div
            className="relative"
            style={{
                /* Match sibling inputs exactly — no extra width, no overflow */
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden',
            }}
        >
            {/* Native date input — always rendered for picker functionality */}
            <input
                ref={inputRef}
                type="date"
                value={value}
                onChange={onChange}
                min={min}
                max={max}
                disabled={disabled}
                onKeyDown={onKeyDown}
                onKeyPress={onKeyPress}
                onPaste={onPaste}
                onClick={openPicker}
                className={`w-full cursor-pointer ${isEmpty ? 'date-input-empty' : ''} ${className}`}
                style={isEmpty ? {
                    color: 'transparent',
                    caretColor: 'transparent',
                    /* Hide the native calendar icon so our custom one
                       in the overlay is the only one visible */
                    WebkitTextFillColor: 'transparent',
                } : {}}
                {...rest}
            />

            {/* Placeholder overlay — visible only when no date is selected */}
            {isEmpty && !disabled && (
                <div
                    onClick={openPicker}
                    className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none select-none"
                    style={{ fontSize: 16, lineHeight: 'normal' }}
                    aria-hidden="true"
                >
                    {/* Placeholder text */}
                    <span className="text-text-secondary truncate pr-2">
                        {placeholder}
                    </span>

                    {/* Custom calendar icon — replaces the hidden native one */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-text-secondary flex-shrink-0"
                        aria-hidden="true"
                    >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                </div>
            )}


        </div>
    );
}

export default DateInput;
