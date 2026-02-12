package com.gsg.it4u.service.mail;

import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;
import java.util.Arrays;
import java.util.List;
import jakarta.annotation.PostConstruct;

@Component
@RequiredArgsConstructor
@Slf4j
public class TicketRecipientResolver {

    @Value("${it4u.mail.cc.itSupport:}")
    private String itSupportCc;

    @Value("${it4u.mail.cc.admin:}")
    private String adminCc;

    @Value("${it4u.mail.from:no-reply@geosoftglobal.com}")
    private String mailFrom;

    @Value("${it4u.mail.enabled:false}")
    private boolean mailEnabled;

    public EmailRecipients resolve(Ticket ticket, MailAction action, User actor) {
        Set<String> to = new HashSet<>();
        Set<String> cc = new HashSet<>();

        // Default CCs
        // Default CCs
        addCc(cc, itSupportCc);
        addCc(cc, adminCc);

        // Always CC Manager if exists
        if (ticket.getManager() != null && ticket.getManager().getEmail() != null) {
            cc.add(ticket.getManager().getEmail());
        }

        switch (action) {
            case TICKET_CREATED:
                addTo(to, ticket.getRequester());
                break;

            case MANAGER_APPROVAL_REQUESTED:
                // Special case: TO Manager, CC Employee
                if (ticket.getManager() != null) {
                    to.add(ticket.getManager().getEmail());
                    // Remove manager from CC since they are TO
                    cc.remove(ticket.getManager().getEmail());
                }
                if (ticket.getRequester() != null) {
                    cc.add(ticket.getRequester().getEmail());
                }
                break;

            case MANAGER_APPROVED:
            case MANAGER_REJECTED:
                addTo(to, ticket.getRequester()); // Notify Employee
                // Manager is already in CC by default block above
                break;

            case STATUS_CHANGED: // In-Process, Resolved, Closed
            case COMMENT_ADDED:
                addTo(to, ticket.getRequester());
                break;
        }

        // If actor is the one receiving the email, we might want to suppress or keep
        // it.
        // Requirement: "If comment author is Employee, still keep same; or optionally
        // swap TO to others"
        // We stick to the simple rules for now: Employee is always TO (except for
        // Approval Req).

        return EmailRecipients.builder()
                .to(to.toArray(new String[0]))
                .cc(cc.toArray(new String[0]))
                .build();
    }

    private void addTo(Set<String> recipients, User user) {
        if (user != null && user.getEmail() != null && !user.getEmail().isBlank()) {
            recipients.add(user.getEmail());
        }
    }

    private void addCc(Set<String> recipients, String email) {
        splitEmails(email).forEach(recipients::add);
    }

    public enum MailAction {
        TICKET_CREATED,
        MANAGER_APPROVAL_REQUESTED,
        MANAGER_APPROVED,
        MANAGER_REJECTED,
        STATUS_CHANGED,
        COMMENT_ADDED
    }

    @Data
    @Builder
    public static class EmailRecipients {
        private String[] to;
        private String[] cc;
    }

    @PostConstruct
    void logMailConfig() {
        log.info("Mail enabled={}, from={}, ccItSupportCount={}, ccAdminCount={}",
                mailEnabled, mailFrom, splitEmails(itSupportCc).size(), splitEmails(adminCc).size());
    }

    private List<String> splitEmails(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();
    }
}
