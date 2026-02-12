package com.gsg.it4u.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(name = "AdminActionRequest", description = "Request payload for Admin/IT Support actions on a ticket. " +
        "Supports assignment, status transitions, priority updates, and optional comment.")
public class AdminActionRequest {

    @Schema(description = "Target status (enum string). Allowed values: OPEN, IN_PROGRESS, RESOLVED, CLOSED. " +
            "UI labels like 'Closed' or 'In Progress' are normalized server-side.", example = "IN_PROGRESS", allowableValues = {
                    "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED" })
    private String status; // Accepts "OPEN", "Open", "IN_PROGRESS", "In Progress" etc.

    @Schema(description = "Ticket priority (optional). If provided, updates ticket priority.", example = "HIGH", allowableValues = {
            "LOW", "MEDIUM", "HIGH", "CRITICAL" })
    private String priority;

    @Schema(description = "Username/login ID of the IT Support user to assign the ticket to. " +
            "Optional. If provided, assignment will be updated.", example = "219")
    private Long assignedTo; // User ID

    @Schema(description = "Category of the ticket (optional).", example = "HARDWARE", allowableValues = { "HARDWARE",
            "SOFTWARE", "NETWORK", "ACCESS_AND_M365", "PROCUREMENT", "OTHERS" })
    private String category;

    @Schema(description = "Optional comment to add into the ticket discussion thread as part of this action.", example = "Starting investigation")
    @Size(max = 2000, message = "Comment must be <= 2000 characters")
    private String comment; // Optional comment
}
