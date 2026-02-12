package com.gsg.it4u.controller;

import com.gsg.it4u.constant.EmailEventType;
import com.gsg.it4u.entity.EmailAudit;
import com.gsg.it4u.repository.EmailAuditRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdminEmailAuditControllerTest {

    @Mock
    private EmailAuditRepository emailAuditRepository;

    @InjectMocks
    private AdminEmailAuditController adminEmailAuditController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void getEmailAudits_ShouldReturnPageOfAudits() {
        // Arrange
        EmailAudit audit = new EmailAudit();
        audit.setId(1L);
        audit.setTicketId(101L);
        audit.setEventType(EmailEventType.TICKET_CREATED);

        PageImpl<EmailAudit> page = new PageImpl<>(Collections.singletonList(audit));

        when(emailAuditRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        // Act
        ResponseEntity<org.springframework.data.domain.Page<com.gsg.it4u.dto.EmailAuditDTO>> response = adminEmailAuditController
                .getEmailAudits(
                        "SENT",
                        EmailEventType.TICKET_CREATED,
                        101L,
                        null,
                        null,
                        Pageable.unpaged());

        // Assert
        assertNotNull(response);
        assertEquals(1, response.getBody().getTotalElements());
        assertEquals(101L, response.getBody().getContent().get(0).getTicketId());

        verify(emailAuditRepository).findAll(any(Specification.class), any(Pageable.class));
    }
}
