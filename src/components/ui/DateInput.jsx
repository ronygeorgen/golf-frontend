import React, { useState, useRef } from 'react';

/**
 * DateInput — iOS Safari compatible date field.
 *
 * The classic iOS Safari problem: input[type="date"] with an empty value
 * renders completely blank (no placeholder, no hint). This is a known
 * WebKit limitation — placeholder attributes are ignored on date inputs.
 *
 * Solution (no wrapper div, no width issues):
 *   • When empty + not focused → type="text" with a visible placeholder
 *   • On focus               → switch to type="date" → iOS shows date picker
 *   • On blur with no value  → switch back to type="text"
 *   • Once a date is chosen  → stay as type="date" forever
 *
 * The input is a single DOM element with the same global CSS styles as every
 * other input in the form, so width is always identical.
 */
function DateInput({
    value = '',
    onChange,
    min,
    max,
    placeholder = 'Select a date',
    className = '',
    disabled = false,
    onKeyDown,
    onKeyPress,
    onPaste,
    ...rest
}) {
    // Start as 'text' when empty so placeholder shows immediately; 'date' if already has value
    const [inputType, setInputType] = useState(value ? 'date' : 'text');
    const inputRef = useRef(null);

    const handleFocus = () => {
        // Switch to date input — iOS date picker appears on focus
        setInputType('date');
    };

    const handleBlur = (e) => {
        // If user dismissed without picking, show placeholder again
        if (!e.target.value) {
            setInputType('text');
        }
    };

    const handleChange = (e) => {
        onChange(e);
        // Once a date is selected, stay as type="date"
        if (e.target.value) {
            setInputType('date');
        }
    };

    return (
        <input
            ref={inputRef}
            type={inputType}
            /* When showing as text, always show empty so placeholder appears.
               When showing as date, pass the actual value. */
            value={inputType === 'text' ? '' : value}
            placeholder={inputType === 'text' ? placeholder : undefined}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            min={min}
            max={max}
            disabled={disabled}
            onKeyDown={onKeyDown}
            onKeyPress={onKeyPress}
            onPaste={onPaste}
            className={`cursor-pointer ${className}`}
            {...rest}
        />
    );
}

export default DateInput;
