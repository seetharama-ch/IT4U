package com.gsg.it4u.entity;

import com.gsg.it4u.constant.EmailEventType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_audit")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private EmailEventType eventType;

    @Column(name = "ticket_id")
    private Long ticketId;

    @Column(name = "to_email", nullable = false)
    private String toEmail;

    @Column(name = "cc_email")
    private String ccEmail;

    @Column(name = "subject")
    private String subject;

    @Column(name = "status", nullable = false)
    private String status; // SENT / FAILED

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (sentAt == null) {
            sentAt = LocalDateTime.now();
        }
        this.createdAt = LocalDateTime.now();
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
