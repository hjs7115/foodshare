package com.hjs.foodshare.mypage.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.hjs.foodshare.user.domain.User;

public record LocationResponse(
        String location,
        Double latitude,
        Double longitude
) {

    public static LocationResponse from(User user) {
        return new LocationResponse(user.getLocation(), user.getLatitude(), user.getLongitude());
    }

    @JsonProperty("lat")
    public Double lat() {
        return latitude;
    }

    @JsonProperty("lng")
    public Double lng() {
        return longitude;
    }
}
