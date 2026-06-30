package com.hjs.foodshare.auth.dto;

public record NicknameCheckResponse(
        boolean success,
        String message,
        boolean duplicated,
        boolean available,
        DuplicateCheckResponse data
) {

    public static NicknameCheckResponse from(String message, DuplicateCheckResponse data) {
        return new NicknameCheckResponse(true, message, data.duplicated(), data.available(), data);
    }
}
