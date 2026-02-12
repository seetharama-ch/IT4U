package com.gsg.it4u.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
public class RequestIdFilter implements Filter {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String MDC_KEY = "requestId";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        try {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            HttpServletResponse httpResponse = (HttpServletResponse) response;

            String requestId = httpRequest.getHeader(REQUEST_ID_HEADER);
            if (requestId == null || requestId.isEmpty()) {
                requestId = UUID.randomUUID().toString();
            }

            MDC.put(MDC_KEY, requestId);
            // Add to response header
            httpResponse.setHeader(REQUEST_ID_HEADER, requestId);

            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }
}
