package com.gsg.it4u.config;

import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class CorrelationIdFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(CorrelationIdFilter.class);
    private static final String CORRELATION_ID_HEADER = "X-Correlation-Id";
    private static final String CORRELATION_ID_LOG_VAR = "cid";

    @Override
    protected void doFilterInternal(@org.springframework.lang.NonNull HttpServletRequest request,
            @org.springframework.lang.NonNull HttpServletResponse response,
            @org.springframework.lang.NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String correlationId = request.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null || correlationId.isEmpty()) {
            correlationId = UUID.randomUUID().toString();
        }

        MDC.put(CORRELATION_ID_LOG_VAR, correlationId);
        response.setHeader(CORRELATION_ID_HEADER, correlationId);

        // Log request summary
        String user = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "anonymous";
        log.info("Request: method={} path={} user={}", request.getMethod(), request.getRequestURI(), user);

        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(CORRELATION_ID_LOG_VAR);
        }
    }
}
