package com.gsg.it4u.api;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleResponseStatusException(ResponseStatusException ex,
            HttpServletRequest request) {
        log.warn("API Error: {} - {}", ex.getStatusCode(), ex.getReason());

        ApiError error = ApiError.builder()
                .status(ex.getStatusCode().value())
                .error(HttpStatus.resolve(ex.getStatusCode().value()) != null
                        ? HttpStatus.resolve(ex.getStatusCode().value()).getReasonPhrase()
                        : "Error")
                .message(ex.getReason())
                .path(request.getRequestURI())
                .requestId(MDC.get("requestId"))
                .build();

        return new ResponseEntity<>(error, ex.getStatusCode());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidationExceptions(MethodArgumentNotValidException ex,
            HttpServletRequest request) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> errors.put(error.getField(), error.getDefaultMessage()));

        log.warn("Validation Error on {}: {}", request.getRequestURI(), errors);

        ApiError error = ApiError.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Validation Error")
                .message("Input validation failed")
                .path(request.getRequestURI())
                .requestId(MDC.get("requestId"))
                .validationErrors(errors)
                .build();

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        log.warn("Access Denied: {}", ex.getMessage());

        ApiError error = ApiError.builder()
                .status(HttpStatus.FORBIDDEN.value())
                .error("Forbidden")
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .requestId(MDC.get("requestId"))
                .build();

        return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGenericException(Exception ex, HttpServletRequest request) {
        String requestId = MDC.get("requestId");
        log.error("Internal Server Error [RequestId: {}]: ", requestId, ex);

        ApiError error = ApiError.builder()
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error("Internal Server Error")
                .message("An unexpected error occurred. Please contact support with Request ID: " + requestId)
                .path(request.getRequestURI())
                .requestId(requestId)
                .build();

        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
