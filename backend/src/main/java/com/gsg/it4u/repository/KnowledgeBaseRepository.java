package com.gsg.it4u.repository;

import com.gsg.it4u.entity.KnowledgeBaseArticle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBaseArticle, Long> {
}
