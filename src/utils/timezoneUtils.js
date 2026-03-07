/**
 * Timezone utilities for the Golf Booking frontend.
 *
 * USAGE:
 *   import { formatLocalTime, formatLocalDate, formatLocalDateTime } from '../utils/timezoneUtils';
 *   const { locationTimezone } = useAppSelector((state) => state.auth);
 *   const displayTime = formatLocalTime(booking.start_time, locationTimezone);
 *
 * WHY IANA NAMES (not +/- offsets):
 *   'America/Halifax' automatically handles DST:
 *     - Before March 8, 2026 2:00 AM  → UTC-4 (AST)
 *     - After  March 8, 2026 2:00 AM  → UTC-3 (ADT)
 *   A fixed offset like '-04:00' would be WRONG after DST kicks in.
 *
 * We use the native Intl.DateTimeFormat API (no extra deps needed).
 * All UTC strings from the API are ISO 8601: "2026-03-10T18:00:00Z"
 */

export function getTimezoneAbbreviation(timezone = 'America/Halifax', date = new Date()) {
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            timeZoneName: 'short'
        }).formatToParts(date);
        const tzName = parts.find(p => p.type === 'timeZoneName')?.value;
        return tzName || timezone;
    } catch {
        return timezone;
    }
}

/**
 * Format a UTC ISO datetime string as a local time in the given IANA timezone.
 *
 * @param {string|Date} utcString  - UTC datetime, e.g. "2026-03-10T18:00:00Z"
 * @param {string} timezone        - IANA timezone, e.g. "America/Halifax"
 * @param {object} options         - Intl.DateTimeFormat options (optional)
 * @returns {string} Formatted local time, e.g. "2:00 PM"
 */
export function formatLocalTime(utcString, timezone = 'America/Halifax', options = {}) {
    if (!utcString) return '';
    try {
        const date = new Date(utcString);
        if (isNaN(date)) return '';
        return new Intl.DateTimeFormat('en-CA', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: timezone,
            ...options,
        }).format(date);
    } catch {
        return '';
    }
}

/**
 * Format a UTC ISO datetime string as a local date in the given IANA timezone.
 *
 * @param {string|Date} utcString  - UTC datetime, e.g. "2026-03-10T18:00:00Z"
 * @param {string} timezone        - IANA timezone, e.g. "America/Halifax"
 * @param {object} options         - Intl.DateTimeFormat options (optional)
 * @returns {string} Formatted local date, e.g. "March 10, 2026"
 */
export function formatLocalDate(utcString, timezone = 'America/Halifax', options = {}) {
    if (!utcString) return '';
    try {
        const date = new Date(utcString);
        if (isNaN(date)) return '';
        return new Intl.DateTimeFormat('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: timezone,
            ...options,
        }).format(date);
    } catch {
        return '';
    }
}

/**
 * Format a UTC ISO datetime string as a local date + time.
 *
 * @param {string|Date} utcString  - UTC datetime
 * @param {string} timezone        - IANA timezone
 * @param {object} options         - Intl.DateTimeFormat options (optional)
 * @returns {string} e.g. "March 10, 2026 at 2:00 PM"
 */
export function formatLocalDateTime(utcString, timezone = 'America/Halifax', options = {}) {
    if (!utcString) return '';
    try {
        const date = new Date(utcString);
        if (isNaN(date)) return '';
        return new Intl.DateTimeFormat('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: timezone,
            ...options,
        }).format(date);
    } catch {
        return '';
    }
}

/**
 * Get today's date string (YYYY-MM-DD) in the given IANA timezone.
 * Use this instead of `new Date().toISOString().slice(0,10)` which gives UTC date.
 *
 * @param {string} timezone - IANA timezone
 * @returns {string} e.g. "2026-03-10"
 */
export function getTodayInTimezone(timezone = 'America/Halifax') {
    return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: timezone,
    }).format(new Date()).replace(/\//g, '-');
}

/**
 * Get the current time as a Date object adjusted to the given timezone.
 * Useful for comparing local "now" against slot times.
 *
 * @param {string} timezone - IANA timezone
 * @returns {Date} current moment
 */
export function getNowInTimezone(timezone = 'America/Halifax') {
    // Returns the actual UTC Date — use with Intl for display.
    // For comparison, just use `new Date()` — it's already UTC.
    return new Date();
}

/**
 * Convert a local date string (YYYY-MM-DD) and local time string (HH:MM)
 * to a UTC ISO string, accounting for the given IANA timezone and DST.
 *
 * Example:
 *   localToUTCIso('2026-03-10', '15:00', 'America/Halifax')
 *   → "2026-03-10T18:00:00.000Z"  (Halifax is UTC-3 on that date after DST)
 *
 * @param {string} localDateStr - e.g. "2026-03-10"
 * @param {string} localTimeStr - e.g. "15:00"
 * @param {string} timezone     - IANA timezone
 * @returns {string} UTC ISO string
 */
export function localToUTCIso(localDateStr, localTimeStr, timezone = 'America/Halifax') {
    if (!localDateStr || !localTimeStr) return '';
    try {
        // Build a string that the browser will parse as local time in the given timezone
        // We use Intl to get the UTC offset for this specific date/time (handles DST)
        const localDateTimeStr = `${localDateStr}T${localTimeStr}:00`;

        // Use Temporal-style approach: parse as UTC, then adjust by offset
        // This is the most reliable cross-browser approach without external deps
        const tempDate = new Date(`${localDateTimeStr}Z`); // parse as UTC first

        // Get the UTC offset for this local time in the timezone
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });

        // Format the temp UTC date in the target timezone
        const parts = formatter.formatToParts(tempDate);
        const get = (type) => parts.find(p => p.type === type)?.value || '0';

        const tzYear = parseInt(get('year'));
        const tzMonth = parseInt(get('month')) - 1;
        const tzDay = parseInt(get('day'));
        const tzHour = parseInt(get('hour'));
        const tzMinute = parseInt(get('minute'));
        const tzSecond = parseInt(get('second'));

        // What we wanted
        const [wantYear, wantMonth, wantDay] = localDateStr.split('-').map(Number);
        const [wantHour, wantMinute] = localTimeStr.split(':').map(Number);

        // Difference between what we got and what we wanted (in ms)
        const gotMs = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond);
        const wantMs = Date.UTC(wantYear, wantMonth - 1, wantDay, wantHour, wantMinute, 0);
        const diffMs = gotMs - wantMs;

        // The actual UTC time is tempDate adjusted by the difference
        const utcMs = tempDate.getTime() - diffMs;
        return new Date(utcMs).toISOString();
    } catch {
        return '';
    }
}

/**
 * Format a UTC ISO datetime for display in the local timezone with a short format.
 * e.g. "Tue, Mar 10 at 2:00 PM"
 *
 * @param {string} utcString - UTC ISO datetime
 * @param {string} timezone  - IANA timezone
 * @returns {string}
 */
export function formatLocalShort(utcString, timezone = 'America/Halifax') {
    if (!utcString) return '';
    try {
        const date = new Date(utcString);
        if (isNaN(date)) return '';
        const datePart = new Intl.DateTimeFormat('en-CA', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            timeZone: timezone,
        }).format(date);
        const timePart = new Intl.DateTimeFormat('en-CA', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: timezone,
        }).format(date);
        return `${datePart} at ${timePart}`;
    } catch {
        return '';
    }
}
