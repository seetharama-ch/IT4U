package com.gsg.it4u.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
public class SecurityConfig {

        @org.springframework.beans.factory.annotation.Autowired
        private com.gsg.it4u.security.CustomOAuth2SuccessHandler customSuccessHandler;

        @org.springframework.beans.factory.annotation.Autowired
        private com.gsg.it4u.security.CustomOAuth2UserService customOAuth2UserService;

        @org.springframework.beans.factory.annotation.Value("${it4u.auth.mode:local}")
        private String authMode;

        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
                http
                                .csrf(csrf -> csrf.disable())
                                .cors(cors -> cors.configurationSource(request -> {
                                        var corsConfiguration = new org.springframework.web.cors.CorsConfiguration();
                                        corsConfiguration.setAllowedOrigins(java.util.List.of("http://localhost:5173",
                                                        "http://localhost:4173", "http://localhost:4180",
                                                        "http://localhost:8086",
                                                        "http://gsg-mecm:8086", "http://gsg-mecm",
                                                        "http://192.168.40.172:8086",
                                                        "https://gsg-mecm", "https://GSG-MECM.gsg.in"));
                                        corsConfiguration.setAllowCredentials(true);
                                        corsConfiguration
                                                        .setAllowedMethods(java.util.List.of("GET", "POST", "PUT",
                                                                        "DELETE", "OPTIONS", "PATCH"));
                                        corsConfiguration.setAllowedHeaders(java.util.List.of("*"));
                                        return corsConfiguration;
                                }))
                                .httpBasic(org.springframework.security.config.Customizer.withDefaults())
                                .exceptionHandling(ex -> ex
                                                .authenticationEntryPoint((request, response, authException) -> {
                                                        response.setContentType("application/json;charset=UTF-8");
                                                        response.setStatus(401);
                                                        response.getWriter().write(
                                                                        "{\"error\": \"UNAUTHORIZED\", \"message\": \"Invalid username or password\"}");
                                                })
                                                .accessDeniedHandler((request, response, accessDeniedException) -> {
                                                        response.setContentType("application/json;charset=UTF-8");
                                                        response.setStatus(403);
                                                        response.getWriter().write(
                                                                        "{\"error\": \"FORBIDDEN\", \"message\": \"Access Denied\"}");
                                                }))
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/actuator/health").permitAll()
                                                .requestMatchers("/actuator/**").authenticated()
                                                .requestMatchers("/login/**", "/oauth2/**").permitAll()
                                                .requestMatchers("/api/auth/login").permitAll()
                                                // Explicitly permit static assets
                                                .requestMatchers("/assets/**", "/*.js", "/*.css", "/*.ico", "/*.png",
                                                                "/*.svg", "/*.json", "/index.html")
                                                .permitAll()
                                                .requestMatchers(org.springframework.http.HttpMethod.GET,
                                                                "/api/auth/me")
                                                .authenticated()

                                                // Ticket Create & View Own
                                                .requestMatchers(org.springframework.http.HttpMethod.POST,
                                                                "/api/tickets")
                                                .hasAnyRole("EMPLOYEE", "MANAGER", "IT_SUPPORT", "ADMIN")
                                                .requestMatchers(org.springframework.http.HttpMethod.GET,
                                                                "/api/tickets")
                                                .hasAnyRole("EMPLOYEE", "MANAGER", "IT_SUPPORT", "ADMIN") // Allow
                                                                                                          // listing for
                                                                                                          // all,
                                                                                                          // filtered by
                                                                                                          // service
                                                .requestMatchers(org.springframework.http.HttpMethod.GET,
                                                                "/api/tickets/my")
                                                .hasAnyRole("EMPLOYEE", "ADMIN", "MANAGER", "IT_SUPPORT")

                                                // Manager
                                                .requestMatchers("/api/manager/**").hasAnyRole("MANAGER", "ADMIN")

                                                // IT Support
                                                .requestMatchers("/api/it-support/**").hasAnyRole("IT_SUPPORT", "ADMIN")

                                                // Admin
                                                .requestMatchers("/api/users/managers").authenticated() // Allow
                                                                                                        // fetching
                                                                                                        // managers
                                                .requestMatchers(org.springframework.http.HttpMethod.GET,
                                                                "/api/users")
                                                .hasAnyRole("ADMIN", "IT_SUPPORT")
                                                .requestMatchers("/api/users/**").hasRole("ADMIN")
                                                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                                                // Default API
                                                .requestMatchers("/api/**").authenticated()

                                                // Static & SPA (everything else)
                                                .anyRequest().permitAll())
                                .logout(logout -> logout
                                                .logoutUrl("/api/auth/logout")
                                                .invalidateHttpSession(true)
                                                .clearAuthentication(true)
                                                .deleteCookies("JSESSIONID")
                                                .logoutSuccessHandler((request, response, authentication) -> {
                                                        response.setContentType("application/json");
                                                        response.setStatus(200);
                                                        response.getWriter().write(
                                                                        "{\"message\": \"Logged out successfully\"}");
                                                }));

                if ("azure".equalsIgnoreCase(authMode)) {
                        http.oauth2Login(oauth2 -> oauth2
                                        .loginPage("/login")
                                        .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                                        .successHandler(customSuccessHandler));
                }

                return http.build();
        }

        @Bean
        public org.springframework.security.authentication.AuthenticationManager authenticationManager(
                        org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration authenticationConfiguration)
                        throws Exception {
                return authenticationConfiguration.getAuthenticationManager();
        }

        @Bean
        public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
                // Allow plain text passwords for legacy/test users by using "noop" as default
                @SuppressWarnings("deprecation")
                var encoder = org.springframework.security.crypto.password.NoOpPasswordEncoder.getInstance();
                return encoder;
        }
}
