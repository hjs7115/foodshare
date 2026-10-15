package com.hjs.foodshare.shopping;

import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.*;

@Component
public class ShoppingReminderScheduler {
    private static final Logger log=LoggerFactory.getLogger(ShoppingReminderScheduler.class);
    private final ShoppingReminderService reminders;
    public ShoppingReminderScheduler(ShoppingReminderService reminders) {this.reminders=reminders;}
    @Scheduled(cron="0 * * * * *",zone="Asia/Seoul")
    public void sendDue() {
        LocalDateTime now=LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        for(Long userId:reminders.dueUsers(now)) {
            try {reminders.deliver(userId,now);} catch(RuntimeException e) {log.warn("Shopping reminder delivery failed for user {}: {}",userId,e.getClass().getSimpleName());}
        }
    }
}
