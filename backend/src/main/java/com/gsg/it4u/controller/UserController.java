package com.gsg.it4u.controller;

import com.gsg.it4u.entity.User;
import com.gsg.it4u.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

import java.io.IOException;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/upload")
    public ResponseEntity<String> uploadUsers(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Please select a file to upload");
        }

        try {
            userService.importUsers(file);
            return ResponseEntity.ok("Users imported successfully");
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to parse CSV file: " + e.getMessage());
        }
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() {
        byte[] content = userService.getUserImportTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", "user_import_template.csv");
        return new ResponseEntity<>(content, headers, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() { // Using List<User> from java.util, ensure import
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/managers")
    public ResponseEntity<List<User>> getManagers() {
        return ResponseEntity.ok(userService.getManagers());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> deleteUser(@PathVariable Long id) { // Ensure Long matches ID type
        userService.deleteUser(id);
        return ResponseEntity.ok(java.util.Collections.singletonMap("message", "User deleted successfully"));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<String> deactivateUser(@PathVariable Long id) {
        userService.deactivateUser(id);
        return ResponseEntity.ok("User deactivated successfully");
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<String> resetPassword(@PathVariable Long id,
            @RequestBody java.util.Map<String, String> payload) {
        String newPassword = payload.get("newPassword");
        if (newPassword == null || newPassword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("New password is required");
        }
        userService.resetPassword(id, newPassword);
        return ResponseEntity.ok("Password reset successfully");
    }

    @PostMapping
    public ResponseEntity<?> createUser(
            @jakarta.validation.Valid @RequestBody com.gsg.it4u.dto.UserCreateRequest request) {
        // Validation now handled by @Valid + GlobalExceptionHandler

        try {
            User user = new User();
            user.setUsername(request.getUsername());
            user.setPassword(request.getPassword());
            try {
                user.setRole(User.Role.valueOf(request.getRole()));
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("Invalid role: " + request.getRole());
            }
            user.setDepartment(request.getDepartment());
            user.setJobTitle(request.getJobTitle());
            user.setEmail(request.getEmail());
            user.setPhoneNumber(request.getPhoneNumber());

            // Admin-created user defaults
            user.setAuthProvider(User.AuthProvider.LOCAL);
            user.setCreatedByAdmin(true);
            user.setActive(true);

            User createdUser = userService.createUserWithManager(user, request.getManagerName());
            return ResponseEntity.ok(createdUser);
        } catch (IllegalArgumentException e) {
            // Business logic errors
            return ResponseEntity.badRequest().body(java.util.Collections.singletonMap("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User userDetails) {
        try {
            User updatedUser = userService.updateUser(id, userDetails);
            return ResponseEntity.ok(updatedUser);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
