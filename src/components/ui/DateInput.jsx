import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

/**
 * Parse YYYY-MM-DD string to local Date (avoids UTC day-boundary issues).
 */
function stringToDate(value) {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

/**
 * Format Date to YYYY-MM-DD string (local date).
 */
function dateToString(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Single cross-platform date input. Renders the same UI on iOS, Android, and desktop
 * (no native date picker), so alignment and layout are consistent everywhere.
 * Value and onChange use YYYY-MM-DD strings to match the rest of the app.
 */
function DateInput({
  value = '',
  onChange,
  min,
  max,
  placeholder = 'Select date',
  disabled = false,
  className = '',
  id,
  required = false,
  ...props
}) {
  const selected = stringToDate(value);
  const minDate = min ? stringToDate(min) : undefined;
  const maxDate = max ? stringToDate(max) : undefined;

  const handleChange = (date) => {
    onChange?.(date ? dateToString(date) : '');
  };

  return (
    <DatePicker
      id={id}
      selected={selected}
      onChange={handleChange}
      minDate={minDate}
      maxDate={maxDate}
      placeholderText={placeholder}
      disabled={disabled}
      required={required}
      dateFormat="yyyy-MM-dd"
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      className={`date-input-custom w-full box-border min-h-[44px] text-base text-left px-4 py-2 border-2 border-border rounded-[10px] focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-surface transition-colors disabled:bg-background disabled:text-text-secondary disabled:cursor-not-allowed ${className}`}
      calendarClassName="date-input-calendar"
      wrapperClassName="w-full"
      {...props}
    />
  );
}

export default DateInput;
