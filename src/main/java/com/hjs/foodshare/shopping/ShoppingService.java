package com.hjs.foodshare.shopping;

import com.hjs.foodshare.fridge.repository.FridgeItemRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.user.domain.User;
import jakarta.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service @Transactional(readOnly = true)
public class ShoppingService {
    @PersistenceContext EntityManager em;
    private final FridgeItemRepository fridge;
    public ShoppingService(FridgeItemRepository fridge) {this.fridge=fridge;}
    public record Entry(String name, String amount) {}
    public record Stock(String name, String amount, LocalDate expiryDate) {}
    public record Row(Long id, String name, String amount, String source, String state, boolean fridgeRegistered, List<Stock> stock) {}
    public record ListView(LocalDate weekStart, LocalDate today, int shoppingDay, boolean reminderEnabled, String reminderTime, List<Row> items) {}
    private BusinessException error(String message) {return new BusinessException(HttpStatus.BAD_REQUEST,message);}
    private LocalDate today() {return LocalDate.now(ZoneId.of("Asia/Seoul"));}
    private LocalDate week(LocalDate date) {
        LocalDate monday=(date==null?today():date).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        if(monday.isBefore(today().minusWeeks(53))||monday.isAfter(today().plusWeeks(53)))throw error("장보기 목록은 앞뒤 1년 범위에서 이용해주세요.");
        return monday;
    }
    private String clean(String value, int max, boolean required) {
        String s=value==null?"":value.strip();
        if(s.length()>max||(required&&s.isEmpty()))throw error("입력한 이름이나 수량의 길이를 확인해주세요.");
        return s;
    }
    private String key(String name) {String s=name.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);return s.equals("달걀")?"계란":s;}
    private void lock(Long userId) {if(em.find(User.class,userId,LockModeType.PESSIMISTIC_WRITE)==null)throw new BusinessException(HttpStatus.UNAUTHORIZED,"다시 로그인해주세요.");}
    private List<ShoppingItem> rows(Long userId, LocalDate monday) {
        return em.createQuery("select i from ShoppingItem i where i.userId=:user and i.weekStart=:week order by i.id",ShoppingItem.class).setParameter("user",userId).setParameter("week",monday).getResultList();
    }
    public ListView get(Long userId, LocalDate date) {
        LocalDate monday=week(date);var preference=em.find(ShoppingPreference.class,userId);
        var stock=fridge.findAllByUserIdOrderByExpiryDateAscCreatedAtAsc(userId).stream().filter(f->!f.getExpiryDate().isBefore(today())).toList();
        var result=rows(userId,monday).stream().map(i->new Row(i.id,i.name,i.amount,i.source,i.state,i.fridgeItemId!=null,stock.stream().filter(f->key(f.getName()).equals(key(i.name))).map(f->new Stock(f.getName(),f.getAmount(),f.getExpiryDate())).toList())).toList();
        return new ListView(monday,today(),preference==null?7:preference.shoppingDay,preference!=null&&Boolean.TRUE.equals(preference.reminderEnabled),LocalTime.ofSecondOfDay((preference==null||preference.reminderMinute==null?540:preference.reminderMinute)*60L).toString(),result);
    }
    @Transactional public ListView add(Long userId, LocalDate date, String source, List<Entry> entries) {
        LocalDate monday=week(date);String origin=clean(source,120,false);
        if(entries==null||entries.isEmpty()||entries.size()>50)throw error("재료는 한 번에 1~50개까지 담을 수 있어요.");
        lock(userId);var existing=new ArrayList<>(rows(userId,monday));
        for(var entry:entries) {
            if(entry==null)throw error("재료를 확인해주세요.");
            String name=clean(entry.name(),100,true),amount=clean(entry.amount(),100,false);
            if(amount.isEmpty())amount="수량 확인";
            final String quantity=amount;
            // Keep quantities from different menus separate; never infer unit conversions.
            if(existing.stream().anyMatch(i->key(i.name).equals(key(name))&&i.source.equals(origin)&&i.amount.equals(quantity)))continue;
            if(existing.size()>=200)throw error("한 주에는 최대 200개까지 담을 수 있어요.");
            var item=new ShoppingItem(userId,monday,name,amount,origin);em.persist(item);existing.add(item);
        }
        em.flush();return get(userId,monday);
    }
    @Transactional public ListView update(Long userId, Long id, String state, String amount) {
        lock(userId);var item=em.find(ShoppingItem.class,id);
        if(item==null||!item.userId.equals(userId))throw new BusinessException(HttpStatus.NOT_FOUND,"장보기 품목을 찾지 못했어요.");
        if(state!=null) {if(!Set.of("NEED","HAVE","BOUGHT").contains(state))throw error("품목 상태를 확인해주세요.");item.state=state;}
        if(amount!=null)item.amount=clean(amount,100,true);
        return get(userId,item.weekStart);
    }
    @Transactional public ListView delete(Long userId, Long id) {
        lock(userId);var item=em.find(ShoppingItem.class,id);
        if(item==null||!item.userId.equals(userId))throw new BusinessException(HttpStatus.NOT_FOUND,"장보기 품목을 찾지 못했어요.");
        LocalDate monday=item.weekStart;em.remove(item);em.flush();return get(userId,monday);
    }
    @Transactional public ListView day(Long userId, int day, LocalDate date) {
        if(day<1||day>7)throw error("장보는 요일을 확인해주세요.");lock(userId);
        var preference=em.find(ShoppingPreference.class,userId);
        if(preference==null)em.persist(new ShoppingPreference(userId,day));else preference.shoppingDay=day;
        return get(userId,date);
    }

    @Transactional public ListView reminder(Long userId, boolean enabled, String time, LocalDate date) {
        if(time==null||!time.matches("[0-2][0-9]:[0-5][0-9]"))throw error("알림 시간을 확인해주세요.");
        LocalTime parsed;
        try {parsed=LocalTime.parse(time);} catch(java.time.format.DateTimeParseException e) {throw error("알림 시간을 확인해주세요.");}
        lock(userId);var preference=em.find(ShoppingPreference.class,userId);
        if(preference==null) {preference=new ShoppingPreference(userId,7);em.persist(preference);}
        preference.reminderEnabled=enabled;preference.reminderMinute=parsed.getHour()*60+parsed.getMinute();
        return get(userId,date);
    }
    @Transactional public ListView registerFridge(Long userId, Long id, String amount, LocalDate expiry, String storage) {
        lock(userId);var item=em.find(ShoppingItem.class,id);
        if(item==null||!item.userId.equals(userId))throw new BusinessException(HttpStatus.NOT_FOUND,"장보기 품목을 찾지 못했어요.");
        // A repeated click or a retried request must not register the same purchase twice.
        if(item.fridgeItemId!=null)return get(userId,item.weekStart);
        if(!"BOUGHT".equals(item.state))throw error("구매 완료한 품목만 냉장고에 등록할 수 있어요.");
        String quantity=clean(amount,50,true);
        if(expiry==null||expiry.isBefore(today()))throw error("표시된 기한을 확인해주세요. 오늘 이후의 날짜가 필요해요.");
        if(storage==null||!Set.of("냉장","냉동","실온").contains(storage))throw error("보관 위치를 선택해주세요.");
        var food=com.hjs.foodshare.fridge.domain.FridgeItem.create(em.find(User.class,userId),item.name,quantity,expiry,storage,"장보기에서 등록");
        fridge.saveAndFlush(food);item.fridgeItemId=food.getId();
        return get(userId,item.weekStart);
    }
}
