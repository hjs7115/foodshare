package com.hjs.foodshare;

import com.hjs.foodshare.global.security.JwtTokenProvider;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LogoutSecurityTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired JwtTokenProvider jwt;

    @Test
    void anonymousLogoutCannotReportSuccess() throws Exception {
        mvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void emptyDeviceLogoutTokenIsRejectedInsteadOfSilentlyIgnored() throws Exception {
        User user = users.save(User.create(
                "logout-user", "logout-user", "logout-security@example.com",
                "encoded-password", "01012349000", "Seoul"));
        mvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + jwt.createAccessToken(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void logoutWithoutBodyRevokesAccessToken() throws Exception {
        User user = users.save(User.create(
                "logout-all", "logout-all", "logout-all@example.com",
                "encoded-password", "01012349001", "Seoul"));
        String token = jwt.createAccessToken(user);
        mvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        mvc.perform(get("/api/shopping")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }
}
