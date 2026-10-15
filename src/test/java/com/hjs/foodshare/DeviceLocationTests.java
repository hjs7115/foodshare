package com.hjs.foodshare;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hjs.foodshare.auth.dto.SignupRequest;
import com.hjs.foodshare.auth.dto.UserResponse;
import com.hjs.foodshare.auth.domain.RefreshToken;
import com.hjs.foodshare.auth.repository.RefreshTokenRepository;
import com.hjs.foodshare.auth.service.AuthService;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest
@Transactional
class DeviceLocationTests {
 @Autowired AuthService auth;
 @Autowired UserRepository users;
 @Autowired RefreshTokenRepository tokens;
 @Test void signupReadsCoordinatesAndUserResponseReturnsThem() throws Exception {
  var request=new ObjectMapper().readValue("{\"name\":\"Test\",\"nickname\":\"Test\",\"email\":\"test@example.com\",\"password\":\"password\",\"phone\":\"01012345678\",\"address\":\"Seoul\",\"latitude\":37.5,\"longitude\":127.0}",SignupRequest.class);
  assertEquals(37.5,request.latitude());assertEquals(127.0,request.longitude());
  var user=User.create("test","test","test@example.com","password","01012345678",request.location());
  user.updateLocation(request.location(),request.latitude(),request.longitude());
  assertEquals(37.5,UserResponse.from(user).latitude());
 }
 @Test void changingToAddressOnlyClearsOldCoordinates() {
  var user=User.create("test","test","test@example.com","password","01012345678","Old");
  user.updateLocation("Old",37.5,127.0);user.updateLocation("New",null,null);
  assertEquals("New",user.getLocation());assertNull(user.getLatitude());assertNull(user.getLongitude());
 }
 @Test void deviceLogoutRevokesOnlyOwnedMatchingSession() {
  var a=users.save(User.create("devicea","devicea","devicea@example.com","password","01000000001","Seoul"));
  var b=users.save(User.create("deviceb","deviceb","deviceb@example.com","password","01000000002","Seoul"));
  var one=tokens.save(RefreshToken.create(a,"device-one",LocalDateTime.now().plusDays(1)));
  var two=tokens.save(RefreshToken.create(a,"device-two",LocalDateTime.now().plusDays(1)));
  var other=tokens.save(RefreshToken.create(b,"device-other",LocalDateTime.now().plusDays(1)));
  auth.logoutDevice(a.getId(),other.getToken());assertFalse(other.isRevoked());
  auth.logoutDevice(a.getId(),one.getToken());assertTrue(one.isRevoked());assertFalse(two.isRevoked());
 }

 @Autowired com.hjs.foodshare.mypage.service.MyPageService mypage;
 @Autowired org.springframework.security.crypto.password.PasswordEncoder encoder;
 @Autowired jakarta.persistence.EntityManager entityManager;
 @Test void addressPayloadPersistsAcrossLogoutAndLogin() throws Exception {
  var user=users.save(User.create("locationtest","locationtest","location-test@example.com",encoder.encode("password123"),"01000000999","Old address"));
  Long id=user.getId();
  var request=new ObjectMapper().readValue("{\"address\":\"New address\",\"latitude\":37.5,\"longitude\":127.0}",com.hjs.foodshare.mypage.dto.LocationUpdateRequest.class);
  mypage.updateLocation(id,request);
  entityManager.flush();entityManager.clear();
  var saved=users.findById(id).orElseThrow();
  assertEquals("New address",saved.getLocation());assertEquals(37.5,saved.getLatitude());assertEquals(127.0,saved.getLongitude());
  var login=new com.hjs.foodshare.auth.dto.LoginRequest("location-test@example.com","password123");
  var first=auth.login(login);auth.logoutDevice(id,first.refreshToken());
  entityManager.flush();entityManager.clear();
  var second=auth.login(login);
  assertEquals("New address",second.user().location());assertEquals(37.5,second.user().latitude());assertEquals(127.0,second.user().longitude());
 }
}
