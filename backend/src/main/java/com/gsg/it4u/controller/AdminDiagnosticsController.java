package com.gsg.it4u.controller;

import com.gsg.it4u.repository.UserRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/diagnostics")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDiagnosticsController {

    private final UserRepository userRepository;

    public AdminDiagnosticsController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/users/{username}")
    public Map<String, Object> user(@PathVariable String username) {
        return userRepository.findByUsername(username)
                .map(u -> Map.<String, Object>of(
                        "id", u.getId(),
                        "username", u.getUsername(),
                        "enabled", u.isActive(),
                        "roles", u.getRole(),
                        "passwordHashPrefix",
                        u.getPassword() == null ? "NULL"
                                : u.getPassword().substring(0, Math.min(10, u.getPassword().length()))))
                .orElse(Map.of("found", false, "username", username));
    }
}
