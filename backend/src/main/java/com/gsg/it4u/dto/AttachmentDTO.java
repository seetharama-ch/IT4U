package com.gsg.it4u.dto;

import com.gsg.it4u.entity.Attachment;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AttachmentDTO {
    private Long id;
    private String originalFileName;
    private Long sizeBytes;
    private String contentType;
    private Long uploadedById;
    private String uploadedByName;
    private LocalDateTime uploadedAt;

    public static AttachmentDTO fromEntity(Attachment attachment) {
        return AttachmentDTO.builder()
                .id(attachment.getId())
                .originalFileName(attachment.getOriginalFileName())
                .sizeBytes(attachment.getSizeBytes())
                .contentType(attachment.getContentType())
                .uploadedById(attachment.getUploadedBy() != null ? attachment.getUploadedBy().getId() : null)
                .uploadedByName(attachment.getUploadedBy() != null ? attachment.getUploadedBy().getFullName() : null)
                .uploadedAt(attachment.getUploadedAt())
                .build();
    }
}
