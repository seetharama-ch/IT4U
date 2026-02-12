package com.gsg.it4u.repository;

import com.gsg.it4u.entity.NodeHealthLog;
import com.gsg.it4u.entity.ServiceNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NodeHealthLogRepository extends JpaRepository<NodeHealthLog, Long> {

    List<NodeHealthLog> findByServiceNode(ServiceNode serviceNode);

    List<NodeHealthLog> findByServiceNodeAndStatus(ServiceNode serviceNode, String status);

    List<NodeHealthLog> findByServiceNodeOrderByCheckTimeDesc(ServiceNode serviceNode);

    @Query("SELECT n FROM NodeHealthLog n WHERE n.serviceNode = :serviceNode AND n.checkTime >= :since ORDER BY n.checkTime DESC")
    List<NodeHealthLog> findRecentLogsByServiceNode(@Param("serviceNode") ServiceNode serviceNode,
                                                   @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(n) FROM NodeHealthLog n WHERE n.serviceNode = :serviceNode AND n.status = 'CRITICAL' AND n.checkTime >= :since")
    Long countCriticalLogsSince(@Param("serviceNode") ServiceNode serviceNode,
                               @Param("since") LocalDateTime since);

    @Query("SELECT n.status, COUNT(n) FROM NodeHealthLog n WHERE n.checkTime >= :since GROUP BY n.status")
    List<Object[]> countLogsByStatusSince(@Param("since") LocalDateTime since);
}
