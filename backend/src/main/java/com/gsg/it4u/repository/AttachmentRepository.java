package com.gsg.it4u.repository;

import com.gsg.it4u.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByTicketIdAndDeletedFalse(Long ticketId);
}
