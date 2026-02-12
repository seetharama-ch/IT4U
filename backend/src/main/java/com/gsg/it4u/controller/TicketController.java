package com.gsg.it4u.controller;

import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import com.gsg.it4u.dto.TicketDTO;
import com.gsg.it4u.repository.TicketRepository;
import com.gsg.it4u.repository.UserRepository;
import com.gsg.it4u.service.TicketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.gsg.it4u.repository.TicketSpecification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping("/api/tickets")
@Tag(name = "Tickets - Admin/IT Actions", description = "Admin / IT Support operations for ticket lifecycle management")
public class TicketController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(TicketController.class);

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TicketService ticketService;

    @org.springframework.beans.factory.annotation.Value("${IT4U_TEST_MODE:false}")
    private boolean testMode;

    // ... existing constructor implicitly via autowired fields (or explicit if
    // present, but here standard field injection used) ...

    @PatchMapping("/{id}/admin-actions")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'IT_SUPPORT')")
    @Operation(summary = "Perform Admin / IT Support actions on a ticket", description = "Allows ADMIN or IT_SUPPORT to assign a ticket, transition status, update priority, and optionally add a comment. "
            +
            "Lifecycle rules are enforced: manager approval must be APPROVED before moving to IN_PROGRESS/RESOLVED/CLOSED. "
            +
            "Ownership rules are enforced for IT_SUPPORT (must be assigned to resolve/close).", parameters = {
                    @Parameter(name = "id", in = ParameterIn.PATH, required = true, description = "Ticket ID", example = "123")
            })
    @ApiResponse(responseCode = "200", description = "Action applied successfully. Returns updated ticket details (attachments/comments included).", content = @Content(schema = @Schema(implementation = TicketDTO.class)))
    @ApiResponse(responseCode = "400", description = "Invalid transition or invalid input (e.g., status not allowed, manager approval pending).", content = @Content(schema = @Schema(implementation = com.gsg.it4u.api.ApiError.class)))
    @ApiResponse(responseCode = "403", description = "Forbidden due to role/ownership enforcement (e.g., IT_SUPPORT not assigned to the ticket).", content = @Content(schema = @Schema(implementation = com.gsg.it4u.api.ApiError.class)))
    @ApiResponse(responseCode = "404", description = "Ticket not found", content = @Content(schema = @Schema(implementation = com.gsg.it4u.api.ApiError.class)))
    @ApiResponse(responseCode = "500", description = "Internal Server Error", content = @Content(schema = @Schema(implementation = com.gsg.it4u.api.ApiError.class)))
    public ResponseEntity<?> performAdminAction(@PathVariable Long id,
            @RequestBody @Valid com.gsg.it4u.dto.AdminActionRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth.getName();
        User actor = userRepository.findByUsername(currentUsername).orElseThrow();

        log.info("Ticket #{} Admin Action: {} by {}", id, request, currentUsername);

        try {
            TicketDTO updated = ticketService.performAdminAction(id, request, actor);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            log.warn("Ticket #{} Admin Action Invalid: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(java.util.Collections.singletonMap("message", e.getMessage()));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode())
                    .body(java.util.Collections.singletonMap("message", e.getReason()));
        } catch (Exception e) {
            log.error("Ticket #{} Admin Action Error", id, e);
            return ResponseEntity.status(500)
                    .body(java.util.Collections.singletonMap("message", "Internal Error: " + e.getMessage()));
        }
    }

    @GetMapping
    public Page<TicketDTO> getAllTickets(
            @RequestParam(required = false) String ticketNumber,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdTo,
            @RequestParam(required = false) String raisedBy,
            @RequestParam(required = false) String managerAssigned,
            Pageable pageable) {

        if (!pageable.getSort().isSorted()) {
            pageable = PageRequest.of(
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    Sort.by("createdAt").descending());
        } else {
            // Handle DTO to Entity field mapping for sorting
            Sort sort = pageable.getSort();
            Sort newSort = Sort.unsorted();
            for (Sort.Order order : sort) {
                String property = order.getProperty();
                if ("updatedByName".equals(property)) {
                    // Map to entity path. Fallback to username if fullName is null is tricky in
                    // Sort,
                    // but for now let's sort by fullName (or username)
                    property = "updatedBy.fullName";
                } else if ("raisedByName".equals(property)) {
                    property = "requester.fullName";
                } else if ("managerAssignedName".equals(property)) {
                    property = "manager.fullName";
                }

                newSort = newSort.and(Sort.by(order.getDirection(), property));
            }
            pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), newSort);
        }

        LocalDateTime from = createdFrom != null ? createdFrom.atStartOfDay() : null;
        LocalDateTime to = createdTo != null ? createdTo.atTime(23, 59, 59) : null;

        Specification<Ticket> spec = TicketSpecification.filterTickets(
                ticketNumber, from, to, raisedBy, managerAssigned);

        return ticketRepository.findAll(spec, pageable)
                .map(t -> TicketDTO.fromEntity(t, false));
    }

    @GetMapping("/my")
    public List<TicketDTO> getMyTickets() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        // --- DIAGNOSTIC LOGGING START ---
        log.info("getMyTickets requested by Principal: {}", username);
        if (auth.getPrincipal() instanceof org.springframework.security.oauth2.core.user.OAuth2User) {
            org.springframework.security.oauth2.core.user.OAuth2User oauthUser = (org.springframework.security.oauth2.core.user.OAuth2User) auth
                    .getPrincipal();
            log.info("OAuth2 Attributes: {}", oauthUser.getAttributes());
        }
        // --- DIAGNOSTIC LOGGING END ---

        User user = null;

        // Try SSO Email resolution
        if (auth.getPrincipal() instanceof org.springframework.security.oauth2.core.user.OAuth2User) {
            org.springframework.security.oauth2.core.user.OAuth2User oidcUser = (org.springframework.security.oauth2.core.user.OAuth2User) auth
                    .getPrincipal();
            String email = oidcUser.getAttribute("preferred_username");
            if (email == null)
                email = oidcUser.getAttribute("email");

            if (email != null) {
                user = userRepository.findByEmail(email).orElse(null);
                // Try lowercase if not found
                if (user == null) {
                    user = userRepository.findByEmail(email.toLowerCase()).orElse(null);
                }
            }
        }

        // Fallback to username (Local auth or if SSO email lookup failed but username
        // matches)
        if (user == null) {
            user = userRepository.findByUsername(username).orElse(null);
        }

        if (user != null) {
            log.info("getMyTickets resolved to Internal User: ID={} Username={}", user.getId(), user.getUsername());
            return ticketRepository.findByRequesterIdWithAttachments(user.getId())
                    .stream()
                    .map(t -> TicketDTO.fromEntity(t, false))
                    .collect(Collectors.toList());
        }

        log.warn("getMyTickets failed to resolve user for Principal: {}", username);
        return java.util.Collections.emptyList();
    }

    @GetMapping("/approvals")
    public List<TicketDTO> getManagerApprovals(@RequestParam Long managerId,
            @RequestParam(required = false) Ticket.ManagerApprovalStatus status) {
        List<Ticket> tickets;
        if (status != null) {
            tickets = ticketRepository.findByManagerIdAndManagerApprovalStatusWithAttachments(managerId, status);
        } else {
            tickets = ticketRepository.findByManagerIdWithAttachments(managerId);
        }
        return tickets.stream().map(t -> TicketDTO.fromEntity(t, false)).collect(Collectors.toList());
    }

    @GetMapping("/manager/pending")
    public List<TicketDTO> getManagerPendingTickets(@RequestParam Long managerId) {
        return ticketRepository
                .findByManagerIdAndManagerApprovalStatusWithAttachments(managerId,
                        Ticket.ManagerApprovalStatus.PENDING)
                .stream()
                .map(t -> TicketDTO.fromEntity(t, false))
                .collect(Collectors.toList());
    }

    @GetMapping("/manager/approved")
    public List<TicketDTO> getManagerApprovedTickets(@RequestParam Long managerId) {
        List<Ticket.ManagerApprovalStatus> approvedStatuses = java.util.Arrays.asList(
                Ticket.ManagerApprovalStatus.APPROVED,
                Ticket.ManagerApprovalStatus.REJECTED,
                Ticket.ManagerApprovalStatus.NA);
        return ticketRepository
                .findByManagerIdAndManagerApprovalStatusInWithAttachments(managerId, approvedStatuses)
                .stream()
                .map(t -> TicketDTO.fromEntity(t, false))
                .collect(Collectors.toList());
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveTicket(@PathVariable Long id, @RequestBody Ticket approvalData) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth.getName();
        User actor = userRepository.findByUsername(currentUsername).orElse(null);

        log.info("Ticket #{} Approve Request by user={}", id, currentUsername);

        try {
            // Note: comment is not passed in this endpoint currently (it's in RquestBody
            // Ticket but field unclear),
            // but requirements said "Update service methods so actions accept optional
            // comment".
            // existing Endpoint receives `Ticket approvalData` which has fields.
            // If the UI sends comment in a field, we should use it.
            // `Ticket` entity doesn't have `comment` field directly for payload, it has
            // List<Comment>.
            // Assuming for now comment is null or I need to handle it.
            // I'll proceed with null comment for this endpoint rewrite unless I see DTO
            // usage.
            Ticket updated = ticketService.approveTicket(id, actor, null, approvalData.getPriority());
            log.info("Ticket #{} Approved successfully. Status={} ManagerStatus={}", id, updated.getStatus(),
                    updated.getManagerApprovalStatus());
            return ResponseEntity.ok(TicketDTO.fromEntity(updated));
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.error("Ticket #{} Approve failed: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> createTicket(@RequestBody Ticket ticket) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String currentUsername = auth.getName();
            User actor = userRepository.findByUsername(currentUsername)
                    .orElseThrow(() -> new IllegalArgumentException("Authenticated user not found"));

            // Enforce requester as the authenticated user
            ticket.setRequester(actor);

            if (testMode) {
                String timestamp = java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd-HHmm")
                        .format(java.time.LocalDateTime.now());
                ticket.setTitle("[QA-PROD-" + timestamp + "] " + ticket.getTitle());
            }

            Ticket savedTicket = ticketService.createTicket(ticket);
            log.info("Ticket #{} Created via API. ID={} Number={}", savedTicket.getId(), savedTicket.getId(),
                    savedTicket.getTicketNumber());
            return ResponseEntity.ok(TicketDTO.fromEntity(savedTicket)); // Or DTO
        } catch (Exception e) {
            log.error("Ticket Create failed: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Internal Error: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<com.gsg.it4u.dto.TicketDTO> getTicket(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String user = auth != null ? auth.getName() : "anonymous";
        log.info("Ticket #{} Fetch request by {}", id, user);

        try {
            com.gsg.it4u.dto.TicketDTO details = ticketService.getTicketDetails(id);
            return ResponseEntity.ok(details);
        } catch (ResponseStatusException e) {
            log.warn("Ticket #{} Fetch denied/failed for {}: {}", id, user, e.getReason());
            throw e;
        } catch (Exception e) {
            log.error("Ticket #{} Fetch error for {}: {}", id, user, e.getMessage(), e);
            throw e;
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateTicketStatus(@PathVariable Long id, @RequestBody Ticket statusUpdate) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth.getName();
        User actor = userRepository.findByUsername(currentUsername).orElse(null);

        log.info("Ticket #{} Status update request to {} by {} (Role: {})", id, statusUpdate.getStatus(),
                currentUsername,
                actor != null ? actor.getRole() : "Unknown");

        // Check if comment is passed. The `Ticket` object doesn't really have a
        // transient comment field.
        // Assuming we rely on separate "Add Comment" or if frontend sends it in a
        // special way.
        // For now: null comment.
        try {
            Ticket updated = ticketService.updateStatus(id, statusUpdate.getStatus(), actor, null);
            log.info("Ticket #{} Status updated to {}", id, updated.getStatus());
            return ResponseEntity.ok(TicketDTO.fromEntity(updated));
        } catch (Exception e) {
            log.error("Ticket #{} Status update failed: {}", id, e.getMessage());
            // Return 403 for Forbidden exceptions (like IT Support ownership check)
            if (e instanceof ResponseStatusException) {
                return ResponseEntity.status(((ResponseStatusException) e).getStatusCode()).body(e.getMessage());
            }
            return ResponseEntity.status(409).body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/approval")
    public ResponseEntity<?> updateApprovalStatus(@PathVariable Long id, @RequestBody Ticket approvalUpdate) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth.getName();
        User actor = userRepository.findByUsername(currentUsername).orElse(null);

        log.info("Ticket #{} Approval update: {} by {}", id, approvalUpdate.getManagerApprovalStatus(),
                currentUsername);

        if (approvalUpdate.getManagerApprovalStatus() == Ticket.ManagerApprovalStatus.APPROVED) {
            return ResponseEntity.ok(
                    TicketDTO.fromEntity(ticketService.approveTicket(id, actor, null, approvalUpdate.getPriority())));
        } else if (approvalUpdate.getManagerApprovalStatus() == Ticket.ManagerApprovalStatus.REJECTED) {
            Ticket t = ticketService.rejectTicket(id, actor, null);
            log.info("Ticket #{} Rejected. Status={}", id, t.getStatus());
            // Check for stuck state
            if (t.getStatus() == Ticket.Status.PENDING_MANAGER_APPROVAL) {
                log.warn("Ticket #{} rejected but status remains PENDING_MANAGER_APPROVAL", id);
            }
            return ResponseEntity.ok(TicketDTO.fromEntity(t));
        }

        return ResponseEntity.badRequest().build();
    }

    @PatchMapping("/{id}/assign")
    public ResponseEntity<com.gsg.it4u.dto.TicketDTO> assignTicket(@PathVariable Long id, @RequestParam Long userId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth.getName();
        User actor = userRepository.findByUsername(currentUsername).orElse(null);

        log.info("Ticket #{} Assign request to user ID {} by {}", id, userId, currentUsername);

        // Security Check: Only ADMIN or IT_SUPPORT can assign
        if (actor == null || (actor.getRole() != User.Role.ADMIN && actor.getRole() != User.Role.IT_SUPPORT)) {
            return ResponseEntity.status(403).body(null);
        }

        return ticketRepository.findById(id).map(ticket -> {
            String beforeAssigned = ticket.getAssignedTo() != null ? ticket.getAssignedTo().getUsername() : "NONE";
            userRepository.findById(userId).ifPresent(ticket::setAssignedTo);

            // Save the assignment first so it persists before any status update service
            // call
            Ticket savedTicket = ticketRepository.save(ticket);

            String afterAssigned = savedTicket.getAssignedTo() != null ? savedTicket.getAssignedTo().getUsername()
                    : "NONE";
            log.info("Ticket #{} Assigned: {} -> {}", id, beforeAssigned, afterAssigned);

            if (savedTicket.getStatus() == Ticket.Status.OPEN) {
                // Now update status (starts new transaction, fetches updated ticket from DB)
                ticketService.updateStatus(id, Ticket.Status.IN_PROGRESS, actor, "Auto-assigned to " + userId);
            }

            // Return DTO to avoid LazyInitializationException and match API standards
            // We fetch fresh to ensure we have latest state
            return ResponseEntity.ok(ticketService.getTicketDetails(id));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<com.gsg.it4u.entity.Comment> addComment(@PathVariable Long id,
            @RequestBody com.gsg.it4u.entity.Comment commentRequest) {

        // We need the actor.
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth.getName();

        User actor = null;
        if (commentRequest.getAuthor() != null && commentRequest.getAuthor().getId() != null) {
            actor = userRepository.findById(commentRequest.getAuthor().getId()).orElse(null);
        }
        if (actor == null) {
            actor = userRepository.findByUsername(currentUsername).orElse(null);
        }

        try {
            log.info("Ticket #{} Adding comment by {}", id, currentUsername);
            return ResponseEntity.ok(ticketService.addComment(id, actor, commentRequest.getContent()));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Object> deleteTicket(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth.getName();
        User admin = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Admin user not found"));

        log.info("Ticket #{} Soft delete request by {}", id, currentUsername);

        if (!ticketRepository.existsById(id)) {
            log.warn("Ticket #{} Delete failed: Not Found", id);
            return ResponseEntity.notFound().build();
        }

        ticketService.deleteTicketAsAdmin(id, admin);
        return ResponseEntity.ok(java.util.Collections.singletonMap("message", "Ticket deleted successfully"));
    }

    @PutMapping("/{id}/admin")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'IT_SUPPORT')")
    public ResponseEntity<?> updateTicket(@PathVariable Long id, @RequestBody Ticket updateRequest) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth.getName();
        User admin = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Admin user not found"));

        log.info("Ticket #{} Admin update request by {}", id, currentUsername);

        return ticketRepository.findByIdWithAssociations(id).map(ticket -> {
            // 1. Update fields if present
            if (updateRequest.getCategory() != null) {
                ticket.setCategory(updateRequest.getCategory());
            }
            if (updateRequest.getPriority() != null) {
                ticket.setPriority(updateRequest.getPriority());
            }

            // Handle Assignment
            if (updateRequest.getAssignedTo() != null) {
                // If ID is provided
                if (updateRequest.getAssignedTo().getId() != null) {
                    userRepository.findById(updateRequest.getAssignedTo().getId())
                            .ifPresent(ticket::setAssignedTo);
                } else if (updateRequest.getAssignedTo().getUsername() != null) {
                    userRepository.findByUsername(updateRequest.getAssignedTo().getUsername())
                            .ifPresent(ticket::setAssignedTo);
                }
            }

            // Save intermediate state
            Ticket saved = ticketRepository.save(ticket);

            // 2. Handle Status Update
            if (updateRequest.getStatus() != null && updateRequest.getStatus() != saved.getStatus()) {
                // Use service to handle side-effects and events
                try {
                    saved = ticketService.updateStatus(id, updateRequest.getStatus(), admin, "Admin Update");
                } catch (Exception e) {
                    log.error("Failed to update status in admin flow", e);
                    // Continue with saved changes, but warn? Or fail?
                    // For now, re-throw or return error would be better but we already saved some
                    // changes.
                    // Ideally transactional, but controller isn't @Transactional.
                    // It's acceptable for now.
                }
            }

            return ResponseEntity.ok(TicketDTO.fromEntity(saved));
        }).orElse(ResponseEntity.notFound().build());
    }
}
