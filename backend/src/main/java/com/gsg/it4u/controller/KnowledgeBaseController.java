package com.gsg.it4u.controller;

import com.gsg.it4u.entity.KnowledgeBaseArticle;
import com.gsg.it4u.repository.KnowledgeBaseRepository;
import com.gsg.it4u.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/kb")
@CrossOrigin(origins = "http://localhost:5173")
public class KnowledgeBaseController {

    @Autowired
    private KnowledgeBaseRepository knowledgeBaseRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public List<KnowledgeBaseArticle> getAllArticles() {
        return knowledgeBaseRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<KnowledgeBaseArticle> createArticle(@RequestBody KnowledgeBaseArticle article) {
        // In a real app, verify user is Admin/Support from Security Context
        if (article.getAuthor() != null && article.getAuthor().getId() != null) {
            article.setAuthor(userRepository.findById(article.getAuthor().getId()).orElse(null));
        }
        return ResponseEntity.ok(knowledgeBaseRepository.save(article));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable Long id) {
        knowledgeBaseRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
