package com.gsg.it4u.controller;

import com.gsg.it4u.entity.User;
import com.gsg.it4u.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    @Autowired
    private UserRepository userRepository;

    // PUT /api/admin/users/{id}/role
    @PutMapping("/{id}/role")
    public ResponseEntity<?> updateUserRole(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String newRoleStr = payload.get("role");
        if (newRoleStr == null) {
            return ResponseEntity.badRequest().body("Role is required");
        }

        User.Role newRole;
        try {
            newRole = User.Role.valueOf(newRoleStr);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid role: " + newRoleStr);
        }

        User targetUser = userRepository.findById(id).orElse(null);
        if (targetUser == null) {
            return ResponseEntity.notFound().build();
        }

        // Guardrail: Prevent modifying self role
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth.getName();

        // Since we are using standard UserDetails or OAuth2User, getName() usually
        // returns username or principal ID
        // Check username and email to be safe
        if (targetUser.getUsername().equals(currentUsername) ||
                (targetUser.getEmail() != null && targetUser.getEmail().equals(currentUsername))) {
            return ResponseEntity.badRequest().body("You cannot change your own role.");
        }

        // Log change (Console for now, persistent log recommended for future)
        System.out.println("ADMIN ACTION: User " + currentUsername + " changed role of user " + targetUser.getUsername()
                + " from " + targetUser.getRole() + " to " + newRole);

        targetUser.setRole(newRole);
        userRepository.save(targetUser);

        return ResponseEntity.ok("Role updated successfully");
    }
}
