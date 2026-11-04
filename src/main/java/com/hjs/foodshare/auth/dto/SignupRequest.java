package com.hjs.foodshare.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank(message = "name is required.")
        @Size(max=50) String name,

        @NotBlank(message = "nickname is required.")
        @Size(max = 50, message = "nickname must be 50 characters or less.")
        String nickname,

        @NotBlank(message = "email is required.")
        @Email(message = "email format is invalid.")
        @Size(max=100) String email,

        @NotBlank(message = "password is required.")
        @Size(min = 8, message = "password must be at least 8 characters.")
        String password,

        @NotBlank(message = "phoneNumber is required.")
        @JsonAlias("phone")
        @jakarta.validation.constraints.Pattern(regexp="01[016789][0-9]{7,8}",message="연락처 형식을 확인해주세요.") String phoneNumber,

        @JsonAlias("address")
        @Size(max=100) String location,
        Double latitude,
        Double longitude,
        Boolean termsAccepted, Boolean privacyAccepted, Boolean apiAccepted, @Size(max=30) String termsVersion
) {
    public SignupRequest {
        name=name==null?null:name.strip(); nickname=nickname==null?null:nickname.strip();
        email=email==null?null:email.strip().toLowerCase(java.util.Locale.ROOT);
        phoneNumber=phoneNumber==null?null:phoneNumber.replaceAll("[^0-9]","");
    }
    public SignupRequest(String name,String nickname,String email,String password,String phoneNumber,String location) {
        this(name,nickname,email,password,phoneNumber,location,null,null,true,true,true,"2026-11-04");
    }
    public SignupRequest(String name,String nickname,String email,String password,String phoneNumber,String location,Double latitude,Double longitude) {
        this(name,nickname,email,password,phoneNumber,location,latitude,longitude,true,true,true,"2026-11-04");
    }
}
