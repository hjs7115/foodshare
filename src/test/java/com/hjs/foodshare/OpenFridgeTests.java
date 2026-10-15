package com.hjs.foodshare;
import com.hjs.foodshare.fridge.open.OpenFridgeService;
import com.hjs.foodshare.fridge.service.FridgeItemService;
import com.hjs.foodshare.fridge.dto.FridgeItemRequest;
import com.hjs.foodshare.fridge.repository.FridgeItemRepository;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.post.service.PostService;
import com.hjs.foodshare.trade.service.TradeRequestService;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import com.hjs.foodshare.moderation.repository.UserBlockRepository;
import com.hjs.foodshare.moderation.domain.UserBlock;
import com.hjs.foodshare.global.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest @Transactional
class OpenFridgeTests {
 @Autowired OpenFridgeService open; @Autowired FridgeItemService fridge; @Autowired FridgeItemRepository items; @Autowired UserRepository users; @Autowired PostRepository posts; @Autowired TradeRequestService trades;
 @Autowired UserBlockRepository blocks;
 User user(String name,double lat){var u=User.create(name,name,name+"@test.local","pw","010"+name,"서울 강남구 비밀주소 123");u.updateLocation("서울 강남구 비밀주소 123",lat,127.0);return users.save(u);}
 Long item(User u){return fridge.createItem(u.getId(),new FridgeItemRequest("당근","3개",LocalDate.now(ZoneId.of("Asia/Seoul")).plusDays(4),"비밀 보관장소","비밀 메모")).id();}
 @Test void privateByDefaultAndOnlyExplicitFieldsPublished(){var owner=user("owner",37.5);var viewer=user("viewer",37.501);var id=item(owner);assertTrue(open.nearby(viewer.getId(),"").neighbors().isEmpty());var a=open.publish(owner.getId(),id,"1개");var b=open.publish(owner.getId(),id,"1개");assertEquals(a.postId(),b.postId());var list=open.nearby(viewer.getId(),"당근").neighbors();assertEquals(1,list.size());assertEquals("서울 강남구",list.getFirst().neighborhood());assertEquals("1개",list.getFirst().items().getFirst().amount());assertFalse(list.toString().contains("비밀"));assertTrue(open.nearby(owner.getId(),"").neighbors().isEmpty());}
 @Test void ownershipExpiryAndLocationAreEnforced(){var owner=user("own",37.5);var other=user("other",37.5);var id=item(owner);assertThrows(BusinessException.class,()->open.publish(other.getId(),id,"1개"));owner.updateLocation("미정",null,null);assertTrue(open.nearby(owner.getId(),"").locationRequired());assertThrows(BusinessException.class,()->open.publish(owner.getId(),id,"1개"));owner.updateLocation("서울 강남구",37.5,127.0);fridge.updateItem(owner.getId(),id,new FridgeItemRequest("당근","3개",LocalDate.now().minusDays(1),"냉장",""));assertThrows(BusinessException.class,()->open.publish(owner.getId(),id,"1개"));}
 @Test void requestUsesOneMarketTradeAndAcceptanceHidesBoth(){var owner=user("seller",37.5);var buyer=user("buyer",37.501);var other=user("buyer2",37.501);var id=item(owner);var published=open.publish(owner.getId(),id,"1개");var request=open.request(buyer.getId(),id);assertEquals(published.postId(),request.postId());assertTrue(open.nearby(buyer.getId(),"").neighbors().getFirst().items().getFirst().requested());assertThrows(BusinessException.class,()->open.request(buyer.getId(),id));var second=open.request(other.getId(),id);trades.accept(request.requestId(),owner.getId());assertFalse(posts.findById(published.postId()).orElseThrow().isOpen());assertTrue(open.nearby(other.getId(),"").neighbors().isEmpty());assertThrows(BusinessException.class,()->trades.accept(second.requestId(),owner.getId()));assertThrows(BusinessException.class,()->open.publish(owner.getId(),id,"1개"));}
 @Test void staleItemsCannotBeRequestedViaMarketEither(){var owner=user("stale",37.5);var buyer=user("staleBuyer",37.501);var id=item(owner);var shared=open.publish(owner.getId(),id,"1개");var f=items.findById(id).orElseThrow();ReflectionTestUtils.setField(f,"shareConfirmedAt",LocalDateTime.now().minusDays(8));f.getSharedPost().setOpenFridgeValidUntil(LocalDateTime.now().minusDays(1));assertTrue(open.nearby(buyer.getId(),"").neighbors().isEmpty());assertThrows(BusinessException.class,()->open.request(buyer.getId(),id));assertThrows(BusinessException.class,()->trades.createRequest(shared.postId(),buyer.getId()));}
 @Test void hideUpdateAndDeleteCloseLinkedListings(){var owner=user("lifecycle",37.5);var id=item(owner);var shared=open.publish(owner.getId(),id,"1개");open.hide(owner.getId(),id);assertFalse(posts.findById(shared.postId()).orElseThrow().isOpen());shared=open.publish(owner.getId(),id,"2개");fridge.updateItem(owner.getId(),id,new FridgeItemRequest("당근","2개",LocalDate.now().plusDays(3),"냉장",""));assertFalse(posts.findById(shared.postId()).orElseThrow().isOpen());shared=open.publish(owner.getId(),id,"1개");fridge.deleteItem(owner.getId(),id);assertFalse(posts.findById(shared.postId()).orElseThrow().isOpen());}
 @Test void distantAndBlockedUsersAreExcluded(){var owner=user("nearOwner",37.5);var far=user("far",36);var near=user("blocked",37.501);var id=item(owner);open.publish(owner.getId(),id,"1개");assertTrue(open.nearby(far.getId(),"").neighbors().isEmpty());assertThrows(BusinessException.class,()->open.request(far.getId(),id));blocks.save(UserBlock.create(near,owner));assertTrue(open.nearby(near.getId(),"").neighbors().isEmpty());assertThrows(BusinessException.class,()->open.request(near.getId(),id));}
}
