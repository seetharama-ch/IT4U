package com.gsg.it4u.repository;

import com.gsg.it4u.entity.EmailAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface EmailAuditRepository extends JpaRepository<EmailAudit, Long>, JpaSpecificationExecutor<EmailAudit> {
    List<EmailAudit> findTop50ByOrderByCreatedAtDesc();

    @Modifying
    @Transactional
    @Query("DELETE FROM EmailAudit e WHERE e.ticketId = :ticketId")
    void deleteByTicketId(@Param("ticketId") Long ticketId);
}
