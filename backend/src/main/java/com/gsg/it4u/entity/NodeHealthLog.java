package com.gsg.it4u.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "node_health_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NodeHealthLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_node_id", nullable = false)
    private ServiceNode serviceNode;

    @Column(nullable = false)
    private LocalDateTime checkTime;

    @Column(nullable = false)
    private String status; // "HEALTHY", "WARNING", "CRITICAL", "UNKNOWN"

    private Integer responseTime; // in milliseconds

    private String errorMessage;

    @Column(columnDefinition = "TEXT")
    private String details; // Additional health check details as JSON

    private String checkedBy; // System or user who performed the check
}
