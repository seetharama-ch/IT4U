package com.gsg.it4u.service.mail;

import com.gsg.it4u.entity.Ticket;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.format.DateTimeFormatter;

@Component
@RequiredArgsConstructor
public class TicketMailComposer {

    private final TemplateEngine templateEngine;

    @Value("${it4u.mail.subject.prefix:[IT4U]}")
    private String subjectPrefix;

    @Value("${it4u.app.url:http://localhost:8060}")
    private String appBaseUrl;

    public MailContent build(Ticket ticket, TicketRecipientResolver.MailAction action, String comment,
            String actorName) {
        String subject = buildSubject(ticket, action);
        String body = buildBody(ticket, action, comment, actorName);
        return MailContent.builder().subject(subject).body(body).build();
    }

    private String buildSubject(Ticket ticket, TicketRecipientResolver.MailAction action) {
        StringBuilder sb = new StringBuilder();

        // Change Request Prefix
        if (ticket.getCategory() == Ticket.Category.ACCESS_AND_M365 ||
                ticket.getCategory().name().contains("CHANGE")) { // Heuristic if category enum doesn't map exactly to
                                                                  // "Change Request" concept strictly yet
            // Or just follow user rule: "If ticket type/category = CHANGE_REQUEST"
            // Since Category enum doesn't have CHANGE_REQUEST explicitly, I'll assume
            // 'ACCESS_AND_M365' or similar might trigger it,
            // OR I should check strictly if I added requestType field? Ticket has
            // requestType.
            if ("CHANGE_REQUEST".equalsIgnoreCase(ticket.getRequestType())) {
                sb.append("[Change Request] ");
            }
        }

        sb.append(subjectPrefix).append(" ");

        switch (action) {
            case TICKET_CREATED:
                sb.append("New Ticket Created");
                break;
            case MANAGER_APPROVAL_REQUESTED:
                sb.append("Approval Required");
                break;
            case MANAGER_APPROVED:
                sb.append("Manager Approved");
                break;
            case MANAGER_REJECTED:
                sb.append("Manager Rejected");
                break;
            case STATUS_CHANGED:
                if (ticket.getStatus() == Ticket.Status.IN_PROGRESS)
                    sb.append("In-Process");
                else if (ticket.getStatus() == Ticket.Status.RESOLVED)
                    sb.append("Resolved");
                else if (ticket.getStatus() == Ticket.Status.CLOSED)
                    sb.append("Closed");
                else
                    sb.append("Status Updated");
                break;
            case COMMENT_ADDED:
                sb.append("Comment Added");
                break;
        }

        sb.append(" | ").append(ticket.getTicketNumber() != null ? ticket.getTicketNumber() : ticket.getId());
        sb.append(" | ").append(ticket.getTitle());

        return sb.toString();
    }

    private String buildBody(Ticket ticket, TicketRecipientResolver.MailAction action, String comment,
            String actorName) {
        Context context = new Context();
        context.setVariable("headerTitle", getHeaderTitle(action));
        context.setVariable("ticketNumber",
                ticket.getTicketNumber() != null ? ticket.getTicketNumber() : String.valueOf(ticket.getId()));
        context.setVariable("title", ticket.getTitle());
        context.setVariable("status", ticket.getStatus());
        context.setVariable("priority", ticket.getPriority());
        context.setVariable("category", ticket.getCategory());
        context.setVariable("creatorName",
                ticket.getRequester() != null ? ticket.getRequester().getFullName() : "Unknown");
        context.setVariable("managerName",
                ticket.getManager() != null ? ticket.getManager().getFullName() : "Unassigned");
        context.setVariable("createdAt",
                ticket.getCreatedAt() != null
                        ? ticket.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                        : "");
        context.setVariable("description", ticket.getDescription());
        context.setVariable("latestComment", comment);
        context.setVariable("commentAuthor", actorName);
        context.setVariable("attachmentCount", ticket.getAttachments() != null ? ticket.getAttachments().size() : 0);
        context.setVariable("ticketUrl", appBaseUrl + "/app/tickets/" + ticket.getId()); // Adjust specific URL logic

        // Last updated info
        context.setVariable("lastUpdatedBy", actorName);
        context.setVariable("lastUpdatedAt",
                java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));

        return templateEngine.process("email/ticket_generic", context);
    }

    private String getHeaderTitle(TicketRecipientResolver.MailAction action) {
        switch (action) {
            case TICKET_CREATED:
                return "New Ticket Created";
            case MANAGER_APPROVAL_REQUESTED:
                return "Action Required: Manager Approval";
            case MANAGER_APPROVED:
                return "Ticket Approved by Manager";
            case MANAGER_REJECTED:
                return "Ticket Rejected by Manager";
            case STATUS_CHANGED:
                return "Ticket Status Updated";
            case COMMENT_ADDED:
                return "New Comment Added";
            default:
                return "Ticket Update";
        }
    }

    @Data
    @Builder
    public static class MailContent {
        private String subject;
        private String body;
    }
}
