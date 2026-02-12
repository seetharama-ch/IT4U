package com.gsg.it4u.controller.admin;

import com.gsg.it4u.entity.User;
import com.gsg.it4u.repository.UserRepository;
import com.gsg.it4u.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/admin/system")
public class SystemMaintenanceController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${it4u.reset.enabled:false}")
    private boolean resetEnabled;

    @Value("${spring.profiles.active:}")
    private String activeProfile;

    @PostMapping("/reset")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> resetSystem() {
        if (!resetEnabled && !"dev".equals(activeProfile)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("System reset is not enabled in this environment.");
        }

        try {
            // Truncate ticket related tables
            jdbcTemplate.execute("TRUNCATE TABLE attachments, comments, email_audit, tickets RESTART IDENTITY CASCADE");

            // Delete non-admin users
            jdbcTemplate.execute("DELETE FROM users WHERE username <> 'admin'");

            // Reset user sequence (dynamic)
            try {
                jdbcTemplate.execute("SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1))");
            } catch (Exception e) {
                // Ignore
            }

            return ResponseEntity.ok("System reset successful. All tickets deleted and users reset to admin only.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Reset failed: " + e.getMessage());
        }
    }

    @PostMapping("/seed-default")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> seedUsers() {
        try {
            // Check if users already exist to avoid duplicates if called twice without
            // reset
            if (userRepository.findByUsername("manager1").isPresent()) {
                return ResponseEntity.badRequest().body("Users already seeded.");
            }

            String defaultPassword = "Welcome@123";
            String encodedPassword = passwordEncoder.encode(defaultPassword);

            // Create Manager
            User manager = new User();
            manager.setUsername("manager1");
            manager.setPassword(encodedPassword);
            manager.setRole(User.Role.MANAGER);
            manager.setEmail("manager1@example.com");
            manager.setFullName("Manager One");
            manager.setActive(true);
            manager.setAuthProvider(User.AuthProvider.LOCAL);
            manager = userRepository.save(manager);

            // Create IT Support
            User support = new User();
            support.setUsername("support1");
            support.setPassword(encodedPassword);
            support.setRole(User.Role.IT_SUPPORT);
            support.setEmail("support1@example.com");
            support.setFullName("Support One");
            support.setActive(true);
            support.setAuthProvider(User.AuthProvider.LOCAL);
            userRepository.save(support);

            // Create Employee (linked to Manager)
            User employee = new User();
            employee.setUsername("employee1");
            employee.setPassword(encodedPassword);
            employee.setRole(User.Role.EMPLOYEE);
            employee.setEmail("employee1@example.com");
            employee.setFullName("Employee One");
            employee.setManager(manager);
            employee.setActive(true);
            employee.setAuthProvider(User.AuthProvider.LOCAL);
            userRepository.save(employee);

            return ResponseEntity.ok("Default users seeded: manager1, support1, employee1");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Seeding failed: " + e.getMessage());
        }
    }
}
