package com.gsg.it4u.dto;

import com.gsg.it4u.entity.Ticket;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
public class TicketDTO {
        private Long id;
        private String ticketNumber;
        private String title;
        private String description;
        private String status;
        private String priority;
        private String category;
        private String subCategory;
        private String slaStatus;
        private LocalDateTime slaDeadline;
        private String softwareName;
        private String softwareVersion;
        private String deviceDetails;
        private String employeeId;
        private String domain;
        private String requestType;
        private String newUserDetails;
        private String managerName;
        private String managerEmail;
        private String managerApprovalStatus;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime approvedAt;
        private LocalDateTime rejectedAt;
        private LocalDateTime inProgressAt;
        private LocalDateTime resolvedAt;
        private LocalDateTime closedAt;

        private Long updatedById;
        private String updatedByName;
        private String updatedByRole;
        private String updatedByEmail;

        // User info - Nested Objects for Frontend Compatibility
        private UserDTO requester;
        private UserDTO manager;
        private UserDTO assignedTo;

        // Collections
        private List<AttachmentDTO> attachments;
        private List<TicketCommentDto> comments;

        private Long raisedById;
        private String raisedByName;
        private String raisedByEmail;

        private Long managerAssignedId;
        private String managerAssignedName;
        private String managerAssignedEmail;

        public static TicketDTO fromEntity(Ticket ticket) {
                return fromEntity(ticket, true);
        }

        public static TicketDTO fromEntity(Ticket ticket, boolean includeAttachments) {
                return TicketDTO.builder()
                                .id(ticket.getId())
                                .ticketNumber(ticket.getTicketNumber())
                                .title(ticket.getTitle())
                                .description(ticket.getDescription())
                                .status(ticket.getStatus() != null ? ticket.getStatus().name() : null)
                                .priority(ticket.getPriority() != null ? ticket.getPriority().name() : null)
                                .category(ticket.getCategory() != null ? ticket.getCategory().name() : null)
                                .subCategory(ticket.getSubCategory())
                                .slaStatus(ticket.getSlaStatus() != null ? ticket.getSlaStatus().name() : null)
                                .slaDeadline(ticket.getSlaDeadline())
                                .softwareName(ticket.getSoftwareName())
                                .softwareVersion(ticket.getSoftwareVersion())
                                .deviceDetails(ticket.getDeviceDetails())
                                .employeeId(ticket.getEmployeeId())
                                .domain(ticket.getDomain())
                                .requestType(ticket.getRequestType())
                                .newUserDetails(ticket.getNewUserDetails())
                                .managerName(ticket.getManagerName()) // Keeps flattened name if just name was stored
                                .managerEmail(ticket.getManagerEmail())
                                .managerApprovalStatus(
                                                ticket.getManagerApprovalStatus() != null
                                                                ? ticket.getManagerApprovalStatus().name()
                                                                : null)
                                .createdAt(ticket.getCreatedAt())
                                .updatedAt(ticket.getUpdatedAt())
                                .approvedAt(ticket.getApprovedAt())
                                .rejectedAt(ticket.getRejectedAt())
                                .inProgressAt(ticket.getInProgressAt())
                                .resolvedAt(ticket.getResolvedAt())
                                .closedAt(ticket.getClosedAt())

                                .updatedById(ticket.getUpdatedBy() != null ? ticket.getUpdatedBy().getId() : null)
                                .updatedByName(ticket.getUpdatedBy() != null ? ticket.getUpdatedBy().getFullName()
                                                : null)
                                .updatedByRole(ticket.getUpdatedBy() != null ? ticket.getUpdatedBy().getRole().name()
                                                : null)
                                .updatedByEmail(ticket.getUpdatedBy() != null ? ticket.getUpdatedBy().getEmail() : null)

                                // New Fields Mapping
                                .raisedById(ticket.getRequester() != null ? ticket.getRequester().getId() : null)
                                .raisedByName(ticket.getRequester() != null ? ticket.getRequester().getFullName()
                                                : null)
                                .raisedByEmail(ticket.getRequester() != null ? ticket.getRequester().getEmail() : null)

                                .managerAssignedId(ticket.getManager() != null ? ticket.getManager().getId() : null)
                                .managerAssignedName(ticket.getManager() != null ? ticket.getManager().getFullName()
                                                : null)
                                .managerAssignedEmail(
                                                ticket.getManager() != null ? ticket.getManager().getEmail() : null)

                                .requester(UserDTO.fromEntity(ticket.getRequester()))
                                .manager(UserDTO.fromEntity(ticket.getManager()))
                                .assignedTo(UserDTO.fromEntity(ticket.getAssignedTo()))
                                .attachments(includeAttachments && ticket.getAttachments() != null
                                                ? ticket.getAttachments().stream().map(AttachmentDTO::fromEntity)
                                                                .collect(Collectors.toList())
                                                : null)
                                .comments(includeAttachments && ticket.getComments() != null
                                                ? ticket.getComments().stream()
                                                                .map(c -> new TicketCommentDto(
                                                                                c.getId(),
                                                                                c.getContent(),
                                                                                UserDTO.fromEntity(c.getAuthor()),
                                                                                c.getCreatedAt()))
                                                                .collect(Collectors.toList())
                                                : null)
                                .build();
        }
}
