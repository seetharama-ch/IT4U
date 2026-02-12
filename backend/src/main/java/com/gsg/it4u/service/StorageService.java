package com.gsg.it4u.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class StorageService {

    @Value("${it4u.attachments.base-path:./storage/attachments}")
    private String basePath;

    public void init() {
        try {
            Files.createDirectories(Paths.get(basePath));
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage", e);
        }
    }

    public String store(MultipartFile file, Long ticketId) throws IOException {
        // Create ticket specific folder
        Path ticketDir = Paths.get(basePath, String.valueOf(ticketId));
        if (!Files.exists(ticketDir)) {
            Files.createDirectories(ticketDir);
        }

        // Generate secure random name
        String storedFileName = UUID.randomUUID().toString();
        Path destinationFile = ticketDir.resolve(storedFileName);

        Files.copy(file.getInputStream(), destinationFile);

        return storedFileName;
    }

    public Path load(Long ticketId, String storedFileName) {
        return Paths.get(basePath, String.valueOf(ticketId)).resolve(storedFileName);
    }

    public void delete(Long ticketId, String storedFileName) {
        try {
            Path file = load(ticketId, storedFileName);
            Files.deleteIfExists(file);
        } catch (IOException e) {
            // Log but don't fail hard
            e.printStackTrace();
        }
    }
}
