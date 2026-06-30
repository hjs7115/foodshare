package com.hjs.foodshare.upload.service;

import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.upload.dto.ImageUploadResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImageUploadService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");

    private final Path uploadPath;

    public ImageUploadService(@Value("${app.upload.dir:uploads}") String uploadDir) {
        this.uploadPath = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    public ImageUploadResponse upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Image file is required.");
        }
        if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Only jpeg, png, webp, and gif images are allowed.");
        }

        try {
            Files.createDirectories(uploadPath);
            String originalFilename = file.getOriginalFilename() == null ? "image" : file.getOriginalFilename();
            String extension = getExtension(originalFilename);
            String storedFilename = UUID.randomUUID() + extension;
            Path target = uploadPath.resolve(storedFilename).normalize();
            file.transferTo(target);

            return new ImageUploadResponse("/uploads/" + storedFilename, originalFilename, file.getSize());
        } catch (IOException exception) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload image.");
        }
    }

    private String getExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex < 0) {
            return "";
        }
        return filename.substring(dotIndex).toLowerCase();
    }
}
