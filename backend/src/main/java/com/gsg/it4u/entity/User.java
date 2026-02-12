package com.gsg.it4u.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.EMPLOYEE;

    private boolean active = true;

    private java.time.LocalDateTime deactivatedAt;

    private boolean createdByAdmin = false;

    @Enumerated(EnumType.STRING)
    private AuthProvider authProvider;

    public enum AuthProvider {
        LOCAL,
        SSO
    }

    public enum Role {
        EMPLOYEE,
        IT_SUPPORT,
        MANAGER,
        ADMIN,
        SECURITY_TEAM
    }

    private String department;
    private String jobTitle;

    @ManyToOne
    @JoinColumn(name = "manager_id")
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private User manager;

    @Column(unique = true)
    private String email;

    private String phoneNumber;

    private String fullName;

    private java.time.LocalDateTime lastLoginAt;

    @Column(updatable = false)
    private java.time.LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = java.time.LocalDateTime.now();
    }

    public String getFullName() {
        if (fullName != null && !fullName.isEmpty()) {
            return fullName;
        }
        return username != null ? username.replace("_", " ") : "Unknown";
    }

    public String getEmail() {
        return email;
    }
}
