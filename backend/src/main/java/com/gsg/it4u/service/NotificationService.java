package com.gsg.it4u.service;

import com.gsg.it4u.event.*;
import com.gsg.it4u.service.mail.TicketMailService;
import com.gsg.it4u.service.mail.TicketRecipientResolver;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Service
@Slf4j
public class NotificationService {

    private final TicketMailService ticketMailService;

    @org.springframework.beans.factory.annotation.Value("${notifications.enabled:true}")
    private boolean notificationsEnabled;

    public NotificationService(
            @org.springframework.beans.factory.annotation.Autowired(required = false) TicketMailService ticketMailService) {
        this.ticketMailService = ticketMailService;
        if (this.ticketMailService == null) {
            log.info(
                    "NotificationService initialized but Mail Service is DISABLED (Bean is null). Emails will not be sent.");
        } else {
            log.info(
                    "NotificationService initialized with Mail Service ENABLED (Bean present). checking feature flag...");
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleTicketCreated(TicketCreatedEvent event) {
        log.info("Event: Ticket #{} Created. Sending notification.", event.getTicket().getId());

        if (!shouldSendNotification()) {
            log.info("Skipping Ticket #{} Created notification (Disabled).", event.getTicket().getId());
            return;
        }

        try {
            if (event.getTicket().getStatus() == com.gsg.it4u.entity.Ticket.Status.PENDING_MANAGER_APPROVAL) {
                ticketMailService.sendEmail(
                        event.getTicket(),
                        TicketRecipientResolver.MailAction.MANAGER_APPROVAL_REQUESTED,
                        event.getCreator(),
                        null);
            } else {
                ticketMailService.sendEmail(
                        event.getTicket(),
                        TicketRecipientResolver.MailAction.TICKET_CREATED,
                        event.getCreator(),
                        null);
            }
        } catch (Exception e) {
            log.warn("Failed to send creation email for Ticket #{} (Non-fatal): {}", event.getTicket().getId(),
                    e.getMessage());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleTicketStatusChanged(TicketStatusChangedEvent event) {
        log.info("Event: Ticket #{} Status Changed to {}.", event.getTicketDTO().getId(), event.getNewStatus());

        if (!shouldSendNotification()) {
            log.info("Skipping Ticket #{} Status Change notification (Disabled).", event.getTicketDTO().getId());
            return;
        }

        try {
            ticketMailService.sendEmailForStatusChange(
                    event.getTicketDTO(),
                    event.getActor(),
                    event.getComment());
        } catch (Exception e) {
            log.warn("Failed to send status change email for Ticket #{} (Non-fatal): {}", event.getTicketDTO().getId(),
                    e.getMessage());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleManagerDecision(TicketManagerDecisionEvent event) {
        log.info("Event: Ticket #{} Manager Decision: Approved={}", event.getTicket().getId(), event.isApproved());

        if (!shouldSendNotification()) {
            log.info("Skipping Ticket #{} Manager Decision notification (Disabled).", event.getTicket().getId());
            return;
        }

        try {
            TicketRecipientResolver.MailAction action = event.isApproved()
                    ? TicketRecipientResolver.MailAction.MANAGER_APPROVED
                    : TicketRecipientResolver.MailAction.MANAGER_REJECTED;

            ticketMailService.sendEmail(
                    event.getTicket(),
                    action,
                    event.getManager(),
                    event.getComment());
        } catch (Exception e) {
            log.warn("Failed to send manager decision email for Ticket #{} (Non-fatal): {}", event.getTicket().getId(),
                    e.getMessage());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleTicketCommentAdded(TicketCommentAddedEvent event) {
        log.info("Event: Ticket #{} Comment Added.", event.getTicketDTO().getId());

        if (!shouldSendNotification()) {
            log.info("Skipping Ticket #{} Comment notification (Disabled).", event.getTicketDTO().getId());
            return;
        }

        try {
            ticketMailService.sendEmailForComment(
                    event.getTicketDTO(),
                    event.getActor(),
                    event.getCommentEntity().getContent());
        } catch (Exception e) {
            log.warn("Failed to send comment email for Ticket #{} (Non-fatal): {}", event.getTicketDTO().getId(),
                    e.getMessage());
        }
    }

    private boolean shouldSendNotification() {
        if (ticketMailService == null)
            return false;
        if (!notificationsEnabled)
            return false;
        return true;
    }
}
