package com.gsg.it4u.dto;

import com.gsg.it4u.entity.Ticket;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class TicketReportDTO {
    private String ticketNumber;
    private String title;
    private String category;
    private String subCategory;
    private String status;
    private String managerApprovalStatus;
    private String priority;
    private String employeeName;
    private String employeeId;
    private String employeeEmail;
    private String managerName;
    private String assignedToName;
    private String deviceDetails;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String slaStatus;
    private String department;
    private String location;

    public static TicketReportDTO fromEntity(Ticket ticket) {
        return TicketReportDTO.builder()
                .ticketNumber(ticket.getTicketNumber())
                .title(ticket.getTitle())
                .category(ticket.getCategory() != null ? ticket.getCategory().name() : "")
                .subCategory(ticket.getSubCategory())
                .status(ticket.getStatus() != null ? ticket.getStatus().name() : "")
                .managerApprovalStatus(
                        ticket.getManagerApprovalStatus() != null ? ticket.getManagerApprovalStatus().name() : "")
                .priority(ticket.getPriority() != null ? ticket.getPriority().name() : "")
                .employeeName(ticket.getRequester() != null ? ticket.getRequester().getFullName() : "")
                .employeeId(ticket.getRequester() != null ? String.valueOf(ticket.getRequester().getId())
                        : ticket.getEmployeeId())
                .employeeEmail(ticket.getRequester() != null ? ticket.getRequester().getEmail() : "")
                .managerName(ticket.getManagerName())
                .assignedToName(ticket.getAssignedTo() != null ? ticket.getAssignedTo().getFullName() : "Unassigned")
                .deviceDetails(ticket.getDeviceDetails())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .slaStatus(ticket.getSlaStatus() != null ? ticket.getSlaStatus().name() : "")
                .department(ticket.getRequester() != null ? ticket.getRequester().getDepartment() : "")
                .location("") // Location not available in User entity
                .build();
    }
}
