package com.gsg.it4u.service;

import com.gsg.it4u.entity.Attachment;
import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import org.springframework.stereotype.Service;

@Service
public class TicketAccessService {

    public boolean canViewTicket(User user, Ticket ticket) {
        // ADMIN and IT_SUPPORT can view ALL tickets
        if (user.getRole() == User.Role.ADMIN || user.getRole() == User.Role.IT_SUPPORT) {
            return true;
        }

        // MANAGER can view tickets assigned to them (by ID or Email)
        if (user.getRole() == User.Role.MANAGER) {
            boolean assignedById = ticket.getManager() != null && ticket.getManager().getId().equals(user.getId());
            boolean assignedByEmail = ticket.getManagerEmail() != null
                    && ticket.getManagerEmail().equalsIgnoreCase(user.getEmail());

            // Allow if assigned or if they are the requester
            if (assignedById || assignedByEmail)
                return true;
        }

        // EMPLOYEE (and others) can view if they are the requester
        if (ticket.getRequester() != null && ticket.getRequester().getId().equals(user.getId())) {
            return true;
        }

        return false;
    }

    public boolean canDeleteAttachment(User user, Ticket ticket, Attachment attachment) {
        if (user.getRole() == User.Role.ADMIN)
            return true;

        // IT Support can delete if they have access to the ticket (simplified)
        // Implementing strict: only uploaders can delete
        return attachment.getUploadedBy() != null && attachment.getUploadedBy().getId().equals(user.getId());
    }

    public boolean canUploadAttachment(User user, Ticket ticket) {
        // ADMIN can always upload
        if (user.getRole() == User.Role.ADMIN)
            return true;

        // IT_SUPPORT can upload if assigned OR if they are an admin-like role
        // (requirements say "assigned support or any IT_SUPPORT")
        // User said: "IT_SUPPORT (assigned support or any IT_SUPPORT depending your
        // rule)" -> Let's allow ANY IT_SUPPORT to be safe helpers.
        if (user.getRole() == User.Role.IT_SUPPORT)
            return true;

        // MANAGER: Assigned manager only
        if (user.getRole() == User.Role.MANAGER) {
            boolean assignedById = ticket.getManager() != null && ticket.getManager().getId().equals(user.getId());
            boolean assignedByEmail = ticket.getManagerEmail() != null
                    && ticket.getManagerEmail().equalsIgnoreCase(user.getEmail());
            if (assignedById || assignedByEmail)
                return true;
        }

        // EMPLOYEE: Ticket owner only
        if (ticket.getRequester() != null && ticket.getRequester().getId().equals(user.getId())) {
            return true;
        }

        return false;
    }
}
