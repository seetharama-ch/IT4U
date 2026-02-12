/**
 * Formats an ISO date string into a consistent format: "DD-MMM-YYYY HH:mm"
 * Example: "14-Dec-2025 19:05"
 * Uses user's local timezone.
 * @param {string} isoString - The ISO date string to format
 * @returns {string} - The formatted date string or '--' if invalid
 */
export const formatDateTime = (isoString) => {
    if (!isoString) return '--';

    try {
        const date = new Date(isoString);

        // Check if date is valid
        if (isNaN(date.getTime())) return '--';

        // Options for date formatting
        const options = {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };

        // Get the formatted parts
        const formatter = new Intl.DateTimeFormat('en-GB', options);
        return formatter.format(date).replace(',', '');
    } catch (e) {
        console.error('Error formatting date:', e);
        return isoString || '--';
    }
};
