package com.hjs.foodshare.demo;

import com.hjs.foodshare.chat.domain.ChatMessage;
import com.hjs.foodshare.trade.domain.TradeRequest;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Gathers only actual persisted trade conversation for simulation review drafting. */
public final class DemoReviewContext {
    private DemoReviewContext() {}

    public static String from(EntityManager em, TradeRequest trade, Long roomId, Long reviewerId) {
        StringBuilder context = new StringBuilder("거래 종류: ")
                .append(trade.getPost().getPostType())
                .append("\n상품: ").append(trade.getPost().getIngredientName())
                .append("\n후기 작성자: 거래 상대(자동 응답 계정)")
                .append("\n후기 대상: 실제 사용자")
                .append("\n대화 기록:\n");
        if (roomId != null) {
            Long targetId = reviewerId.equals(trade.getRequester().getId())
                    ? trade.getPost().getWriter().getId() : trade.getRequester().getId();
            List<ChatMessage> latest = em.createQuery(
                    "select m from ChatMessage m left join fetch m.sender where m.chatRoom.id=:room and m.systemMessage=false and m.sender.id in :people order by m.id desc",
                    ChatMessage.class)
                    .setParameter("room", roomId).setParameter("people",List.of(reviewerId,targetId)).setMaxResults(24).getResultList();
            List<ChatMessage> ordered = new ArrayList<>(latest);
            Collections.reverse(ordered);
            for (ChatMessage m : ordered) {
                if (m.getSender() == null || m.getContent() == null) continue;
                String speaker = reviewerId.equals(m.getSender().getId()) ? "자동 응답 상대" : "사용자";
                String message = m.getContent().strip().replace('\n', ' ');
                if (message.length() > 180) message = message.substring(0, 180);
                if (context.length() > 3500) break;
                context.append(speaker).append(": ").append(message).append('\n');
            }
        }
        return context.toString();
    }
}
