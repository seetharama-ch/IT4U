import apiClient from './apiClient';

/**
 * Deletes a ticket by ID.
 * Handles 204 No Content gracefully to avoid JSON parse errors.
 * 
 * @param {string|number} ticketId 
 * @returns {Promise<object>} The response data or { ok: true }
 */
export async function deleteTicket(ticketId) {
    try {
        await apiClient.delete(`/tickets/${ticketId}`, {
            validateStatus: (status) => {
                return (status >= 200 && status < 300);
            }
        });

        return { ok: true };
    } catch (error) {
        // Enhance error with message if available
        const msg = error.response?.data?.message || error.message || "Delete failed";
        throw new Error(msg);
    }
}
