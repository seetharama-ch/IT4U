package com.gsg.it4u.config;

import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import com.gsg.it4u.repository.TicketRepository;
import com.gsg.it4u.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {

        @org.springframework.beans.factory.annotation.Autowired
        private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

        @org.springframework.beans.factory.annotation.Autowired
        private org.springframework.core.env.Environment environment;

        @org.springframework.beans.factory.annotation.Value("${it4u.bootstrap.reset-admin:false}")
        private boolean resetAdmin;

        @org.springframework.beans.factory.annotation.Value("${it4u.bootstrap.forceResetPasswords:false}")
        private boolean forceResetPasswords;

        @org.springframework.beans.factory.annotation.Autowired
        private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

        @Bean
        public CommandLineRunner initData(UserRepository userRepository, TicketRepository ticketRepository) {
                return args -> {
                        // Fix sequence if needed (Auto-heal)
                        try {
                                jdbcTemplate.execute(
                                                "SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1))");
                        } catch (Exception e) {
                                System.out.println("Sequence reset failed (ignore if H2/other DB): " + e.getMessage());
                        }

                        // 1. Create Users
                        upsertUser(userRepository, "manager_mike", "password", User.Role.MANAGER,
                                        "mike.manager@geosoftglobal.com");
                        upsertUser(userRepository, "security_sam", "password", User.Role.SECURITY_TEAM, null);
                        User managerMike = userRepository.findByUsername("manager_mike").orElseThrow();

                        upsertUser(userRepository, "it_support_jane", "password", User.Role.IT_SUPPORT,
                                        "jane.support@geosoftglobal.com");
                        upsertUser(userRepository, "admin", "admin123", User.Role.ADMIN, "admin@geosoftglobal.com");
                        upsertUser(userRepository, "admin_test", "password", User.Role.ADMIN,
                                        "admin_test@geosoftglobal.com");

                        // E2E Test Users
                        upsertUser(userRepository, "employee", "password", User.Role.EMPLOYEE, "employee@gsg.in");
                        upsertUser(userRepository, "manager", "password", User.Role.MANAGER, "manager@gsg.in");
                        upsertUser(userRepository, "support", "password", User.Role.IT_SUPPORT, "support@gsg.in");

                        User itSupportJane = userRepository.findByUsername("it_support_jane").orElseThrow();

                        // 8. Create Dummy Tickets
                        if (ticketRepository.count() == 0) {
                                Ticket t1 = new Ticket();
                                t1.setTitle("Laptop Screen Flickering");
                                t1.setDescription(
                                                "My screen flickers when I tilt the lid effectively making it unusable.");
                                t1.setPriority(Ticket.Priority.HIGH);
                                t1.setStatus(Ticket.Status.OPEN);
                                t1.setCategory(Ticket.Category.HARDWARE);
                                t1.setRequester(managerMike); // Changed from employeeJohn
                                t1.setManager(null); // Manager can't approve own ticket
                                t1.setManagerApprovalStatus(Ticket.ManagerApprovalStatus.NA);
                                ticketRepository.save(t1);

                                Ticket t2 = new Ticket();
                                t2.setTitle("Request for IntelliJ License");
                                t2.setDescription(
                                                "I need a license key for IntelliJ IDEA Ultimate for the new project.");
                                t2.setPriority(Ticket.Priority.MEDIUM);
                                t2.setStatus(Ticket.Status.IN_PROGRESS);
                                t2.setCategory(Ticket.Category.SOFTWARE);
                                t2.setRequester(managerMike); // Changed from employeeJohn
                                t2.setAssignedTo(itSupportJane);
                                t2.setManagerApprovalStatus(Ticket.ManagerApprovalStatus.APPROVED);
                                ticketRepository.save(t2);

                                Ticket t3 = new Ticket();
                                t3.setTitle("Wifi issues in Meeting Room B");
                                t3.setDescription("Signal is very weak.");
                                t3.setPriority(Ticket.Priority.LOW);
                                t3.setStatus(Ticket.Status.RESOLVED);
                                t3.setCategory(Ticket.Category.NETWORK);
                                t3.setRequester(managerMike); // Changed from employeeJohn
                                t3.setAssignedTo(itSupportJane);
                                t3.setManagerApprovalStatus(Ticket.ManagerApprovalStatus.NA);
                                ticketRepository.save(t3);

                                System.out.println("Dummy data initialized: 3 tickets.");
                        }

                        // 9. Reset Admin if requested (After standard init to override)
                        if (resetAdmin) {
                                try {
                                        User admin = userRepository.findByUsername("admin").orElseGet(User::new);
                                        if (admin.getId() == null) {
                                                admin.setUsername("admin");
                                                admin.setRole(User.Role.ADMIN);
                                                admin.setEmail("admin@geosoftglobal.com");
                                                admin.setCreatedByAdmin(true);
                                                admin.setAuthProvider(User.AuthProvider.LOCAL);
                                        }
                                        // Force password reset
                                        admin.setPassword(passwordEncoder.encode("Admin@123"));
                                        admin.setActive(true);
                                        userRepository.save(admin);
                                        System.out.println("Admin reset applied (username=admin)");
                                } catch (Exception e) {
                                        System.err.println("Failed to reset admin: " + e.getMessage());
                                }
                        }

                        if (forceResetPasswords) {
                                boolean isDevOrTest = java.util.stream.Stream.of(environment.getActiveProfiles())
                                                .anyMatch(p -> p.equalsIgnoreCase("dev") || p.equalsIgnoreCase("test"));
                                boolean isEnvOverride = "true"
                                                .equalsIgnoreCase(System.getenv("IT4U_FORCE_RESET_ALLOWED"));

                                if (isDevOrTest || isEnvOverride) {
                                        System.out.println(
                                                        "Force resetting critical account passwords (Safe Profile or Env Override active)...");
                                        upsertUser(userRepository, "admin", "Admin@123", User.Role.ADMIN,
                                                        "admin@geosoftglobal.com");
                                        upsertUser(userRepository, "manager_mike", "password", User.Role.MANAGER,
                                                        "mike.manager@geosoftglobal.com");
                                        upsertUser(userRepository, "it_support_jane", "password", User.Role.IT_SUPPORT,
                                                        "jane.support@geosoftglobal.com");
                                        System.out.println("Bootstrapped admin credentials: admin/Admin@123");
                                } else {
                                        System.out.println(
                                                        "forceResetPasswords enabled but skipped for safety (Active profiles: "
                                                                        +
                                                                        java.util.Arrays.toString(
                                                                                        environment.getActiveProfiles())
                                                                        + ")");
                                }
                        }

                        System.out.println("Data initialization check completed.");
                };
        }

        private void upsertUser(UserRepository userRepository, String username, String rawPassword, User.Role role,
                        String email) {
                String normalized = username.trim();
                User u = userRepository.findByUsername(normalized).orElseGet(User::new);

                u.setUsername(normalized);
                String encoded = passwordEncoder.encode(rawPassword);
                System.out.println("DEBUG: Upserting user " + normalized + " with raw='" + rawPassword + "' encoded='"
                                + encoded + "'");
                u.setPassword(encoded);
                u.setRole(role);
                u.setEmail(email);
                u.setActive(true);
                u.setCreatedByAdmin(true);
                u.setAuthProvider(User.AuthProvider.LOCAL);

                userRepository.save(u);
        }
}
