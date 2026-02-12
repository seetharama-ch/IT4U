package com.gsg.it4u.controller;

import com.gsg.it4u.dto.AttachmentDTO;
import com.gsg.it4u.entity.Attachment;
import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import com.gsg.it4u.repository.AttachmentRepository;
import com.gsg.it4u.repository.TicketRepository;
import com.gsg.it4u.repository.UserRepository;
import com.gsg.it4u.service.StorageService;
import com.gsg.it4u.service.TicketAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tickets/{ticketId}/attachments")
public class AttachmentController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AttachmentController.class);

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StorageService storageService;

    @Autowired
    private TicketAccessService ticketAccessService;

    private User getAuthenticatedUser() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth == null)
            return null;

        String username = auth.getName();
        // Try to find by username first
        User user = userRepository.findByUsername(username).orElse(null);

        // If not found, check if it's OAuth2 and try email
        if (user == null && auth.getPrincipal() instanceof org.springframework.security.oauth2.core.user.OAuth2User) {
            org.springframework.security.oauth2.core.user.OAuth2User oauthUser = (org.springframework.security.oauth2.core.user.OAuth2User) auth
                    .getPrincipal();
            String email = oauthUser.getAttribute("preferred_username");
            if (email == null)
                email = oauthUser.getAttribute("email");

            if (email != null) {
                user = userRepository.findByEmail(email).orElse(null);
            }
        }
        return user;
    }

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('EMPLOYEE','MANAGER','IT_SUPPORT','ADMIN')")
    public ResponseEntity<?> uploadAttachment(@PathVariable Long ticketId,
            @RequestParam("file") MultipartFile file) {
        User user = getAuthenticatedUser();
        if (user == null) {
            log.warn("Upload failed: User not authenticated");
            return ResponseEntity.status(401).build();
        }

        Ticket ticket = ticketRepository.findById(ticketId).orElse(null);
        if (ticket == null) {
            log.warn("Upload failed: Ticket #{} not found", ticketId);
            return ResponseEntity.notFound().build();
        }

        if (!ticketAccessService.canUploadAttachment(user, ticket)) {
            log.warn("Upload denied: User {} cannot upload to Ticket #{}", user.getUsername(), ticketId);
            return ResponseEntity.status(403)
                    .body("Access Denied: You do not have permission to upload to this ticket.");
        }

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        // Validate size (5MB)
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.status(413).body("File too large. Max 5 MB");
        }

        // Validate type
        String contentType = file.getContentType();
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null)
            originalFilename = "";
        String extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();

        boolean isValidExtension = extension.equals("pdf") || extension.equals("jpg") || extension.equals("jpeg")
                || extension.equals("png") || extension.equals("txt") || extension.equals("csv");
        boolean isValidMime = false;

        if (contentType != null) {
            String mime = contentType.toLowerCase();
            if (extension.equals("pdf") && mime.equals("application/pdf"))
                isValidMime = true;
            else if ((extension.equals("jpg") || extension.equals("jpeg"))
                    && (mime.equals("image/jpeg") || mime.equals("image/jpg")))
                isValidMime = true;
            else if (extension.equals("png") && mime.equals("image/png"))
                isValidMime = true;
            else if (extension.equals("txt") && (mime.equals("text/plain") || mime.startsWith("text/")))
                isValidMime = true;
            else if (extension.equals("csv") && (mime.equals("text/csv") || mime.equals("application/vnd.ms-excel")
                    || mime.equals("text/plain")))
                isValidMime = true;
        }

        if (!isValidExtension || !isValidMime) {
            return ResponseEntity.badRequest().body("Only PDF, JPG, PNG, TXT, CSV files are allowed");
        }

        try {
            String storedName = storageService.store(file, ticketId);

            Attachment attachment = new Attachment();
            attachment.setTicket(ticket);
            attachment.setOriginalFileName(file.getOriginalFilename());
            attachment.setStoredFileName(storedName);
            attachment.setContentType(contentType);
            attachment.setSizeBytes(file.getSize());
            attachment.setUploadedBy(user);

            Attachment saved = attachmentRepository.save(attachment);
            log.info("Attachment uploaded successfully: {} for Ticket #{} by {}", saved.getOriginalFileName(), ticketId,
                    user.getUsername());
            return ResponseEntity.ok(AttachmentDTO.fromEntity(saved));

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Upload failed");
        }
    }

    @GetMapping
    public ResponseEntity<?> listAttachments(@PathVariable Long ticketId) {
        User user = getAuthenticatedUser();
        if (user == null)
            return ResponseEntity.status(401).build();

        Ticket ticket = ticketRepository.findById(ticketId).orElse(null);
        if (ticket == null)
            return ResponseEntity.notFound().build();

        if (!ticketAccessService.canViewTicket(user, ticket)) {
            return ResponseEntity.status(403).body("Access Denied");
        }

        List<AttachmentDTO> attachments = attachmentRepository.findByTicketIdAndDeletedFalse(ticketId)
                .stream()
                .map(AttachmentDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(attachments);
    }

    @GetMapping("/{attachmentId}/download")
    public ResponseEntity<?> downloadAttachment(@PathVariable Long ticketId,
            @PathVariable Long attachmentId) {
        User user = getAuthenticatedUser();
        if (user == null)
            return ResponseEntity.status(401).build();

        Ticket ticket = ticketRepository.findById(ticketId).orElse(null);
        if (ticket == null)
            return ResponseEntity.notFound().build();

        if (!ticketAccessService.canViewTicket(user, ticket)) {
            return ResponseEntity.status(403).body("Access Denied");
        }

        Attachment attachment = attachmentRepository.findById(attachmentId).orElse(null);
        if (attachment == null || !attachment.getTicket().getId().equals(ticketId) || attachment.isDeleted()) {
            return ResponseEntity.notFound().build();
        }

        try {
            Path filePath = storageService.load(ticketId, attachment.getStoredFileName());
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return ResponseEntity.ok()
                        .contentType(MediaType
                                .parseMediaType(attachment.getContentType() != null ? attachment.getContentType()
                                        : "application/octet-stream"))
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\""
                                        + attachment.getOriginalFileName().replaceAll("[^a-zA-Z0-9._-]", "_") + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<?> deleteAttachment(@PathVariable Long ticketId,
            @PathVariable Long attachmentId) {
        User user = getAuthenticatedUser();
        if (user == null)
            return ResponseEntity.status(401).build();

        Ticket ticket = ticketRepository.findById(ticketId).orElse(null);
        if (ticket == null)
            return ResponseEntity.notFound().build();

        // Check if user has access to ticket first
        if (!ticketAccessService.canViewTicket(user, ticket)) {
            return ResponseEntity.status(403).body("Access Denied");
        }

        Attachment attachment = attachmentRepository.findById(attachmentId).orElse(null);
        if (attachment == null || !attachment.getTicket().getId().equals(ticketId)) {
            return ResponseEntity.notFound().build();
        }

        if (!ticketAccessService.canDeleteAttachment(user, ticket, attachment)) {
            return ResponseEntity.status(403).body("You can only delete files you uploaded");
        }

        // Soft delete
        attachment.setDeleted(true);
        attachmentRepository.save(attachment);

        // Optional: Remove physical file if policy dictates, or keep for audit.
        // For Enterprise soft-delete, we usually keep the file or move to archive.
        // If hard delete was requested, we would call storageService.delete(...)

        return ResponseEntity.noContent().build();
    }
}
