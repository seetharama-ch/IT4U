package com.gsg.it4u.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import com.gsg.it4u.repository.TicketRepository;
import com.gsg.it4u.repository.UserRepository;
import com.gsg.it4u.service.TicketService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class Issue8ReproTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TicketService ticketService;

    @MockBean
    private TicketRepository ticketRepository;

    @MockBean
    private UserRepository userRepository;

    @Test
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    public void testAdminStatusUpdate_LazyInitFix() throws Exception {
        // Mock User
        User admin = new User();
        admin.setId(1L);
        admin.setUsername("admin");
        admin.setRole(User.Role.ADMIN);
        Mockito.when(userRepository.findByUsername("admin")).thenReturn(Optional.of(admin));

        // Mock Ticket (returned by findByIdWithAssociations)
        Ticket ticket = new Ticket();
        ticket.setId(100L);
        ticket.setStatus(Ticket.Status.OPEN);
        ticket.setTitle("Test Ticket");

        // Ensure findByIdWithAssociations is called
        Mockito.when(ticketRepository.findByIdWithAssociations(100L)).thenReturn(Optional.of(ticket));

        // Mock Service Update
        Ticket updatedTicket = new Ticket();
        updatedTicket.setId(100L);
        updatedTicket.setStatus(Ticket.Status.IN_PROGRESS);
        updatedTicket.setTitle("Test Ticket");

        Mockito.when(ticketService.updateStatus(eq(100L), eq(Ticket.Status.IN_PROGRESS), any(User.class), any()))
                .thenReturn(updatedTicket);

        // Perform PUT
        Ticket payload = new Ticket();
        payload.setStatus(Ticket.Status.IN_PROGRESS);

        mockMvc.perform(put("/api/tickets/100/admin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(new ObjectMapper().writeValueAsString(payload)))
                .andExpect(status().isOk());

        // Verification happens by virtue of return value serialization
        // passing without LazyInitializationException (mocked here, but ensures flow
        // uses correct FIND method)
        Mockito.verify(ticketRepository).findByIdWithAssociations(100L);
    }
}
