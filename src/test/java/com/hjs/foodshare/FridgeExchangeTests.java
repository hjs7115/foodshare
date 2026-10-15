package com.hjs.foodshare;
import com.hjs.foodshare.fridge.exchange.*;
import com.hjs.foodshare.fridge.open.OpenFridgeService;
import com.hjs.foodshare.fridge.service.FridgeItemService;
import com.hjs.foodshare.fridge.dto.FridgeItemRequest;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import com.hjs.foodshare.chat.service.ChatService;
import com.hjs.foodshare.trade.service.TradeRequestService;
import com.hjs.foodshare.global.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest @Transactional
class FridgeExchangeTests {
 @Autowired FridgeExchangeService exchange;@Autowired FridgeExchangeRepository repo;@Autowired OpenFridgeService open;@Autowired FridgeItemService fridge;@Autowired UserRepository users;@Autowired ChatService chats;@Autowired TradeRequestService trades;
 User user(String name){var u=User.create(name,name,name+"@test.local","pw","010"+name,"서울 강남구");u.updateLocation("서울 강남구",37.5,127.0);return users.save(u);}
 Long item(User u,String name){var i=fridge.createItem(u.getId(),new FridgeItemRequest(name,"2개",LocalDate.now(ZoneId.of("Asia/Seoul")).plusDays(3),"냉장",""));open.publish(u.getId(),i.id(),"1개");return i.id();}
 @Test void acceptsBothLotsCreatesOneChatAndCompletes(){var a=user("swapA");var b=user("swapB");var x=item(a,"당근");var y=item(b,"두부");var p=exchange.propose(a.getId(),x,y);assertFalse(p.incoming());assertTrue(exchange.mine(b.getId()).getFirst().incoming());var accepted=exchange.act(b.getId(),p.id(),"accept");assertEquals("ACCEPTED",accepted.status());assertNotNull(accepted.chatRoomId());assertEquals(1,chats.getRooms(a.getId(),"ALL").size());assertTrue(chats.getMessages(a.getId(),accepted.chatRoomId()).stream().anyMatch(m->m.content().contains("당근 1개 ↔")));assertTrue(open.nearby(a.getId(),"").neighbors().isEmpty());assertTrue(open.nearby(b.getId(),"").neighbors().isEmpty());assertThrows(BusinessException.class,()->open.publish(a.getId(),x,"1개"));assertThrows(BusinessException.class,()->open.publish(b.getId(),y,"1개"));assertEquals("COMPLETED",exchange.act(a.getId(),p.id(),"complete").status());assertEquals("COMPLETED",exchange.mine(b.getId()).getFirst().status());}
 @Test void onlyOwnersAndCounterpartyCanAct(){var a=user("authA");var b=user("authB");var c=user("authC");var x=item(a,"양파");var y=item(b,"계란");assertThrows(BusinessException.class,()->exchange.propose(c.getId(),x,y));var p=exchange.propose(a.getId(),x,y);assertThrows(BusinessException.class,()->exchange.act(a.getId(),p.id(),"accept"));assertThrows(BusinessException.class,()->exchange.act(c.getId(),p.id(),"accept"));assertThrows(BusinessException.class,()->exchange.act(b.getId(),p.id(),"cancel"));assertTrue(exchange.mine(c.getId()).isEmpty());}
 @Test void duplicateAndReverseProposalAreRejected(){var a=user("dupA");var b=user("dupB");var x=item(a,"당근");var y=item(b,"두부");exchange.propose(a.getId(),x,y);assertThrows(BusinessException.class,()->exchange.propose(a.getId(),x,y));assertThrows(BusinessException.class,()->exchange.propose(b.getId(),y,x));}
 @Test void pendingCanBeCancelledOrRejectedWithoutClosingFood(){var a=user("cancelA");var b=user("cancelB");var x=item(a,"당근");var y=item(b,"두부");var p=exchange.propose(a.getId(),x,y);assertEquals("CANCELLED",exchange.act(a.getId(),p.id(),"cancel").status());var again=exchange.propose(a.getId(),x,y);assertEquals("REJECTED",exchange.act(b.getId(),again.id(),"reject").status());assertEquals("PUBLIC",open.mine(a.getId()).getFirst().state());assertEquals("PUBLIC",open.mine(b.getId()).getFirst().state());}
 @Test void changedInventoryCannotBeAccepted(){var a=user("changeA");var b=user("changeB");var x=item(a,"당근");var y=item(b,"두부");var p=exchange.propose(a.getId(),x,y);open.hide(a.getId(),x);assertEquals("EXPIRED",exchange.mine(b.getId()).getFirst().status());assertThrows(BusinessException.class,()->exchange.act(b.getId(),p.id(),"accept"));assertTrue(chats.getRooms(a.getId(),"ALL").isEmpty());}
 @Test void competingExchangeAndNormalTradeCannotReuseReservedLot(){var a=user("raceA");var b=user("raceB");var c=user("raceC");var x=item(a,"당근");var y=item(b,"두부");var z=item(c,"계란");var p=exchange.propose(a.getId(),x,y);var q=exchange.propose(c.getId(),z,y);var normal=open.request(c.getId(),y);exchange.act(b.getId(),p.id(),"accept");assertEquals("EXPIRED",exchange.mine(c.getId()).getFirst().status());assertThrows(BusinessException.class,()->exchange.act(b.getId(),q.id(),"accept"));assertThrows(BusinessException.class,()->trades.accept(normal.requestId(),b.getId()));}
 @Test void distanceAndSelfExchangeAreRejected(){var a=user("farA");var b=user("farB");var x=item(a,"당근");var y=item(b,"두부");var z=item(a,"계란");assertThrows(BusinessException.class,()->exchange.propose(a.getId(),x,z));b.updateLocation("부산",35.1,129.0);assertThrows(BusinessException.class,()->exchange.propose(a.getId(),x,y));}
}
