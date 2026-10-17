package com.hjs.foodshare;

import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import com.hjs.foodshare.upload.service.ImageUploadService;
import com.hjs.foodshare.auth.service.*;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.security.JwtTokenProvider;
import com.hjs.foodshare.notification.service.*;
import com.hjs.foodshare.notification.domain.UserFcmToken;
import com.hjs.foodshare.notification.repository.*;
import com.hjs.foodshare.fridge.exchange.*;
import com.hjs.foodshare.fridge.open.OpenFridgeService;
import com.hjs.foodshare.fridge.service.FridgeItemService;
import com.hjs.foodshare.fridge.dto.FridgeItemRequest;
import com.hjs.foodshare.trade.service.TradeRequestService;
import com.hjs.foodshare.shopping.ShoppingService;
import com.hjs.foodshare.meal.*;
import jakarta.persistence.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import java.nio.file.*;
import java.io.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties="app.upload.dir=build/test-uploads") @AutoConfigureMockMvc @Transactional
class StabilizationTests {
 @Autowired UserRepository users;
 @Autowired ImageUploadService images;
 @Autowired AuthThrottle throttle;
 @Autowired NotificationService notifications;
 @Autowired NotificationRepository notes;
 @Autowired UserFcmTokenRepository tokens;
 @Autowired PushRetryService retries;
 @MockitoBean FcmPushService fcm;
 @Autowired FridgeExchangeService exchanges;
 @Autowired FridgeExchangeRepository exchangeRepo;
 @Autowired FridgeItemService fridge;
 @Autowired OpenFridgeService open;
 @Autowired TradeRequestService trades;
 @Autowired ShoppingService shopping;
 @Autowired MealLibraryService library;
 @Autowired MealCatalog catalog;
 @Autowired MockMvc mvc;
 @Autowired JwtTokenProvider jwt;
 @PersistenceContext EntityManager em;
 User user(String name){var u=User.create(name,name,name+"@test.local","pw","010"+name,"서울 강남구");u.updateLocation("서울 강남구",37.5,127.0);return users.save(u);}
 LocalDate today(){return LocalDate.now(ZoneId.of("Asia/Seoul"));}
 Long item(User u,String name){var f=fridge.createItem(u.getId(),new FridgeItemRequest(name,"2개",today().plusDays(3),"냉장",""));open.publish(u.getId(),f.id(),"1개");return f.id();}
 byte[] png() throws Exception {var out=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(20,20,BufferedImage.TYPE_INT_RGB),"png",out);return out.toByteArray();}
 @Test void rejectsDisguisedHtmlAndReencodesSafeBytes() throws Exception {
  var u=user("imageBytes");
  assertThrows(BusinessException.class,()->images.upload(new MockMultipartFile("file","fake.html","image/png","<script>alert(1)</script>".getBytes()),u.getId()));
  var saved=images.upload(new MockMultipartFile("file","safe.html","image/png",png()),u.getId());
  assertTrue(saved.imageUrl().endsWith(".jpg"));
  var path=Path.of("build/test-uploads",saved.imageUrl().substring("/uploads/".length()));
  assertNotNull(ImageIO.read(path.toFile()));
  images.requireOwned(saved.imageUrl(),u.getId(),null);
  assertThrows(BusinessException.class,()->images.requireOwned(saved.imageUrl(),u.getId()+1,null));
  images.deleteIfLocalUpload(saved.imageUrl());assertTrue(Files.exists(path));
  images.requireOwned("/uploads/legacy.png",u.getId(),"/uploads/legacy.png");
  assertThrows(BusinessException.class,()->images.requireOwned("/uploads/legacy.png",u.getId(),null));
 }
 @Test void supportsWebpAndProtectsExistingUploadResponses() throws Exception {
  var u=user("webpBytes");
  var saved=images.upload(new MockMultipartFile("file","carrot.webp","image/webp",Files.readAllBytes(Path.of("public/assets/preview-carrot-v2.webp"))),u.getId());
  assertTrue(saved.imageUrl().endsWith(".jpg"));
  mvc.perform(get(saved.imageUrl())).andExpect(status().isOk()).andExpect(header().string("Content-Security-Policy","sandbox; default-src 'none'"));
 }
 @Test void authLimitsPersistOutsideFailedTransactionsAndSeparateAccounts(){
  String key=UUID.randomUUID().toString();
  for(int i=0;i<5;i++)throttle.check("test-code",key,5,60);
  assertEquals(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,assertThrows(BusinessException.class,()->throttle.check("test-code",key,5,60)).getStatus());
  assertDoesNotThrow(()->throttle.check("test-code",key+"other",5,60));
 }
 @Test void deleteAllIncludesUnreadAndCannotDeleteAnotherAccount() throws Exception {
  var a=user("clearNotesA");var b=user("clearNotesB");
  notifications.createNotification(a.getId(),"TEST","t","unread");notifications.createNotification(a.getId(),"TEST","t","read");notifications.createNotification(b.getId(),"TEST","t","keep");
  notes.findAllByUserIdOrderByCreatedAtDesc(a.getId()).getFirst().markAsRead();em.flush();
  mvc.perform(delete("/api/notifications").header("Authorization","Bearer "+jwt.createAccessToken(a))).andExpect(status().isOk());
  assertEquals(0,notes.countByUserIdAndReadFalse(a.getId()));assertTrue(notes.findAllByUserIdOrderByCreatedAtDesc(a.getId()).isEmpty());assertEquals(1,notes.findAllByUserIdOrderByCreatedAtDesc(b.getId()).size());
  mvc.perform(delete("/api/notifications")).andExpect(status().isUnauthorized());
 }
 @Test void retriesOnlyFailedDeviceWithoutDuplicatingInAppNotification(){
  var u=user("retryDevices");tokens.save(UserFcmToken.create(u,"success-device"));tokens.save(UserFcmToken.create(u,"retry-device"));
  when(fcm.sendPush(eq("success-device"),anyString(),anyString(),anyMap())).thenReturn(FcmPushService.SendResult.SENT);
  when(fcm.sendPush(eq("retry-device"),anyString(),anyString(),anyMap())).thenReturn(FcmPushService.SendResult.FAILED,FcmPushService.SendResult.SENT);
  notifications.createNotification(u.getId(),"TEST","title","body");em.flush();
  var ids=em.createQuery("select p.id from PushRetry p where p.userId=:id",Long.class).setParameter("id",u.getId()).getResultList();assertEquals(1,ids.size());
  em.createQuery("update PushRetry p set p.dueAt=:time where p.userId=:id").setParameter("time",Instant.EPOCH).setParameter("id",u.getId()).executeUpdate();em.clear();
  retries.deliver(ids.getFirst());em.flush();
  assertEquals(1,notes.findAllByUserIdOrderByCreatedAtDesc(u.getId()).size());
  verify(fcm,times(1)).sendPush(eq("success-device"),anyString(),anyString(),anyMap());verify(fcm,times(2)).sendPush(eq("retry-device"),anyString(),anyString(),anyMap());
  assertEquals(0L,em.createQuery("select count(p) from PushRetry p where p.userId=:id",Long.class).setParameter("id",u.getId()).getSingleResult());
 }
 @Test void acceptedExchangeRequiresMutualCancellationAndCanBeRepublished(){
  var a=user("cancelAcceptedA");var b=user("cancelAcceptedB");var x=item(a,"당근");var y=item(b,"두부");var p=exchanges.propose(a.getId(),x,y);exchanges.act(b.getId(),p.id(),"accept");
  assertTrue(exchanges.act(a.getId(),p.id(),"request-cancel").cancellationPending());
  assertThrows(BusinessException.class,()->exchanges.act(a.getId(),p.id(),"confirm-cancel"));
  var trade=exchangeRepo.findById(p.id()).orElseThrow().getTrade();assertThrows(BusinessException.class,()->trades.complete(trade.getId(),b.getId()));
  assertEquals("CANCELLED",exchanges.act(b.getId(),p.id(),"confirm-cancel").status());
  assertEquals("PUBLIC",open.publish(a.getId(),x,"1개").state());assertEquals("PUBLIC",open.publish(b.getId(),y,"1개").state());
 }
 @Test void appointmentNeedsCounterpartyConfirmationAndChangesResetIt(){
  var a=user("meetingA");var b=user("meetingB");var p=exchanges.propose(a.getId(),item(a,"계란"),item(b,"양파"));exchanges.act(b.getId(),p.id(),"accept");
  var when=LocalDateTime.now(ZoneId.of("Asia/Seoul")).plusDays(1);exchanges.meeting(a.getId(),p.id(),when,"도서관 입구");
  assertThrows(BusinessException.class,()->exchanges.act(a.getId(),p.id(),"confirm-meeting"));
  assertTrue(exchanges.act(b.getId(),p.id(),"confirm-meeting").meetingConfirmed());
  assertFalse(exchanges.meeting(b.getId(),p.id(),when.plusHours(1),"마트 앞").meetingConfirmed());
 }
 @Test void carryOnlySelectedOwnedNeededItemsAndIsIdempotent(){
  var a=user("carryA");var b=user("carryB");var list=shopping.add(a.getId(),today(),"",List.of(new ShoppingService.Entry("두부","1모"),new ShoppingService.Entry("계란","2개")));
  Long first=list.items().getFirst().id(),other=list.items().getLast().id();shopping.update(a.getId(),other,"BOUGHT",null);
  assertThrows(BusinessException.class,()->shopping.carry(b.getId(),today(),List.of(first)));
  assertThrows(BusinessException.class,()->shopping.carry(a.getId(),today(),List.of(other)));
  assertEquals(1,shopping.carry(a.getId(),today(),List.of(first)).items().size());assertEquals(1,shopping.carry(a.getId(),today(),List.of(first)).items().size());assertEquals(2,shopping.get(a.getId(),today()).items().size());
 }
 @Test void recipeLibraryIsOwnedAndDeduplicatesSaveAndCook(){
  var a=user("libraryA");var b=user("libraryB");var recipe=catalog.all().getFirst();
  var saved=library.save(a.getId(),recipe,false);var cooked=library.save(a.getId(),recipe,true);
  assertEquals(saved.id(),cooked.id());assertTrue(cooked.favorite());assertNotNull(cooked.cookedAt());assertEquals(1,library.list(a.getId()).size());assertTrue(library.list(b.getId()).isEmpty());
  assertThrows(BusinessException.class,()->library.delete(b.getId(),saved.id()));library.delete(a.getId(),saved.id());assertTrue(library.list(a.getId()).isEmpty());
 }
}
