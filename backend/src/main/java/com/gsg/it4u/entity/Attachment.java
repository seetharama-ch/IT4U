package com.gsg.it4u.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "attachments")
@lombok.Getter
@lombok.Setter
@NoArgsConstructor
@AllArgsConstructor
@lombok.ToString(exclude = { "ticket" })
@lombok.EqualsAndHashCode(exclude = { "ticket" })
public class Attachment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String originalFileName;

    @Column(nullable = false)
    private String storedFileName; // UUID-based name on disk

    private String contentType;

    private Long sizeBytes;

    private String sha256;

    @ManyToOne
    @JoinColumn(name = "ticket_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Ticket ticket;

    @ManyToOne
    @JoinColumn(name = "uploaded_by_id")
    private User uploadedBy;

    private LocalDateTime uploadedAt;

    private boolean deleted = false;

    @PrePersist
    protected void onCreate() {
        uploadedAt = LocalDateTime.now();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        Attachment that = (Attachment) o;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
