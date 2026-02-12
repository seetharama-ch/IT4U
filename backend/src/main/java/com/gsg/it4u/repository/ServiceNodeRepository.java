package com.gsg.it4u.repository;

import com.gsg.it4u.entity.ServiceNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceNodeRepository extends JpaRepository<ServiceNode, Long> {

    Optional<ServiceNode> findByNodeId(String nodeId);

    List<ServiceNode> findByStatus(String status);

    List<ServiceNode> findByNodeType(String nodeType);

    List<ServiceNode> findByEnvironment(String environment);

    List<ServiceNode> findByOwner(String owner);

    List<ServiceNode> findByTeam(String team);

    @Query("SELECT s FROM ServiceNode s WHERE s.healthStatus = :healthStatus")
    List<ServiceNode> findByHealthStatus(@Param("healthStatus") String healthStatus);

    @Query("SELECT COUNT(s) FROM ServiceNode s WHERE s.status = 'ACTIVE'")
    Long countActiveNodes();

    @Query("SELECT COUNT(s) FROM ServiceNode s WHERE s.healthStatus = 'CRITICAL'")
    Long countCriticalNodes();

    @Query("SELECT s.nodeType, COUNT(s) FROM ServiceNode s GROUP BY s.nodeType")
    List<Object[]> countNodesByType();

    @Query("SELECT s.environment, COUNT(s) FROM ServiceNode s GROUP BY s.environment")
    List<Object[]> countNodesByEnvironment();
}
