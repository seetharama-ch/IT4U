package com.gsg.it4u.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "tickets")
@org.hibernate.annotations.SQLRestriction("(deleted = false OR deleted IS NULL)")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Ticket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String ticketNumber;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    private Status status = Status.OPEN;

    @Enumerated(EnumType.STRING)
    private Priority priority = Priority.UNASSIGNED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    private String subCategory;

    @Enumerated(EnumType.STRING)
    private SlaStatus slaStatus = SlaStatus.ON_TRACK;

    private LocalDateTime slaDeadline;

    private String softwareName;
    private String softwareVersion;
    private String deviceDetails;
    private String employeeId;
    private String domain;
    private String requestType;

    @Column(columnDefinition = "TEXT")
    private String newUserDetails;

    private String managerName;
    private String managerEmail;

    @Enumerated(EnumType.STRING)
    private ManagerApprovalStatus managerApprovalStatus = ManagerApprovalStatus.PENDING;

    // Email Threading Fields
    @Column(length = 512)
    private String emailThreadMessageId;

    @Column(columnDefinition = "TEXT")
    private String emailThreadReferences;

    @ManyToOne
    @JoinColumn(name = "manager_id")
    private User manager;

    @ManyToOne
    @JoinColumn(name = "requester_id")
    private User requester;

    @ManyToOne
    @JoinColumn(name = "assigned_to_id")
    private User assignedTo;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private java.util.Set<Attachment> attachments = new java.util.LinkedHashSet<>();

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private java.util.Set<Comment> comments = new java.util.LinkedHashSet<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private LocalDateTime approvedAt;
    private LocalDateTime rejectedAt;
    private LocalDateTime inProgressAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime closedAt;

    @Column(nullable = false)
    private boolean deleted = false;

    private LocalDateTime deletedAt;
    private String deletedBy;

    @ManyToOne
    @JoinColumn(name = "updated_by_id")
    private User updatedBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        // Initial updatedBy is implicitly same as createdBy/requester if not set,
        // but we usually set it in service.
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum Status {
        OPEN,
        IN_PROGRESS,
        RESOLVED,
        CLOSED,
        WAITING_FOR_USER,
        PENDING_MANAGER_APPROVAL
    }

    public enum Priority {
        UNASSIGNED,
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    public enum Category {
        SOFTWARE,
        HARDWARE,
        ACCESS_AND_M365,
        NETWORK,
        ACCOUNT,
        ENGINEERING_APP,

        PROCUREMENT,
        SECURITY,
        OTHERS
    }

    public enum SlaStatus {
        ON_TRACK,
        AT_RISK,
        BREACHED
    }

    public enum ManagerApprovalStatus {
        PENDING,
        APPROVED,
        REJECTED,
        NA
    }
}
