package com.gsg.it4u.service;

import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import com.gsg.it4u.event.TicketCreatedEvent;
import com.gsg.it4u.event.TicketManagerDecisionEvent;
import com.gsg.it4u.event.TicketStatusChangedEvent;
import com.gsg.it4u.service.mail.TicketMailService;
import com.gsg.it4u.service.mail.TicketRecipientResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

class NotificationServiceTest {

    @Mock
    private TicketMailService ticketMailService;

    @InjectMocks
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void handleTicketCreated_ShouldCallSendEmail_WithCreatedAction() {
        // Arrange
        User employee = new User();
        employee.setId(1L);
        Ticket ticket = new Ticket();
        ticket.setStatus(Ticket.Status.OPEN);

        TicketCreatedEvent event = new TicketCreatedEvent(this, ticket, employee, null);

        // Act
        notificationService.handleTicketCreated(event);

        // Assert
        verify(ticketMailService).sendEmail(eq(ticket), eq(TicketRecipientResolver.MailAction.TICKET_CREATED),
                eq(employee), any());
    }

    @Test
    void handleTicketCreated_ShouldCallSendEmail_WithApprovalAction_WhenPending() {
        // Arrange
        User employee = new User();
        Ticket ticket = new Ticket();
        ticket.setStatus(Ticket.Status.PENDING_MANAGER_APPROVAL);

        TicketCreatedEvent event = new TicketCreatedEvent(this, ticket, employee, null);

        // Act
        notificationService.handleTicketCreated(event);

        // Assert
        verify(ticketMailService).sendEmail(eq(ticket),
                eq(TicketRecipientResolver.MailAction.MANAGER_APPROVAL_REQUESTED), eq(employee), any());
    }

    @Test
    void handleTicketStatusChanged_ShouldCallSendEmail_WithStatusChangedAction() {
        User actor = new User();
        Ticket ticket = new Ticket();
        ticket.setId(1L);

        // Convert to DTO as required by the new event structure
        com.gsg.it4u.dto.TicketDTO ticketDTO = com.gsg.it4u.dto.TicketDTO.fromEntity(ticket, false);

        TicketStatusChangedEvent event = new TicketStatusChangedEvent(this, ticketDTO, Ticket.Status.OPEN,
                Ticket.Status.IN_PROGRESS, actor, "Start work");

        notificationService.handleTicketStatusChanged(event);

        verify(ticketMailService).sendEmailForStatusChange(eq(ticketDTO), eq(actor), eq("Start work"));
    }

    @Test
    void handleManagerDecision_ShouldCallSendEmail_WithApprovedAction() {
        User manager = new User();
        Ticket ticket = new Ticket();
        TicketManagerDecisionEvent event = new TicketManagerDecisionEvent(this, ticket, true, manager, "Looks good");

        notificationService.handleManagerDecision(event);

        verify(ticketMailService).sendEmail(eq(ticket), eq(TicketRecipientResolver.MailAction.MANAGER_APPROVED),
                eq(manager), eq("Looks good"));
    }
}
