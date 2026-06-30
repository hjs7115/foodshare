package com.hjs.foodshare.auth.dto;

public record DuplicateCheckResponse(
        boolean duplicated,
        boolean available
) {

    public static DuplicateCheckResponse from(boolean duplicated) {
        return new DuplicateCheckResponse(duplicated, !duplicated);
    }
}
