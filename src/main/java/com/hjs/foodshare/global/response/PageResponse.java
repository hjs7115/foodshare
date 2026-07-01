package com.hjs.foodshare.global.response;

import java.util.List;

public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {

    public static <T> PageResponse<T> of(List<T> allContent, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        int fromIndex = Math.min(safePage * safeSize, allContent.size());
        int toIndex = Math.min(fromIndex + safeSize, allContent.size());
        List<T> pageContent = allContent.subList(fromIndex, toIndex);
        int totalPages = allContent.isEmpty() ? 0 : (int) Math.ceil(allContent.size() / (double) safeSize);
        return new PageResponse<>(
                pageContent,
                safePage,
                safeSize,
                allContent.size(),
                totalPages,
                safePage == 0,
                totalPages == 0 || safePage >= totalPages - 1
        );
    }
}
