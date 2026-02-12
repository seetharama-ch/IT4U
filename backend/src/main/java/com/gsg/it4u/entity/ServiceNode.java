package com.gsg.it4u.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_nodes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ServiceNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String nodeId; // e.g., "NODE-001", "WEB-SERVER-01"

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private String nodeType; // "WEB_SERVER", "DATABASE", "API_GATEWAY", "LOAD_BALANCER", etc.

    @Column(nullable = false)
    private String status; // "ACTIVE", "INACTIVE", "MAINTENANCE", "DOWN"

    private String ipAddress;

    private Integer port;

    private String hostName;

    private String environment; // "PRODUCTION", "STAGING", "DEVELOPMENT", "TESTING"

    private String location; // Physical or cloud location

    private String owner; // Person responsible for the node

    private String team; // Team that owns the node

    @Column(columnDefinition = "TEXT")
    private String configuration; // JSON string for node configuration

    @Column(columnDefinition = "TEXT")
    private String healthCheckUrl;

    private Integer healthCheckInterval; // in seconds

    private LocalDateTime lastHealthCheck;

    private String healthStatus; // "HEALTHY", "WARNING", "CRITICAL", "UNKNOWN"

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
