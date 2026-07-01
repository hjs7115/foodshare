package com.hjs.foodshare.notification.dto;

public record TestPushRequest(
        String title,
        String message
) {
    public String titleValue() {
        return title == null || title.isBlank() ? "FoodShare 테스트 알림" : title.trim();
    }

    public String messageValue() {
        return message == null || message.isBlank()
                ? "브라우저 푸시 알림 설정이 정상적으로 연결되었습니다."
                : message.trim();
    }
}
