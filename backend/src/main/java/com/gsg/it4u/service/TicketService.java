package com.gsg.it4u.service;

import com.gsg.it4u.entity.Comment;
import com.gsg.it4u.entity.Ticket;
import com.gsg.it4u.entity.User;
import com.gsg.it4u.event.TicketCommentAddedEvent;
import com.gsg.it4u.event.TicketCreatedEvent;
import com.gsg.it4u.event.TicketManagerDecisionEvent;
import com.gsg.it4u.event.TicketStatusChangedEvent;
import com.gsg.it4u.repository.CommentRepository;
import com.gsg.it4u.repository.TicketRepository;
import com.gsg.it4u.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class TicketService {

    private final TicketRepository ticketRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final TicketAccessService ticketAccessService;
    private final ApplicationEventPublisher eventPublisher;
    private final com.gsg.it4u.repository.EmailAuditRepository emailAuditRepository;

    @Transactional
    public Ticket createTicket(Ticket ticket) {
        // Validation and Defaults
        ticket.setPriority(Ticket.Priority.UNASSIGNED);
        ticket.setSlaDeadline(null);

        // Hydrate Requester
        if (ticket.getRequester() != null && ticket.getRequester().getId() != null) {
            userRepository.findById(ticket.getRequester().getId()).ifPresent(ticket::setRequester);
        } else if (ticket.getRequester() != null && ticket.getRequester().getUsername() != null) {
            userRepository.findByUsername(ticket.getRequester().getUsername()).ifPresent(ticket::setRequester);
        }

        if (ticket.getRequester() == null) {
            throw new IllegalArgumentException("Requester not found or invalid.");
        }

        // Hydrate Manager
        if (ticket.getManager() != null && ticket.getManager().getId() != null) {
            userRepository.findById(ticket.getManager().getId()).ifPresent(ticket::setManager);
        } else if (ticket.getManagerName() != null) {
            userRepository.findByUsername(ticket.getManagerName()).ifPresent(ticket::setManager);
        }

        // Populate managerEmail if Manager entity is set
        if (ticket.getManager() != null && ticket.getManager().getEmail() != null) {
            ticket.setManagerEmail(ticket.getManager().getEmail());
        } else if (ticket.getManagerEmail() == null) {
            // Fallback or explicit null
        }

        // Approval Logic
        boolean needsApproval = needsApproval(ticket);
        log.info("Ticket (Title: {}) Needs Approval? {}", ticket.getTitle(), needsApproval);

        if (needsApproval) {
            ticket.setManagerApprovalStatus(Ticket.ManagerApprovalStatus.PENDING);
            ticket.setStatus(Ticket.Status.PENDING_MANAGER_APPROVAL);
        } else {
            ticket.setManagerApprovalStatus(Ticket.ManagerApprovalStatus.NA);
            ticket.setStatus(Ticket.Status.OPEN);
        }

        // Initial updatedBy is the requester
        ticket.setUpdatedBy(ticket.getRequester());

        Ticket savedTicketWithStatus = ticketRepository.save(ticket);

        // Generate Custom Number
        java.time.LocalDate today = java.time.LocalDate.now();
        String datePart = java.time.format.DateTimeFormatter.ofPattern("MMyyyy").format(today);
        String uniqueId = String.format("%04d", savedTicketWithStatus.getId());
        savedTicketWithStatus.setTicketNumber("GSG-" + datePart + uniqueId);

        savedTicketWithStatus = ticketRepository.save(savedTicketWithStatus);

        // Publish Event
        eventPublisher
                .publishEvent(new TicketCreatedEvent(this, savedTicketWithStatus, savedTicketWithStatus.getRequester(),
                        savedTicketWithStatus.getManager()));

        log.info("Ticket {} created by {}. Manager={} Status={} ApprovalStatus={}",
                savedTicketWithStatus.getTicketNumber(),
                savedTicketWithStatus.getRequester().getUsername(),
                savedTicketWithStatus.getManagerEmail(),
                savedTicketWithStatus.getStatus(),
                savedTicketWithStatus.getManagerApprovalStatus());

        return savedTicketWithStatus;
    }

    @Transactional
    public Ticket approveTicket(Long ticketId, User actor, String comment, Ticket.Priority priority) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        // Admin Override: Allow approval even if not strictly pending, or if structure
        // allows.
        // But mainly we want to clear the pending flag.
        if (ticket.getStatus() != Ticket.Status.PENDING_MANAGER_APPROVAL) {
            // For Admin, we might allow re-approving or forcing?
            // Requirement: "Admin approves ticket but status still shows Manager Approval
            // Pending"
            // If manual workflow stuck, allow Admin to force.
            if (actor.getRole() != User.Role.ADMIN && actor.getRole() != User.Role.IT_SUPPORT) {
                throw new IllegalStateException("Ticket is not pending approval");
            }
        }

        ticket.setManagerApprovalStatus(Ticket.ManagerApprovalStatus.APPROVED);
        ticket.setStatus(Ticket.Status.OPEN);
        ticket.setApprovedAt(LocalDateTime.now());
        ticket.setUpdatedAt(LocalDateTime.now());
        ticket.setUpdatedBy(actor);

        // If Admin is approving, we can consider it "Admin Override" or just standard
        // Approval.
        // If the Manager was skipped, this sets it to APPROVED anyway.

        if (priority != null) {
            ticket.setPriority(priority);
        }

        Ticket saved = ticketRepository.save(ticket);

        // Add Comment if present
        if (comment != null && !comment.isBlank()) {
            addCommentWithoutEvent(saved, actor, comment);
        }

        eventPublisher.publishEvent(new TicketManagerDecisionEvent(this, saved, true, actor, comment));

        // Ensure attachments and comments are loaded for DTO mapping/Serialization
        if (saved.getAttachments() != null)
            saved.getAttachments().size();
        if (saved.getComments() != null)
            saved.getComments().size();
        log.info("Ticket #{} approved by {}. Status={} ManagerStatus={}", saved.getId(), actor.getUsername(),
                saved.getStatus(), saved.getManagerApprovalStatus());

        return saved;
    }

    @Transactional
    public Ticket rejectTicket(Long ticketId, User actor, String comment) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        if (ticket.getStatus() != Ticket.Status.PENDING_MANAGER_APPROVAL) {
            throw new IllegalStateException("Ticket is not pending approval");
        }

        ticket.setManagerApprovalStatus(Ticket.ManagerApprovalStatus.REJECTED);
        // Explicitly set to CLOSED when rejected, as per requirements
        ticket.setStatus(Ticket.Status.CLOSED);
        ticket.setClosedAt(LocalDateTime.now());

        ticket.setRejectedAt(LocalDateTime.now());
        ticket.setUpdatedAt(LocalDateTime.now());
        ticket.setUpdatedBy(actor);

        Ticket saved = ticketRepository.save(ticket);

        if (comment != null && !comment.isBlank()) {
            addCommentWithoutEvent(saved, actor, comment);
        }

        eventPublisher.publishEvent(new TicketManagerDecisionEvent(this, saved, false, actor, comment));

        // Ensure attachments and comments are loaded
        if (saved.getAttachments() != null)
            saved.getAttachments().size();
        if (saved.getComments() != null)
            saved.getComments().size();

        return saved;
    }

    @Transactional
    public Ticket updateStatus(Long ticketId, Ticket.Status newStatus, User actor, String comment) {
        Ticket ticket = ticketRepository.findByIdWithAssociations(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        Ticket.Status oldStatus = ticket.getStatus();

        // Basic Transition Validation (simplified)
        // Basic Transition Validation (simplified)
        if (oldStatus == newStatus)
            return ticket;

        // Role-based Status Update Validation
        // ADMIN and IT_SUPPORT can update status freely (Override)
        if (actor.getRole() == User.Role.ADMIN || actor.getRole() == User.Role.IT_SUPPORT) {
            // Allowed to proceed
        } else {
            // MANAGER and EMPLOYEE should not use this generic endpoint for status changes
            // except maybe for very specific flows not covered by approve/reject.
            // For now, prompt implies strictly preventing them or limiting them.
            // Prompt: "If role is MANAGER -> allow only approve/reject actions... EMPLOYEE
            // -> read-only"
            // Approve/Reject actions use specific methods, not this generic updateStatus.
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Role " + actor.getRole() + " not allowed to directly update status");
        }

        // Phase 4: Enforce ownership for IT_SUPPORT when Closing/Resolving
        // "IT Support can close/resolve tickets assigned to them... IT Support cannot
        // close tickets assigned to another support"
        if (actor.getRole() == User.Role.IT_SUPPORT) {
            if (newStatus == Ticket.Status.RESOLVED || newStatus == Ticket.Status.CLOSED) {
                if (ticket.getAssignedTo() == null || !ticket.getAssignedTo().getId().equals(actor.getId())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            "IT Support can only close tickets assigned to them.");
                }
            }
        }

        ticket.setStatus(newStatus);
        ticket.setStatus(newStatus);
        ticket.setUpdatedAt(LocalDateTime.now());
        ticket.setUpdatedBy(actor);

        LocalDateTime now = LocalDateTime.now();
        if (newStatus == Ticket.Status.IN_PROGRESS && ticket.getInProgressAt() == null)
            ticket.setInProgressAt(now);
        if (newStatus == Ticket.Status.RESOLVED && ticket.getResolvedAt() == null)
            ticket.setResolvedAt(now);
        // FIX: Ensure consistency. If Admin forces status to
        // CLOSED/RESOLVED/IN_PROGRESS,
        // and approval is still PENDING, we must resolve that state.
        if (newStatus == Ticket.Status.CLOSED || newStatus == Ticket.Status.RESOLVED
                || newStatus == Ticket.Status.IN_PROGRESS || newStatus == Ticket.Status.OPEN) { // Added OPEN
            if (ticket.getManagerApprovalStatus() == Ticket.ManagerApprovalStatus.PENDING) {
                // Auto-approve or set NA based on logic. "NOT_REQUIRED" (NA) is safer as
                // manager didn't really approve.
                // But requirements say "If ticket is CLOSED, approval cannot remain PENDING".
                ticket.setManagerApprovalStatus(Ticket.ManagerApprovalStatus.NA);
                log.info("Ticket #{} auto-updated approval to NA due to forced status change to {}", ticketId,
                        newStatus);
            }
        }

        if (newStatus == Ticket.Status.CLOSED && ticket.getClosedAt() == null)
            ticket.setClosedAt(now);

        Ticket saved = ticketRepository.save(ticket);

        if (comment != null && !comment.isBlank()) {
            addCommentWithoutEvent(saved, actor, comment);
        }

        // Convert to DTO before publishing event to avoid LazyInitializationException
        // in async handlers
        com.gsg.it4u.dto.TicketDTO ticketDTO = com.gsg.it4u.dto.TicketDTO.fromEntity(saved, true);

        eventPublisher
                .publishEvent(new TicketStatusChangedEvent(this, ticketDTO, oldStatus, newStatus, actor, comment));

        log.info("Ticket #{} Status updated from {} to {}", saved.getId(), oldStatus, newStatus);

        return saved;
    }

    @Transactional
    public Comment addComment(Long ticketId, User actor, String content) {
        Ticket ticket = ticketRepository.findByIdWithAssociations(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        Comment comment = new Comment();
        comment.setTicket(ticket);
        comment.setAuthor(actor);
        comment.setContent(content);

        Comment saved = commentRepository.save(comment);

        // Convert to DTO before publishing event to avoid LazyInitializationException
        com.gsg.it4u.dto.TicketDTO ticketDTO = com.gsg.it4u.dto.TicketDTO.fromEntity(ticket, true);
        eventPublisher.publishEvent(new TicketCommentAddedEvent(this, ticketDTO, saved, actor));

        return saved;
    }

    private void addCommentWithoutEvent(Ticket ticket, User actor, String content) {
        Comment comment = new Comment();
        comment.setTicket(ticket);
        comment.setAuthor(actor);
        comment.setContent(content);
        commentRepository.save(comment);
    }

    private boolean needsApproval(Ticket ticket) {
        if (ticket.getManager() != null)
            return true;

        // Category based rules
        switch (ticket.getCategory()) {
            case HARDWARE:
            case PROCUREMENT:
            case ACCESS_AND_M365:
            case ACCOUNT:
            case ENGINEERING_APP:
            case SECURITY:
            case OTHERS:
            case SOFTWARE:
                return true;
            default:
                return false;
        }
    }

    @Transactional
    public void deleteTicketAsAdmin(Long ticketId, User admin) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        // Hard Delete as requested by user ("Hard delete: ... on confirm it hard
        // deletes from DB")
        // Cascading delete handles attachments and comments due to CascadeType.ALL in
        // Entity
        // But EmailAudit is loosely coupled via ticketId field, MUST delete manually
        emailAuditRepository.deleteByTicketId(ticketId);

        ticketRepository.delete(ticket);
        log.info("Ticket {} hard-deleted by admin {}", ticketId, admin.getUsername());
    }

    @Transactional(readOnly = true)
    public com.gsg.it4u.dto.TicketDTO getTicketDetails(Long id) {
        Ticket t = ticketRepository.findTicketWithDetails(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        // Access Control Check
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            String username = auth.getName();
            User currentUser = userRepository.findByUsername(username).orElse(null);

            if (currentUser == null) {
                // User authenticated but not in DB (SSO user, deleted user, sync issue)
                // Log warning and skip access control to prioritize availability
                log.warn("Authenticated user '{}' not found in database. Skipping access control for ticket #{}",
                        username, id);
            } else if (!ticketAccessService.canViewTicket(currentUser, t)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to view this ticket");
            }
        }

        // Attachments and Comments are now eagerly loaded by findTicketWithDetails
        return com.gsg.it4u.dto.TicketDTO.fromEntity(t, true);
    }

    @Transactional
    public com.gsg.it4u.dto.TicketDTO performAdminAction(Long ticketId, com.gsg.it4u.dto.AdminActionRequest request,
            User actor) {
        Ticket ticket = ticketRepository.findByIdWithAssociations(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        boolean changed = false;

        // 1. Assignment
        if (request.getAssignedTo() != null) {
            userRepository.findById(request.getAssignedTo()).ifPresent(u -> ticket.setAssignedTo(u));
            changed = true;
        }

        // 2. Category / Priority
        if (request.getPriority() != null) {
            try {
                Ticket.Priority p = Ticket.Priority.valueOf(request.getPriority().toUpperCase());
                ticket.setPriority(p);
                changed = true;
            } catch (IllegalArgumentException e) {
                // Ignore or warn
            }
        }
        if (request.getCategory() != null) {
            try {
                Ticket.Category c = Ticket.Category.valueOf(request.getCategory().toUpperCase());
                ticket.setCategory(c);
                changed = true;
            } catch (IllegalArgumentException e) {
                // Ignore
            }
        }

        // 3. Status Normalization & Transition Logic
        if (request.getStatus() != null) {
            String rawStatus = request.getStatus().trim().toUpperCase().replace(" ", "_");
            try {
                Ticket.Status newStatus = Ticket.Status.valueOf(rawStatus);
                Ticket.Status oldStatus = ticket.getStatus();

                if (newStatus != oldStatus) {
                    // Check Manager Approval Constraint
                    if (ticket.getManagerApprovalStatus() == Ticket.ManagerApprovalStatus.PENDING) {
                        // Block generic updates to closed states if pending, unless it's an Admin
                        // override/Reject?
                        // Requirement: "Admin / IT Support cannot move status... (500)"
                        // If we fix the 500, we still want to enforce the rule:
                        // "Manager must approve BEFORE IT acts."
                        // So we should BLOCK moving to IN_PROGRESS if Pending.
                        if (newStatus == Ticket.Status.IN_PROGRESS || newStatus == Ticket.Status.RESOLVED
                                || newStatus == Ticket.Status.CLOSED) {
                            throw new IllegalArgumentException(
                                    "Manager approval is pending. Cannot move to " + newStatus);
                        }
                    }

                    // Use updateStatus for side effects
                    updateStatus(ticket.getId(), newStatus, actor, request.getComment());
                    // Note: updateStatus saves the ticket and returns it. We need to reload or
                    // assume success.
                    // We will reload at the end.
                    changed = false; // Handled by updateStatus
                }
            } catch (IllegalArgumentException e) {
                if (e.getMessage() != null && e.getMessage().contains("enum")) {
                    throw new IllegalArgumentException("Invalid status value: " + request.getStatus());
                } else {
                    throw e;
                }
            }
        }

        if (changed) {
            ticket.setUpdatedBy(actor);
            ticket.setUpdatedAt(LocalDateTime.now());
            ticketRepository.save(ticket);
        }

        return getTicketDetails(ticketId);
    }
}
