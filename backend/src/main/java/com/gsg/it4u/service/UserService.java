package com.gsg.it4u.service;

import com.gsg.it4u.entity.User;
import com.gsg.it4u.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.gsg.it4u.repository.TicketRepository ticketRepository;

    @org.springframework.beans.factory.annotation.Value("${IT4U_TEST_MODE:false}")
    private boolean testMode;

    public void importUsers(MultipartFile file) throws IOException {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean firstLine = true;
            List<User> usersToSave = new ArrayList<>();

            while ((line = reader.readLine()) != null) {
                if (firstLine) {
                    firstLine = false;
                    continue; // Skip header
                }
                String[] data = line.split(",");
                // Expected: Username, Password, Role, Department, JobTitle, ManagerUsername
                if (data.length >= 3) {
                    String username = data[0].trim();
                    String password = data[1].trim();
                    String roleStr = data[2].trim();

                    // Check if user exists
                    if (userRepository.findByUsername(username).isPresent()) {
                        continue; // Skip existing
                    }

                    User user = new User();
                    user.setUsername(username);
                    user.setPassword(password); // Note: Should encrypt in real app

                    try {
                        user.setRole(User.Role.valueOf(roleStr.toUpperCase()));
                    } catch (IllegalArgumentException e) {
                        user.setRole(User.Role.EMPLOYEE); // Default
                    }

                    if (data.length > 3)
                        user.setDepartment(data[3].trim());
                    if (data.length > 4)
                        user.setJobTitle(data[4].trim());
                    if (data.length > 5) {
                        String managerName = data[5].trim();
                        userRepository.findByUsername(managerName).ifPresent(user::setManager);
                    }

                    usersToSave.add(user);
                }
            }
            if (!usersToSave.isEmpty()) {
                userRepository.saveAll(usersToSave);
            }
        }
    }

    public byte[] getUserImportTemplate() {
        String header = "Username,Password,Role,Department,JobTitle,ManagerUsername\n";
        String example = "new_user,password123,EMPLOYEE,Engineering,Developer,manager_mike\nmanager_bob,securepass,MANAGER,IT,Director,";
        return (header + example).getBytes(StandardCharsets.UTF_8);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteUser(Long id) {
        // Safe delete check: prevent deleting if tickets are linked
        boolean referenced = ticketRepository.existsByRequesterId(id)
                || ticketRepository.existsByAssignedToId(id)
                || ticketRepository.existsByManagerId(id);

        if (referenced) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "User cannot be deleted because tickets are linked. Deactivate user instead.");
        }

        userRepository.deleteById(id);
    }

    @org.springframework.transaction.annotation.Transactional
    public void deactivateUser(Long id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
        u.setActive(false);
        u.setDeactivatedAt(java.time.LocalDateTime.now());
        userRepository.save(u);
    }

    public User resetPassword(Long id, String newPassword) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setPassword(newPassword); // In real app, hash this
        return userRepository.save(user);
    }

    public User createUser(User user) {
        if (testMode && !user.getUsername().startsWith("qa_")) {
            user.setUsername("qa_" + user.getUsername());
        }

        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists");
        }
        if (user.getEmail() != null && !user.getEmail().isEmpty()) {
            userRepository.findByEmail(user.getEmail()).ifPresent(existing -> {
                throw new RuntimeException("Email already exists: " + user.getEmail());
            });
        }
        // In a real app, hash the password here
        return userRepository.save(user);
    }

    public User updateUser(Long id, User userDetails) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setRole(userDetails.getRole());
        user.setDepartment(userDetails.getDepartment());
        user.setJobTitle(userDetails.getJobTitle());

        // Optional: Allow updating manager if provided
        if (userDetails.getManager() != null) {
            user.setManager(userDetails.getManager());
        }

        user.setPhoneNumber(userDetails.getPhoneNumber());

        // Validate Email Update
        if (userDetails.getEmail() != null && !userDetails.getEmail().equals(user.getEmail())) {
            if (!userDetails.getEmail().isEmpty()) {
                userRepository.findByEmail(userDetails.getEmail()).ifPresent(existing -> {
                    if (!existing.getId().equals(user.getId())) {
                        throw new RuntimeException("Email already exists: " + userDetails.getEmail());
                    }
                });
            }
            user.setEmail(userDetails.getEmail());
        }

        return userRepository.save(user);
    }

    public User createUserWithManager(User user, String managerName) {
        if (testMode && !user.getUsername().startsWith("qa_")) {
            user.setUsername("qa_" + user.getUsername());
        }

        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        if (managerName != null && !managerName.isEmpty()) {
            userRepository.findByUsername(managerName).ifPresent(user::setManager);
        }

        // Validate Email Uniqueness
        if (user.getEmail() != null && !user.getEmail().isEmpty()) {
            userRepository.findByEmail(user.getEmail()).ifPresent(existing -> {
                throw new RuntimeException("Email already exists: " + user.getEmail());
            });
        }

        // In a real app, hash the password here
        return userRepository.save(user);
    }

    public void createFromAzure(org.springframework.security.oauth2.core.user.OAuth2User oauthUser) {
        java.util.Map<String, Object> attributes = oauthUser.getAttributes();
        String email = (String) attributes.get("email");
        if (email == null) {
            email = (String) attributes.get("preferred_username");
        }
        if (email == null) {
            email = (String) attributes.get("upn");
        }

        if (email != null) {
            email = email.toLowerCase();
            // Check if exists
            if (userRepository.findByEmail(email).isPresent()) {
                return; // User exists, nothing to do
            }

            // Create new user
            User user = new User();
            user.setEmail(email);
            String name = (String) attributes.getOrDefault("name", "Unknown");
            user.setFullName(name);

            String username = email.split("@")[0];
            // Ensure unique username
            if (userRepository.findByUsername(username).isPresent()) {
                username = username + "_" + System.currentTimeMillis();
            }
            user.setUsername(username);
            user.setPassword(""); // No password for SSO users
            user.setAuthProvider(User.AuthProvider.SSO);

            // Set default role
            user.setRole(User.Role.EMPLOYEE);

            // Should probably check for admin/support roles from groups here too?
            // But SuccessHandler does it on login. Let's keep it simple here.

            user.setActive(true);
            user.setCreatedByAdmin(false);
            user.setCreatedAt(java.time.LocalDateTime.now());

            userRepository.save(user);
            System.out.println("Auto-provisioned user: " + email);
        }
    }

    public List<User> getManagers() {
        return userRepository.findByRoleAndActiveTrue(User.Role.MANAGER);
    }
}
