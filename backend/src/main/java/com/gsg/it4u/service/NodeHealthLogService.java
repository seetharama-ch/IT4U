package com.gsg.it4u.service;

import com.gsg.it4u.entity.NodeHealthLog;
import com.gsg.it4u.entity.ServiceNode;
import com.gsg.it4u.repository.NodeHealthLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class NodeHealthLogService {

    @Autowired
    private NodeHealthLogRepository nodeHealthLogRepository;

    @Autowired
    private ServiceNodeService serviceNodeService;

    public List<NodeHealthLog> getAllHealthLogs() {
        return nodeHealthLogRepository.findAll();
    }

    public List<NodeHealthLog> getHealthLogsByServiceNode(ServiceNode serviceNode) {
        return nodeHealthLogRepository.findByServiceNode(serviceNode);
    }

    public List<NodeHealthLog> getHealthLogsByServiceNodeId(Long serviceNodeId) {
        ServiceNode serviceNode = serviceNodeService.getServiceNodeById(serviceNodeId)
                .orElseThrow(() -> new RuntimeException("Service node not found"));
        return nodeHealthLogRepository.findByServiceNodeOrderByCheckTimeDesc(serviceNode);
    }

    public NodeHealthLog createHealthLog(NodeHealthLog healthLog) {
        return nodeHealthLogRepository.save(healthLog);
    }

    public NodeHealthLog logHealthCheck(Long serviceNodeId, String status, Integer responseTime,
                                       String errorMessage, String details, String checkedBy) {
        ServiceNode serviceNode = serviceNodeService.getServiceNodeById(serviceNodeId)
                .orElseThrow(() -> new RuntimeException("Service node not found"));

        NodeHealthLog healthLog = new NodeHealthLog();
        healthLog.setServiceNode(serviceNode);
        healthLog.setCheckTime(LocalDateTime.now());
        healthLog.setStatus(status);
        healthLog.setResponseTime(responseTime);
        healthLog.setErrorMessage(errorMessage);
        healthLog.setDetails(details);
        healthLog.setCheckedBy(checkedBy);

        // Update the service node's health status and last check time
        serviceNode.setHealthStatus(status);
        serviceNode.setLastHealthCheck(healthLog.getCheckTime());
        serviceNodeService.updateServiceNode(serviceNode);

        return nodeHealthLogRepository.save(healthLog);
    }

    public List<NodeHealthLog> getRecentHealthLogs(Long serviceNodeId, int hours) {
        ServiceNode serviceNode = serviceNodeService.getServiceNodeById(serviceNodeId)
                .orElseThrow(() -> new RuntimeException("Service node not found"));

        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return nodeHealthLogRepository.findRecentLogsByServiceNode(serviceNode, since);
    }

    public Long getCriticalLogsCount(Long serviceNodeId, int hours) {
        ServiceNode serviceNode = serviceNodeService.getServiceNodeById(serviceNodeId)
                .orElseThrow(() -> new RuntimeException("Service node not found"));

        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return nodeHealthLogRepository.countCriticalLogsSince(serviceNode, since);
    }

    public Map<String, Long> getHealthStatusSummary(int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return nodeHealthLogRepository.countLogsByStatusSince(since).stream()
                .collect(Collectors.toMap(
                        obj -> (String) obj[0],
                        obj -> (Long) obj[1]
                ));
    }
}
