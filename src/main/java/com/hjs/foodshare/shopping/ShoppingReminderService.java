package com.hjs.foodshare.shopping;

import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.notification.service.NotificationService;
import jakarta.persistence.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

@Service @Transactional(readOnly=true)
public class ShoppingReminderService {
    @PersistenceContext EntityManager em;
    private final NotificationService notifications;
    public ShoppingReminderService(NotificationService notifications) {this.notifications=notifications;}
    private LocalDate week(LocalDateTime now) {return now.toLocalDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));}
    public List<Long> dueUsers(LocalDateTime now) {
        return em.createQuery("select p.userId from ShoppingPreference p where p.reminderEnabled=true and p.shoppingDay=:day and coalesce(p.reminderMinute,540)<=:minute and (p.lastReminderWeek is null or p.lastReminderWeek<>:week) and exists (select u.id from User u where u.id=p.userId) and exists (select i.id from ShoppingItem i where i.userId=p.userId and i.weekStart=:week and i.state='NEED') order by p.userId",Long.class)
            .setParameter("day",now.getDayOfWeek().getValue()).setParameter("minute",now.getHour()*60+now.getMinute()).setParameter("week",week(now)).setMaxResults(200).getResultList();
    }
    @Transactional public boolean deliver(Long userId, LocalDateTime now) {
        // Serialize with list edits and preference changes, including concurrent scheduler runs.
        if(em.find(User.class,userId,LockModeType.PESSIMISTIC_WRITE)==null)return false;
        var p=em.find(ShoppingPreference.class,userId);LocalDate monday=week(now);
        if(p==null||!Boolean.TRUE.equals(p.reminderEnabled)||p.shoppingDay!=now.getDayOfWeek().getValue()||now.getHour()*60+now.getMinute()<(p.reminderMinute==null?540:p.reminderMinute)||monday.equals(p.lastReminderWeek))return false;
        long count=em.createQuery("select count(i) from ShoppingItem i where i.userId=:user and i.weekStart=:week and i.state='NEED'",Long.class).setParameter("user",userId).setParameter("week",monday).getSingleResult();
        if(count==0)return false;
        p.lastReminderWeek=monday;
        notifications.createNotification(userId,"SHOPPING_REMINDER","오늘은 장보는 날이에요",monday+" 주 장보기 목록에 살 품목 "+count+"개가 남아 있어요.","SHOPPING",monday.toEpochDay());
        return true;
    }
}
