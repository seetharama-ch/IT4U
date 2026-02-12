package com.gsg.it4u.dto;

import com.gsg.it4u.entity.Ticket;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Data
public class ReportFilter {
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime startDate;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime endDate;

    private Long managerId;
    private Long assignedToId;
    private Long employeeId; // Requester ID in DB

    private Ticket.Category category;
    private Ticket.Priority priority;
    private Ticket.Status status;
    private Ticket.ManagerApprovalStatus managerApprovalStatus;
}
