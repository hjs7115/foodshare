package com.hjs.foodshare.trade.service;

import com.hjs.foodshare.chat.domain.ChatRoom;
import com.hjs.foodshare.chat.service.ChatService;
import com.hjs.foodshare.global.exception.BusinessException;
import com.hjs.foodshare.moderation.repository.UserBlockRepository;
import com.hjs.foodshare.notification.service.NotificationService;
import com.hjs.foodshare.post.domain.Post;
import com.hjs.foodshare.post.domain.PostType;
import com.hjs.foodshare.post.repository.PostRepository;
import com.hjs.foodshare.trade.domain.TradeRequest;
import com.hjs.foodshare.trade.domain.TradeRequestStatus;
import com.hjs.foodshare.trade.dto.TradeRequestResponse;
import com.hjs.foodshare.trade.repository.TradeRequestRepository;
import com.hjs.foodshare.user.domain.User;
import com.hjs.foodshare.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class TradeRequestService {

    @org.springframework.beans.factory.annotation.Autowired
    private com.hjs.foodshare.demo.DemoVisibility demo;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    private final TradeRequestRepository tradeRequestRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ChatService chatService;
    private final UserBlockRepository userBlockRepository;

    public TradeRequestService(TradeRequestRepository tradeRequestRepository, PostRepository postRepository,
                               UserRepository userRepository, NotificationService notificationService,
                               ChatService chatService, UserBlockRepository userBlockRepository) {
        this.tradeRequestRepository = tradeRequestRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.chatService = chatService;
        this.userBlockRepository = userBlockRepository;
    }

    @Transactional
    public TradeRequestResponse createRequest(Long postId, Long requesterId) {
        Post post = getActivePost(postId);
        entityManager.flush();
        entityManager.refresh(post, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        validateRequestablePost(post);
        if (post.getWriter().getId().equals(requesterId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "You cannot request your own post.");
        }
        validateNotBlocked(requesterId, post.getWriter().getId());
        if (tradeRequestRepository.existsByPostIdAndRequesterIdAndStatusIn(postId, requesterId, List.of(TradeRequestStatus.PENDING, TradeRequestStatus.ACCEPTED, TradeRequestStatus.COMPLETED))) {
            throw new BusinessException(HttpStatus.CONFLICT, "You already requested this post.");
        }

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found."));
        if (!requester.isAvailable()) throw new BusinessException(HttpStatus.FORBIDDEN,"이용이 제한된 계정입니다.");
        if (post.isOpenFridgePost()) validateFridgeDistance(requester, post.getWriter());

        TradeRequest savedRequest = tradeRequestRepository.save(TradeRequest.create(post, requester));
        if (post.getWriter().isNotificationTradeRequest()) {
            notificationService.createNotification(
                    post.getWriter().getId(),
                    "TRADE_REQUEST",
                    "거래 요청",
                    requester.getNickname() + "님이 '" + post.getTitle() + "' 게시글에 거래를 요청했습니다.",
                    "TRADE_REQUEST",
                    savedRequest.getId()
            );
        }
        return toResponse(savedRequest);
    }

    @Transactional
    public void hideHistory(List<Long> requestIds, Long userId) {
        if (requestIds == null || requestIds.isEmpty() || requestIds.size() > 100 || requestIds.stream().anyMatch(java.util.Objects::isNull))
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid trade request IDs.");
        // Lock in ID order so simultaneous deletions by both participants preserve both flags.
        for (Long id : requestIds.stream().distinct().sorted().toList()) {
            TradeRequest request = entityManager.find(TradeRequest.class, id, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            if (request == null) throw new BusinessException(HttpStatus.NOT_FOUND, "Trade request not found.");
            if (!request.getRequester().getId().equals(userId) && !request.getPost().getWriter().getId().equals(userId))
                throw new BusinessException(HttpStatus.FORBIDDEN, "Only participants can delete their history.");
            if (request.getStatus() == TradeRequestStatus.PENDING || request.getStatus() == TradeRequestStatus.ACCEPTED)
                throw new BusinessException(HttpStatus.CONFLICT, "진행 중인 거래는 삭제할 수 없습니다.");
            request.hideHistoryFor(userId);
        }
    }

    public List<TradeRequestResponse> getMyRequestForPost(Long id,Long postId){
        return tradeRequestRepository.findFirstByPostIdAndRequesterIdAndStatusInOrderByIdDesc(postId,id,List.of(TradeRequestStatus.PENDING,TradeRequestStatus.ACCEPTED,TradeRequestStatus.COMPLETED)).map(this::toResponse).stream().toList();
    }
    public List<TradeRequestResponse> getMyRequests(Long id){return responses(tradeRequestRepository.findAllByRequesterIdOrderByCreatedAtDesc(id).stream().filter(r->!r.isHistoryHiddenFor(id)).toList());}
    public List<TradeRequestResponse> getReceivedRequests(Long id){return responses(tradeRequestRepository.findAllByPostWriterIdOrderByCreatedAtDesc(id).stream().filter(r->!r.isHistoryHiddenFor(id)).toList());}
    public com.hjs.foodshare.global.response.PageResponse<TradeRequestResponse> historyPage(Long id,boolean received,int page,int size){
        var request=org.springframework.data.domain.PageRequest.of(Math.max(0,page),Math.min(100,Math.max(1,size)));
        var result=received?tradeRequestRepository.receivedPage(id,request):tradeRequestRepository.sentPage(id,request);
        return new com.hjs.foodshare.global.response.PageResponse<>(responses(result.getContent()),result.getNumber(),result.getSize(),result.getTotalElements(),result.getTotalPages(),result.isFirst(),result.isLast());
    }
    public List<TradeRequestResponse> getRequestsForPost(Long postId,Long writerId){
        Post post=getActivePost(postId);if(!post.getWriter().getId().equals(writerId))throw new BusinessException(HttpStatus.FORBIDDEN,"작성자만 요청을 확인할 수 있습니다.");
        return responses(tradeRequestRepository.findAllByPostIdOrderByCreatedAtDesc(postId));
    }
    private List<TradeRequestResponse> responses(List<TradeRequest> rows){
        var stats=new java.util.HashMap<Long,long[]>();
        java.util.function.Function<Long,long[]> get=id->stats.computeIfAbsent(id,k->new long[]{countShareCompleted(k),countSaleCompleted(k),countReceivedShare(k),countGroupBuyParticipation(k)});
        return rows.stream().map(r->{var a=get.apply(r.getRequester().getId());var b=get.apply(r.getPost().getWriter().getId());
            return TradeRequestResponse.from(r,a[0],a[1],a[2],a[3],b[0],b[1],b[2],b[3],chatService.findRoomIdByTradeRequestId(r.getId()));}).toList();
    }

    @Transactional
    public TradeRequestResponse accept(Long requestId, Long writerId) {
        TradeRequest tradeRequest = getRequestForWriter(requestId, writerId);
        if (tradeRequest.getStatus() != TradeRequestStatus.PENDING) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Only pending requests can be accepted.");
        }
        entityManager.flush();
        entityManager.refresh(tradeRequest.getPost(), jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(tradeRequest);
        if (tradeRequest.getStatus() != TradeRequestStatus.PENDING)
            throw new BusinessException(HttpStatus.CONFLICT, "이미 처리된 요청입니다.");
        validateRequestablePost(tradeRequest.getPost());
        if(!tradeRequest.getRequester().isAvailable())throw new BusinessException(HttpStatus.CONFLICT,"요청자의 계정이 이용 불가 상태입니다.");
        validateNotBlocked(tradeRequest.getRequester().getId(), writerId);
        if(tradeRequest.getPost().isOpenFridgePost())validateFridgeDistance(tradeRequest.getRequester(),tradeRequest.getPost().getWriter());
        tradeRequest.accept();
        ChatRoom chatRoom = applyAcceptedTradePolicy(tradeRequest);
        if (tradeRequest.getRequester().isNotificationTradeAccepted()) {
            notificationService.createNotification(
                    tradeRequest.getRequester().getId(),
                    "TRADE_ACCEPTED",
                    "거래 요청 수락",
                    "'" + tradeRequest.getPost().getTitle() + "' 거래 요청이 수락되었습니다.",
                    "TRADE_REQUEST",
                    tradeRequest.getId()
            );
        }
        if (chatRoom != null && tradeRequest.getPost().getPostType() != PostType.GROUP_BUY) {
            notificationService.createNotification(
                tradeRequest.getRequester().getId(),
                "CHAT_ROOM_OPENED",
                "채팅방 개설",
                "채팅방이 개설되었습니다.",
                "CHAT_ROOM",
                chatRoom.getId()
            );
        }
        return toResponse(tradeRequest, chatRoom == null ? null : chatRoom.getId());
    }

    @Transactional
    public TradeRequestResponse reject(Long requestId, Long writerId) {
        TradeRequest tradeRequest = getRequestForWriter(requestId, writerId);
        entityManager.refresh(tradeRequest.getPost(), jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(tradeRequest);
        if (tradeRequest.getStatus() != TradeRequestStatus.PENDING) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Only pending requests can be rejected.");
        }
        tradeRequest.reject();
        notifyRejected(tradeRequest, "작성자가 요청을 거절했습니다.");
        return toResponse(tradeRequest);
    }

    @Transactional
    public TradeRequestResponse complete(Long requestId, Long userId) {
        TradeRequest tradeRequest = lockTrade(requestId);
        if (tradeRequest == null) throw new BusinessException(HttpStatus.NOT_FOUND, "Trade request not found.");
        if (entityManager.createQuery("select count(e) from FridgeExchange e where e.trade.id=:id and e.cancelRequestedBy is not null", Long.class).setParameter("id",requestId).getSingleResult()>0) throw new BusinessException(HttpStatus.CONFLICT,"취소 요청을 먼저 처리해주세요.");
        boolean isWriter = tradeRequest.getPost().getWriter().getId().equals(userId);
        boolean isRequester = tradeRequest.getRequester().getId().equals(userId);
        if (!isWriter && !isRequester) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only trade participants can complete this request.");
        }
        if(tradeRequest.getStatus()==TradeRequestStatus.COMPLETED)return toResponse(tradeRequest);
        if (tradeRequest.getStatus() != TradeRequestStatus.ACCEPTED) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Only accepted requests can be completed.");
        }

        if (tradeRequest.getPost().getPostType() == PostType.GROUP_BUY && tradeRequest.getPost().isOpen())
            throw new BusinessException(HttpStatus.CONFLICT, "모집을 마감한 뒤 거래 완료를 확인해주세요.");
        if((isWriter && tradeRequest.getWriterConfirmedAt()!=null) || (isRequester && tradeRequest.getRequesterConfirmedAt()!=null))return toResponse(tradeRequest);
        boolean completed = tradeRequest.confirmCompletion(userId);
        if (!completed) {
            Long otherId = isWriter ? tradeRequest.getRequester().getId() : tradeRequest.getPost().getWriter().getId();
            notificationService.createNotification(otherId,"TRADE_CONFIRMATION","거래 완료 확인 요청","상대가 거래 완료를 확인했습니다. 물품을 받은 뒤 완료를 확인해주세요.","TRADE_REQUEST",requestId);
            return toResponse(tradeRequest);
        }
        if (tradeRequest.getPost().getPostType() != PostType.GROUP_BUY) {
            tradeRequest.getPost().close();
        }
        notifyTradeCompleted(tradeRequest);
        return toResponse(tradeRequest);
    }

    @Transactional
    public List<TradeRequestResponse> closeGroupBuyRecruitment(Long postId, Long writerId) {
        Post post = getActivePost(postId);
        if (!post.getWriter().getId().equals(writerId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only the post writer can close recruitment.");
        }
        if (post.getPostType() != PostType.GROUP_BUY) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Only group buy posts can close recruitment.");
        }
        entityManager.refresh(post, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (post.getStatus() != com.hjs.foodshare.post.domain.PostStatus.OPEN) {
            throw new BusinessException(HttpStatus.CONFLICT, "이미 모집이 마감되었습니다.");
        }
        if (post.getDeadlineDate() != null && !post.getDeadlineDate().isAfter(LocalDateTime.now())) {
            return finishExpiredGroupBuy(post);
        }

        List<TradeRequest> selectedRequests = tradeRequestRepository.findAllByPostIdOrderByCreatedAtDesc(postId)
                .stream()
                .filter(request -> request.getStatus() == TradeRequestStatus.PENDING
                        || request.getStatus() == TradeRequestStatus.ACCEPTED)
                .toList();
        if (selectedRequests.isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "No group buy participants are waiting.");
        }

        if (post.getTargetParticipantCount() == null || selectedRequests.size() + 1 > post.getTargetParticipantCount()) {
            throw new BusinessException(HttpStatus.CONFLICT, "참여 요청이 모집 정원을 초과했습니다. 거래 내역에서 참여자를 수락하거나 거절한 뒤 마감해주세요.");
        }
        selectedRequests.forEach(request -> validateNotBlocked(request.getRequester().getId(), writerId));
        selectedRequests.stream()
                .filter(request -> request.getStatus() == TradeRequestStatus.PENDING)
                .forEach(TradeRequest::accept);
        post.updateParticipantCount(selectedRequests.size() + 1);
        post.close();
        ChatRoom chatRoom = chatService.openGroupRoomForTradeRequests(selectedRequests);
        notifyRoomOpened(selectedRequests, chatRoom);
        return selectedRequests.stream()
                .map(request -> toResponse(request, chatRoom.getId()))
                .toList();
    }

    private TradeRequest lockTrade(Long requestId) {
        TradeRequest request = tradeRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "거래 요청을 찾을 수 없습니다."));
        entityManager.refresh(request.getPost(), jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(request, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        return request;
    }

    private void requireMarketTrade(TradeRequest request) {
        if (request.getPost().getPostType()==PostType.GROUP_BUY || request.getPost().isOpenFridgePost() || request.getExchangeDescription()!=null)
            throw new BusinessException(HttpStatus.BAD_REQUEST, "일반 시장 거래에서만 사용할 수 있습니다.");
    }

    @Transactional
    public TradeRequestResponse cancelMarketTrade(Long requestId, Long userId, String reason) {
        TradeRequest request=lockTrade(requestId);
        if (request.getExchangeDescription() != null)
            throw new BusinessException(HttpStatus.CONFLICT,"맞교환 내역에서 취소해주세요.");
        boolean writer=request.getPost().getWriter().getId().equals(userId);
        boolean requester=request.getRequester().getId().equals(userId);
        if (!writer && !requester) throw new BusinessException(HttpStatus.FORBIDDEN, "거래 당사자만 취소할 수 있습니다.");
        if (request.getStatus()==TradeRequestStatus.CANCELLED) return toResponse(request);
        if (request.getStatus()!=TradeRequestStatus.ACCEPTED && !(requester && request.getStatus()==TradeRequestStatus.PENDING))
            throw new BusinessException(HttpStatus.CONFLICT, "대기 중인 내 요청이나 수락된 거래만 취소할 수 있습니다.");
        if (reason==null || !java.util.Set.of("생각이 바뀌었어요", "일정이 맞지 않아요", "연락이 닿지 않아요", "거래 조건이 달라요", "기타").contains(reason))
            throw new BusinessException(HttpStatus.BAD_REQUEST, "취소 사유를 선택해주세요.");
        request.cancel(userId,reason);
        if (request.getPost().getPostType() == PostType.GROUP_BUY) {
            var active = tradeRequestRepository.findAllByPostIdAndStatus(request.getPost().getId(),TradeRequestStatus.ACCEPTED);
            request.getPost().updateParticipantCount(active.size()+tradeRequestRepository.findAllByPostIdAndStatus(request.getPost().getId(),TradeRequestStatus.COMPLETED).size()+1);
            chatService.removeTradeParticipant(request.getId(), request.getRequester().getId());
        }
        chatService.recordTradeCancellation(requestId,reason);
        Long otherId=writer?request.getRequester().getId():request.getPost().getWriter().getId();
        notificationService.createNotification(otherId,"TRADE_CANCELLED","거래 취소",
                "'"+request.getPost().getTitle()+"' 거래가 취소되었습니다. 사유: "+reason,"TRADE_REQUEST",requestId);
        return toResponse(request);
    }

    @Transactional
    public TradeRequestResponse reopenMarketTrade(Long requestId, Long userId, boolean confirmed) {
        TradeRequest request=lockTrade(requestId);
        Post post=request.getPost();
        requireMarketTrade(request);
        if (!post.getWriter().getId().equals(userId)) throw new BusinessException(HttpStatus.FORBIDDEN,"작성자만 다시 모집할 수 있습니다.");
        if (!confirmed) throw new BusinessException(HttpStatus.BAD_REQUEST,"재료 상태와 날짜를 확인해주세요.");
        if (post.isDeleted() || request.getStatus()!=TradeRequestStatus.CANCELLED || !request.isCancelledAfterAcceptance())
            throw new BusinessException(HttpStatus.CONFLICT,"수락 후 취소된 거래만 다시 모집할 수 있습니다.");
        if (post.hasPassedDeadline() || post.getExpirationDate().isBefore(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"))))
            throw new BusinessException(HttpStatus.CONFLICT,"등록된 날짜가 지났습니다. 재료 상태를 확인하고 새 글을 작성해주세요.");
        if (tradeRequestRepository.existsByPostIdAndStatusIn(post.getId(),List.of(TradeRequestStatus.ACCEPTED,TradeRequestStatus.COMPLETED)))
            throw new BusinessException(HttpStatus.CONFLICT,"진행 중이거나 완료된 거래가 있어 다시 모집할 수 없습니다.");
        demo.requireVisible(post.getId());
        post.reopen();
        return toResponse(request);
    }

    @Transactional
    public void expireGroupBuy(Long postId) {
        Post post = entityManager.find(Post.class, postId, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (post == null || post.isDeleted() || post.getPostType() != PostType.GROUP_BUY
                || post.getStatus() != com.hjs.foodshare.post.domain.PostStatus.OPEN
                || post.getDeadlineDate() == null || post.getDeadlineDate().isAfter(LocalDateTime.now())) return;
        finishExpiredGroupBuy(post);
    }

    private List<TradeRequestResponse> finishExpiredGroupBuy(Post post) {
        for(var r:tradeRequestRepository.findAllByPostIdAndStatus(post.getId(), TradeRequestStatus.ACCEPTED)){
            if(userBlockRepository.blockedEitherWay(r.getRequester().getId(),post.getWriter().getId())||!r.getRequester().isAvailable()){
                r.cancel(post.getWriter().getId(),"차단 또는 계정 상태 변경으로 참여 종료");notifyCancelled(r,"차단 또는 계정 상태 변경으로 공동구매 참여가 종료되었습니다.");
            }
        }
        var accepted = tradeRequestRepository.findAllByPostIdAndStatus(post.getId(), TradeRequestStatus.ACCEPTED);
        tradeRequestRepository.findAllByPostIdAndStatus(post.getId(), TradeRequestStatus.PENDING).forEach(request -> {
            request.reject();
            notificationService.createNotification(request.getRequester().getId(), "GROUP_BUY_CLOSED",
                    "공동구매 모집 종료", "'" + post.getTitle() + "' 모집이 마감되어 미수락 요청이 종료되었습니다.", "TRADE_REQUEST", request.getId());
        });
        post.updateParticipantCount(accepted.size() + 1);
        post.close();
        if (accepted.isEmpty()) {
            notificationService.createNotification(post.getWriter().getId(), "GROUP_BUY_CLOSED",
                    "공동구매 모집 종료", "'" + post.getTitle() + "' 모집이 참여 확정 없이 종료되었습니다.", "POST", post.getId());
            return List.of();
        }
        ChatRoom room = chatService.openGroupRoomForTradeRequests(accepted);
        var members = new java.util.HashSet<Long>();
        members.add(post.getWriter().getId());
        accepted.forEach(request -> members.add(request.getRequester().getId()));
        members.forEach(id -> notificationService.createNotification(id, "CHAT_ROOM_OPENED", "공동구매 모집 마감",
                "'" + post.getTitle() + "'의 수락된 참여자들과 채팅방이 개설되었습니다.", "CHAT_ROOM", room.getId()));
        return accepted.stream().map(request -> toResponse(request, room.getId())).toList();
    }

    private ChatRoom applyAcceptedTradePolicy(TradeRequest acceptedRequest) {
        Post post = acceptedRequest.getPost();
        if (post.getPostType() == PostType.GROUP_BUY) {
            post.increaseParticipantCount();
            if (isGroupBuyFull(post)) {
                post.close();
                List<TradeRequest> acceptedRequests = tradeRequestRepository.findAllByPostIdAndStatus(
                        post.getId(),
                        TradeRequestStatus.ACCEPTED
                );
                tradeRequestRepository.findAllByPostIdAndStatus(post.getId(), TradeRequestStatus.PENDING)
                        .forEach(r -> { r.reject(); notifyRejected(r, "공동구매 정원이 차서 참여 요청이 종료되었습니다."); });
                ChatRoom room = chatService.openGroupRoomForTradeRequests(acceptedRequests);
                notifyRoomOpened(acceptedRequests, room);
                return room;
            }
            return null;
        }

        post.close();
        tradeRequestRepository.findAllByPostIdAndStatus(post.getId(), TradeRequestStatus.PENDING)
                .stream()
                .filter(request -> !request.getId().equals(acceptedRequest.getId()))
                .forEach(r -> { r.reject(); notifyRejected(r, "다른 분과 거래가 확정되어 요청이 종료되었습니다."); });
        return chatService.openRoomForTradeRequest(acceptedRequest);
    }

    private void notifyRoomOpened(List<TradeRequest> requests, ChatRoom room) {
        var ids = new java.util.HashSet<Long>();
        requests.forEach(r -> { ids.add(r.getRequester().getId()); ids.add(r.getPost().getWriter().getId()); });
        ids.forEach(id -> notificationService.createNotification(id,"CHAT_ROOM_OPENED","채팅방 개설","거래 참여자 채팅방이 개설되었습니다.","CHAT_ROOM",room.getId()));
    }

    private void validateFridgeDistance(User a, User b) {
        if (a.getLatitude()==null || a.getLongitude()==null || b.getLatitude()==null || b.getLongitude()==null)
            throw new BusinessException(HttpStatus.BAD_REQUEST,"양쪽 모두 위치 설정이 필요합니다.");
        double x=Math.toRadians(a.getLatitude()-b.getLatitude()), y=Math.toRadians(a.getLongitude()-b.getLongitude());
        double h=Math.sin(x/2)*Math.sin(x/2)+Math.cos(Math.toRadians(a.getLatitude()))*Math.cos(Math.toRadians(b.getLatitude()))*Math.sin(y/2)*Math.sin(y/2);
        if (6371*2*Math.asin(Math.sqrt(Math.min(1,h)))>5) throw new BusinessException(HttpStatus.FORBIDDEN,"5km 이내 이웃에게만 요청할 수 있습니다.");
    }

    @Transactional
    public void cancelPostTrades(Long postId, Long writerId, String reason) {
        Post post=getActivePost(postId);
        if(reason==null || !java.util.Set.of("생각이 바뀌었어요","일정이 맞지 않아요","연락이 닿지 않아요","거래 조건이 달라요","기타").contains(reason))throw new BusinessException(HttpStatus.BAD_REQUEST,"취소 사유를 선택해주세요.");
        entityManager.refresh(post,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (!post.getWriter().getId().equals(writerId)) throw new BusinessException(HttpStatus.FORBIDDEN,"작성자만 전체 취소할 수 있습니다.");
        for (TradeRequest request:tradeRequestRepository.findAllByPostIdOrderByCreatedAtDesc(postId)) {
            if (request.getStatus()==TradeRequestStatus.PENDING) { request.cancel(writerId,reason); notifyCancelled(request,reason); }
            else if (request.getStatus()==TradeRequestStatus.ACCEPTED) cancelMarketTrade(request.getId(),writerId,reason);
        }
        post.close();
    }

    private void notifyCancelled(TradeRequest request,String reason) {
        notificationService.createNotification(request.getRequester().getId(),"TRADE_CANCELLED","거래 요청 종료",reason,"TRADE_REQUEST",request.getId());
    }

    private void notifyRejected(TradeRequest request, String reason) {
        notificationService.createNotification(request.getRequester().getId(), "TRADE_REJECTED", "거래 요청 종료",
                "'" + request.getPost().getTitle() + "' " + reason, "TRADE_REQUEST", request.getId());
    }

    @Transactional
    public void rejectPendingRequests(Post post, String reason) {
        tradeRequestRepository.findAllByPostIdAndStatus(post.getId(), TradeRequestStatus.PENDING)
                .forEach(r -> { r.reject(); notifyRejected(r, reason); });
    }

    @Transactional
    public void reopenGroupBuy(Long postId, Long writerId, boolean notOrdered, LocalDateTime deadline) {
        Post post = getActivePost(postId);
        entityManager.flush();
        entityManager.refresh(post, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (!post.getWriter().getId().equals(writerId)) throw new BusinessException(HttpStatus.FORBIDDEN, "작성자만 재모집할 수 있습니다.");
        if (post.getPostType() != PostType.GROUP_BUY || post.isDeleted()) throw new BusinessException(HttpStatus.BAD_REQUEST, "공동구매 글에서만 재모집할 수 있습니다.");
        if (!notOrdered) throw new BusinessException(HttpStatus.BAD_REQUEST, "아직 주문·결제 전인지 확인해주세요.");
        var now = LocalDateTime.now(java.time.ZoneId.of("Asia/Seoul"));
        if (deadline == null || !deadline.isAfter(now) || deadline.isAfter(now.plusDays(30)))
            throw new BusinessException(HttpStatus.BAD_REQUEST, "30일 이내의 앞으로의 마감 시간을 선택해주세요.");
        var all = tradeRequestRepository.findAllByPostIdOrderByCreatedAtDesc(postId);
        if (all.stream().anyMatch(r -> r.getStatus() == TradeRequestStatus.COMPLETED ||
                (r.getStatus() == TradeRequestStatus.ACCEPTED && (r.getWriterConfirmedAt() != null || r.getRequesterConfirmedAt() != null))))
            throw new BusinessException(HttpStatus.CONFLICT, "완료 확인을 시작한 공동구매는 재모집할 수 없습니다.");
        var accepted = all.stream().filter(r -> r.getStatus() == TradeRequestStatus.ACCEPTED).toList();
        int count = accepted.size() + 1;
        if (post.getTargetParticipantCount() == null || count >= post.getTargetParticipantCount())
            throw new BusinessException(HttpStatus.CONFLICT, "빈자리가 있는 공동구매만 재모집할 수 있습니다.");
        if (post.isOpen()) return;
        post.updateParticipantCount(count);
        post.reopenGroupBuy(deadline);
        accepted.forEach(r -> notificationService.createNotification(r.getRequester().getId(), "GROUP_BUY_REOPENED", "공동구매 재모집",
                "'" + post.getTitle() + "'의 빈자리를 다시 모집합니다. 새 마감: " + deadline.toString().replace('T', ' '), "TRADE_REQUEST", r.getId()));
    }

    private boolean isGroupBuyFull(Post post) {
        return post.getCurrentParticipantCount() != null
                && post.getTargetParticipantCount() != null
                && post.getCurrentParticipantCount() >= post.getTargetParticipantCount();
    }

    private void notifyTradeCompleted(TradeRequest tradeRequest) {
        Long writerId = tradeRequest.getPost().getWriter().getId();
        Long requesterId = tradeRequest.getRequester().getId();
        String message = "'" + tradeRequest.getPost().getTitle() + "' 거래가 완료되었습니다.";

        notificationService.createNotification(
                writerId,
                "TRADE_COMPLETED",
                "거래 완료",
                message,
                "TRADE_REQUEST",
                tradeRequest.getId()
        );
        notificationService.createNotification(
                requesterId,
                "TRADE_COMPLETED",
                "거래 완료",
                message,
                "TRADE_REQUEST",
                tradeRequest.getId()
        );
    }

    private TradeRequestResponse toResponse(TradeRequest tradeRequest) {
        return toResponse(tradeRequest, chatService.findRoomIdByTradeRequestId(tradeRequest.getId()));
    }

    private boolean isVisibleTradeRequest(TradeRequest tradeRequest) {
        return true;
    }

    private TradeRequestResponse toResponse(TradeRequest tradeRequest, Long chatRoomId) {
        Long requesterId = tradeRequest.getRequester().getId();
        Long writerId = tradeRequest.getPost().getWriter().getId();
        return TradeRequestResponse.from(
                tradeRequest,
                countShareCompleted(requesterId),
                countSaleCompleted(requesterId),
                countReceivedShare(requesterId),
                countGroupBuyParticipation(requesterId),
                countShareCompleted(writerId),
                countSaleCompleted(writerId),
                countReceivedShare(writerId),
                countGroupBuyParticipation(writerId),
                chatRoomId
        );
    }

    private long countShareCompleted(Long userId) {
        return tradeRequestRepository.countByPostWriterIdAndPostTypeAndStatus(
                userId,
                PostType.SHARE,
                TradeRequestStatus.COMPLETED
        );
    }

    private long countSaleCompleted(Long userId) {
        return tradeRequestRepository.countByPostWriterIdAndPostTypeAndStatus(
                userId,
                PostType.SALE,
                TradeRequestStatus.COMPLETED
        );
    }

    private long countReceivedShare(Long userId) {
        return tradeRequestRepository.countByRequesterIdAndPostTypeAndStatus(
                userId,
                PostType.SHARE,
                TradeRequestStatus.COMPLETED
        );
    }

    private long countGroupBuyParticipation(Long userId) {
        return tradeRequestRepository.countDistinctPostsByRequesterOrWriterAndPostTypeAndStatus(
                userId,
                PostType.GROUP_BUY,
                TradeRequestStatus.COMPLETED
        );
    }

    private void validateRequestablePost(Post post) {
        if (!post.isOpen() || post.getExpirationDate().isBefore(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul")))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Post is closed.");
        }
        if (!post.getWriter().isAvailable()) throw new BusinessException(HttpStatus.CONFLICT,"이용할 수 없는 작성자입니다.");
        if (post.getPostType() == PostType.GROUP_BUY) {
            validateGroupBuyRequestable(post);
        } else if (post.hasPassedDeadline()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "거래 마감 시간이 지났습니다.");
        }
    }

    private void validateNotBlocked(Long requesterId, Long writerId) {
        if (userBlockRepository.blockedEitherWay(writerId, requesterId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Blocked users cannot request this post.");
        }
    }

    private void validateGroupBuyRequestable(Post post) {
        if (post.getDeadlineDate() != null && post.getDeadlineDate().isBefore(LocalDateTime.now())) {
            post.close();
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Group buy deadline has passed.");
        }
        if (post.getTargetParticipantCount() == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Group buy target participant count is required.");
        }
        if (post.getCurrentParticipantCount() == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Group buy current participant count is required.");
        }
        if (post.getCurrentParticipantCount() >= post.getTargetParticipantCount()) {
            post.close();
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Group buy is full.");
        }
    }

    private void validateGroupBuyDeadline(Post post) {
        if (post.getDeadlineDate() != null && post.getDeadlineDate().isBefore(LocalDateTime.now())) {
            post.close();
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Group buy deadline has passed.");
        }
    }

    private TradeRequest getRequestForWriter(Long requestId, Long writerId) {
        TradeRequest tradeRequest = tradeRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Trade request not found."));
        if (!tradeRequest.getPost().getWriter().getId().equals(writerId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only the post writer can respond to this request.");
        }
        return tradeRequest;
    }

    private Post getActivePost(Long postId) {
        demo.requireVisible(postId);
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Post not found."));
        if (post.isDeleted()) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Post not found.");
        }
        return post;
    }
}
