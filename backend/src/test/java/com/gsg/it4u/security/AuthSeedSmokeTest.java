package com.gsg.it4u.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@org.springframework.test.context.TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class AuthSeedSmokeTest {

    @Autowired
    AuthenticationManager authenticationManager;

    @org.springframework.boot.test.mock.mockito.MockBean
    org.springframework.security.oauth2.client.registration.ClientRegistrationRepository clientRegistrationRepository;

    @Test
    void managerCanAuthenticate() {
        var auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken("manager_mike", "password"));
        assertTrue(auth.isAuthenticated());
    }

    @Test
    void itSupportCanAuthenticate() {
        var auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken("it_support_jane", "password"));
        assertTrue(auth.isAuthenticated());
    }

    @Test
    void adminCanAuthenticate() {
        var auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken("admin", "Admin@123"));
        assertTrue(auth.isAuthenticated());
    }
}
