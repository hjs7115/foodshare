package com.hjs.foodshare.upload.controller;

import com.hjs.foodshare.global.response.ApiResponse;
import com.hjs.foodshare.upload.dto.ImageUploadResponse;
import com.hjs.foodshare.upload.service.ImageUploadService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/uploads")
public class ImageUploadController {

    private final ImageUploadService imageUploadService;

    public ImageUploadController(ImageUploadService imageUploadService) {
        this.imageUploadService = imageUploadService;
    }

    @PostMapping("/images")
    public ResponseEntity<ApiResponse<ImageUploadResponse>> uploadImage(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        MultipartFile uploadFile = file != null ? file : image;
        return ResponseEntity.ok(ApiResponse.ok("Image uploaded.", imageUploadService.upload(uploadFile)));
    }
}
