package com.gsg.it4u.service.mail;

import com.gsg.it4u.constant.EmailEventType; // Keeping for Audit mapping if needed
import com.gsg.it4u.dto.TicketDTO;
import com.gsg.it4u.entity.EmailAudit;
import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import com.gsg.it4u.repository.EmailAuditRepository;
import com.gsg.it4u.repository.TicketRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import java.util.UUID;

@Service
@ConditionalOnProperty(name = "it4u.mail.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class TicketMailService {

    private final JavaMailSender mailSender;
    private final TicketRecipientResolver recipientResolver;
    private final TicketMailComposer mailComposer;
    private final TicketRepository ticketRepository;
    private final EmailAuditRepository emailAuditRepository;

    @Value("${it4u.mail.enabled:false}")
    private boolean emailEnabled;

    @Value("${notifications.sender-address}")
    private String senderAddress;

    @Value("${it4u.mail.thread.domain:it4u.geosoftglobal.com}")
    private String threadDomain;

    /**
     * New DTO-based method to send emails for status changes without lazy-loading
     * issues
     */
    @Async("mailExecutor")
    @org.springframework.transaction.annotation.Transactional
    public void sendEmailForStatusChange(TicketDTO ticketDTO, User actor, String comment) {
        if (!emailEnabled) {
            log.info("Email disabled. Skipping notification for Ticket #{}", ticketDTO.getId());
            return;
        }

        try {
            // Re-fetch ticket ONLY to update email thread ID if needed
            // All other data comes from DTO to avoid lazy-loading issues
            Ticket ticket = ticketRepository.findById(ticketDTO.getId()).orElse(null);
            if (ticket == null) {
                log.warn("Ticket #{} not found for email notification", ticketDTO.getId());
                return;
            }

            // Eagerly initialize lazy collections to prevent LazyInitializationException
            org.hibernate.Hibernate.initialize(ticket.getAttachments());
            org.hibernate.Hibernate.initialize(ticket.getComments());

            // 1. Resolve Recipients (using the fetched ticket for navigation)
            TicketRecipientResolver.EmailRecipients recipients = recipientResolver.resolve(ticket,
                    TicketRecipientResolver.MailAction.STATUS_CHANGED, actor);
            if ((recipients.getTo() == null || recipients.getTo().length == 0) &&
                    (recipients.getCc() == null || recipients.getCc().length == 0)) {
                log.warn("No recipients resolved for Ticket #{} Status Change", ticketDTO.getId());
                return;
            }

            // 2. Build Content (using the fetched ticket for mail composition)
            TicketMailComposer.MailContent content = mailComposer.build(ticket,
                    TicketRecipientResolver.MailAction.STATUS_CHANGED, comment,
                    actor != null ? actor.getFullName() : "System");

            // 3. Prepare Message with Threading
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(senderAddress);
            helper.setTo(recipients.getTo());
            if (recipients.getCc() != null && recipients.getCc().length > 0) {
                helper.setCc(recipients.getCc());
            }
            helper.setSubject(content.getSubject());
            helper.setText(content.getBody(), true);

            // Threading Headers
            handleThreadingHeaders(message, ticket);

            // 4. Send
            mailSender.send(message);

            // Structured Logging for Verification
            String messageId = message.getMessageID();
            String[] to = recipients.getTo();
            String[] cc = recipients.getCc();
            String inReplyTo = message.getHeader("In-Reply-To", null);

            log.info(
                    "MAIL_AUDIT | Ticket: {} | Action: STATUS_CHANGED | To: {} | Cc: {} | Subject: {} | MsgId: {} | InReplyTo: {}",
                    ticketDTO.getTicketNumber() != null ? ticketDTO.getTicketNumber() : ticketDTO.getId(),
                    to != null ? String.join(",", to) : "[]",
                    cc != null ? String.join(",", cc) : "[]",
                    content.getSubject(),
                    messageId,
                    inReplyTo);

            // 5. Audit
            saveAuditLog(ticket, TicketRecipientResolver.MailAction.STATUS_CHANGED, recipients, content.getSubject(),
                    "SENT", null);

        } catch (Exception e) {
            log.error("Failed to send email for Ticket #{}", ticketDTO.getId(), e);
            try {
                Ticket ticket = ticketRepository.findById(ticketDTO.getId()).orElse(null);
                if (ticket != null) {
                    saveAuditLog(ticket, TicketRecipientResolver.MailAction.STATUS_CHANGED, null, "Error", "FAILED",
                            e.getMessage());
                }
            } catch (Exception auditEx) {
                log.error("Failed to save audit log for failed email", auditEx);
            }
        }
    }

    /**
     * New DTO-based method to send emails for comment additions without
     * lazy-loading issues
     */
    @Async("mailExecutor")
    @org.springframework.transaction.annotation.Transactional
    public void sendEmailForComment(TicketDTO ticketDTO, User actor, String comment) {
        if (!emailEnabled) {
            log.info("Email disabled. Skipping notification for Ticket #{}", ticketDTO.getId());
            return;
        }

        try {
            // Re-fetch ticket ONLY to update email thread ID if needed
            Ticket ticket = ticketRepository.findById(ticketDTO.getId()).orElse(null);
            if (ticket == null) {
                log.warn("Ticket #{} not found for email notification", ticketDTO.getId());
                return;
            }

            // Eagerly initialize lazy collections to prevent LazyInitializationException
            org.hibernate.Hibernate.initialize(ticket.getAttachments());
            org.hibernate.Hibernate.initialize(ticket.getComments());

            // 1. Resolve Recipients
            TicketRecipientResolver.EmailRecipients recipients = recipientResolver.resolve(ticket,
                    TicketRecipientResolver.MailAction.COMMENT_ADDED, actor);
            if ((recipients.getTo() == null || recipients.getTo().length == 0) &&
                    (recipients.getCc() == null || recipients.getCc().length == 0)) {
                log.warn("No recipients resolved for Ticket #{} Comment Added", ticketDTO.getId());
                return;
            }

            // 2. Build Content
            TicketMailComposer.MailContent content = mailComposer.build(ticket,
                    TicketRecipientResolver.MailAction.COMMENT_ADDED, comment,
                    actor != null ? actor.getFullName() : "System");

            // 3. Prepare Message with Threading
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(senderAddress);
            helper.setTo(recipients.getTo());
            if (recipients.getCc() != null && recipients.getCc().length > 0) {
                helper.setCc(recipients.getCc());
            }
            helper.setSubject(content.getSubject());
            helper.setText(content.getBody(), true);

            // Threading Headers
            handleThreadingHeaders(message, ticket);

            // 4. Send
            mailSender.send(message);

            // Structured Logging for Verification
            String messageId = message.getMessageID();
            String[] to = recipients.getTo();
            String[] cc = recipients.getCc();
            String inReplyTo = message.getHeader("In-Reply-To", null);

            log.info(
                    "MAIL_AUDIT | Ticket: {} | Action: COMMENT_ADDED | To: {} | Cc: {} | Subject: {} | MsgId: {} | InReplyTo: {}",
                    ticketDTO.getTicketNumber() != null ? ticketDTO.getTicketNumber() : ticketDTO.getId(),
                    to != null ? String.join(",", to) : "[]",
                    cc != null ? String.join(",", cc) : "[]",
                    content.getSubject(),
                    messageId,
                    inReplyTo);

            // 5. Audit
            saveAuditLog(ticket, TicketRecipientResolver.MailAction.COMMENT_ADDED, recipients, content.getSubject(),
                    "SENT", null);

        } catch (Exception e) {
            log.error("Failed to send email for Ticket #{}", ticketDTO.getId(), e);
            try {
                Ticket ticket = ticketRepository.findById(ticketDTO.getId()).orElse(null);
                if (ticket != null) {
                    saveAuditLog(ticket, TicketRecipientResolver.MailAction.COMMENT_ADDED, null, "Error", "FAILED",
                            e.getMessage());
                }
            } catch (Exception auditEx) {
                log.error("Failed to save audit log for failed email", auditEx);
            }
        }
    }

    @Async("mailExecutor")
    @org.springframework.transaction.annotation.Transactional
    public void sendEmail(Ticket ticket, TicketRecipientResolver.MailAction action, User actor, String comment) {
        if (!emailEnabled) {
            log.info("Email disabled. Skipping notification for Ticket #{}", ticket.getId());
            return;
        }

        try {
            // Re-fetch ticket to ensure it's attached and lazy collections can be
            // initialized
            // This fixes the LazyInitializationException in Async thread
            ticket = ticketRepository.findById(ticket.getId()).orElse(ticket);

            // Eagerly initialize lazy collections to prevent LazyInitializationException
            org.hibernate.Hibernate.initialize(ticket.getAttachments());
            org.hibernate.Hibernate.initialize(ticket.getComments());

            // 1. Resolve Recipients
            TicketRecipientResolver.EmailRecipients recipients = recipientResolver.resolve(ticket, action, actor);
            if ((recipients.getTo() == null || recipients.getTo().length == 0) &&
                    (recipients.getCc() == null || recipients.getCc().length == 0)) {
                log.warn("No recipients resolved for Ticket #{} Action {}", ticket.getId(), action);
                return;
            }

            // 2. Build Content
            TicketMailComposer.MailContent content = mailComposer.build(ticket, action, comment,
                    actor != null ? actor.getFullName() : "System");

            // 3. Prepare Message with Threading
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(senderAddress);
            helper.setTo(recipients.getTo());
            if (recipients.getCc() != null && recipients.getCc().length > 0) {
                helper.setCc(recipients.getCc());
            }
            helper.setSubject(content.getSubject());
            helper.setText(content.getBody(), true);

            // Threading Headers
            handleThreadingHeaders(message, ticket);

            // 4. Send
            mailSender.send(message);

            // Structured Logging for Verification
            String messageId = message.getMessageID();
            String[] to = recipients.getTo();
            String[] cc = recipients.getCc();
            String inReplyTo = message.getHeader("In-Reply-To", null);

            log.info("MAIL_AUDIT | Ticket: {} | Action: {} | To: {} | Cc: {} | Subject: {} | MsgId: {} | InReplyTo: {}",
                    ticket.getTicketNumber() != null ? ticket.getTicketNumber() : ticket.getId(),
                    action,
                    to != null ? String.join(",", to) : "[]",
                    cc != null ? String.join(",", cc) : "[]",
                    content.getSubject(),
                    messageId,
                    inReplyTo);

            // 5. Audit (Using generic event type for now or mapping)
            saveAuditLog(ticket, action, recipients, content.getSubject(), "SENT", null);

        } catch (Exception e) {
            log.error("Failed to send email for Ticket #{}", ticket.getId(), e);
            saveAuditLog(ticket, action, null, "Error", "FAILED", e.getMessage());
        }
    }

    private void handleThreadingHeaders(MimeMessage message, Ticket ticket) throws Exception {
        // Ensure Root Message ID exists
        if (ticket.getEmailThreadMessageId() == null) {
            String newId = generateMessageId(ticket);
            ticket.setEmailThreadMessageId(newId);
            ticketRepository.save(ticket); // Persist ID for future threads
            message.setHeader("Message-ID", newId);
        } else {
            // This is a reply
            String newId = generateMessageId(ticket);
            message.setHeader("Message-ID", newId);
            message.setHeader("In-Reply-To", ticket.getEmailThreadMessageId());
            message.setHeader("References", ticket.getEmailThreadMessageId());
        }
    }

    private String generateMessageId(Ticket ticket) {
        return "<" + ticket.getId() + "." + System.currentTimeMillis() + "."
                + UUID.randomUUID().toString().substring(0, 8) + "@" + threadDomain + ">";
    }

    private void saveAuditLog(Ticket ticket, TicketRecipientResolver.MailAction action,
            TicketRecipientResolver.EmailRecipients recipients,
            String subject, String status, String error) {
        try {
            EmailAudit audit = EmailAudit.builder()
                    .ticketId(ticket.getId())
                    .eventType(mapActionToEventType(action))
                    .subject(subject != null ? subject : "Unknown Subject")
                    .status(status)
                    .errorMessage(error)
                    .build();

            // Fix for DB Not Null Constraint: Always set email fields
            if (recipients != null) {
                audit.setToEmail(recipients.getTo() != null ? String.join(",", recipients.getTo()) : "");
                audit.setCcEmail(recipients.getCc() != null ? String.join(",", recipients.getCc()) : "");
            } else {
                audit.setToEmail("");
                audit.setCcEmail("");
            }

            emailAuditRepository.save(audit);
        } catch (Exception ex) {
            log.error("Failed to save audit log", ex);
        }
    }

    private EmailEventType mapActionToEventType(TicketRecipientResolver.MailAction action) {
        switch (action) {
            case TICKET_CREATED:
                return EmailEventType.TICKET_CREATED;
            case MANAGER_APPROVAL_REQUESTED:
                return EmailEventType.MANAGER_APPROVAL_REQUESTED;
            case MANAGER_APPROVED:
                return EmailEventType.MANAGER_APPROVED;
            case MANAGER_REJECTED:
                return EmailEventType.MANAGER_REJECTED;
            case STATUS_CHANGED:
                return EmailEventType.ADMIN_STATUS_CHANGED; // Generic mapping
            case COMMENT_ADDED:
                return EmailEventType.ADMIN_STATUS_CHANGED; // Reusing or need new enum
            default:
                return EmailEventType.ADMIN_STATUS_CHANGED;
        }
    }
}
