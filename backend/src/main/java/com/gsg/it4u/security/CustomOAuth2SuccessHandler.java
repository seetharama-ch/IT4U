package com.gsg.it4u.security;

import com.gsg.it4u.entity.User;
import com.gsg.it4u.repository.UserRepository;
import com.gsg.it4u.service.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;

@Component
public class CustomOAuth2SuccessHandler extends SavedRequestAwareAuthenticationSuccessHandler {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws ServletException, IOException {
        try {
            System.out.println("Processing OAuth2 Success...");
            OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
            OAuth2User oAuth2User = token.getPrincipal();
            Map<String, Object> attributes = oAuth2User.getAttributes();

            // --- DIAGNOSTIC LOGGING START ---
            System.out.println("Processing OAuth2 Success for Principal: " + oAuth2User.getName());
            System.out.println("Attributes Keys: " + attributes.keySet());
            attributes.forEach((k, v) -> {
                if (k.contains("email") || k.contains("name") || k.contains("id") || k.contains("sub")
                        || k.contains("roles") || k.contains("groups")) {
                    System.out.println("Attribute [" + k + "]: " + v);
                }
            });
            // --- DIAGNOSTIC LOGGING END ---

            String email = getEmail(attributes);
            if (email != null) {
                email = email.toLowerCase(); // Normalize
            }
            System.out.println("Resolved OAuth2 Email (Normalized): " + email);

            // 1. Domain Extraction
            boolean isAllowedDomain = email != null
                    && (email.endsWith("@geosoftglobal.com") || email.endsWith("@surtech-me.com"));

            String name = (String) attributes.getOrDefault("name", "Unknown");

            Optional<User> userOptional = Optional.empty();
            if (email != null) {
                userOptional = userRepository.findByEmail(email);
            }

            User user;

            if (userOptional.isPresent()) {
                user = userOptional.get();
                System.out.println("Existing user found: " + user.getUsername());

                // Existing User Logic
                if (!isAllowedDomain) {
                    // Check special bypass from properties or DB if needed
                    boolean canBypass = user.isCreatedByAdmin() && user.getAuthProvider() == User.AuthProvider.LOCAL;
                    if (!canBypass) {
                        System.out.println("SSO Login denied for restricted domain: " + email);
                        getRedirectStrategy().sendRedirect(request, response, "/login?error=domain_not_allowed");
                        return;
                    }
                }

                // Update last login
                user.setLastLoginAt(java.time.LocalDateTime.now());
                if (user.getAuthProvider() == null) {
                    user.setAuthProvider(User.AuthProvider.SSO);
                }

                // Update Role based on attributes or email
                updateUserRole(user, email, attributes);

                userRepository.save(user);

            } else {
                System.out.println("New user provisioning...");
                // New User Logic
                if (!isAllowedDomain) {
                    System.out.println("SSO Provisioning denied for restricted domain: " + email);
                    getRedirectStrategy().sendRedirect(request, response, "/login?error=domain_not_allowed");
                    return;
                }

                // Provision new user
                user = new User();
                user.setEmail(email);

                String preferredUsername = (String) attributes.get("preferred_username");
                if (preferredUsername != null) {
                    user.setUsername(preferredUsername.split("@")[0]);
                } else if (email != null) {
                    user.setUsername(email.split("@")[0]);
                } else {
                    user.setUsername("user_" + System.currentTimeMillis());
                }

                user.setPassword("");
                // Initial Role Mapping
                updateUserRole(user, email, attributes);

                user.setActive(true);
                user.setFullName(name);
                user.setAuthProvider(User.AuthProvider.SSO);
                user.setCreatedByAdmin(false);
                user.setLastLoginAt(java.time.LocalDateTime.now());

                try {
                    user = userService.createUser(user);
                } catch (Exception e) {
                    System.out.println("Error creating user, retrying with timestamp: " + e.getMessage());
                    // Fallback if username taken, append timestamp
                    if (email != null) {
                        user.setUsername(email.split("@")[0] + "_" + System.currentTimeMillis());
                    } else {
                        user.setUsername("user_" + System.currentTimeMillis());
                    }
                    user = userService.createUser(user);
                }
            }

            // --- FIX: Sync Local Role with SecurityContext ---
            System.out.println("Syncing security context for user: " + user.getUsername() + " Role: " + user.getRole());

            // Safety check for role
            if (user.getRole() == null) {
                user.setRole(User.Role.EMPLOYEE);
            }

            java.util.List<org.springframework.security.core.GrantedAuthority> authorities = java.util.Collections
                    .singletonList(new org.springframework.security.core.authority.SimpleGrantedAuthority(
                            "ROLE_" + user.getRole().name()));

            OAuth2AuthenticationToken newAuth = new OAuth2AuthenticationToken(
                    oAuth2User,
                    authorities,
                    token.getAuthorizedClientRegistrationId());

            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(newAuth);
            request.getSession().setAttribute(
                    org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                    org.springframework.security.core.context.SecurityContextHolder.getContext());
            // --------------------------------------------------

            String targetUrl = determineTargetUrl(user);
            getRedirectStrategy().sendRedirect(request, response, targetUrl);

        } catch (Exception e) {
            System.err.println("CRITICAL ERROR in CustomOAuth2SuccessHandler:");
            e.printStackTrace();
            response.sendRedirect("/login?error=server_error");
        }
    }

    private String getEmail(Map<String, Object> attributes) {
        String email = (String) attributes.get("email");
        if (email == null) {
            email = (String) attributes.get("preferred_username");
        }
        if (email == null) {
            email = (String) attributes.get("upn");
        }
        return email;
    }

    private void updateUserRole(User user, String email, Map<String, Object> attributes) {
        // 1. Check for explicit role claims from Azure/IdP
        // This relies on "roles" or "groups" claim being present and mapped
        if (attributes.containsKey("roles")) {
            Object rolesObj = attributes.get("roles");
            if (rolesObj instanceof java.util.List) {
                java.util.List<?> roles = (java.util.List<?>) rolesObj;
                if (roles.contains("Global Administrator") || roles.contains("AppAdmin")) {
                    user.setRole(User.Role.ADMIN);
                    return;
                }
                if (roles.contains("HelpDesk") || roles.contains("Support")) {
                    user.setRole(User.Role.IT_SUPPORT);
                    return;
                }
            }
        }

        // 2. Fallback to Email-based heuristics (keep existing logic + enhancements)
        if (email == null) {
            if (user.getRole() == null)
                user.setRole(User.Role.EMPLOYEE);
            return;
        }

        if (email.equalsIgnoreCase("admin@geosoftglobal.com")) {
            user.setRole(User.Role.ADMIN);
        } else if (email.startsWith("support") || email.contains("HelpDesk") || email.startsWith("it.")) {
            if (email.equalsIgnoreCase("support@geosoftglobal.com")) {
                user.setRole(User.Role.IT_SUPPORT);
            } else if (user.getRole() == null) {
                user.setRole(User.Role.EMPLOYEE);
            }
        } else {
            // Default for everyone else
            if (user.getRole() == null) {
                user.setRole(User.Role.EMPLOYEE);
            }
        }
    }

    private String determineTargetUrl(User user) {
        return "/";
    }
}
