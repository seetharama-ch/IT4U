package com.gsg.it4u.controller;

import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import com.gsg.it4u.repository.AttachmentRepository;
import com.gsg.it4u.repository.TicketRepository;
import com.gsg.it4u.repository.UserRepository;
import com.gsg.it4u.service.StorageService;
import com.gsg.it4u.service.TicketAccessService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AttachmentController.class)
public class AttachmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TicketRepository ticketRepository;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private AttachmentRepository attachmentRepository;

    @MockBean
    private StorageService storageService;

    @MockBean
    private TicketAccessService ticketAccessService;

    // Mock Security Dependencies
    @MockBean(name = "customUserDetailsService")
    private org.springframework.security.core.userdetails.UserDetailsService customUserDetailsService;

    @MockBean
    private org.springframework.security.oauth2.client.userinfo.OAuth2UserService<?, ?> customOAuth2UserService;

    @MockBean
    private com.gsg.it4u.security.CustomOAuth2SuccessHandler customSuccessHandler;

    @Test
    @WithMockUser(username = "employee", roles = "EMPLOYEE")
    public void testUploadAttachment_Success() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setUsername("employee");
        user.setRole(User.Role.EMPLOYEE);

        Ticket ticket = new Ticket();
        ticket.setId(100L);
        ticket.setRequester(user);

        when(userRepository.findByUsername("employee")).thenReturn(Optional.of(user));
        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticket));
        when(ticketAccessService.canViewTicket(any(), any())).thenReturn(true);
        when(storageService.store(any(), any())).thenReturn("uuid-filename");
        when(attachmentRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", "content".getBytes());

        mockMvc.perform(multipart("/api/tickets/100/attachments")
                .file(file)
                .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void testUploadAttachment_TicketNotFound() throws Exception {
        when(ticketRepository.findById(999L)).thenReturn(Optional.empty());
        when(userRepository.findByUsername(any())).thenReturn(Optional.of(new User()));

        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", "content".getBytes());

        mockMvc.perform(multipart("/api/tickets/999/attachments")
                .file(file)
                .with(csrf()))
                .andExpect(status().isNotFound());
    }
}
