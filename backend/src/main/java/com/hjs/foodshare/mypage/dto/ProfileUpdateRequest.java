package com.hjs.foodshare.mypage.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        @Size(max = 50, message = "nickname must be 50 characters or less.")
        String nickname,

        @JsonAlias("address")
        @Size(max = 100, message = "location must be 100 characters or less.")
        String location,

        String profileImage
) {
}
