package com.hjs.foodshare;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import com.hjs.foodshare.global.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc @Transactional
class MealApiTests {
 @Autowired MockMvc mvc;@Autowired UserRepository users;@Autowired JwtTokenProvider jwt;
 String token(){var u=users.save(User.create("mealapi","mealapi","mealapi@example.com","pw","01011119999","Seoul"));return jwt.createAccessToken(u);}
 @Test void unauthenticatedRequestIsRejected() throws Exception {mvc.perform(post("/api/meals/recommend").contentType("application/json").content("{\"fridgeItemIds\":[],\"ingredients\":[],\"maxMinutes\":30}")).andExpect(status().isUnauthorized());}
 @Test void authenticatedManualRecommendationWorks() throws Exception {mvc.perform(post("/api/meals/recommend").header("Authorization","Bearer "+token()).contentType("application/json").content("{\"fridgeItemIds\":[],\"ingredients\":[\"밥\",\"계란\",\"대파\"],\"maxMinutes\":15}")).andExpect(status().isOk()).andExpect(jsonPath("$.data.mode").value("FALLBACK")).andExpect(jsonPath("$.data.meals[0].recipe.id").value("egg-rice")).andExpect(jsonPath("$.data.meals[0].missing").isEmpty());}
 @Test void invalidRequestIsRejectedBeforeRecommendation() throws Exception {mvc.perform(post("/api/meals/recommend").header("Authorization","Bearer "+token()).contentType("application/json").content("{\"fridgeItemIds\":[],\"ingredients\":[],\"maxMinutes\":0}")).andExpect(status().isBadRequest());}
}
