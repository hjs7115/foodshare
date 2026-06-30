package com.hjs.foodshare.upload.dto;

public record ImageUploadResponse(
        String imageUrl,
        String originalFilename,
        long size
) {
}
