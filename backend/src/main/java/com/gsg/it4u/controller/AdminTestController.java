package com.gsg.it4u.controller;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gsg.it4u.constant.EmailEventType;
import com.gsg.it4u.entity.EmailAudit;
import com.gsg.it4u.repository.EmailAuditRepository;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminTestController {

    private final JavaMailSender mailSender;
    private final EmailAuditRepository emailAuditRepository;

    @Value("${notifications.sender-address}")
    private String senderAddress;

    @GetMapping("/test-email")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> sendTestEmail(@RequestParam String to) {
        log.info("Received request to send test email to: {}", to);
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(senderAddress);
            helper.setTo(to);
            helper.setSubject("IT4U SMTP Test");
            helper.setText(
                    "<h1>SMTP Test</h1><p>This is a test email from IT4U Backend using Microsoft 365 configuration.</p>",
                    true);

            mailSender.send(mimeMessage);
            log.info("Test email sent successfullly to: {}", to);

            // Audit Success
            emailAuditRepository.save(EmailAudit.builder()
                    .eventType(EmailEventType.SMTP_TEST)
                    .toEmail(to)
                    .subject("IT4U SMTP Test")
                    .status("SENT")
                    .build());

            return ResponseEntity.ok("Test email sent to " + to);
        } catch (MessagingException e) {
            log.error("Failed to send test email", e);

            // Audit Failure
            emailAuditRepository.save(EmailAudit.builder()
                    .eventType(EmailEventType.SMTP_TEST)
                    .toEmail(to)
                    .subject("IT4U SMTP Test")
                    .status("FAILED")
                    .errorMessage(e.getMessage())
                    .build());

            return ResponseEntity.internalServerError().body("Failed to send email: " + e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error sending test email", e);

            // Audit Failure
            emailAuditRepository.save(EmailAudit.builder()
                    .eventType(EmailEventType.SMTP_TEST)
                    .toEmail(to)
                    .subject("IT4U SMTP Test")
                    .status("FAILED")
                    .errorMessage(e.getMessage())
                    .build());

            return ResponseEntity.internalServerError().body("Unexpected error: " + e.getMessage());
        }
    }

    @GetMapping("/notifications")
    @PreAuthorize("hasRole('ADMIN')")
    public java.util.List<EmailAudit> getRecentNotifications() {
        return emailAuditRepository.findTop50ByOrderByCreatedAtDesc();
    }

    @GetMapping("/system/test-mode")
    @PreAuthorize("hasRole('ADMIN')")
    public boolean getTestModeStatus(@Value("${IT4U_TEST_MODE:false}") boolean testMode) {
        return testMode;
    }
}
