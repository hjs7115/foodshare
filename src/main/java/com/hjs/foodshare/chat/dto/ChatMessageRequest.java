package com.hjs.foodshare.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatMessageRequest(
        @NotBlank
        @Size(max = 1000)
        String content,
        @Size(max=80) String clientMessageId
) {
    public ChatMessageRequest(String content){this(content,null);}
}
