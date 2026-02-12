package com.gsg.it4u.controller;

import com.gsg.it4u.entity.ServiceNode;
import com.gsg.it4u.service.ServiceNodeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/service-nodes")
@CrossOrigin(origins = "http://localhost:5173")
public class ServiceNodeController {

    @Autowired
    private ServiceNodeService serviceNodeService;

    @Autowired
    private com.gsg.it4u.service.HealthCheckService healthCheckService;

    @GetMapping
    public List<ServiceNode> getAllServiceNodes() {
        return serviceNodeService.getAllServiceNodes();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceNode> getServiceNodeById(@PathVariable Long id) {
        Optional<ServiceNode> serviceNode = serviceNodeService.getServiceNodeById(id);
        return serviceNode.map(ResponseEntity::ok)
                         .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/node/{nodeId}")
    public ResponseEntity<ServiceNode> getServiceNodeByNodeId(@PathVariable String nodeId) {
        Optional<ServiceNode> serviceNode = serviceNodeService.getServiceNodeByNodeId(nodeId);
        return serviceNode.map(ResponseEntity::ok)
                         .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ServiceNode createServiceNode(@RequestBody ServiceNode serviceNode) {
        return serviceNodeService.createServiceNode(serviceNode);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceNode> updateServiceNode(@PathVariable Long id,
                                                        @RequestBody ServiceNode serviceNode) {
        Optional<ServiceNode> existingNode = serviceNodeService.getServiceNodeById(id);
        if (existingNode.isPresent()) {
            serviceNode.setId(id);
            ServiceNode updatedNode = serviceNodeService.updateServiceNode(serviceNode);
            return ResponseEntity.ok(updatedNode);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteServiceNode(@PathVariable Long id) {
        Optional<ServiceNode> serviceNode = serviceNodeService.getServiceNodeById(id);
        if (serviceNode.isPresent()) {
            serviceNodeService.deleteServiceNode(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/status/{status}")
    public List<ServiceNode> getServiceNodesByStatus(@PathVariable String status) {
        return serviceNodeService.getServiceNodesByStatus(status);
    }

    @GetMapping("/type/{nodeType}")
    public List<ServiceNode> getServiceNodesByType(@PathVariable String nodeType) {
        return serviceNodeService.getServiceNodesByType(nodeType);
    }

    @GetMapping("/environment/{environment}")
    public List<ServiceNode> getServiceNodesByEnvironment(@PathVariable String environment) {
        return serviceNodeService.getServiceNodesByEnvironment(environment);
    }

    @GetMapping("/owner/{owner}")
    public List<ServiceNode> getServiceNodesByOwner(@PathVariable String owner) {
        return serviceNodeService.getServiceNodesByOwner(owner);
    }

    @GetMapping("/team/{team}")
    public List<ServiceNode> getServiceNodesByTeam(@PathVariable String team) {
        return serviceNodeService.getServiceNodesByTeam(team);
    }

    @GetMapping("/health/{healthStatus}")
    public List<ServiceNode> getServiceNodesByHealthStatus(@PathVariable String healthStatus) {
        return serviceNodeService.getServiceNodesByHealthStatus(healthStatus);
    }

    @GetMapping("/stats")
    public Map<String, Long> getNodeStatistics() {
        return serviceNodeService.getNodeStatistics();
    }

    @GetMapping("/stats/by-type")
    public Map<String, Long> getNodesByType() {
        return serviceNodeService.getNodesByType();
    }

    @GetMapping("/stats/by-environment")
    public Map<String, Long> getNodesByEnvironment() {
        return serviceNodeService.getNodesByEnvironment();
    }

    @PostMapping("/{id}/health-check")
    public ResponseEntity<String> triggerHealthCheck(@PathVariable Long id) {
        try {
            healthCheckService.triggerHealthCheck(id);
            return ResponseEntity.ok("Health check triggered successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to trigger health check: " + e.getMessage());
        }
    }

    @PostMapping("/bulk-health-check")
    public ResponseEntity<String> triggerBulkHealthCheck() {
        try {
            healthCheckService.triggerBulkHealthCheck();
            return ResponseEntity.ok("Bulk health check triggered successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to trigger bulk health check: " + e.getMessage());
        }
    }
}
