package com.gsg.it4u.service;

import com.gsg.it4u.entity.ServiceNode;
import com.gsg.it4u.repository.ServiceNodeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ServiceNodeService {

    @Autowired
    private ServiceNodeRepository serviceNodeRepository;

    public List<ServiceNode> getAllServiceNodes() {
        return serviceNodeRepository.findAll();
    }

    public Optional<ServiceNode> getServiceNodeById(Long id) {
        return serviceNodeRepository.findById(id);
    }

    public Optional<ServiceNode> getServiceNodeByNodeId(String nodeId) {
        return serviceNodeRepository.findByNodeId(nodeId);
    }

    public ServiceNode createServiceNode(ServiceNode serviceNode) {
        serviceNode.setCreatedAt(LocalDateTime.now());
        serviceNode.setUpdatedAt(LocalDateTime.now());
        return serviceNodeRepository.save(serviceNode);
    }

    public ServiceNode updateServiceNode(ServiceNode serviceNode) {
        serviceNode.setUpdatedAt(LocalDateTime.now());
        return serviceNodeRepository.save(serviceNode);
    }

    public void deleteServiceNode(Long id) {
        serviceNodeRepository.deleteById(id);
    }

    public List<ServiceNode> getServiceNodesByStatus(String status) {
        return serviceNodeRepository.findByStatus(status);
    }

    public List<ServiceNode> getServiceNodesByType(String nodeType) {
        return serviceNodeRepository.findByNodeType(nodeType);
    }

    public List<ServiceNode> getServiceNodesByEnvironment(String environment) {
        return serviceNodeRepository.findByEnvironment(environment);
    }

    public List<ServiceNode> getServiceNodesByOwner(String owner) {
        return serviceNodeRepository.findByOwner(owner);
    }

    public List<ServiceNode> getServiceNodesByTeam(String team) {
        return serviceNodeRepository.findByTeam(team);
    }

    public List<ServiceNode> getServiceNodesByHealthStatus(String healthStatus) {
        return serviceNodeRepository.findByHealthStatus(healthStatus);
    }

    public Map<String, Long> getNodeStatistics() {
        Map<String, Long> stats = new java.util.HashMap<>();
        stats.put("totalNodes", serviceNodeRepository.count());
        stats.put("activeNodes", serviceNodeRepository.countActiveNodes());
        stats.put("criticalNodes", serviceNodeRepository.countCriticalNodes());
        return stats;
    }

    public Map<String, Long> getNodesByType() {
        return serviceNodeRepository.countNodesByType().stream()
                .collect(Collectors.toMap(
                        obj -> (String) obj[0],
                        obj -> (Long) obj[1]
                ));
    }

    public Map<String, Long> getNodesByEnvironment() {
        return serviceNodeRepository.countNodesByEnvironment().stream()
                .collect(Collectors.toMap(
                        obj -> (String) obj[0],
                        obj -> (Long) obj[1]
                ));
    }
}
