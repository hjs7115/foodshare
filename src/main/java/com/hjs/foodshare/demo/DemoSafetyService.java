package com.hjs.foodshare.demo;

import com.hjs.foodshare.global.exception.BusinessException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Deliberately conservative anti-spam safeguards.
 * No language or subjective "bad behaviour" classifier can ban legitimate demo users.
 * Only extreme account-scoped bursts trigger short, self-expiring demo-only restrictions.
 */
@Service
public class DemoSafetyService {
    public enum Activity { POST, REQUEST, MESSAGE }
    private enum Decision { ALLOW, RESTRICTED }

    @PersistenceContext private EntityManager em;
    private final TransactionTemplate tx;

    public DemoSafetyService(PlatformTransactionManager manager) {
        tx = new TransactionTemplate(manager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public boolean canParticipate(Long userId) {
        if(userId==null)return false;
        DemoParticipationControl state=em.find(DemoParticipationControl.class,userId);
        return state==null || (!state.permanentlyRestricted && (state.restrictedUntil==null
                || !state.restrictedUntil.isAfter(LocalDateTime.now())));
    }

    /** Post submission succeeds normally, but automated demo requests are omitted if restricted. */
    public boolean allowPost(Long userId) {
        return record(userId,Activity.POST)==Decision.ALLOW;
    }

    public void require(Long userId,Activity activity) {
        if(userId!=null) {
            DemoParticipationControl state=em.find(DemoParticipationControl.class,userId);
            if(state!=null && state.permanentlyRestricted)
                throw new BusinessException(HttpStatus.FORBIDDEN,
                    "명백한 부적절한 메시지가 반복되어 이 계정의 AI 체험이 제한되었습니다. 해제는 운영자에게 문의해주세요.");
        }
        if(record(userId,activity)!=Decision.ALLOW)
            throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS,
                    "시연 이용이 잠시 제한되었습니다. 반복 요청이 매우 많아 일시 중지했어요. 잠시 후 자동으로 해제됩니다.");
    }

    private Decision record(Long userId,Activity activity) {
        if(userId==null)return Decision.RESTRICTED;
        return tx.execute(status -> {
            LocalDateTime now=LocalDateTime.now();
            DemoParticipationControl state=em.find(DemoParticipationControl.class,userId,LockModeType.PESSIMISTIC_WRITE);
            if(state==null){
                state=new DemoParticipationControl(userId,now);
                em.persist(state);
            }
            if(state.permanentlyRestricted || (state.restrictedUntil!=null && state.restrictedUntil.isAfter(now)))
                return Decision.RESTRICTED;
            if(state.windowStart.isBefore(now.minusMinutes(10)))
                state.resetWindow(now);
            // Thresholds are intentionally much higher than ordinary demonstrations.
            int count=switch(activity){
                case POST -> ++state.posts;
                case REQUEST -> ++state.requests;
                case MESSAGE -> ++state.messages;
            };
            int limit=switch(activity){
                case POST -> 30;
                case REQUEST -> 50;
                case MESSAGE -> 90;
            };
            if(count<=limit)return Decision.ALLOW;
            // First event: 1-minute pause. Further extreme bursts in a day: 10 minutes.
            if(state.lastViolation==null || state.lastViolation.isBefore(now.minusHours(24)))
                state.violations=0;
            state.violations++;
            state.lastViolation=now;
            state.restrictedUntil=now.plusMinutes(state.violations==1?1:10);
            state.resetWindow(now);
            return Decision.RESTRICTED;
        });
    }

    /**
     * Reject unmistakably abusive/sexual solicitations before they are stored as
     * chat messages, so the AI never replies to them.
     * Three separate qualifying messages in 24 hours permanently disable only
     * this account's AI demonstration; managers can manually restore access.
     */
    public void checkChatMessage(Long userId, String message) {
        if (userId == null || !DemoSafetySignals.unmistakableHarassment(message)) return;
        int strikes = tx.execute(status -> {
            LocalDateTime now = LocalDateTime.now();
            DemoParticipationControl state = em.find(DemoParticipationControl.class,userId,LockModeType.PESSIMISTIC_WRITE);
            if (state == null) {
                state = new DemoParticipationControl(userId,now);
                em.persist(state);
            }
            if (state.permanentlyRestricted) return 3;
            if (state.abuseWindowStart == null || state.abuseWindowStart.isBefore(now.minusHours(24))) {
                state.abuseWindowStart=now;
                state.explicitAbuseSignals=0;
            }
            state.explicitAbuseSignals++;
            if (state.explicitAbuseSignals >= 3) state.permanentlyRestricted=true;
            return state.explicitAbuseSignals;
        });
        if (strikes >= 3)
            throw new BusinessException(HttpStatus.FORBIDDEN,
                "명백한 부적절한 메시지가 반복되어 이 계정의 AI 체험이 제한되었습니다. 해제는 운영자에게 문의해주세요.");
        throw new BusinessException(HttpStatus.BAD_REQUEST,
                "AI 거래 채팅에서는 욕설이나 성적인 요구를 보낼 수 없습니다. 메시지는 전송되지 않았습니다. ("+strikes+"/3)");
    }

    /** Manual operator correction; account and ordinary trade data are not touched. */
    public void clear(Long userId) {
        tx.executeWithoutResult(status -> {
            DemoParticipationControl state=em.find(DemoParticipationControl.class,userId,LockModeType.PESSIMISTIC_WRITE);
            if(state!=null)em.remove(state);
        });
    }
}
