package com.gsg.it4u.dto;

import java.time.LocalDateTime;

public record TicketCommentDto(
                Long id,
                String content,
                UserDTO author,
                LocalDateTime createdAt) {
}
