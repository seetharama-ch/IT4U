package com.gsg.it4u.controller;

import com.gsg.it4u.repository.TicketRepository;
import com.gsg.it4u.repository.UserRepository;
import com.gsg.it4u.repository.EmailAuditRepository;
import com.gsg.it4u.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.transaction.Transactional;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/reset")
public class DataResetController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private EmailAuditRepository emailAuditRepository;

    @PostMapping("/full")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> fullDataReset() {
        Map<String, Object> result = new HashMap<>();

        try {
            // Step 1: Delete all email audits (they reference tickets)
            long emailAuditCount = emailAuditRepository.count();
            emailAuditRepository.deleteAll();
            result.put("emailAuditsDeleted", emailAuditCount);

            // Step 2: Delete all tickets (soft delete doesn't matter, we'll hard delete)
            long ticketCount = ticketRepository.count();
            ticketRepository.deleteAll();
            result.put("ticketsDeleted", ticketCount);

            // Step 3: Get all users
            java.util.List<User> allUsers = userRepository.findAll();
            int totalUsers = allUsers.size();
            result.put("totalUsersBefore", totalUsers);

            // Step 4: Delete all non-admin users
            int deletedUsers = 0;
            int keptUsers = 0;
            java.util.List<String> deletedUsernames = new java.util.ArrayList<>();
            java.util.List<String> keptUsernames = new java.util.ArrayList<>();

            for (User user : allUsers) {
                if (user.getUsername().equals("admin")) {
                    // Keep only the primary admin user
                    keptUsers++;
                    keptUsernames.add(user.getUsername());
                } else {
                    // Delete everyone else including admin_test
                    userRepository.delete(user);
                    deletedUsers++;
                    deletedUsernames.add(user.getUsername());
                }
            }

            result.put("usersDeleted", deletedUsers);
            result.put("usersKept", keptUsers);
            result.put("deletedUsernames", deletedUsernames);
            result.put("keptUsernames", keptUsernames);

            // Step 5: Verify final state
            long finalUserCount = userRepository.count();
            result.put("finalUserCount", finalUserCount);

            if (finalUserCount == 1) {
                User remainingUser = userRepository.findAll().get(0);
                result.put("success", true);
                result.put("remainingUser", Map.of(
                        "username", remainingUser.getUsername(),
                        "role", remainingUser.getRole().toString(),
                        "email", remainingUser.getEmail() != null ? remainingUser.getEmail() : "N/A"));
            } else {
                result.put("success", false);
                result.put("error", "Expected 1 user, found: " + finalUserCount);
            }

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
            result.put("stackTrace", e.getClass().getName());
            return ResponseEntity.status(500).body(result);
        }
    }

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @PostMapping("/seed")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> seedData() {
        Map<String, Object> result = new HashMap<>();
        try {
            // Create Employees
            createUser("emp1", "Pass@123", User.Role.EMPLOYEE, "emp1@example.com");
            createUser("emp2", "Pass@123", User.Role.EMPLOYEE, "emp2@example.com");

            // Create Managers
            createUser("mgr1", "Pass@123", User.Role.MANAGER, "mgr1@example.com");
            createUser("mgr2", "Pass@123", User.Role.MANAGER, "mgr2@example.com");

            // Create IT Support
            createUser("sup1", "Pass@123", User.Role.IT_SUPPORT, "sup1@example.com");

            result.put("success", true);
            result.put("message", "Seeding completed successfully.");
            result.put("usersCreated", java.util.List.of("emp1", "emp2", "mgr1", "mgr2", "sup1"));

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
            return ResponseEntity.status(500).body(result);
        }
    }

    private void createUser(String username, String password, User.Role role, String email) {
        if (userRepository.findByUsername(username).isPresent()) {
            return; // Skip if exists
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role);
        user.setEmail(email);
        user.setDepartment("General"); // Default department
        user.setAuthProvider(User.AuthProvider.LOCAL); // Explicitly set LOCAL auth
        userRepository.save(user);
    }
}
