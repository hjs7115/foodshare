package com.hjs.foodshare.mypage.dto;

import jakarta.validation.constraints.Size;

public record LocationUpdateRequest(
        @Size(max = 100)
        String location,
        Double lat,
        Double lng,
        Double latitude,
        Double longitude
) {

    public Double latitudeValue() {
        return latitude != null ? latitude : lat;
    }

    public Double longitudeValue() {
        return longitude != null ? longitude : lng;
    }
}
