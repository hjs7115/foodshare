package com.hjs.foodshare;

import com.hjs.foodshare.shopping.ShoppingService;
import com.hjs.foodshare.shopping.ShoppingService.Entry;
import com.hjs.foodshare.fridge.service.FridgeItemService;
import com.hjs.foodshare.fridge.dto.FridgeItemRequest;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.global.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import java.time.*;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @Transactional
class ShoppingTests {
    @Autowired ShoppingService shopping;
    @Autowired UserRepository users;
    @Autowired FridgeItemService fridge;
    @Autowired EntityManager em;
    @Autowired MockMvc mvc;
    @Autowired JwtTokenProvider jwt;
    User user(String name) {return users.save(User.create(name,name,name+"@test.local","pw","010"+name,"서울"));}
    LocalDate today() {return LocalDate.now(ZoneId.of("Asia/Seoul"));}
    List<Entry> tofu() {return List.of(new Entry("두부","반 모"));}
    @Test void listIsAccountPrivateAndForeignMutationsFail() {
        var a=user("shopA");var b=user("shopB");
        var id=shopping.add(a.getId(),today(),"두부조림",tofu()).items().getFirst().id();
        assertTrue(shopping.get(b.getId(),today()).items().isEmpty());
        assertThrows(BusinessException.class,()->shopping.update(b.getId(),id,"BOUGHT",null));
        assertThrows(BusinessException.class,()->shopping.delete(b.getId(),id));
    }
    @Test void weeksAreSeparateAndSurvivePersistenceReload() {
        var a=user("shopWeeks");var first=shopping.add(a.getId(),today(),"두부조림",tofu());
        assertEquals(DayOfWeek.MONDAY,first.weekStart().getDayOfWeek());
        shopping.day(a.getId(),3,today());em.flush();em.clear();
        assertEquals(1,shopping.get(a.getId(),today()).items().size());
        assertEquals(3,shopping.get(a.getId(),today().plusWeeks(1)).shoppingDay());
        assertTrue(shopping.get(a.getId(),today().plusWeeks(1)).items().isEmpty());
    }
    @Test void repeatedRequestsDeduplicateButDifferentRecipesKeepQuantities() {
        var a=user("shopDuplicate");shopping.add(a.getId(),today(),"두부조림",tofu());
        assertEquals(1,shopping.add(a.getId(),today(),"두부조림",tofu()).items().size());
        var result=shopping.add(a.getId(),today(),"두부전",List.of(new Entry("두부","100g")));
        assertEquals(2,result.items().size());assertEquals("반 모",result.items().getFirst().amount());
    }
    @Test void stockHintsExcludeExpiredAndDoNotAssumeEnoughQuantity() {
        var a=user("shopStock");var b=user("shopStockOther");
        fridge.createItem(a.getId(),new FridgeItemRequest("두부","조금",today().plusDays(2),"냉장",""));
        fridge.createItem(a.getId(),new FridgeItemRequest("두부","1모",today().minusDays(1),"냉장",""));
        fridge.createItem(b.getId(),new FridgeItemRequest("두부","2모",today().plusDays(2),"냉장",""));
        var row=shopping.add(a.getId(),today(),"두부조림",tofu()).items().getFirst();
        assertEquals(1,row.stock().size());assertEquals("조금",row.stock().getFirst().amount());assertEquals("NEED",row.state());
    }
    @Test void statusAndQuantityCanBeReversedWithoutChangingInventory() {
        var a=user("shopStatus");var id=shopping.add(a.getId(),today(),"",tofu()).items().getFirst().id();
        assertEquals("HAVE",shopping.update(a.getId(),id,"HAVE",null).items().getFirst().state());
        assertEquals("BOUGHT",shopping.update(a.getId(),id,"BOUGHT",null).items().getFirst().state());
        var result=shopping.update(a.getId(),id,"NEED","1모");assertEquals("1모",result.items().getFirst().amount());
        assertTrue(shopping.delete(a.getId(),id).items().isEmpty());
        assertTrue(fridge.getItems(a.getId()).isEmpty());
    }
    @Test void invalidAndOversizedRequestsAreRejected() {
        var a=user("shopInvalid");assertThrows(BusinessException.class,()->shopping.add(a.getId(),today(),"",List.of(new Entry(" ","1개"))));
        assertThrows(BusinessException.class,()->shopping.add(a.getId(),today(),"",java.util.Collections.nCopies(51,new Entry("두부","1모"))));
        assertThrows(BusinessException.class,()->shopping.day(a.getId(),8,today()));
        assertThrows(BusinessException.class,()->shopping.get(a.getId(),today().plusYears(3)));
    }
    @Test void apiRequiresAuthenticationAndValidatesState() throws Exception {
        mvc.perform(get("/api/shopping")).andExpect(status().isUnauthorized());
        var a=user("shopApi");var id=shopping.add(a.getId(),today(),"",tofu()).items().getFirst().id();var token=jwt.createAccessToken(a);
        mvc.perform(patch("/api/shopping/items/"+id).header("Authorization","Bearer "+token).contentType("application/json").content("{\"state\":\"WRONG\"}")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/shopping").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.data.items[0].name").value("두부"));
    }
}
