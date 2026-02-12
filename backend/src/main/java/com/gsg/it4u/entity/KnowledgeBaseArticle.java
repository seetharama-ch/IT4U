package com.gsg.it4u.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "knowledge_base_articles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeBaseArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false)
    private String category;

    private LocalDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "author_id")
    private User author;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
