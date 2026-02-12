package com.gsg.it4u.controller;

import com.gsg.it4u.entity.NodeHealthLog;
import com.gsg.it4u.service.NodeHealthLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/health-logs")
@CrossOrigin(origins = "http://localhost:5173")
public class NodeHealthLogController {

    @Autowired
    private NodeHealthLogService nodeHealthLogService;

    @GetMapping
    public List<NodeHealthLog> getAllHealthLogs() {
        return nodeHealthLogService.getAllHealthLogs();
    }

    @GetMapping("/node/{serviceNodeId}")
    public List<NodeHealthLog> getHealthLogsByServiceNodeId(@PathVariable Long serviceNodeId) {
        return nodeHealthLogService.getHealthLogsByServiceNodeId(serviceNodeId);
    }

    @PostMapping
    public NodeHealthLog createHealthLog(@RequestBody NodeHealthLog healthLog) {
        return nodeHealthLogService.createHealthLog(healthLog);
    }

    @PostMapping("/check/{serviceNodeId}")
    public NodeHealthLog logHealthCheck(@PathVariable Long serviceNodeId,
                                       @RequestParam String status,
                                       @RequestParam(required = false) Integer responseTime,
                                       @RequestParam(required = false) String errorMessage,
                                       @RequestParam(required = false) String details,
                                       @RequestParam(defaultValue = "SYSTEM") String checkedBy) {
        return nodeHealthLogService.logHealthCheck(serviceNodeId, status, responseTime,
                                                  errorMessage, details, checkedBy);
    }

    @GetMapping("/node/{serviceNodeId}/recent")
    public List<NodeHealthLog> getRecentHealthLogs(@PathVariable Long serviceNodeId,
                                                  @RequestParam(defaultValue = "24") int hours) {
        return nodeHealthLogService.getRecentHealthLogs(serviceNodeId, hours);
    }

    @GetMapping("/node/{serviceNodeId}/critical-count")
    public Long getCriticalLogsCount(@PathVariable Long serviceNodeId,
                                    @RequestParam(defaultValue = "24") int hours) {
        return nodeHealthLogService.getCriticalLogsCount(serviceNodeId, hours);
    }

    @GetMapping("/stats/summary")
    public Map<String, Long> getHealthStatusSummary(@RequestParam(defaultValue = "24") int hours) {
        return nodeHealthLogService.getHealthStatusSummary(hours);
    }
}
