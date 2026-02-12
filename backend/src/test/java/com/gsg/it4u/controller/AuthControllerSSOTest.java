package com.gsg.it4u.controller;

import com.gsg.it4u.config.SecurityConfig;
import com.gsg.it4u.entity.User;
import com.gsg.it4u.repository.UserRepository;
import com.gsg.it4u.security.CustomOAuth2SuccessHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
class AuthControllerSSOTest {

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private UserRepository userRepository;

        @MockBean
        private CustomOAuth2SuccessHandler customSuccessHandler;

        @Test
        void testGetCurrentUser_SSO_UserFoundInDB() throws Exception {
                // Mock User in DB
                User user = new User();
                user.setId(1L);
                user.setUsername("sso_user");
                user.setEmail("user@example.com");
                user.setRole(User.Role.EMPLOYEE);
                user.setFullName("SSO User");

                when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

                // Create OAuth2 Token
                Map<String, Object> attributes = Map.of("email", "user@example.com", "name", "SSO User");
                OAuth2User oauth2User = new DefaultOAuth2User(
                                Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")),
                                attributes,
                                "email");

                OAuth2AuthenticationToken token = new OAuth2AuthenticationToken(
                                oauth2User,
                                Collections.singleton(new SimpleGrantedAuthority("ROLE_EMPLOYEE")),
                                "azure");

                mockMvc.perform(get("/api/auth/me").with(authentication(token)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.authenticated").value(true))
                                .andExpect(jsonPath("$.email").value("user@example.com"))
                                .andExpect(jsonPath("$.role").value("EMPLOYEE"));
        }

        @Test
        void testGetCurrentUser_SSO_fallback_RoleExtraction() throws Exception {
                // Mock User NOT in DB (first time login simulation before sync, or rare race
                // condition)
                when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
                when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());

                // Create OAuth2 Token with specific Role Authority
                Map<String, Object> attributes = Map.of("email", "new@example.com", "name", "New User");
                OAuth2User oauth2User = new DefaultOAuth2User(
                                Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")),
                                attributes,
                                "email");

                // The SuccessHandler would have set this authority
                OAuth2AuthenticationToken token = new OAuth2AuthenticationToken(
                                oauth2User,
                                Collections.singleton(new SimpleGrantedAuthority("ROLE_ADMIN")),
                                "azure");

                mockMvc.perform(get("/api/auth/me").with(authentication(token)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.authenticated").value(true))
                                .andExpect(jsonPath("$.username").value("new@example.com")) // Default name from token
                                                                                            // principal
                                .andExpect(jsonPath("$.role").value("ADMIN"));
        }

        @Test
        void testGetCurrentUser_SSO_MixedCaseEmail() throws Exception {
                // Mock User in DB with lowercase email
                User user = new User();
                user.setId(2L);
                user.setUsername("mixed_user");
                user.setEmail("mixedCase@example.com".toLowerCase());
                user.setRole(User.Role.IT_SUPPORT);
                user.setFullName("Mixed Case User");

                // Repository expects lowercase
                when(userRepository.findByEmail("mixedcase@example.com")).thenReturn(Optional.of(user));

                // Token has mixed case email
                Map<String, Object> attributes = Map.of("email", "MixedCase@Example.com", "name", "Mixed Case User");
                OAuth2User oauth2User = new DefaultOAuth2User(
                                Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")),
                                attributes,
                                "email");

                OAuth2AuthenticationToken token = new OAuth2AuthenticationToken(
                                oauth2User,
                                Collections.singleton(new SimpleGrantedAuthority("ROLE_IT_SUPPORT")),
                                "azure");

                mockMvc.perform(get("/api/auth/me").with(authentication(token)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.authenticated").value(true))
                                .andExpect(jsonPath("$.email").value("mixedcase@example.com"))
                                .andExpect(jsonPath("$.role").value("IT_SUPPORT"));
        }
}
