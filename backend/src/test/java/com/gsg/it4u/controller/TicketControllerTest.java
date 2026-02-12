package com.gsg.it4u.controller;

import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import com.gsg.it4u.dto.TicketDTO;
import com.gsg.it4u.repository.TicketRepository;
import com.gsg.it4u.repository.UserRepository;
import com.gsg.it4u.event.TicketCreatedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.context.ApplicationEventPublisher;
import java.util.Collections;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class TicketControllerTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private TicketController ticketController;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void getAllTickets_shouldReturnPageOfTicketDTOs() {
        // Arrange
        Ticket ticket = new Ticket();
        ticket.setId(1L);
        ticket.setTitle("Test Ticket");
        ticket.setRequester(new User());

        Page<Ticket> ticketPage = new PageImpl<>(Collections.singletonList(ticket));

        when(ticketRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(ticketPage);

        // Act
        Page<TicketDTO> result = ticketController.getAllTickets(
                null, null, null, null, null, PageRequest.of(0, 10));

        // Assert
        assertEquals(1, result.getTotalElements());
        assertEquals(1L, result.getContent().get(0).getId());
    }

    @Test
    public void createTicket_withManager_shouldSetStatusToPendingApproval() {
        // Arrange
        User manager = new User();
        manager.setId(2L);
        manager.setUsername("manager1");

        User requester = new User();
        requester.setId(1L);
        requester.setUsername("user1");

        Ticket ticket = new Ticket();
        ticket.setTitle("Test Ticket");
        ticket.setRequester(requester);
        ticket.setManager(manager); // Set manager to trigger approval
        ticket.setCategory(Ticket.Category.SOFTWARE);

        when(userRepository.findById(1L)).thenReturn(Optional.of(requester));
        when(userRepository.findById(2L)).thenReturn(Optional.of(manager));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> {
            Ticket t = invocation.getArgument(0);
            t.setId(100L); // simulate save
            return t;
        });

        // Act
        org.springframework.http.ResponseEntity<?> response = ticketController.createTicket(ticket);
        Ticket createdTicket = (Ticket) response.getBody();

        // Assert
        assertEquals(Ticket.Status.PENDING_MANAGER_APPROVAL, createdTicket.getStatus(),
                "Status should be PENDING_MANAGER_APPROVAL when manager is assigned");
        assertEquals(Ticket.ManagerApprovalStatus.PENDING, createdTicket.getManagerApprovalStatus(),
                "Approval status should be PENDING");
    }
}
