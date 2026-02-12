package com.gsg.it4u.repository;

import com.gsg.it4u.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {

        @org.springframework.data.jpa.repository.Query("select distinct t from Ticket t left join fetch t.attachments")
        List<Ticket> findAllWithAttachments();

        List<Ticket> findByRequesterId(Long requesterId);

        @org.springframework.data.jpa.repository.Query("select distinct t from Ticket t left join fetch t.attachments where t.requester.id = :requesterId")
        List<Ticket> findByRequesterIdWithAttachments(
                        @org.springframework.data.repository.query.Param("requesterId") Long requesterId);

        List<Ticket> findByAssignedToId(Long assignedToId);

        List<Ticket> findByManagerId(Long managerId);

        List<Ticket> findByManagerIdAndManagerApprovalStatus(Long managerId, Ticket.ManagerApprovalStatus status);

        @org.springframework.data.jpa.repository.Query("select distinct t from Ticket t left join fetch t.attachments where t.manager.id = :managerId")
        List<Ticket> findByManagerIdWithAttachments(
                        @org.springframework.data.repository.query.Param("managerId") Long managerId);

        @org.springframework.data.jpa.repository.Query("select distinct t from Ticket t left join fetch t.attachments where t.manager.id = :managerId and t.managerApprovalStatus = :status")
        List<Ticket> findByManagerIdAndManagerApprovalStatusWithAttachments(
                        @org.springframework.data.repository.query.Param("managerId") Long managerId,
                        @org.springframework.data.repository.query.Param("status") Ticket.ManagerApprovalStatus status);

        @org.springframework.data.jpa.repository.Query("select distinct t from Ticket t left join fetch t.attachments where t.manager.id = :managerId and t.managerApprovalStatus in :statuses order by t.updatedAt desc")
        List<Ticket> findByManagerIdAndManagerApprovalStatusInWithAttachments(
                        @org.springframework.data.repository.query.Param("managerId") Long managerId,
                        @org.springframework.data.repository.query.Param("statuses") java.util.List<Ticket.ManagerApprovalStatus> statuses);

        boolean existsByRequesterId(Long requesterId);

        boolean existsByAssignedToId(Long assignedToId);

        boolean existsByManagerId(Long managerId);

        @org.springframework.data.jpa.repository.Query("select distinct t from Ticket t left join fetch t.attachments where t.id = :id")
        java.util.Optional<Ticket> findByIdWithAttachments(
                        @org.springframework.data.repository.query.Param("id") Long id);

        @org.springframework.data.jpa.repository.Query("SELECT DISTINCT t FROM Ticket t LEFT JOIN FETCH t.attachments a LEFT JOIN FETCH t.comments c WHERE t.id = :id")
        java.util.Optional<Ticket> findTicketWithDetails(
                        @org.springframework.data.repository.query.Param("id") Long id);

        @org.springframework.data.jpa.repository.Query("SELECT t FROM Ticket t WHERE t.id = :id")
        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "comments", "comments.author",
                        "attachments", "attachments.uploadedBy", "assignedTo", "requester", "manager", "updatedBy" })
        java.util.Optional<Ticket> findByIdWithAssociations(
                        @org.springframework.data.repository.query.Param("id") Long id);
}
