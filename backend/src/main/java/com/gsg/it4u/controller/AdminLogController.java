package com.gsg.it4u.controller;

import com.gsg.it4u.config.CircularLogAppender;
import com.gsg.it4u.dto.LogEntry;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/logs")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class AdminLogController {

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<LogEntry> getRecentLogs() {
        return CircularLogAppender.getLogs();
    }
}
