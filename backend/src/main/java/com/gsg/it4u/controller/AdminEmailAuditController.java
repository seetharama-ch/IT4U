package com.gsg.it4u.controller;

import com.gsg.it4u.constant.EmailEventType;
import com.gsg.it4u.entity.EmailAudit;
import com.gsg.it4u.repository.EmailAuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/email-audit")
@RequiredArgsConstructor
public class AdminEmailAuditController {

    private final EmailAuditRepository emailAuditRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'IT_SUPPORT')")
    public ResponseEntity<Page<com.gsg.it4u.dto.EmailAuditDTO>> getEmailAudits(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) EmailEventType eventType,
            @RequestParam(required = false) Long ticketId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @PageableDefault(sort = "sentAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Specification<EmailAudit> spec = Specification.where(null);

        if (status != null && !status.isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (eventType != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("eventType"), eventType));
        }
        if (ticketId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("ticketId"), ticketId));
        }
        if (fromDate != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("sentAt"), fromDate));
        }
        if (toDate != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("sentAt"), toDate));
        }

        Page<EmailAudit> audits = emailAuditRepository.findAll(spec, pageable);
        return ResponseEntity.ok(audits.map(com.gsg.it4u.dto.EmailAuditDTO::fromEntity));
    }
}
