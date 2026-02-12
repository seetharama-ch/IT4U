package com.gsg.it4u.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
@lombok.Getter
@lombok.Setter
@NoArgsConstructor
@AllArgsConstructor
@lombok.ToString(exclude = { "ticket" })
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 1000)
    private String content;

    @ManyToOne
    @JoinColumn(name = "ticket_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Ticket ticket;

    @ManyToOne
    @JoinColumn(name = "author_id")
    private User author;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        Comment comment = (Comment) o;
        return id != null && id.equals(comment.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
