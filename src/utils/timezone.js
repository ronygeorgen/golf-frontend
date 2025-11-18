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
 * Convert UTC time (HH:MM format) to local time (HH:MM format)
 * @param {string} utcTime - Time in HH:MM format (UTC)
 * @returns {string} - Time in HH:MM format (user's local time)
 */
export const utcTimeToLocal = (utcTime) => {
    if (!utcTime) return utcTime;
    
    const [hours, minutes] = utcTime.split(':').map(Number);
    const now = new Date();
    const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes));
    
    // Get local time
    const localHours = utcDate.getHours().toString().padStart(2, '0');
    const localMinutes = utcDate.getMinutes().toString().padStart(2, '0');
    
    return `${localHours}:${localMinutes}`;
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




