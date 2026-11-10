package com.hjs.foodshare.chat.service;

import com.hjs.foodshare.chat.domain.ChatMessage;
import com.hjs.foodshare.chat.domain.ChatRoom;
import com.hjs.foodshare.chat.domain.ChatRoomMember;
import com.hjs.foodshare.chat.dto.ChatMessageRequest;
import com.hjs.foodshare.chat.dto.ChatMessageResponse;
import com.hjs.foodshare.chat.dto.ChatParticipantResponse;
import com.hjs.foodshare.chat.dto.ChatRoomNameRequest;
import com.hjs.foodshare.chat.dto.ChatRoomResponse;
import com.hjs.foodshare.chat.repository.ChatMessageRepository;
import com.hjs.foodshare.chat.repository.ChatRoomMemberRepository;
import com.hjs.foodshare.chat.repository.ChatRoomRepository;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.notification.service.NotificationService;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import com.hjs.foodshare.trade.repository.TradeRequestRepository;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ChatService {

    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager em;
    @org.springframework.beans.factory.annotation.Autowired private com.hjs.foodshare.demo.DemoVisibility demo;
    @org.springframework.beans.factory.annotation.Autowired private com.hjs.foodshare.moderation.repository.UserBlockRepository blocks;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final TradeRequestRepository tradeRequestRepository;

    public ChatService(
            ChatRoomRepository chatRoomRepository,
            ChatMessageRepository chatMessageRepository,
            ChatRoomMemberRepository chatRoomMemberRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            TradeRequestRepository tradeRequestRepository
    ) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.tradeRequestRepository = tradeRequestRepository;
    }

    @Transactional
    public ChatRoom openRoomForTradeRequest(TradeRequest tradeRequest) {
        if(blocks.blockedEitherWay(tradeRequest.getRequester().getId(),tradeRequest.getPost().getWriter().getId()))throw new BusinessException(HttpStatus.FORBIDDEN,"차단된 사용자와 새 방을 열 수 없습니다.");
        return chatRoomRepository.findByTradeRequestId(tradeRequest.getId())
                .orElseGet(() -> {
                    ChatRoom room = chatRoomRepository.save(ChatRoom.create(tradeRequest));
                    addMemberIfAbsent(room, tradeRequest.getPost().getWriter(), 0);
                    addMemberIfAbsent(room, tradeRequest.getRequester(), 1);
                    if (!(demo.enabled() && demo.isSimulation(tradeRequest.getId()))) {
                        chatMessageRepository.save(ChatMessage.system(room, "채팅방이 개설되었습니다."));
                    }
                    return room;
                });
    }

    @Transactional
    public ChatRoom openGroupRoomForTradeRequests(List<TradeRequest> tradeRequests) {
        if (tradeRequests == null || tradeRequests.isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "At least one trade request is required.");
        }
        for(var request:tradeRequests)if(blocks.blockedEitherWay(request.getRequester().getId(),request.getPost().getWriter().getId()))throw new BusinessException(HttpStatus.FORBIDDEN,"차단된 사용자와 새 방을 열 수 없습니다.");
        TradeRequest primaryRequest = tradeRequests.get(0);
        ChatRoom room = chatRoomRepository.findGroupRoomByPostId(primaryRequest.getPost().getId())
                .orElseGet(() -> chatRoomRepository.findByTradeRequestId(primaryRequest.getId())
                        .orElseGet(() -> chatRoomRepository.save(ChatRoom.create(primaryRequest))));
        boolean newlyPromotedGroupRoom = !room.isGroupRoom();
        if (newlyPromotedGroupRoom) {
            room.markAsGroupRoom();
        }
        addMemberIfAbsent(room, primaryRequest.getPost().getWriter(), 0);
        tradeRequests.forEach(request -> {
            addMemberIfAbsent(room, request.getRequester(), 1);
            chatRoomMemberRepository.findByChatRoomIdAndUserId(room.getId(), request.getRequester().getId())
                    .filter(m -> !m.isActive() && request.getCreatedAt().isAfter(m.getLeftAt()))
                    .ifPresent(ChatRoomMember::rejoin);
        });
        if (newlyPromotedGroupRoom) {
            chatMessageRepository.save(ChatMessage.system(room, "채팅방이 개설되었습니다."));
        }
        return room;
    }

    public List<ChatRoomResponse> getRooms(Long userId, String filter) {
        List<ChatRoom> rooms = switch ((filter == null ? "ALL" : filter).toUpperCase()) {
            case "SHARE", "SALE", "SHARING" -> chatRoomRepository.findAllByParticipantIdAndPostTypes(
                    userId,
                    List.of(PostType.SHARE, PostType.SALE, PostType.BUY)
            );
            case "GROUP", "GROUP_BUY" -> chatRoomRepository.findAllByParticipantIdAndPostTypes(
                    userId,
                    List.of(PostType.GROUP_BUY)
            );
            default -> chatRoomRepository.findAllByParticipantId(userId);
        };

        return rooms.stream()
                .map(room -> {
                    var access = roomAccess(room, userId);
                    return access == null ? null : toResponse(room, userId, access);
                })
                .filter(java.util.Objects::nonNull)
                .filter(room -> !"UNREAD".equalsIgnoreCase(filter) || room.unreadCount() > 0)
                .sorted(Comparator
                        .comparing(ChatRoomResponse::pinned).reversed()
                        .thenComparing(ChatRoomResponse::updatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public List<ChatMessageResponse> getMessages(Long userId,Long roomId) { return getMessages(userId,roomId,null,null,100); }

    public List<ChatMessageResponse> getMessages(Long userId,Long roomId,Long after,Long before,int size) {
        ChatRoom room = findRoom(roomId);
        RoomAccess access = requireRoomAccess(room, userId);
        var query = em.createQuery("select m from ChatMessage m left join fetch m.sender where m.chatRoom.id=:room"
                + " and (:after is null or m.id>:after) and (:before is null or m.id<:before)"
                + visibleMessagesCondition(access) + " order by m.id " + (after == null ? "desc" : "asc"), ChatMessage.class)
                .setParameter("room", roomId).setParameter("viewer", userId)
                .setParameter("after", after).setParameter("before", before)
                .setMaxResults(Math.min(Math.max(size, 1), 100));
        var messages = new java.util.ArrayList<>(query.getResultList());
        if (after == null) java.util.Collections.reverse(messages);
        if (access.readOnly()) {
            return messages.stream().map(message -> ChatMessageResponse.from(message, userId).withUnreadCount(0)).toList();
        }
        var members=chatRoomMemberRepository.findAllByChatRoom(room);
        return messages.stream().map(message -> {
            int unread=0;
            if(message.getSender()!=null && message.getSender().getId().equals(userId))
                unread=(int)members.stream().filter(ChatRoomMember::isActive).filter(m -> !m.getUser().getId().equals(userId) && !blocks.blockedEitherWay(userId,m.getUser().getId()))
                    .filter(m -> !m.getUser().isChatReadReceiptEnabled() || readCursorFor(m)<message.getId()).count();
            return ChatMessageResponse.from(message,userId).withUnreadCount(unread);
        }).toList();
    }

    @Transactional
    public ChatMessageResponse sendMessage(Long userId,Long roomId,ChatMessageRequest request) {
        return sendMessage(userId,roomId,request.content(),request.clientMessageId());
    }
    @Transactional
    public ChatMessageResponse sendMessage(Long userId,Long roomId,String content) {return sendMessage(userId,roomId,content,null);}

    @Transactional
    public ChatMessageResponse sendMessage(Long userId,Long roomId,String content,String clientId) {
        ChatRoom room=lockRoom(userId,roomId);
        User sender=userRepository.findById(userId).orElseThrow();
        if(!sender.isAvailable())throw new BusinessException(HttpStatus.FORBIDDEN,"이용이 제한된 계정입니다.");
        String text=content==null?"":content.strip();
        if(text.isBlank() || text.length()>1000 || (clientId!=null && !clientId.matches("[A-Za-z0-9-]{1,80}")))
            throw new BusinessException(HttpStatus.BAD_REQUEST,"메시지는 1~1000자로 입력해주세요.");
        if(clientId!=null){var previous=chatMessageRepository.findByChatRoomIdAndSenderIdAndClientMessageId(roomId,userId,clientId);if(previous.isPresent()){if(!previous.get().getContent().equals(text))throw new BusinessException(HttpStatus.CONFLICT,"같은 전송 식별자로 다른 메시지를 보낼 수 없습니다.");return ChatMessageResponse.from(previous.get(),userId);}}
        var message=ChatMessage.user(room,sender,text);message.setClientMessageId(clientId);
        chatMessageRepository.saveAndFlush(message);notifyUnreadMembers(room,sender,text,message.getId());
        return ChatMessageResponse.from(message,userId,true).withUnreadCount((int)chatRoomMemberRepository.findAllByChatRoom(room).stream().filter(ChatRoomMember::isActive).filter(m->!m.getUser().getId().equals(userId)&&!blocks.blockedEitherWay(userId,m.getUser().getId())).count());
    }

    private ChatRoom lockRoom(Long userId,Long roomId){
        ChatRoom room = findRoomForUpdate(roomId);
        validateParticipant(room, userId);
        return room;
    }

    private ChatRoom findRoomForUpdate(Long roomId) {
        ChatRoom room=em.find(ChatRoom.class,roomId,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if(room==null)throw new BusinessException(HttpStatus.NOT_FOUND,"채팅방을 찾을 수 없습니다.");
        return room;
    }

    public long readCursor(Long userId,Long roomId){getParticipantRoom(userId,roomId);return chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId,userId).map(this::readCursorFor).orElse(0L);}
    public boolean showsReadReceipt(Long userId){return userRepository.findById(userId).map(User::isChatReadReceiptEnabled).orElse(false);}
    public boolean canReceiveFrom(Long viewerId,Long senderId){return senderId==null || !blocks.blockedEitherWay(viewerId,senderId);}

    @Transactional
    public void removeTradeParticipant(Long requestId,Long userId){findRoomForTradeRequest(requestId).ifPresent(room -> leaveMember(room,userId));}

    @Transactional
    public void markAsRead(Long userId, Long roomId) {
        ChatRoom room = lockRoom(userId, roomId);
        room.markAsRead(userId);
        chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, userId)
                .ifPresent(member -> member.readThrough(chatMessageRepository.findFirstByChatRoomIdOrderByIdDesc(roomId).map(ChatMessage::getId).orElse(0L)));
    }

    public ChatRoomResponse getRoomByTradeRequest(Long userId, Long tradeRequestId) {
        ChatRoom room = findRoomForTradeRequest(tradeRequestId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Chat room not found."));
        return toResponse(room, userId, requireRoomAccess(room, userId));
    }

    @Transactional
    public ChatRoomResponse togglePinned(Long userId, Long roomId) {
        ChatRoom room = lockRoom(userId, roomId);
        room.togglePinned(userId);
        chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, userId)
                .ifPresent(ChatRoomMember::togglePinned);
        return toResponse(room, userId);
    }

    @Transactional
    public ChatRoomResponse toggleMuted(Long userId, Long roomId) {
        ChatRoom room = lockRoom(userId, roomId);
        room.toggleMuted(userId);
        chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, userId)
                .ifPresent(ChatRoomMember::toggleMuted);
        return toResponse(room, userId);
    }

    @Transactional
    public ChatRoomResponse renameRoom(Long userId, Long roomId, ChatRoomNameRequest request) {
        ChatRoom room = lockRoom(userId, roomId);
        chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId,userId).orElseThrow().rename(request.roomName());
        return toResponse(room, userId);
    }

    @Transactional
    public void leaveRoom(Long userId, Long roomId) {
        ChatRoom room = findRoomForUpdate(roomId);
        if (chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, userId)
                .map(ChatRoomMember::isHiddenFromChatList).orElse(false)) return;
        requireRoomAccess(room, userId);
        leaveMember(room, userId).hideFromChatList();
    }

    @Transactional
    public void leaveDirectRoomsBetweenUsers(Long userId, Long otherUserId) {
        chatRoomRepository.findDirectRoomsBetweenUsers(userId, otherUserId)
                .forEach(room -> {
                    leaveMember(room, userId);
                    leaveMember(room, otherUserId);
                });
    }

    private ChatRoomMember leaveMember(ChatRoom room, Long userId) {
        // Preserve both legacy participants before adding a per-user tombstone.
        addMemberIfAbsent(room, room.getWriter(), room.getWriterUnreadCount());
        addMemberIfAbsent(room, room.getRequester(), room.getRequesterUnreadCount());
        ChatRoomMember member = chatRoomMemberRepository.findByChatRoomIdAndUserId(room.getId(), userId)
                .orElseGet(() -> chatRoomMemberRepository.save(ChatRoomMember.create(room,
                        userRepository.findById(userId).orElseThrow(), 0)));
        member.leave();
        return member;
    }

    public void requireParticipant(Long userId, Long roomId) {
        getParticipantRoom(userId, roomId);
    }

    // Realtime subscriptions and delivery require active participation.
    public boolean canAccessRoom(Long userId, Long roomId) {
        if (userId == null || roomId == null) return false;
        return chatRoomRepository.findById(roomId)
                .map(room -> isActiveParticipant(room, userId)).orElse(false);
    }

    private record ReportWindow(java.time.LocalDateTime from, java.time.LocalDateTime until) {}
    private record RoomAccess(boolean readOnly, ReportWindow historyWindow) {}

    private RoomAccess roomAccess(ChatRoom room, Long userId) {
        if (isActiveParticipant(room, userId)) return new RoomAccess(false, null);
        var member = chatRoomMemberRepository.findByChatRoomIdAndUserId(room.getId(), userId);
        if (member.map(ChatRoomMember::isHiddenFromChatList).orElse(false)) return null;
        if (room.isCancelledDirectTrade() && isMember(room, userId, member)
                && !blocks.blockedEitherWay(room.getWriter().getId(), room.getRequester().getId())) {
            return new RoomAccess(true, null);
        }
        if (room.isGroupRoom()) {
            if (room.getWriter().getId().equals(userId) && isMember(room, userId, member)) {
                return new RoomAccess(true, null);
            }
            if (member.isPresent() && member.get().getLeftAt() != null
                    && tradeRequestRepository.existsByPostIdAndRequesterIdAndStatusAndCancelledAfterAcceptanceTrue(
                            room.getTradeRequest().getPost().getId(), userId, TradeRequestStatus.CANCELLED)) {
                return new RoomAccess(true, new ReportWindow(member.get().getJoinedAt(), member.get().getLeftAt()));
            }
        }
        return null;
    }

    private RoomAccess requireRoomAccess(ChatRoom room, Long userId) {
        var access = roomAccess(room, userId);
        if (access == null) throw new BusinessException(HttpStatus.FORBIDDEN, "Only chat room participants can access it.");
        return access;
    }

    private boolean isMember(ChatRoom room, Long userId, java.util.Optional<ChatRoomMember> member) {
        return member.map(ChatRoomMember::isActive)
                .orElseGet(() -> room.getWriter().getId().equals(userId) || room.getRequester().getId().equals(userId));
    }

    private ReportWindow reportWindow(Long userId, ChatRoom room) {
        var member = chatRoomMemberRepository.findByChatRoomIdAndUserId(room.getId(), userId);
        if (member.isPresent()) return new ReportWindow(member.get().getJoinedAt(), member.get().getLeftAt());
        if (room.getWriter().getId().equals(userId) || room.getRequester().getId().equals(userId))
            return new ReportWindow(room.getCreatedAt(), null);
        throw new BusinessException(HttpStatus.FORBIDDEN, "참여했던 채팅만 신고할 수 있습니다.");
    }

    public boolean canReportMessage(Long userId, ChatMessage message) {
        var window = reportWindow(userId, message.getChatRoom());
        return !message.getCreatedAt().isBefore(window.from())
                && (window.until() == null || !message.getCreatedAt().isAfter(window.until()));
    }

    public List<ChatMessageResponse> reportableMessages(Long userId, Long requestId, Long before) {
        var trade = tradeRequestRepository.findById(requestId).orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "거래를 찾지 못했습니다."));
        if (!trade.getRequester().getId().equals(userId) && !trade.getPost().getWriter().getId().equals(userId))
            throw new BusinessException(HttpStatus.FORBIDDEN, "참여한 거래만 확인할 수 있습니다.");
        var room = findRoomForTradeRequest(requestId).orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "채팅방을 찾지 못했습니다."));
        reportWindow(userId, room); // Compare persisted timestamps at DB precision.
        return em.createQuery("select m from ChatMessage m join fetch m.sender where m.chatRoom.id=:room and m.sender.id<>:user and (exists (select cm.id from ChatRoomMember cm where cm.chatRoom=m.chatRoom and cm.user.id=:user and m.createdAt>=cm.joinedAt and (cm.leftAt is null or m.createdAt<=cm.leftAt)) or (not exists (select cm.id from ChatRoomMember cm where cm.chatRoom=m.chatRoom and cm.user.id=:user) and m.createdAt>=m.chatRoom.createdAt)) and (:before is null or m.id<:before) order by m.id desc", ChatMessage.class)
                .setParameter("room", room.getId()).setParameter("user", userId)
                .setParameter("before", before).setMaxResults(100).getResultList()
                .stream().map(m -> ChatMessageResponse.from(m, userId)).toList();
    }

    private boolean isActiveParticipant(ChatRoom room, Long userId) {
        if (room.isCancelledDirectTrade()) return false;
        if (room.isGroupRoom() && room.getWriter().getId().equals(userId)
                && room.getTradeRequest().getStatus() == TradeRequestStatus.CANCELLED
                && !tradeRequestRepository.existsByPostIdAndStatusIn(room.getTradeRequest().getPost().getId(),
                        List.of(TradeRequestStatus.ACCEPTED, TradeRequestStatus.COMPLETED))) return false;
        if(!room.isGroupRoom() && blocks.blockedEitherWay(room.getWriter().getId(),room.getRequester().getId())) return false;
        return isMember(room, userId, chatRoomMemberRepository.findByChatRoomIdAndUserId(room.getId(), userId));
    }

    public Long findRoomIdByTradeRequestId(Long tradeRequestId) {
        return findRoomForTradeRequest(tradeRequestId)
                .map(ChatRoom::getId)
                .orElse(null);
    }

    private Optional<ChatRoom> findRoomForTradeRequest(Long tradeRequestId) {
        Optional<ChatRoom> directRoom = chatRoomRepository.findByTradeRequestId(tradeRequestId);
        if (directRoom.isPresent()) {
            return directRoom;
        }

        return tradeRequestRepository.findById(tradeRequestId)
                .filter(request -> request.getPost().getPostType() == PostType.GROUP_BUY)
                .filter(request -> request.getStatus() == TradeRequestStatus.ACCEPTED
                        || request.getStatus() == TradeRequestStatus.COMPLETED
                        || request.isCancelledAfterAcceptance())
                .flatMap(request -> chatRoomRepository.findGroupRoomByPostId(request.getPost().getId()));
    }

    public record ParticipantProfile(
            Long userId, String nickname, String profileImage, double freshness,
            String freshnessLabel, long shareCount, long saleCount, long groupBuyCount,
            boolean sampleActivity) {}

    public ParticipantProfile getParticipantProfile(Long viewerId, Long roomId, Long targetId) {
        ChatRoom room = getParticipantRoom(viewerId, roomId);
        boolean member = chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, targetId).isPresent()
                || room.getWriter().getId().equals(targetId) || room.getRequester().getId().equals(targetId);
        if (!member) throw new BusinessException(HttpStatus.NOT_FOUND, "Participant not found.");
        return profileOf(targetId);
    }

    /** Call only after the post service has checked post visibility and blocking. */
    public ParticipantProfile getPostAuthorProfile(Long writerId) {
        return profileOf(writerId);
    }

    private ParticipantProfile profileOf(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));
        double freshness = user.getFreshnessScore();
        long shares = tradeRequestRepository.countByPostWriterIdAndPostTypeAndStatus(
                userId, PostType.SHARE, TradeRequestStatus.COMPLETED);
        long sales = tradeRequestRepository.countByPostWriterIdAndPostTypeAndStatus(
                userId, PostType.SALE, TradeRequestStatus.COMPLETED);
        long groups = tradeRequestRepository.countDistinctPostsByRequesterOrWriterAndPostTypeAndStatus(
                userId, PostType.GROUP_BUY, TradeRequestStatus.COMPLETED);
        boolean sample = demo.isDemoWriter(userId);
        if (sample) {
            // Presentation-only sample activity, never persisted as genuine trade history.
            long base = Math.max(1L, Math.round(Math.max(0, freshness - 40) / 4.0));
            shares = Math.max(shares, base + Math.floorMod(userId, 4));
            sales = Math.max(sales, Math.max(1, base / 2) + Math.floorMod(userId, 3));
            groups = Math.max(groups, Math.max(1, base / 4) + Math.floorMod(userId, 2));
        }
        String nickname = user.getNickname();
        if (sample) {
            nickname = nickname.replaceAll("(?i)(?:\\s*[·•.]+\\s*|(?:시연|데모))", " ").trim();
            if (nickname.isBlank()) nickname = "이웃" + userId;
        }
        return new ParticipantProfile(userId, nickname, user.getProfileImage(), freshness,
                com.hjs.foodshare.user.domain.FreshnessGrade.fromScore(freshness).getLabel(),
                shares, sales, groups, sample);
    }

    @Transactional
    public void recordTradeCancellation(Long requestId, String reason) {
        findRoomForTradeRequest(requestId).ifPresent(room -> {
            chatMessageRepository.save(ChatMessage.system(room, "거래가 취소되었습니다. 사유: " + reason));
            room.touch();
        });
    }

    public List<Long> notificationRecipientIds(Long senderId, Long roomId) {
        ChatRoom room = getParticipantRoom(senderId, roomId);
        var members = chatRoomMemberRepository.findAllByChatRoom(room);
        if (members.isEmpty()) {
            User receiver = partner(room, senderId);
            return receiver.getId().equals(senderId) || room.isMutedFor(receiver.getId()) ? List.of() : List.of(receiver.getId());
        }
        return members.stream().filter(ChatRoomMember::isActive).filter(member -> !member.isMuted()).filter(member -> !blocks.blockedEitherWay(senderId,member.getUser().getId()))
                .map(member -> member.getUser().getId()).filter(id -> !id.equals(senderId)).distinct().toList();
    }

    public Long findPartnerId(Long userId, Long roomId) {
        return partner(getParticipantRoom(userId, roomId), userId).getId();
    }

    private ChatRoom getParticipantRoom(Long userId, Long roomId) {
        ChatRoom room = findRoom(roomId);
        validateParticipant(room, userId);
        return room;
    }

    private ChatRoom findRoom(Long roomId) {
        return chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Chat room not found."));
    }

    private ChatRoomResponse toResponse(ChatRoom room, Long userId) {
        return toResponse(room, userId, new RoomAccess(false, null));
    }

    private ChatRoomResponse toResponse(ChatRoom room, Long userId, RoomAccess access) {
        return ChatRoomResponse.from(
                room,
                userId,
                lastVisibleMessage(room.getId(), userId, access),
                partner(room, userId),
                access.readOnly() ? 0 : unreadCount(room, userId),
                access.readOnly(),
                isPinned(room, userId),
                isMuted(room, userId),
                room.isGroupRoom(),
                access.historyWindow() == null ? participantCount(room) : 0,
                access.historyWindow() == null ? participants(room) : List.of(),
                access.historyWindow() == null ? room.getUpdatedAt() : access.historyWindow().until()
        ).withRoomName(chatRoomMemberRepository.findByChatRoomIdAndUserId(room.getId(),userId).map(ChatRoomMember::getPersonalName).orElse(null))
         .withSimulation(demo.enabled() && demo.isSimulation(room.getTradeRequest().getId()));
    }

    private ChatMessage lastVisibleMessage(Long roomId, Long userId, RoomAccess access) {
        var query = em.createQuery("select m from ChatMessage m where m.chatRoom.id=:room"
                + visibleMessagesCondition(access) + " order by m.id desc", ChatMessage.class)
                .setParameter("room", roomId).setParameter("viewer", userId).setMaxResults(1);
        var found = query.getResultList();
        return found.isEmpty() ? null : found.getFirst();
    }

    private String visibleMessagesCondition(RoomAccess access) {
        return " and (m.sender is null or not exists(select b.id from UserBlock b where"
                + " (b.blocker.id=:viewer and b.blockedUser.id=m.sender.id)"
                + " or (b.blockedUser.id=:viewer and b.blocker.id=m.sender.id)))"
                + (access.historyWindow() == null ? "" : " and exists (select cm.id from ChatRoomMember cm"
                + " where cm.chatRoom=m.chatRoom and cm.user.id=:viewer and m.createdAt>=cm.joinedAt"
                + " and m.createdAt<=cm.leftAt)");
    }

    private void validateParticipant(ChatRoom room, Long userId) {
        if (!isActiveParticipant(room, userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only chat room participants can access it.");
        }
    }

    private User partner(ChatRoom room, Long userId) {
        if (room.isGroupRoom()) {
            return room.getWriter().getId().equals(userId) ? room.getRequester() : room.getWriter();
        }
        return room.getWriter().getId().equals(userId) ? room.getRequester() : room.getWriter();
    }

    private long readCursorFor(ChatRoomMember member){
        if(member.hasReadCursor())return member.getLastReadMessageId();
        // Preserve legacy read state until the next explicit read writes a cursor.
        var previous=em.createQuery("select m.id from ChatMessage m where m.chatRoom.id=:room and m.sender.id<>:user and m.systemMessage=false order by m.id desc",Long.class)
            .setParameter("room",member.getChatRoom().getId()).setParameter("user",member.getUser().getId()).setFirstResult(Math.max(0,member.getUnreadCount())).setMaxResults(1).getResultList();
        return previous.isEmpty()?0:previous.getFirst();
    }

    private int unreadCount(ChatRoom room,Long userId) {
        long cursor=chatRoomMemberRepository.findByChatRoomIdAndUserId(room.getId(),userId).map(this::readCursorFor).orElse(0L);
        long count=em.createQuery("select count(m) from ChatMessage m where m.chatRoom.id=:room and m.id>:cursor and m.systemMessage=false and m.sender.id<>:viewer and not exists(select b.id from UserBlock b where (b.blocker.id=:viewer and b.blockedUser.id=m.sender.id) or (b.blocker.id=m.sender.id and b.blockedUser.id=:viewer))",Long.class)
            .setParameter("room",room.getId()).setParameter("cursor",cursor).setParameter("viewer",userId).getSingleResult();
        return (int)Math.min(count,Integer.MAX_VALUE);
    }

    private int partnerUnreadCount(ChatRoom room, Long userId) {
        List<ChatRoomMember> members = chatRoomMemberRepository.findAllByChatRoom(room);
        if (!members.isEmpty()) {
            return members
                .stream()
                .filter(ChatRoomMember::isActive)
                .filter(member -> !member.getUser().getId().equals(userId))
                .mapToInt(ChatRoomMember::getUnreadCount)
                .max()
                .orElse(0);
        }

        return room.getWriter().getId().equals(userId)
                ? room.getRequesterUnreadCount()
                : room.getWriterUnreadCount();
    }

    private boolean isPinned(ChatRoom room, Long userId) {
        return chatRoomMemberRepository.findByChatRoomIdAndUserId(room.getId(), userId)
                .map(ChatRoomMember::isPinned)
                .orElseGet(() -> room.isPinnedFor(userId));
    }

    private boolean isMuted(ChatRoom room, Long userId) {
        return chatRoomMemberRepository.findByChatRoomIdAndUserId(room.getId(), userId)
                .map(ChatRoomMember::isMuted)
                .orElseGet(() -> room.isMutedFor(userId));
    }

    private int participantCount(ChatRoom room) {
        List<ChatRoomMember> members = chatRoomMemberRepository.findAllByChatRoom(room);
        return members.isEmpty() ? 2 : (int) members.stream().filter(ChatRoomMember::isActive).count();
    }

    private List<ChatParticipantResponse> participants(ChatRoom room) {
        List<ChatRoomMember> members = chatRoomMemberRepository.findAllByChatRoom(room);
        if (!members.isEmpty()) {
            return members.stream()
                    .filter(ChatRoomMember::isActive)
                    .sorted(Comparator.comparing(ChatRoomMember::getJoinedAt))
                    .map(member -> ChatParticipantResponse.from(member.getUser()))
                    .toList();
        }

        Map<Long, User> users = new LinkedHashMap<>();
        users.put(room.getWriter().getId(), room.getWriter());
        users.put(room.getRequester().getId(), room.getRequester());
        return users.values()
                .stream()
                .map(ChatParticipantResponse::from)
                .toList();
    }

    private void addMemberIfAbsent(ChatRoom room, User user, int unreadCount) {
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(room.getId(), user.getId())) {
            chatRoomMemberRepository.save(ChatRoomMember.create(room, user, unreadCount));
        }
    }

    private void notifyUnreadMembers(ChatRoom room, User sender, String content,Long messageId) {
        List<ChatRoomMember> members = chatRoomMemberRepository.findAllByChatRoom(room);
        if (members.isEmpty()) {
            User receiver = partner(room, sender.getId());
            room.increaseUnreadFor(receiver);
            if (!room.isMutedFor(receiver.getId())) {
                notificationService.sendChatPush(receiver.getId(),sender.getId(),
                        sender.getNickname()+"님의 새 채팅",content,room.getId(),messageId);
            }
            return;
        }

        members.stream()
                .filter(ChatRoomMember::isActive)
                .filter(member -> !member.getUser().getId().equals(sender.getId()) && !blocks.blockedEitherWay(sender.getId(),member.getUser().getId()))
                .forEach(member -> {
                    member.increaseUnread();
                    if (!member.isMuted()) {
                        notificationService.sendChatPush(member.getUser().getId(),sender.getId(),
                                sender.getNickname()+"님의 새 채팅",content,room.getId(),messageId);
                    }
                });
        room.touch();
    }

    private Set<Long> unreadByPartnerMessageIds(List<ChatMessage> messages, Long userId, int partnerUnreadCount) {
        Set<Long> unreadMessageIds = new HashSet<>();
        if (partnerUnreadCount <= 0) {
            return unreadMessageIds;
        }

        int remaining = partnerUnreadCount;
        for (int index = messages.size() - 1; index >= 0 && remaining > 0; index--) {
            ChatMessage message = messages.get(index);
            if (message.isSystemMessage() || message.getSender() == null) {
                continue;
            }
            if (message.getSender().getId().equals(userId)) {
                unreadMessageIds.add(message.getId());
                remaining--;
            }
        }
        return unreadMessageIds;
    }
}
