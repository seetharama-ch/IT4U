package com.gsg.it4u.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiError {
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    private int status;
    private String error;
    private String message;
    private String path;
    private String requestId;

    private Map<String, String> validationErrors;
}
