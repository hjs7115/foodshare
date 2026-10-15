package com.hjs.foodshare;

import com.hjs.foodshare.shopping.*;
import com.hjs.foodshare.fridge.service.FridgeItemService;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import com.hjs.foodshare.notification.repository.NotificationRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.security.JwtTokenProvider;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @Transactional
class ShoppingFollowupTests {
    @Autowired ShoppingService shopping;
    @Autowired ShoppingReminderService reminders;
    @Autowired UserRepository users;
    @Autowired FridgeItemService fridge;
    @Autowired NotificationRepository notifications;
    @Autowired EntityManager em;
    @Autowired MockMvc mvc;
    @Autowired JwtTokenProvider jwt;
    LocalDate today() {return LocalDate.now(ZoneId.of("Asia/Seoul"));}
    User user(String name) {return users.save(User.create(name,name,name+"@test.local","pw","010"+name,"서울"));}
    Long item(User u) {return shopping.add(u.getId(),today(),"",List.of(new ShoppingService.Entry("두부","1모"))).items().getFirst().id();}
    void enable(User u) {shopping.day(u.getId(),today().getDayOfWeek().getValue(),today());shopping.reminder(u.getId(),true,"10:30",today());}
    @Test void remindersAreOptInAndPreferencesPersist() {
        var u=user("reminderDefault");item(u);assertFalse(shopping.get(u.getId(),today()).reminderEnabled());
        assertFalse(reminders.deliver(u.getId(),today().atTime(11,0)));enable(u);em.flush();em.clear();
        var p=shopping.get(u.getId(),today());assertTrue(p.reminderEnabled());assertEquals("10:30",p.reminderTime());
        shopping.day(u.getId(),1,today());assertTrue(shopping.get(u.getId(),today()).reminderEnabled());
    }
    @Test void dueTimeWeekAndDuplicateDeliveryAreEnforced() {
        var u=user("reminderOnce");item(u);enable(u);
        assertFalse(reminders.dueUsers(today().atTime(10,29)).contains(u.getId()));assertFalse(reminders.deliver(u.getId(),today().atTime(10,29)));
        assertTrue(reminders.dueUsers(today().atTime(10,30)).contains(u.getId()));assertTrue(reminders.deliver(u.getId(),today().atTime(10,30)));
        em.flush();em.clear();assertFalse(reminders.deliver(u.getId(),today().atTime(11,0)));assertEquals(1,notifications.findAllByUserIdOrderByCreatedAtDesc(u.getId()).size());
        assertFalse(reminders.dueUsers(today().atTime(12,0)).contains(u.getId()));
        var note=notifications.findAllByUserIdOrderByCreatedAtDesc(u.getId()).getFirst();assertEquals("SHOPPING",note.getTargetType());
        assertEquals(shopping.get(u.getId(),today()).weekStart().toEpochDay(),note.getTargetId());
    }
    @Test void emptyOwnedBoughtDisabledAndWrongDayDoNotNotify() {
        var u=user("reminderSkip");enable(u);assertFalse(reminders.deliver(u.getId(),today().atTime(11,0)));
        var id=item(u);shopping.update(u.getId(),id,"HAVE",null);assertFalse(reminders.deliver(u.getId(),today().atTime(11,0)));
        shopping.update(u.getId(),id,"BOUGHT",null);assertFalse(reminders.deliver(u.getId(),today().atTime(11,0)));
        shopping.update(u.getId(),id,"NEED",null);shopping.reminder(u.getId(),false,"10:30",today());assertFalse(reminders.deliver(u.getId(),today().atTime(11,0)));
        enable(u);assertFalse(reminders.deliver(u.getId(),today().plusDays(1).atTime(11,0)));assertTrue(notifications.findAllByUserIdOrderByCreatedAtDesc(u.getId()).isEmpty());
    }
    @Test void nextWeeksListCanNotifyAgainButOldItemsAreNotUsed() {
        var u=user("reminderNext");item(u);enable(u);assertTrue(reminders.deliver(u.getId(),today().atTime(11,0)));
        var next=today().plusWeeks(1);assertFalse(reminders.deliver(u.getId(),next.atTime(11,0)));
        shopping.add(u.getId(),next,"",List.of(new ShoppingService.Entry("양파","1개")));assertTrue(reminders.deliver(u.getId(),next.atTime(11,0)));
    }
    @Test void registrationUsesConfirmedDetailsAndIsIdempotent() {
        var u=user("registerOnce");var id=item(u);shopping.update(u.getId(),id,"BOUGHT",null);
        var r=shopping.registerFridge(u.getId(),id,"2모",today().plusDays(5),"냉장");assertTrue(r.items().getFirst().fridgeRegistered());
        em.flush();em.clear();shopping.registerFridge(u.getId(),id,"2모",today().plusDays(5),"냉장");
        var foods=fridge.getItems(u.getId());assertEquals(1,foods.size());assertEquals("2모",foods.getFirst().amount());assertEquals(today().plusDays(5),foods.getFirst().expiryDate());
        fridge.deleteItem(u.getId(),foods.getFirst().id());shopping.registerFridge(u.getId(),id,"2모",today().plusDays(5),"냉장");assertTrue(fridge.getItems(u.getId()).isEmpty());
    }
    @Test void registrationRequiresOwnershipPurchaseAndValidDetails() {
        var u=user("registerAuth");var other=user("registerOther");var id=item(u);
        assertThrows(BusinessException.class,()->shopping.registerFridge(other.getId(),id,"1모",today(),"냉장"));
        assertThrows(BusinessException.class,()->shopping.registerFridge(u.getId(),id,"1모",today(),"냉장"));
        shopping.update(u.getId(),id,"BOUGHT",null);
        assertThrows(BusinessException.class,()->shopping.registerFridge(u.getId(),id,"1모",null,"냉장"));
        assertThrows(BusinessException.class,()->shopping.registerFridge(u.getId(),id,"1모",today().minusDays(1),"냉장"));
        assertThrows(BusinessException.class,()->shopping.registerFridge(u.getId(),id,"1모",today(),"기타"));
        assertThrows(BusinessException.class,()->shopping.registerFridge(u.getId(),id," ",today(),"냉장"));assertTrue(fridge.getItems(u.getId()).isEmpty());
    }
    @Test void reminderTimeAndNewEndpointAuthenticationAreValidated() throws Exception {
        var u=user("reminderApi");assertThrows(BusinessException.class,()->shopping.reminder(u.getId(),true,"25:00",today()));
        mvc.perform(post("/api/shopping/items/1/fridge").contentType("application/json").content("{}")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/shopping/reminder").header("Authorization","Bearer "+jwt.createAccessToken(u)).contentType("application/json").content("{\"enabled\":true,\"time\":\"10:30\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.data.reminderEnabled").value(true));
    }
}
