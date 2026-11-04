package com.hjs.foodshare;

import com.hjs.foodshare.user.domain.*;
import com.hjs.foodshare.user.repository.*;
import com.hjs.foodshare.post.domain.*;
import com.hjs.foodshare.post.dto.*;
import com.hjs.foodshare.post.repository.*;
import com.hjs.foodshare.post.service.*;
import com.hjs.foodshare.trade.domain.*;
import com.hjs.foodshare.trade.service.*;
import com.hjs.foodshare.trade.repository.*;
import com.hjs.foodshare.chat.service.*;
import com.hjs.foodshare.chat.dto.*;
import com.hjs.foodshare.chat.repository.*;
import com.hjs.foodshare.moderation.service.*;
import com.hjs.foodshare.moderation.domain.*;
import com.hjs.foodshare.moderation.dto.*;
import com.hjs.foodshare.comment.service.*;
import com.hjs.foodshare.comment.dto.*;
import com.hjs.foodshare.favorite.service.*;
import com.hjs.foodshare.fridge.open.*;
import com.hjs.foodshare.fridge.domain.*;
import com.hjs.foodshare.fridge.repository.*;
import com.hjs.foodshare.global.exception.*;
import com.hjs.foodshare.auth.service.*;
import com.hjs.foodshare.auth.dto.*;
import com.hjs.foodshare.auth.repository.*;
import com.hjs.foodshare.global.security.*;
import com.hjs.foodshare.mypage.service.*;
import com.hjs.foodshare.notification.service.*;
import com.hjs.foodshare.notification.repository.*;
import com.hjs.foodshare.admin.service.*;
import com.hjs.foodshare.admin.dto.*;
import com.hjs.foodshare.review.service.*;
import com.hjs.foodshare.review.dto.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import jakarta.persistence.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest @Transactional
class WorkflowSafetyTests {
 @Autowired UserRepository users;
 @Autowired PostRepository posts;
 @Autowired PostService market;
 @Autowired TradeRequestService trades;
 @Autowired TradeRequestRepository requests;
 @Autowired ChatService chats;
 @Autowired ChatRoomMemberRepository members;
 @Autowired ModerationService moderation;
 @Autowired CommentService comments;
 @Autowired FavoriteService favorites;
 @Autowired MyPageService mypage;
 @Autowired OpenFridgeService open;
 @Autowired FridgeItemRepository fridge;
 @Autowired NotificationService notifications;
 @Autowired NotificationRepository notes;
 @Autowired AuthService auth;
 @Autowired SessionAccessService access;
 @Autowired AccountService accounts;
 @Autowired RefreshTokenRepository tokens;
 @Autowired JwtTokenProvider jwt;
 @Autowired PasswordEncoder passwords;
 @Autowired AdminService admin;
 @Autowired ReviewService reviews;
 @Autowired PlatformTransactionManager manager;
 @Autowired com.hjs.foodshare.fridge.exchange.FridgeExchangeService exchanges;
 @Autowired com.hjs.foodshare.fridge.exchange.FridgeExchangeRepository exchangeRows;
 @Autowired com.hjs.foodshare.ai.service.IngredientAnalysisService analyses;
 @MockitoBean FcmPushService fcm;
 @PersistenceContext EntityManager em;
 User user(String n){var u=users.save(User.create(n,n,n+"@workflow.local",passwords.encode("password1!"),String.format("010%08d",Math.abs(n.hashCode()%100000000)),"서울 강남구 역삼동"));u.updateLocation("서울 강남구 역삼동",37.50123,127.01234);return u;}
 Post post(User u,PostType type){return posts.save(Post.create(u,type,"두부","두부","1개",1000,"서울 강남구 역삼동 123",0.0,LocalDate.now().plusDays(3),37.50123,127.01234,null,"조건",type==PostType.GROUP_BUY?1:null,type==PostType.GROUP_BUY?4:null,type==PostType.GROUP_BUY?LocalDateTime.now().plusDays(1):null));}
 Long accepted(User owner,User buyer,Post p){Long id=trades.createRequest(p.getId(),buyer.getId()).requestId();trades.accept(id,owner.getId());return id;}
 PostUpdateRequest change(){return new PostUpdateRequest(PostType.SALE,"다른 조건","쌀","10kg",99999,"부산",0.0,35.1,129.0,LocalDate.now().plusDays(3),null,"변경",null,null,null);}
 @Test void completionRequiresBothAndOneConfirmationStillAllowsCancellation(){var a=user("a");var b=user("b");Long id=accepted(a,b,post(a,PostType.SALE));assertEquals(TradeRequestStatus.ACCEPTED,trades.complete(id,a.getId()).status());assertEquals(TradeRequestStatus.CANCELLED,trades.cancelMarketTrade(id,b.getId(),"기타").status());}
 @Test void mutualCompletionIsFinalAndCreatesOnlyOneCompletedTrade(){var a=user("a");var b=user("b");Long id=accepted(a,b,post(a,PostType.SALE));trades.complete(id,a.getId());assertEquals(TradeRequestStatus.COMPLETED,trades.complete(id,b.getId()).status());assertEquals(1,mypage.getMyPage(a.getId()).completedTradeCount());assertThrows(BusinessException.class,()->trades.cancelMarketTrade(id,a.getId(),"기타"));}
 @Test void blockingEndsPendingRequestAndPreventsAcceptance(){var a=user("a");var b=user("b");var p=post(a,PostType.SALE);Long id=trades.createRequest(p.getId(),b.getId()).requestId();moderation.blockUser(a.getId(),b.getId());assertEquals(TradeRequestStatus.REJECTED,requests.findById(id).orElseThrow().getStatus());assertThrows(BusinessException.class,()->trades.accept(id,a.getId()));assertTrue(chats.getRooms(a.getId(),"ALL").isEmpty());}
 @Test void blockerCannotRequestOrReadBlockedPersonsPost(){var a=user("a");var b=user("b");var p=post(b,PostType.SALE);moderation.blockUser(a.getId(),b.getId());assertThrows(BusinessException.class,()->trades.createRequest(p.getId(),a.getId()));assertThrows(BusinessException.class,()->market.getPost(p.getId(),a.getId()));}
 @Test void acceptedTradeConditionsAndDeletionAreProtected(){var a=user("a");var b=user("b");var p=post(a,PostType.SALE);accepted(a,b,p);assertThrows(BusinessException.class,()->market.updatePost(p.getId(),a.getId(),change()));assertThrows(BusinessException.class,()->market.deletePost(p.getId(),a.getId()));assertEquals(1000,p.getPrice());assertFalse(p.isDeleted());}
 @Test void deletingPostTerminatesPendingRequestsAndPreservesBothHistories(){var a=user("a");var b=user("b");var p=post(a,PostType.SALE);Long id=trades.createRequest(p.getId(),b.getId()).requestId();market.deletePost(p.getId(),a.getId());assertEquals(TradeRequestStatus.REJECTED,trades.getMyRequests(b.getId()).getFirst().status());assertEquals(trades.getMyRequests(b.getId()),mypage.getMyTradeRequests(b.getId()));trades.hideHistory(List.of(id),b.getId());assertTrue(trades.getMyRequests(b.getId()).isEmpty());}
 @Test void groupCannotCompleteDuringRecruitment(){var a=user("a");var b=user("b");var p=post(a,PostType.GROUP_BUY);Long id=accepted(a,b,p);assertThrows(BusinessException.class,()->trades.complete(id,b.getId()));assertEquals(TradeRequestStatus.ACCEPTED,requests.findById(id).orElseThrow().getStatus());}
 @Test void groupPendingWithdrawalAndAcceptedCancellationWork(){var a=user("a");var b=user("b");var p=post(a,PostType.GROUP_BUY);Long id=trades.createRequest(p.getId(),b.getId()).requestId();trades.cancelMarketTrade(id,b.getId(),"기타");id=accepted(a,b,p);assertEquals(2,p.getCurrentParticipantCount());trades.cancelMarketTrade(id,b.getId(),"기타");assertEquals(1,p.getCurrentParticipantCount());}
 @Test void groupManualClosureNotifiesEveryMemberAndCanBeCancelled(){var a=user("a");var b=user("b");var c=user("c");var p=post(a,PostType.GROUP_BUY);trades.createRequest(p.getId(),b.getId());trades.createRequest(p.getId(),c.getId());var rows=trades.closeGroupBuyRecruitment(p.getId(),a.getId());for(var u:List.of(a,b,c))assertTrue(notes.findAllByUserIdOrderByCreatedAtDesc(u.getId()).stream().anyMatch(n->"CHAT_ROOM_OPENED".equals(n.getType())));trades.cancelMarketTrade(rows.getLast().requestId(),rows.getLast().requesterId(),"기타");assertFalse(chats.canAccessRoom(rows.getLast().requesterId(),rows.getLast().chatRoomId()));trades.cancelPostTrades(p.getId(),a.getId(),"기타");assertTrue(requests.findAllByPostIdAndStatus(p.getId(),TradeRequestStatus.ACCEPTED).isEmpty());}
 @Test void expiredFoodCannotReceiveRequestEvenWithDirectPostId(){var a=user("a");var b=user("b");var p=post(a,PostType.SALE);ReflectionTestUtils.setField(p,"expirationDate",LocalDate.now().minusDays(1));assertThrows(BusinessException.class,()->trades.createRequest(p.getId(),b.getId()));}
 @Test void publicPostDoesNotExposeExactAddressOrCoordinates(){var a=user("a");var b=user("b");var p=post(a,PostType.SALE);var publicView=market.getPost(p.getId(),null);assertFalse(publicView.tradeLocation().contains("123"));assertEquals(37.50,publicView.latitude());assertEquals(127.01,publicView.longitude());assertEquals(p.getLatitude(),market.getPost(p.getId(),a.getId()).latitude());}
 @Test void generalEndpointEnforcesFridgeRadiusAndPendingWithdrawalWorks(){var a=user("a");var b=user("b");var item=fridge.save(FridgeItem.create(a,"두부","1개",LocalDate.now().plusDays(3),"냉장",""));var shared=open.publish(a.getId(),item.getId(),"1개");b.updateLocation("부산",35.1,129.0);assertThrows(BusinessException.class,()->trades.createRequest(shared.postId(),b.getId()));b.updateLocation("서울",37.5,127.0);Long id=open.request(b.getId(),item.getId()).requestId();assertEquals(TradeRequestStatus.CANCELLED,trades.cancelMarketTrade(id,b.getId(),"기타").status());}
 @Test void commentsOfDeletedOrBlockedParentAreNotReadable(){var a=user("a");var b=user("b");var p=post(a,PostType.SALE);comments.createComment(p.getId(),b.getId(),new CommentCreateRequest("댓글"));moderation.blockUser(a.getId(),b.getId());assertThrows(BusinessException.class,()->comments.getComments(p.getId(),b.getId()));market.deletePost(p.getId(),a.getId());assertThrows(BusinessException.class,()->comments.getComments(p.getId(),null));}
 @Test void favoritesRespectBlockAndNoReviewDoesNotInventRating(){var a=user("a");var b=user("b");var p=post(a,PostType.SALE);assertEquals(0,market.getPost(p.getId(),b.getId()).rating());favorites.addFavorite(p.getId(),b.getId());moderation.blockUser(a.getId(),b.getId());assertTrue(favorites.getMyFavorites(b.getId()).isEmpty());assertThrows(BusinessException.class,()->favorites.addFavorite(p.getId(),b.getId()));}
 @Test void invalidPriceDateAndCoordinatesAreRejected(){for(Object price:List.of(-1,1.5,2147483648L,"999999999999999999","abc"))assertThrows(BusinessException.class,()->PostValues.price(price));assertThrows(BusinessException.class,()->PostValues.expiration("2026-99-99"));assertThrows(BusinessException.class,()->PostValues.expiration(LocalDate.now().minusDays(1)));assertThrows(BusinessException.class,()->PostValues.coordinates(Double.NaN,127.0));assertTrue(PostValues.negotiable("희망가 협의"));}
 @Test void groupParticipantCountCannotBeInventedByClient(){var a=user("a");var p=market.createPost(a.getId(),new PostCreateRequest(PostType.GROUP_BUY,"공구","쌀","1개",1000,"서울",0.0,37.5,127.0,LocalDate.now().plusDays(3),null,"공구",3,4,LocalDateTime.now().plusDays(1)));assertEquals(1,p.currentParticipantCount());}
 @Test void signupRequiresRecordedCurrentConsentAndPhoneApiDoesNotPretendToSend(){assertThrows(BusinessException.class,()->auth.signup(new SignupRequest("a","a","a@example.com","password1!","01012345678","서울",null,null,false,true,true,"2026-11-04")));assertThrows(BusinessException.class,()->auth.sendPhoneVerificationCode(new PhoneVerificationSendRequest("01012345678")));}
 @Test void successfulLoginsDoNotConsumeFailedAttemptLimit(){var a=user("a");for(int i=0;i<12;i++)assertNotNull(auth.login(new LoginRequest(a.getEmail(),"password1!")));}
 @Test void rotatedAndLoggedOutSessionsCannotUseOldAccessTokens(){var a=user("a");var login=auth.login(new LoginRequest(a.getEmail(),"password1!"));var old=jwt.parseAuthUser(login.accessToken());access.requireActive(old);var next=auth.refresh(new RefreshTokenRequest(login.refreshToken()));assertThrows(BusinessException.class,()->access.requireActive(old));access.requireActive(jwt.parseAuthUser(next.accessToken()));auth.logoutDevice(a.getId(),next.refreshToken());assertThrows(BusinessException.class,()->access.requireActive(jwt.parseAuthUser(next.accessToken())));}
 @Test void messagesAreIdempotentButIdenticalTextWithDifferentIdsIsPreserved(){var a=user("a");var b=user("b");Long id=accepted(a,b,post(a,PostType.SALE));Long room=trades.getMyRequests(b.getId()).getFirst().chatRoomId();var one=chats.sendMessage(a.getId(),room,new ChatMessageRequest("네","first"));var retry=chats.sendMessage(a.getId(),room,new ChatMessageRequest("네","first"));var two=chats.sendMessage(a.getId(),room,new ChatMessageRequest("네","second"));assertEquals(one.messageId(),retry.messageId());assertNotEquals(one.messageId(),two.messageId());assertEquals(2,chats.getMessages(b.getId(),room).stream().filter(m->!m.systemMessage()).count());assertThrows(BusinessException.class,()->chats.sendMessage(a.getId(),room,new ChatMessageRequest("다른 내용","first")));assertThrows(BusinessException.class,()->chats.sendMessage(a.getId(),room,"x".repeat(1001)));}
 @Test void readReceiptOffStillClearsOwnUnreadWithoutDisclosingRead(){var a=user("a");var b=user("b");accepted(a,b,post(a,PostType.SALE));Long room=chats.getRooms(a.getId(),"ALL").getFirst().chatRoomId();b.updateChatSettings(true,false,false);chats.sendMessage(a.getId(),room,"메시지");assertEquals(1,chats.getRooms(b.getId(),"ALL").getFirst().unreadCount());chats.markAsRead(b.getId(),room);assertEquals(0,chats.getRooms(b.getId(),"ALL").getFirst().unreadCount());assertTrue(chats.getMessages(a.getId(),room).getLast().unreadByPartner());assertFalse(chats.showsReadReceipt(b.getId()));}
 @Test void messageCursorsBoundQueriesAndLoadEarlierRecords(){var a=user("a");var b=user("b");accepted(a,b,post(a,PostType.SALE));Long room=chats.getRooms(a.getId(),"ALL").getFirst().chatRoomId();for(int i=0;i<105;i++)chats.sendMessage(a.getId(),room,"m"+i);var recent=chats.getMessages(b.getId(),room);assertEquals(100,recent.size());var older=chats.getMessages(b.getId(),room,null,recent.getFirst().messageId(),100);assertEquals(6,older.size());assertTrue(chats.getMessages(b.getId(),room,recent.getLast().messageId(),null,100).isEmpty());}
 @Test void groupBlockFiltersMessagesAndNamingIsPersonal(){var a=user("a");var b=user("b");var c=user("c");var p=post(a,PostType.GROUP_BUY);trades.createRequest(p.getId(),b.getId());trades.createRequest(p.getId(),c.getId());Long room=trades.closeGroupBuyRecruitment(p.getId(),a.getId()).getFirst().chatRoomId();moderation.blockUser(b.getId(),c.getId());chats.sendMessage(c.getId(),room,"차단 메시지");assertTrue(chats.getMessages(b.getId(),room).stream().noneMatch(m->"차단 메시지".equals(m.content())));assertFalse(chats.notificationRecipientIds(c.getId(),room).contains(b.getId()));chats.renameRoom(b.getId(),room,new ChatRoomNameRequest("내 방 이름"));assertEquals("내 방 이름",chats.getRooms(b.getId(),"ALL").getFirst().roomName());assertNotEquals("내 방 이름",chats.getRooms(a.getId(),"ALL").getFirst().roomName());}
 @Test void reviewsRequireMutualCompletionAreUniqueAndCountsSurviveHiddenHistory(){var a=user("a");var b=user("b");Long id=accepted(a,b,post(a,PostType.SALE));trades.complete(id,a.getId());assertThrows(BusinessException.class,()->reviews.createReview(id,b.getId(),new ReviewCreateRequest(5,"좋아요")));trades.complete(id,b.getId());reviews.createReview(id,b.getId(),new ReviewCreateRequest(5,"좋아요"));assertThrows(BusinessException.class,()->reviews.createReview(id,b.getId(),new ReviewCreateRequest(1,"다시")));trades.hideHistory(List.of(id),a.getId());assertEquals(1,mypage.getMyPage(a.getId()).completedTradeCount());assertEquals(1,reviews.getRatingSummary(a.getId()).ratingCounts().get(4));}
 @Test void databaseHistoryPagingIncludesHiddenFiltersAndStableTotals(){var a=user("a");var b=user("b");for(int i=0;i<4;i++){var p=post(a,PostType.SALE);Long id=trades.createRequest(p.getId(),b.getId()).requestId();trades.cancelMarketTrade(id,b.getId(),"기타");if(i==0)trades.hideHistory(List.of(id),b.getId());}assertEquals(0,mypage.getMyPage(a.getId()).pendingReceivedRequestCount());
var page=trades.historyPage(b.getId(),false,0,2);assertEquals(3,page.totalElements());assertEquals(2,page.content().size());assertEquals(1,trades.historyPage(b.getId(),false,1,2).content().size());assertEquals(2,trades.historyPage(a.getId(),true,0,2).totalPages());}
 @Test void notificationPageAndCommentTargetAreUsable(){var a=user("a");var b=user("b");var p=post(a,PostType.SALE);comments.createComment(p.getId(),b.getId(),new CommentCreateRequest("댓글"));var n=notifications.getNotificationsPage(a.getId(),0,1).content().getFirst();assertEquals(p.getId(),n.postId());assertEquals("POST",n.targetType());}
 @Test void nearbyNewPostsHaveTheirOwnNotificationSetting(){var a=user("a");var b=user("b");market.createPost(a.getId(),new PostCreateRequest(PostType.SALE,"당근","당근","1개",1000,"서울",0.0,37.5,127.0,LocalDate.now().plusDays(3),null,"내용",null,null,null));assertTrue(notes.findAllByUserIdOrderByCreatedAtDesc(b.getId()).stream().anyMatch(n->"NEW_POST".equals(n.getType())));}
 @Test void tradeReportStoresEvidenceAndAdminCanCancelDisputedCompletion(){var a=user("a");var b=user("b");Long id=accepted(a,b,post(a,PostType.SALE));trades.complete(id,a.getId());trades.complete(id,b.getId());reviews.createReview(id,b.getId(),new ReviewCreateRequest(1,"분쟁"));var r=moderation.createReport(a.getId(),new ReportCreateRequest(ReportTargetType.TRADE_REQUEST,id,"미수령",null));assertNotNull(r.evidence());var result=admin.updateReportStatus("test-admin-key-with-at-least-32-characters",r.reportId(),new ReportStatusUpdateRequest(ReportStatus.REVIEWED,"CANCEL_TRADE","분쟁 조정 취소"));assertEquals("분쟁 조정 취소",result.resolution());assertEquals(TradeRequestStatus.CANCELLED,requests.findById(id).orElseThrow().getStatus());assertEquals(50,a.getFreshnessScore());assertEquals(0,reviews.getRatingSummary(a.getId()).reviewCount());}
 @Test void messageReportRequiresParticipationAndPreservesEvidence(){var a=user("a");var b=user("b");var c=user("c");accepted(a,b,post(a,PostType.SALE));Long room=chats.getRooms(a.getId(),"ALL").getFirst().chatRoomId();var m=chats.sendMessage(b.getId(),room,"신고할 내용");assertThrows(BusinessException.class,()->moderation.createReport(c.getId(),new ReportCreateRequest(ReportTargetType.CHAT_MESSAGE,m.messageId(),"신고",null)));var report=moderation.createReport(a.getId(),new ReportCreateRequest(ReportTargetType.CHAT_MESSAGE,m.messageId(),"신고",null));assertTrue(report.evidence().contains("신고할 내용"));}
 @Test void withdrawalRevokesSessionsAnonymizesOwnerAndEndsTrades(){var a=user("a");var b=user("b");var p=post(a,PostType.SALE);Long id=accepted(a,b,p);var login=auth.login(new LoginRequest(a.getEmail(),"password1!"));accounts.withdraw(a.getId(),"password1!");assertFalse(a.isAvailable());assertNull(a.getLocation());assertEquals(TradeRequestStatus.CANCELLED,requests.findById(id).orElseThrow().getStatus());assertTrue(p.isDeleted());assertThrows(BusinessException.class,()->access.requireActive(jwt.parseAuthUser(login.accessToken())));}
 @Test void blockedAcceptedGroupParticipantIsNotReconnectedByDeadlineFinalization(){var a=user("a");var b=user("b");var p=post(a,PostType.GROUP_BUY);var id=accepted(a,b,p);moderation.blockUser(a.getId(),b.getId());ReflectionTestUtils.setField(p,"deadlineDate",LocalDateTime.now().minusMinutes(1));em.flush();trades.expireGroupBuy(p.getId());assertEquals(TradeRequestStatus.CANCELLED,requests.findById(id).orElseThrow().getStatus());assertTrue(chats.getRooms(b.getId(),"ALL").isEmpty());}
 @Test void unansweredExchangeCancellationHasFiniteExit(){var a=user("a");var b=user("b");var x=fridge.save(FridgeItem.create(a,"당근","1개",LocalDate.now().plusDays(3),"냉장",""));var y=fridge.save(FridgeItem.create(b,"두부","1개",LocalDate.now().plusDays(3),"냉장",""));open.publish(a.getId(),x.getId(),"1개");open.publish(b.getId(),y.getId(),"1개");var e=exchanges.propose(a.getId(),x.getId(),y.getId());exchanges.act(b.getId(),e.id(),"accept");exchanges.act(a.getId(),e.id(),"request-cancel");assertThrows(BusinessException.class,()->exchanges.act(a.getId(),e.id(),"force-cancel"));var row=exchangeRows.findById(e.id()).orElseThrow();ReflectionTestUtils.setField(row,"cancelRequestedAt",LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusHours(49));em.flush();assertEquals("CANCELLED",exchanges.act(a.getId(),e.id(),"force-cancel").status());}
 @Test void photoFingerprintMustMatchClaimedAnalysis(){var a=user("a");var analysis=com.hjs.foodshare.ai.domain.IngredientAnalysis.create(a,"두부",com.hjs.foodshare.ai.domain.QualityGrade.FAIR,"외관",1,3,com.hjs.foodshare.ai.domain.ConfidenceLevel.LOW,com.hjs.foodshare.ai.domain.StorageMethod.values()[0],com.hjs.foodshare.ai.domain.OpenStatus.values()[0],LocalDate.now(),"1개",1000,500,400,"AI","test","v1");analysis.setImageFingerprint("one");em.persist(analysis);var image=new com.hjs.foodshare.upload.service.UploadedImage("12345678-1234-1234-1234-123456789abc.jpg",a.getId());image.setFingerprint("two");em.persist(image);em.flush();assertThrows(BusinessException.class,()->analyses.claimForPost(analysis.getId(),a.getId(),"/uploads/12345678-1234-1234-1234-123456789abc.jpg"));image.setFingerprint("one");em.flush();assertEquals(analysis.getId(),analyses.claimForPost(analysis.getId(),a.getId(),"/uploads/12345678-1234-1234-1234-123456789abc.jpg").getId());}
 @Test void adminSuspensionRevokesSessionAndHidesPublicPost(){var a=user("a");var b=user("b");var p=post(a,PostType.SALE);var principal=jwt.parseAuthUser(jwt.createAccessToken(a));var report=moderation.createReport(b.getId(),new ReportCreateRequest(ReportTargetType.USER,a.getId(),"운영 정책 위반",null));admin.updateReportStatus("test-admin-key-with-at-least-32-characters",report.reportId(),new ReportStatusUpdateRequest(ReportStatus.REVIEWED,"SUSPEND_USER","이용 제한"));assertThrows(BusinessException.class,()->access.requireActive(principal));assertThrows(BusinessException.class,()->market.getPost(p.getId(),null));}
 @Test void personalHistoryDeletionDoesNotChangeLifetimeCount(){var a=user("a");var b=user("b");var id=accepted(a,b,post(a,PostType.SALE));trades.complete(id,a.getId());trades.complete(id,b.getId());trades.hideHistory(List.of(id),b.getId());assertTrue(trades.historyPage(b.getId(),false,0,10).content().isEmpty());assertEquals(1,mypage.getMyPage(b.getId()).completedTradeCount());}
 @Test @Transactional(propagation=Propagation.NOT_SUPPORTED)
 void simultaneousRefreshConsumesOneTokenExactlyOnce() throws Exception {
  var tx=new TransactionTemplate(manager);String name="refresh"+UUID.randomUUID().toString().replace("-","").substring(0,12);
  var login=tx.execute(s->{var u=user(name);return auth.login(new LoginRequest(u.getEmail(),"password1!"));});
  Long userId=login.user().userId();var pool=Executors.newFixedThreadPool(2);var gate=new CountDownLatch(1);
  try{
   Callable<Boolean> call=()->{gate.await();try{auth.refresh(new RefreshTokenRequest(login.refreshToken()));return true;}catch(BusinessException e){return false;}};
   var first=pool.submit(call);var second=pool.submit(call);gate.countDown();
   int success=(first.get(15,TimeUnit.SECONDS)?1:0)+(second.get(15,TimeUnit.SECONDS)?1:0);assertEquals(1,success);
  }finally{pool.shutdownNow();tx.executeWithoutResult(s->{tokens.deleteAllByUserId(userId);users.deleteById(userId);});}
 }
}
