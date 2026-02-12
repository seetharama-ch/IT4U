package com.gsg.it4u.controller;

import com.gsg.it4u.dto.LoginRequest;
import com.gsg.it4u.entity.User;
import com.gsg.it4u.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/login")
    @io.swagger.v3.oas.annotations.Operation(security = {})
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest,
            jakarta.servlet.http.HttpServletRequest request) {
        log.info("Login attempt for user: {}", loginRequest.getUsername());
        Optional<User> userOptional = userRepository.findByUsername(loginRequest.getUsername());

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            // DEBUG LOGGING
            log.info("Checking password for user: {}", user.getUsername());
            log.info("Stored password: '{}'", user.getPassword());
            log.info("Received password: '{}'", loginRequest.getPassword());
            log.info("Encoder used in initializer: check logs during startup");

            // Simple plain text password check as per DataInitializer
            if (user.getPassword().equals(loginRequest.getPassword())) {
                // 1. Check Active
                if (!user.isActive()) {
                    log.warn("Login failed for user {}: Account inactive", loginRequest.getUsername());
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Account is inactive.");
                }

                // 2. Check Password Login Permission
                // Allow if: Role is ADMIN OR createdByAdmin=true OR authProvider=LOCAL
                boolean isAllowed = user.getRole() == User.Role.ADMIN
                        || user.isCreatedByAdmin()
                        || user.getAuthProvider() == User.AuthProvider.LOCAL;

                if (!isAllowed) {
                    log.warn("Login failed for user {}: Password login not permitted (SSO required)",
                            loginRequest.getUsername());
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Password login not permitted for this account. Use SSO.");
                }

                // Set Security Context
                // Set Security Context
                // FIX: Create UserDetails object so @AuthenticationPrincipal works in
                // controllers
                org.springframework.security.core.userdetails.UserDetails userDetails = org.springframework.security.core.userdetails.User
                        .withUsername(user.getUsername())
                        .password(user.getPassword() != null ? user.getPassword() : "")
                        .authorities("ROLE_" + user.getRole().name())
                        .accountExpired(false)
                        .accountLocked(false)
                        .credentialsExpired(false)
                        .disabled(!user.isActive())
                        .build();

                org.springframework.security.core.Authentication auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);

                // Save to session
                request.getSession().setAttribute(
                        org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                        org.springframework.security.core.context.SecurityContextHolder.getContext());

                log.info("Login successful for user: {} [Role: {}]", user.getUsername(), user.getRole());
                log.info("Login successful for user: {} [Role: {}]", user.getUsername(), user.getRole());

                // Use a Map DTO to avoid JSON infinite recursion on User.manager field
                Map<String, Object> response = new java.util.HashMap<>();
                response.put("id", user.getId());
                response.put("username", user.getUsername());
                response.put("role", user.getRole());
                response.put("fullName", user.getFullName());
                response.put("email", user.getEmail());
                // Backend uses Session, but script expects a token field.
                // We'll give it the session ID as a token, though it should rely on the cookie.
                response.put("token", request.getSession().getId());

                return ResponseEntity.ok(response);
            } else {
                log.warn("Login failed for user {}: Invalid password", loginRequest.getUsername());
            }
        } else {
            log.warn("Login failed for user {}: User not found", loginRequest.getUsername());
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "error", "UNAUTHORIZED",
                        "message", "Invalid username or password"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("authenticated", false));
        }

        // --- DIAGNOSTIC LOGGING ---
        log.info("Auth Check - Principal Class: {}", authentication.getPrincipal().getClass().getName());
        log.info("Auth Check - Authorities: {}", authentication.getAuthorities());
        // ---------------------------

        String email = null;
        if (authentication instanceof OAuth2AuthenticationToken) {
            OAuth2User oAuth2User = ((OAuth2AuthenticationToken) authentication).getPrincipal();
            Map<String, Object> attributes = oAuth2User.getAttributes();
            email = (String) attributes.get("email");
            if (email == null)
                email = (String) attributes.get("preferred_username");
            if (email == null)
                email = (String) attributes.get("upn");
        }

        User user = null;
        if (email != null) {
            // FIX: Normalize email to lowercase to match DB storage
            email = email.toLowerCase();
            Optional<User> uOpt = userRepository.findByEmail(email);
            if (uOpt.isPresent())
                user = uOpt.get();
        }

        if (user == null) {
            Optional<User> uNameOpt = userRepository.findByUsername(authentication.getName());
            if (uNameOpt.isPresent())
                user = uNameOpt.get();
        }

        if (user != null) {
            return ResponseEntity.ok(Map.of(
                    "authenticated", true,
                    "id", user.getId(),
                    "username", user.getUsername(),
                    "role", user.getRole(),
                    "email", user.getEmail() != null ? user.getEmail() : "",
                    "name", user.getFullName()));
        }

        // Fallback for OAuth2 users not yet in DB (should be rare if SuccessHandler
        // works)
        // OR for purely in-memory/test users if any.
        // Try to extract role from authorities
        String role = "EMPLOYEE"; // Default (Frontend expects enum string without ROLE_ prefix)
        for (org.springframework.security.core.GrantedAuthority authority : authentication.getAuthorities()) {
            if (authority.getAuthority().startsWith("ROLE_")) {
                // FIX: Strip ROLE_ prefix to match User.Role enum expected by frontend
                role = authority.getAuthority().replace("ROLE_", "");
                break;
            }
        }

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "username", authentication.getName(),
                "role", role));
    }
}
