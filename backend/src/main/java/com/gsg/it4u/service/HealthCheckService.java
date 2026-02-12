package com.gsg.it4u.service;

import com.gsg.it4u.entity.ServiceNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Service
public class HealthCheckService {

    @Autowired
    private ServiceNodeService serviceNodeService;

    @Autowired
    private NodeHealthLogService nodeHealthLogService;

    private final RestTemplate restTemplate = new RestTemplate();
    private final Random random = new Random();

    /**
     * Scheduled health check that runs every 5 minutes
     */
    @Scheduled(fixedRate = 300000) // 5 minutes = 300,000 milliseconds
    public void performScheduledHealthChecks() {
        List<ServiceNode> nodes = serviceNodeService.getServiceNodesByStatus("ACTIVE");

        for (ServiceNode node : nodes) {
            performHealthCheck(node);
        }
    }

    /**
     * Perform health check for a specific node
     */
    public void performHealthCheck(ServiceNode node) {
        String status = "UNKNOWN";
        Integer responseTime = null;
        String errorMessage = null;

        long startTime = System.currentTimeMillis();

        try {
            if (node.getHealthCheckUrl() != null && !node.getHealthCheckUrl().isEmpty()) {
                // Perform actual HTTP health check
                restTemplate.getForObject(node.getHealthCheckUrl(), String.class);
                status = "HEALTHY";
            } else {
                // Simulate health check for demo purposes
                status = simulateHealthCheck(node);
            }

            responseTime = (int) (System.currentTimeMillis() - startTime);

        } catch (RestClientException e) {
            status = "CRITICAL";
            errorMessage = e.getMessage();
            responseTime = (int) (System.currentTimeMillis() - startTime);
        } catch (Exception e) {
            status = "CRITICAL";
            errorMessage = "Unexpected error: " + e.getMessage();
            responseTime = (int) (System.currentTimeMillis() - startTime);
        }

        // Log the health check result
        nodeHealthLogService.logHealthCheck(
            node.getId(),
            status,
            responseTime,
            errorMessage,
            "Automated health check",
            "SYSTEM"
        );
    }

    /**
     * Simulate health check for demo purposes
     * In a real application, this would be replaced with actual health checks
     */
    private String simulateHealthCheck(ServiceNode node) {
        // Simulate different health states based on node properties
        double randomValue = random.nextDouble();

        // Simulate occasional failures
        if (randomValue < 0.05) { // 5% chance of critical failure
            return "CRITICAL";
        } else if (randomValue < 0.15) { // 10% chance of warning
            return "WARNING";
        } else {
            return "HEALTHY";
        }
    }

    /**
     * Manual health check trigger
     */
    public void triggerHealthCheck(Long nodeId) {
        ServiceNode node = serviceNodeService.getServiceNodeById(nodeId)
                .orElseThrow(() -> new RuntimeException("Service node not found"));

        performHealthCheck(node);
    }

    /**
     * Bulk health check for all active nodes
     */
    public void triggerBulkHealthCheck() {
        List<ServiceNode> nodes = serviceNodeService.getServiceNodesByStatus("ACTIVE");

        for (ServiceNode node : nodes) {
            performHealthCheck(node);
        }
    }
}
