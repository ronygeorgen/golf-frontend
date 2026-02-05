/**
 * Timezone utility functions
 * Converts between local time and UTC
 */

/**
 * Convert local time (HH:MM format) to UTC time (HH:MM format)
 * @param {string} localTime - Time in HH:MM format (user's local time)
 * @returns {string} - Time in HH:MM format (UTC)
 */
export const localTimeToUTC = (localTime) => {
    if (!localTime) return localTime;

    const [hours, minutes] = localTime.split(':').map(Number);
    const now = new Date();
    const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    // Get UTC time
    const utcHours = localDate.getUTCHours().toString().padStart(2, '0');
    const utcMinutes = localDate.getUTCMinutes().toString().padStart(2, '0');

    return `${utcHours}:${utcMinutes}`;
};

/**
 * Convert Halifax time (HH:MM format) to UTC time (HH:MM format)
 * This function always converts from Halifax timezone, regardless of browser timezone
 * @param {string} halifaxTime - Time in HH:MM format (Halifax/America/Halifax timezone)
 * @returns {string} - Time in HH:MM format (UTC)
 */
export const halifaxTimeToUTC = (halifaxTime) => {
    if (!halifaxTime) return halifaxTime;

    const [hours, minutes] = halifaxTime.split(':').map(Number);
    const now = new Date();
    
    // Create a date string representing Halifax time on today's date
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateTimeStr = `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    
    // Create a date object - this will be interpreted in browser's local timezone
    const tempDate = new Date(dateTimeStr);
    
    // Get what this time would be in Halifax timezone
    const halifaxString = tempDate.toLocaleString('en-US', {
        timeZone: 'America/Halifax',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    // Parse Halifax time to get the actual Halifax datetime
    const [hDate, hTime] = halifaxString.split(', ');
    const [hMonth, hDay, hYear] = hDate.split('/').map(Number);
    const [hHour, hMin, hSec] = hTime.split(':').map(Number);
    const halifaxDate = new Date(hYear, hMonth - 1, hDay, hHour, hMin, hSec);
    
    // Calculate offset between browser timezone and Halifax
    const offset = tempDate.getTime() - halifaxDate.getTime();
    
    // Create the correct Halifax datetime
    const inputDate = new Date(year, now.getMonth(), now.getDate(), hours, minutes, 0);
    const utcDate = new Date(inputDate.getTime() - offset);
    
    // Extract UTC hours and minutes
    const utcHours = utcDate.getUTCHours().toString().padStart(2, '0');
    const utcMinutes = utcDate.getUTCMinutes().toString().padStart(2, '0');
    
    return `${utcHours}:${utcMinutes}`;
};

/**
 * Convert UTC time (HH:MM format) to Halifax time (HH:MM format)
 * @param {string} utcTime - Time in HH:MM format (UTC)
 * @returns {string} - Time in HH:MM format (Halifax/Atlantic Time)
 */
export const utcTimeToLocal = (utcTime) => {
    if (!utcTime) return utcTime;

    const [hours, minutes] = utcTime.split(':').map(Number);
    const now = new Date();
    const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes));

    // Convert to Halifax timezone
    const halifaxTimeString = utcDate.toLocaleString('en-US', {
        timeZone: 'America/Halifax',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    // Extract hours and minutes from the formatted string (format: "HH:mm")
    const timeParts = halifaxTimeString.match(/(\d+):(\d+)/);
    if (timeParts) {
        return `${timeParts[1].padStart(2, '0')}:${timeParts[2].padStart(2, '0')}`;
    }

    // Fallback (shouldn't happen)
    return utcTime;
};

/**
 * Convert UTC datetime string to local time string for display
 * @param {string} utcDateTime - ISO datetime string in UTC
 * @returns {string} - Formatted time string in local timezone
 */
export const formatUTCDateTimeToLocal = (utcDateTime) => {
    if (!utcDateTime) return '';
    const date = new Date(utcDateTime);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Convert local date and time to UTC ISO string
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:MM format (local time)
 * @returns {string} - ISO datetime string in UTC
 */
export const localDateTimeToUTC = (date, time) => {
    if (!date || !time) return null;

    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);

    // Create date in local timezone
    const localDate = new Date(year, month - 1, day, hours, minutes);

    // Return ISO string (automatically in UTC)
    return localDate.toISOString();
};

/**
 * Convert UTC date and time to Halifax timezone date for display
 * This is critical for special events where a late-night event (e.g., 8 PM Halifax)
 * is stored as the next day in UTC (e.g., Feb 3 00:00 UTC for Feb 2 8 PM Halifax).
 * We need to show the correct Halifax date to users regardless of their browser timezone.
 * 
 * @param {string} utcDate - Date in YYYY-MM-DD format (UTC)
 * @param {string} utcTime - Time in HH:MM or HH:MM:SS format (UTC)
 * @returns {Date} - JavaScript Date object representing Halifax time
 */
export const utcDateTimeToLocalDate = (utcDate, utcTime) => {
    if (!utcDate || !utcTime) return null;

    // Parse UTC date and time
    const [year, month, day] = utcDate.split('-').map(Number);
    const timeParts = utcTime.split(':').map(Number);
    const hours = timeParts[0];
    const minutes = timeParts[1];

    // Create a UTC datetime
    const utcDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    // Convert to Halifax timezone string and parse back
    // This gives us the correct Halifax date even when the browser is in a different timezone
    const halifaxTimeString = utcDateTime.toLocaleString('en-US', {
        timeZone: 'America/Halifax',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    // Parse the Halifax time string back to a Date object
    // Format is: "MM/DD/YYYY, HH:mm:ss"
    const [datePart, timePart] = halifaxTimeString.split(', ');
    const [m, d, y] = datePart.split('/').map(Number);
    const [h, min, s] = timePart.split(':').map(Number);

    // Return a date object representing the Halifax time
    return new Date(y, m - 1, d, h, min, s);
};

/**
 * Convert UTC datetime string (ISO format) to Halifax timezone Date object
 * Used for converting booking times from backend to display in calendar
 * 
 * @param {string} utcDateTimeString - ISO datetime string in UTC (e.g., "2026-01-30T20:00:00Z")
 * @returns {Date} - JavaScript Date object representing Halifax time
 */
export const utcToHalifaxDate = (utcDateTimeString) => {
    if (!utcDateTimeString) return null;

    // Parse the UTC datetime string
    const utcDate = new Date(utcDateTimeString);

    // Convert to Halifax timezone string
    const halifaxTimeString = utcDate.toLocaleString('en-US', {
        timeZone: 'America/Halifax',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    // Parse the Halifax time string back to a Date object
    // Format is: "MM/DD/YYYY, HH:mm:ss"
    const [datePart, timePart] = halifaxTimeString.split(', ');
    const [m, d, y] = datePart.split('/').map(Number);
    const [h, min, s] = timePart.split(':').map(Number);

    // Return a date object representing the Halifax time
    return new Date(y, m - 1, d, h, min, s);
};













/**
 * Convert Halifax local date and time to UTC ISO string
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:MM format (Halifax time)
 * @returns {string} - ISO datetime string in UTC
 */
export const halifaxDateTimeToUTC = (date, time) => {
    if (!date || !time) return null;

    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);

    // Create a date string in ISO format
    const dateTimeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

    // Create a temporary date object (will be in browser's local timezone)
    const tempDate = new Date(dateTimeStr);

    // Get what this date/time would be in Halifax timezone
    const halifaxString = tempDate.toLocaleString('en-US', {
        timeZone: 'America/Halifax',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    // Parse the Halifax string to get the actual Halifax time
    const [hDate, hTime] = halifaxString.split(', ');
    const [hMonth, hDay, hYear] = hDate.split('/').map(Number);
    const [hHour, hMin, hSec] = hTime.split(':').map(Number);

    // Calculate the offset between what we created and what Halifax shows
    const halifaxDate = new Date(hYear, hMonth - 1, hDay, hHour, hMin, hSec);
    const offset = tempDate.getTime() - halifaxDate.getTime();

    // Create the correct date by applying the offset
    const inputDate = new Date(year, month - 1, day, hours, minutes, 0);
    const utcDate = new Date(inputDate.getTime() - offset);

    // Return ISO string (in UTC)
    return utcDate.toISOString();
};
