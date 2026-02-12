package com.gsg.it4u.dto;

import com.gsg.it4u.constant.EmailEventType;
import com.gsg.it4u.entity.EmailAudit;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class EmailAuditDTO {
    private Long id;
    private EmailEventType eventType;
    private Long ticketId;
    private String toEmail;
    private String ccEmail;
    private String subject;
    private String status;
    private String errorMessage;
    private LocalDateTime sentAt;

    public static EmailAuditDTO fromEntity(EmailAudit audit) {
        if (audit == null)
            return null;
        return EmailAuditDTO.builder()
                .id(audit.getId())
                .eventType(audit.getEventType())
                .ticketId(audit.getTicketId())
                .toEmail(audit.getToEmail())
                .ccEmail(audit.getCcEmail())
                .subject(audit.getSubject())
                .status(audit.getStatus())
                .errorMessage(audit.getErrorMessage())
                .sentAt(audit.getSentAt())
                .build();
    }
}
