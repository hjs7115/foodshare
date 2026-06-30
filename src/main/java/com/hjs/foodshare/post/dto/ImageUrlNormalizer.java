package com.hjs.foodshare.post.dto;

import java.net.URI;
import java.net.URISyntaxException;

final class ImageUrlNormalizer {

    private static final int MAX_IMAGE_URL_LENGTH = 500;
    private static final String UPLOADS_PREFIX = "/uploads/";

    private ImageUrlNormalizer() {
    }

    static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String trimmed = value.trim();
        if (trimmed.startsWith("data:image/") || trimmed.length() > MAX_IMAGE_URL_LENGTH) {
            return null;
        }

        String path = extractPath(trimmed);
        if (path.startsWith("uploads/")) {
            path = "/" + path;
        }

        if (!path.startsWith(UPLOADS_PREFIX)) {
            return null;
        }
        return path.length() > MAX_IMAGE_URL_LENGTH ? null : path;
    }

    private static String extractPath(String value) {
        try {
            URI uri = new URI(value);
            if (uri.isAbsolute()) {
                return uri.getPath() == null ? "" : uri.getPath();
            }
        } catch (URISyntaxException ignored) {
            return value;
        }
        return value;
    }
}
