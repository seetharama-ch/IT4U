package com.gsg.it4u.dto;

import java.time.LocalDateTime;

public record TicketAttachmentDto(
        Long id,
        String fileName,
        String contentType,
        long size,
        LocalDateTime uploadedAt) {
}
