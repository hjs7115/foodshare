import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Ban, Bell, BellOff, ChevronDown, ChevronUp, Flag, Leaf, MessageCircle, MoreVertical, Pin, Search, Send, ShoppingCart, Snowflake, Trash2, User, X, type LucideIcon } from 'lucide-react';
import { API_ENDPOINTS, WS_BASE_URL, apiRequest, getNotifications, resolveImageUrl } from '../../api/config';
import { getAuthToken, getStoredUserInfo } from '../../auth/session';
import NotificationsScreen from '../common/NotificationsScreen';
import BottomNavIcon from '../common/BottomNavIcon';
import { showToast, showConfirm } from '../../utils/feedback';

type ChatFilter = 'ALL' | 'SHARING' | 'GROUP_BUY' | 'UNREAD';
const PROFILE_PLACEHOLDER = '/assets/profile-placeholder.svg';

interface ChatRoom {
  chatRoomId: number;
  postTitle: string;
  postType?: string;
  partnerNickname: string;
  partnerProfileImage?: string;
  groupRoom?: boolean;
  participantCount?: number;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  pinned?: boolean;
  muted?: boolean;
}

interface ChatMessage {
  messageId: number;
  senderId?: number;
  senderNickname?: string;
  senderProfileImage?: string;
  content: string;
  mine: boolean;
  systemMessage: boolean;
  unreadByPartner?: boolean;
  createdAt?: string;
}

const TEMP_MESSAGE_ID_START = -1;
let tempMessageId = TEMP_MESSAGE_ID_START;

export default function ChatScreen({
  onNavigate,
  chatUnreadCount = 0,
  onChatUnreadChange,
}: {
  onNavigate: (screen: string) => void;
  chatUnreadCount?: number;
  onChatUnreadChange?: (count: number) => void;
}) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [roomActionTarget, setRoomActionTarget] = useState<ChatRoom | null>(null);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [activeSearchMatchIndex, setActiveSearchMatchIndex] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const messageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const refreshInFlightRef = useRef(false);
  const readInFlightRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const currentUserId = useMemo(() => {
    const userInfo = getStoredUserInfo<any>();
    const value = userInfo?.userId ?? userInfo?.id;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }, []);

  useEffect(() => {
    loadRooms(activeFilter);
    loadUnreadNotifications();
  }, [activeFilter]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!selectedRoom) {
      closeSocket();
      setShowRoomMenu(false);
      setIsSearchingMessages(false);
      setMessageSearchQuery('');
      setActiveSearchMatchIndex(0);
      return;
    }

    connectSocket(selectedRoom);
    return () => closeSocket();
  }, [selectedRoom?.chatRoomId]);

  useEffect(() => {
    if (!selectedRoom) return;

    const refreshOpenRoom = () => {
      loadMessages(selectedRoom).catch((error) => {
        console.warn('채팅 메시지 자동 갱신 실패', error);
      });
    };

    const timer = window.setInterval(refreshOpenRoom, 1500);
    window.addEventListener('focus', refreshOpenRoom);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshOpenRoom);
    };
  }, [selectedRoom?.chatRoomId]);

  useEffect(() => {
    if (isSearchingMessages) {
      searchInputRef.current?.focus();
    }
  }, [isSearchingMessages]);

  useEffect(() => {
    if (selectedRoom) return;

    const timer = window.setInterval(() => {
      loadRooms(activeFilter);
    }, 10000);
    const handleFocus = () => loadRooms(activeFilter);

    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeFilter, selectedRoom?.chatRoomId]);

  useEffect(() => {
    if (!selectedRoom || isSearchingMessages) return;
    if (!shouldStickToBottomRef.current) return;
    scrollMessagesToBottom('smooth');
  }, [messages.length, selectedRoom?.chatRoomId, isSearchingMessages]);

  const filteredRooms = useMemo(() => rooms, [rooms]);

  const loadUnreadNotifications = async () => {
    try {
      const response = await getNotifications(0, 30);
      const raw = response?.data?.content || response?.data || response?.content || response?.notifications || [];
      setHasUnreadNotifications(Array.isArray(raw) && raw.some((item: any) => !(item.read || item.isRead)));
    } catch {
      setHasUnreadNotifications(false);
    }
  };

  const normalizeRoom = (room: any): ChatRoom => ({
    chatRoomId: Number(room.chatRoomId ?? room.id ?? room.roomId),
    postTitle: room.postTitle ?? room.post?.title ?? '거래 채팅',
    postType: room.postType ?? room.post?.postType,
    partnerNickname: room.partnerNickname ?? room.partner?.nickname ?? '사용자',
    partnerProfileImage:
      room.partnerProfileImage ??
      room.partnerProfileImageUrl ??
      room.partner?.profileImage ??
      room.partner?.profileImageUrl ??
      room.opponentProfileImage ??
      room.opponent?.profileImage,
    groupRoom: Boolean(room.groupRoom),
    participantCount: Number(room.participantCount ?? room.memberCount ?? 2),
    lastMessage: room.lastMessage ?? room.latestMessage ?? '',
    lastMessageAt: room.lastMessageAt ?? room.updatedAt ?? room.createdAt,
    unreadCount: Number(room.unreadCount ?? 0),
    pinned: Boolean(room.pinned ?? room.isPinned),
    muted: Boolean(room.muted ?? room.isMuted),
  });

  const normalizeMessage = (message: any): ChatMessage => {
    const rawId = getNumberValue(message.messageId ?? message.id ?? message.chatMessageId);
    const senderId = getNumberValue(message.senderId ?? message.sender?.id ?? message.userId);

    return {
      messageId: rawId ?? getNextTempMessageId(),
      senderId,
      senderNickname: message.senderNickname ?? message.sender?.nickname,
      senderProfileImage: message.senderProfileImage ?? message.sender?.profileImage,
      content: message.content ?? message.message ?? '',
      mine: currentUserId !== undefined
        ? senderId !== undefined ? senderId === currentUserId : Boolean(message.mine || message.isMine)
        : Boolean(message.mine || message.isMine),
      systemMessage: Boolean(message.systemMessage || message.type === 'SYSTEM'),
      unreadByPartner: Boolean(message.unreadByPartner || message.unread_by_partner),
      createdAt: message.createdAt ?? message.sentAt ?? message.created_at,
    };
  };

  const getNumberValue = (value: any): number | undefined => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  };

  const closeSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  const connectSocket = (room: ChatRoom) => {
    closeSocket();
    const token = getAuthToken();
    if (!token) return;

    const socket = new WebSocket(`${WS_BASE_URL}/ws/chat?token=${encodeURIComponent(token)}`);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'SUBSCRIBE', roomId: room.chatRoomId }));
      socket.send(JSON.stringify({ type: 'READ', roomId: room.chatRoomId }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const type = getPayloadType(payload);
        const roomId = getPayloadRoomId(payload);

        if (type === 'READ' && roomId === room.chatRoomId) {
          if (Number(payload.readerId) !== currentUserId) {
            setMessages((prev) => prev.map((message) => (
              message.mine ? { ...message, unreadByPartner: false } : message
            )));
          }
          return;
        }

        if (!isMessagePayload(type) || roomId !== room.chatRoomId) return;

        const incoming = normalizeMessage(payload.message ?? payload.data ?? payload);
        setMessages((prev) => mergeMessages(prev, incoming, currentUserId));
        setRooms((prev) => prev.map((item) => (
          item.chatRoomId === room.chatRoomId
            ? { ...item, lastMessage: incoming.content, lastMessageAt: incoming.createdAt || new Date().toISOString(), unreadCount: 0 }
            : item
        )));
        if (incoming.mine || shouldStickToBottomRef.current) {
          window.requestAnimationFrame(() => scrollMessagesToBottom('smooth'));
        }
        if (!incoming.mine && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'READ', roomId: room.chatRoomId }));
          markRoomRead(room.chatRoomId).catch(() => null);
        }
      } catch (error) {
        console.warn('실시간 채팅 메시지 처리 실패', error);
      }
    };

    socket.onerror = () => {
      console.warn('실시간 채팅 연결에 실패했습니다.');
    };
  };

  const loadRooms = async (filter: ChatFilter) => {
    setIsLoading(true);
    try {
      const response = await apiRequest(`${API_ENDPOINTS.chatRooms}?filter=${filter}`, { method: 'GET' });
      const raw = response?.data?.content || response?.data || response?.rooms || response?.chatRooms || response;
      const normalizedRooms = Array.isArray(raw)
        ? raw.map(normalizeRoom).filter((room) => room.chatRoomId).sort(sortRoomsForDisplay)
        : [];
      setRooms(normalizedRooms);
      onChatUnreadChange?.(normalizedRooms.reduce((sum, room) => sum + room.unreadCount, 0));
    } catch (error) {
      console.warn('채팅방 목록 조회 실패', error);
      setRooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openRoom = async (room: ChatRoom) => {
    setSelectedRoom(room);
    setShowRoomMenu(false);
    setRoomActionTarget(null);
    setIsSearchingMessages(false);
    setMessageSearchQuery('');
    setActiveSearchMatchIndex(0);
    setIsMessagesLoading(true);
    try {
      await loadMessages(room, { markRead: true });
      setRooms((prev) => prev.map((item) => item.chatRoomId === room.chatRoomId ? { ...item, unreadCount: 0 } : item));
      onChatUnreadChange?.(Math.max(0, chatUnreadCount - room.unreadCount));
    } catch (error) {
      console.warn('채팅 메시지 조회 실패', error);
      setMessages([]);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const loadMessages = async (room: ChatRoom, options: { markRead?: boolean } = {}) => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    try {
      const response = await apiRequest(API_ENDPOINTS.chatMessages(room.chatRoomId), { method: 'GET' });
      const raw = response?.data?.content || response?.data || response?.messages || response;
      const normalized = Array.isArray(raw) ? mergeMessageList(raw.map(normalizeMessage), currentUserId) : [];
      const hasNewIncoming = normalized.some((message) => (
        !message.mine && !hasEquivalentMessage(messagesRef.current, message)
      ));

      setMessages((prev) => {
        const next = mergeMessageList([...prev, ...normalized], currentUserId);
        return areMessageListsEqual(prev, next) ? prev : next;
      });

      if (options.markRead || hasNewIncoming) {
        await markRoomRead(room.chatRoomId);
        setRooms((prev) => prev.map((item) => item.chatRoomId === room.chatRoomId ? { ...item, unreadCount: 0 } : item));
      }
      if ((hasNewIncoming && shouldStickToBottomRef.current) || options.markRead) {
        window.requestAnimationFrame(() => scrollMessagesToBottom(hasNewIncoming ? 'smooth' : 'auto'));
      }
    } finally {
      refreshInFlightRef.current = false;
    }
  };

  const markRoomRead = async (chatRoomId: number) => {
    if (readInFlightRef.current) return;
    readInFlightRef.current = true;
    try {
      await apiRequest(API_ENDPOINTS.readChatRoom(chatRoomId), { method: 'PATCH' }).catch(() => null);
    } finally {
      readInFlightRef.current = false;
    }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedRoom || !messageText.trim()) return;

    const content = messageText.trim();
    setMessageText('');
    const optimisticMessage: ChatMessage = {
      messageId: getNextTempMessageId(),
      senderId: currentUserId,
      content,
      mine: true,
      systemMessage: false,
      unreadByPartner: true,
      createdAt: new Date().toISOString(),
    };
    try {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        setMessages((prev) => [...prev, optimisticMessage]);
        setRooms((prev) => prev.map((room) => (
          room.chatRoomId === selectedRoom.chatRoomId
            ? { ...room, lastMessage: content, lastMessageAt: optimisticMessage.createdAt }
            : room
        )));
        window.requestAnimationFrame(() => scrollMessagesToBottom('smooth'));
        socketRef.current.send(JSON.stringify({
          type: 'SEND',
          roomId: selectedRoom.chatRoomId,
          content,
        }));
        window.setTimeout(() => {
          loadMessages(selectedRoom, { markRead: true }).catch(() => null);
        }, 600);
        return;
      }

      const response = await apiRequest(API_ENDPOINTS.chatMessages(selectedRoom.chatRoomId), {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      const created = normalizeMessage(response?.data || response);
      setMessages((prev) => mergeMessages(prev, created, currentUserId));
      setRooms((prev) => prev.map((room) => (
        room.chatRoomId === selectedRoom.chatRoomId
          ? { ...room, lastMessage: content, lastMessageAt: new Date().toISOString() }
          : room
      )));
      window.requestAnimationFrame(() => scrollMessagesToBottom('smooth'));
      window.setTimeout(() => {
        loadMessages(selectedRoom, { markRead: true }).catch(() => null);
      }, 600);
    } catch (error: any) {
      showToast(error.message || '메시지 전송에 실패했습니다.');
      setMessageText(content);
    }
  };

  const filterTabs: { key: ChatFilter; label: string }[] = [
    { key: 'ALL', label: '전체' },
    { key: 'SHARING', label: '나눔 및 판매' },
    { key: 'GROUP_BUY', label: '공동구매' },
    { key: 'UNREAD', label: '안읽음' },
  ];

  const totalUnreadCount = rooms.reduce((sum, room) => sum + room.unreadCount, 0);
  const scrollMessagesToBottom = (behavior: ScrollBehavior = 'auto') => {
    const container = messagesScrollRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  const updateStickToBottom = () => {
    const container = messagesScrollRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 120;
  };

  const searchMatches = useMemo(() => {
    const query = messageSearchQuery.trim().toLowerCase();
    if (!query) return [];
    return messages.filter((message) => !message.systemMessage && message.content.toLowerCase().includes(query));
  }, [messageSearchQuery, messages]);
  const searchMatchIds = useMemo(() => new Set(searchMatches.map((message) => message.messageId)), [searchMatches]);
  const activeSearchMessageId = searchMatches[activeSearchMatchIndex]?.messageId;

  useEffect(() => {
    if (!isSearchingMessages) return;
    setActiveSearchMatchIndex(searchMatches.length > 0 ? searchMatches.length - 1 : 0);
  }, [isSearchingMessages, messageSearchQuery, searchMatches.length]);

  useEffect(() => {
    if (!isSearchingMessages || !activeSearchMessageId) return;
    messageRefs.current[activeSearchMessageId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [activeSearchMessageId, isSearchingMessages]);

  const closeSelectedRoom = () => {
    setSelectedRoom(null);
    setShowRoomMenu(false);
    setIsSearchingMessages(false);
    setMessageSearchQuery('');
    setActiveSearchMatchIndex(0);
  };

  const cancelMessageSearch = () => {
    setIsSearchingMessages(false);
    setMessageSearchQuery('');
    setActiveSearchMatchIndex(0);
  };

  const moveSearchMatch = (direction: 'prev' | 'next') => {
    if (searchMatches.length === 0) return;
    setActiveSearchMatchIndex((current) => {
      if (direction === 'prev') {
        return Math.max(0, current - 1);
      }
      return Math.min(searchMatches.length - 1, current + 1);
    });
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const beginRoomLongPress = (room: ChatRoom) => {
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setRoomActionTarget(room);
    }, 550);
  };

  const handleRoomClick = (room: ChatRoom) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    openRoom(room);
  };

  const applyRoomSettings = (updated: ChatRoom) => {
    setRooms((prev) => prev
      .map((room) => room.chatRoomId === updated.chatRoomId ? { ...room, ...updated } : room)
      .sort(sortRoomsForDisplay));
    setSelectedRoom((current) => current?.chatRoomId === updated.chatRoomId ? { ...current, ...updated } : current);
    setRoomActionTarget((current) => current?.chatRoomId === updated.chatRoomId ? { ...current, ...updated } : current);
  };

  const toggleRoomSetting = async (room: ChatRoom, type: 'pin' | 'mute') => {
    try {
      const endpoint = type === 'pin' ? API_ENDPOINTS.pinChatRoom(room.chatRoomId) : API_ENDPOINTS.muteChatRoom(room.chatRoomId);
      const response = await apiRequest(endpoint, { method: 'PATCH' });
      const updated = normalizeRoom(response?.data || response);
      applyRoomSettings(updated);
      showToast(type === 'pin'
        ? (updated.pinned ? '채팅방을 상단에 고정했습니다.' : '채팅방 상단 고정을 해제했습니다.')
        : (updated.muted ? '채팅방 알림을 껐습니다.' : '채팅방 알림을 켰습니다.'));
    } catch (error) {
      console.warn('채팅방 설정 변경 실패', error);
      showToast('채팅방 설정을 변경하지 못했습니다.');
    }
  };

  const handleRoomMenuAction = async (action: 'pin' | 'block' | 'report' | 'mute' | 'leave', room = selectedRoom) => {
    if (!room) return;

    if (action === 'pin' || action === 'mute') {
      await toggleRoomSetting(room, action);
      setShowRoomMenu(false);
      setRoomActionTarget(null);
      return;
    }

    if (action === 'block') {
      showToast(`${room.partnerNickname}님 차단 기능은 사용자 차단 API와 연결 예정입니다.`);
    }
    if (action === 'report') {
      showToast('신고 기능은 사용자 신고 화면과 연결 예정입니다.');
    }
    if (action === 'leave') {
      if (await showConfirm('채팅방을 나가시겠습니까?', '채팅방 나가기', '나가기')) {
        closeSelectedRoom();
      }
    }

    setShowRoomMenu(false);
    setRoomActionTarget(null);
  };

  if (selectedRoom) {
    return (
      <div className="bg-[#f7fafc] size-full flex flex-col">
        {isSearchingMessages ? (
          <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-2xl bg-[#f1f5f9] px-4 py-3 flex items-center gap-2">
              <Search size={21} className="text-[#718096] flex-shrink-0" />
              <input
                ref={searchInputRef}
                value={messageSearchQuery}
                onChange={(event) => setMessageSearchQuery(event.target.value)}
                placeholder="채팅방 내 메시지 검색"
                className="min-w-0 flex-1 bg-transparent text-base text-[#1a202c] outline-none placeholder:text-[#a0aec0]"
              />
              {messageSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMessageSearchQuery('')}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-[#cbd5e0] text-white"
                  aria-label="검색어 지우기"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => moveSearchMatch('prev')}
                disabled={searchMatches.length === 0 || activeSearchMatchIndex === 0}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f5f9] text-[#2d3748] disabled:text-[#cbd5e0]"
                aria-label="이전 검색 결과"
              >
                <ChevronUp size={19} />
              </button>
              <button
                type="button"
                onClick={() => moveSearchMatch('next')}
                disabled={searchMatches.length === 0 || activeSearchMatchIndex >= searchMatches.length - 1}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f5f9] text-[#2d3748] disabled:text-[#cbd5e0]"
                aria-label="다음 검색 결과"
              >
                <ChevronDown size={19} />
              </button>
            </div>
            <span className="w-11 shrink-0 text-center text-xs text-[#718096]">
              {searchMatches.length > 0 ? `${activeSearchMatchIndex + 1}/${searchMatches.length}` : '0/0'}
            </span>
            <button
              type="button"
              onClick={cancelMessageSearch}
              className="shrink-0 text-base text-[#1a202c]"
              style={{ fontWeight: 800 }}
            >
              취소
            </button>
          </div>
        ) : (
        <div className="bg-gradient-to-r from-[#ccfbf1] to-[#14b8a6] border-b-2 border-[#14b8a6] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={closeSelectedRoom}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#e2e8f0]"
              aria-label="뒤로가기"
            >
              <ArrowLeft size={22} className="text-[#1a202c]" />
            </button>
            <ChatProfileAvatar
              src={selectedRoom.partnerProfileImage}
              alt={selectedRoom.partnerNickname}
              className="w-10 h-10 shadow-sm border border-[#e2e8f0]"
            />
            <div className="min-w-0">
              <h1 className="text-lg text-[#1a202c] truncate" style={{ fontWeight: 900 }}>
                {selectedRoom.partnerNickname}
                {selectedRoom.groupRoom && selectedRoom.participantCount ? ` ${selectedRoom.participantCount}` : ''}
              </h1>
              <p className="text-xs text-[#0f766e] truncate">{selectedRoom.postTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[#1a202c]">
            <button
                onClick={() => {
                  setIsSearchingMessages(true);
                  setActiveSearchMatchIndex(searchMatches.length > 0 ? searchMatches.length - 1 : 0);
                }}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#e2e8f0]"
              aria-label="채팅 검색"
            >
              <Search size={20} />
            </button>
            <button
              onClick={() => setShowRoomMenu(true)}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#e2e8f0]"
              aria-label="채팅 메뉴"
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
        )}

        <div
          ref={messagesScrollRef}
          onScroll={updateStickToBottom}
          className="flex-1 overflow-y-auto px-5 py-5 pb-28 space-y-4"
        >
          {isMessagesLoading ? (
            <div className="rounded-2xl border border-[#ccfbf1] bg-white p-8 text-center text-sm text-[#718096]">메시지를 불러오는 중입니다.</div>
          ) : messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#99f6e4] bg-white p-8 text-center">
              <MessageCircle size={32} className="mx-auto mb-3 text-[#14b8a6]" />
              <p className="text-sm text-[#2d3748]" style={{ fontWeight: 800 }}>아직 메시지가 없습니다.</p>
            </div>
          ) : messages.map((message) => {
            const isSearchHit = searchMatchIds.has(message.messageId);
            const isActiveSearchHit = activeSearchMessageId === message.messageId;
            const searchHighlightClass = isActiveSearchHit
              ? 'ring-2 ring-[#14b8a6] ring-offset-2 ring-offset-[#f7fafc]'
              : isSearchHit
                ? 'ring-1 ring-[#99f6e4]'
                : '';

            return message.systemMessage ? (
              <div
                key={message.messageId}
                ref={(node) => { messageRefs.current[message.messageId] = node; }}
                className="mx-auto w-fit rounded-full border border-[#ccfbf1] bg-white px-4 py-2 text-xs text-[#0f766e] shadow-sm"
              >
                {message.content}
              </div>
            ) : (
              <div
                key={message.messageId}
                ref={(node) => { messageRefs.current[message.messageId] = node; }}
                className={`flex gap-2 ${message.mine ? 'justify-end' : 'justify-start'}`}
              >
                {!message.mine && (
                  <ChatProfileAvatar
                    src={message.senderProfileImage}
                    alt={message.senderNickname || '상대방'}
                    className="h-9 w-9"
                  />
                )}
                {message.mine && (
                  <MessageMeta message={message} align="right" />
                )}
                <div className={`max-w-[72%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm transition ${message.mine ? 'bg-[#14b8a6] text-white' : 'bg-white text-[#1a202c] border border-[#e2e8f0]'} ${searchHighlightClass}`}>
                  {message.content}
                </div>
                {!message.mine && (
                  <MessageMeta message={message} align="left" />
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 border-t border-[#e2e8f0] bg-white px-5 py-4">
          <input
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="메시지를 입력하세요."
            className="min-w-0 flex-1 rounded-full bg-[#f1f5f9] px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#14b8a6]"
          />
          <button type="submit" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#14b8a6] text-white" aria-label="전송">
            <Send size={20} />
          </button>
        </form>

        {showRoomMenu && (
          <div className="fixed inset-0 z-[70] bg-black/35 flex items-end" onClick={() => setShowRoomMenu(false)}>
            <div
              className="w-full rounded-t-[28px] bg-white px-5 pb-6 pt-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-[#e2e8f0]" />
              <div className="mb-4 overflow-hidden rounded-3xl bg-[#f8fafc]">
                <RoomMenuButton icon={Ban} label="차단하기" onClick={() => handleRoomMenuAction('block')} />
                <RoomMenuButton icon={Flag} label="신고하기" onClick={() => handleRoomMenuAction('report')} />
              </div>
              <div className="mb-4 overflow-hidden rounded-3xl bg-[#f8fafc]">
                <RoomMenuButton icon={Pin} label={selectedRoom.pinned ? '채팅방 상단 고정 해제' : '채팅방 상단 고정'} onClick={() => handleRoomMenuAction('pin')} />
                <RoomMenuButton icon={BellOff} label={selectedRoom.muted ? '알림켜기' : '알림끄기'} onClick={() => handleRoomMenuAction('mute')} />
                <RoomMenuButton icon={Trash2} label="채팅방 나가기" danger onClick={() => handleRoomMenuAction('leave')} />
              </div>
              <button
                type="button"
                onClick={() => setShowRoomMenu(false)}
                className="w-full rounded-3xl bg-[#f8fafc] py-4 text-center text-lg text-[#1a202c]"
                style={{ fontWeight: 800 }}
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#f7fafc] size-full flex flex-col">
      <div className="bg-gradient-to-r from-[#ccfbf1] to-[#14b8a6] border-b-2 border-[#14b8a6] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#e2e8f0]">
            <MessageCircle size={22} className="text-[#14b8a6]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg text-[#1a202c]" style={{ fontWeight: 800 }}>채팅</h1>
            <p className="text-xs text-[#0f766e] truncate">열린 거래 채팅 {rooms.length}개</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNotifications(true)} className="text-[#2d3748] relative" aria-label="알림 열기">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#e2e8f0] hover:border-[#14b8a6] transition-colors">
              <Bell size={20} />
            </div>
            {hasUnreadNotifications && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-[#ef4444] rounded-full border-2 border-white" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-28">
        <div className="mb-4 rounded-2xl border border-[#99f6e4] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base text-[#1a202c]" style={{ fontWeight: 800 }}>거래 채팅</h2>
              <p className="mt-1 text-xs text-[#718096]">안읽은 메시지 {totalUnreadCount}개</p>
            </div>
            <div className="h-11 w-11 rounded-full bg-[#f0fdfa] flex items-center justify-center">
              <MessageCircle size={22} className="text-[#14b8a6]" />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${activeFilter === tab.key ? 'bg-[#14b8a6] text-white' : 'bg-[#f1f5f9] text-[#2d3748]'}`}
                style={{ fontWeight: 800 }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#ccfbf1] bg-white p-8 text-center text-sm text-[#718096]">채팅방을 불러오는 중입니다.</div>
        ) : filteredRooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#99f6e4] bg-white p-8 text-center">
            <MessageCircle size={36} className="mx-auto mb-3 text-[#14b8a6]" />
            <p className="text-sm text-[#2d3748]" style={{ fontWeight: 800 }}>아직 개설된 채팅방이 없습니다.</p>
            <p className="mt-1 text-xs text-[#718096]">거래 요청이 수락되면 이곳에 표시됩니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRooms.map((room) => {
              const isGroup = String(room.postType || '').includes('GROUP');
              return (
                <button
                  key={room.chatRoomId}
                  onClick={() => handleRoomClick(room)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setRoomActionTarget(room);
                  }}
                  onTouchStart={() => beginRoomLongPress(room)}
                  onTouchMove={clearLongPressTimer}
                  onTouchEnd={clearLongPressTimer}
                  onMouseDown={() => beginRoomLongPress(room)}
                  onMouseLeave={clearLongPressTimer}
                  onMouseUp={clearLongPressTimer}
                  className="w-full rounded-2xl border border-[#ccfbf1] bg-white p-4 text-left shadow-sm transition hover:border-[#14b8a6]"
                >
                  <div className="flex gap-3">
                    <ChatProfileAvatar
                      src={room.partnerProfileImage}
                      alt={room.partnerNickname}
                      className="h-14 w-14"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-base text-[#1a202c]" style={{ fontWeight: 900 }}>
                            {room.partnerNickname}
                            {room.groupRoom && room.participantCount ? ` ${room.participantCount}` : ''}
                          </span>
                          {room.pinned && <Pin size={15} className="shrink-0 fill-[#a0aec0] text-[#a0aec0]" />}
                          {room.muted && <BellOff size={15} className="shrink-0 text-[#a0aec0]" />}
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${isGroup ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-[#ecfccb] text-[#65a30d]'}`}>
                            {isGroup ? '공동구매' : '나눔/판매'}
                          </span>
                        </div>
                        <span className="shrink-0 text-xs text-[#a0aec0]">{formatTime(room.lastMessageAt)}</span>
                      </div>
                      <p className="truncate text-xs text-[#718096]">{room.postTitle}</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="truncate text-sm text-[#4a5568]">{room.lastMessage || '채팅방이 개설되었습니다.'}</p>
                        {room.unreadCount > 0 && (
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ef4444] px-2 text-xs text-white">
                            {room.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-[#e2e8f0] bg-white px-3 py-4">
        <button onClick={() => onNavigate('나눔 및 판매')} className="flex flex-col items-center gap-1">
          <BottomNavIcon icon={Leaf} color="#65a30d" borderColor="#bef264" />
          <span className="text-[11px] text-[#bef264]">나눔/판매</span>
        </button>
        <button onClick={() => onNavigate('공동구매')} className="flex flex-col items-center gap-1">
          <BottomNavIcon icon={ShoppingCart} color="#f59e0b" borderColor="#fbbf24" />
          <span className="text-[11px] text-[#fbbf24]">공동구매</span>
        </button>
        <button className="relative flex flex-col items-center gap-1">
          <span className="relative">
            <BottomNavIcon icon={MessageCircle} color="#14b8a6" borderColor="#99f6e4" />
            {chatUnreadCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] leading-none text-white">
                {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
              </span>
            )}
          </span>
          <span className="text-[11px] text-[#14b8a6]">채팅</span>
        </button>
        <button onClick={() => onNavigate('fridge')} className="flex flex-col items-center gap-1">
          <BottomNavIcon icon={Snowflake} color="#0284c7" borderColor="#bae6fd" />
          <span className="text-[11px] text-[#0284c7]">냉장고</span>
        </button>
        <button onClick={() => onNavigate('profile')} className="flex flex-col items-center gap-1">
          <BottomNavIcon icon={User} color="#2d3748" borderColor="#cbd5e0" />
          <span className="text-[11px] text-[#2d3748]">내정보</span>
        </button>
      </div>

      {roomActionTarget && (
        <RoomQuickActionSheet
          room={roomActionTarget}
          onClose={() => setRoomActionTarget(null)}
          onTogglePin={() => handleRoomMenuAction('pin', roomActionTarget)}
          onToggleMute={() => handleRoomMenuAction('mute', roomActionTarget)}
        />
      )}

      {showNotifications && (
        <NotificationsScreen
          onClose={() => {
            setShowNotifications(false);
            loadUnreadNotifications();
          }}
          onOpenTradeHistory={() => onNavigate('tradeHistory')}
        />
      )}
    </div>
  );
}

function getNextTempMessageId() {
  tempMessageId -= 1;
  return tempMessageId;
}

function getPayloadType(payload: any) {
  return String(payload.type ?? payload.eventType ?? payload.event ?? payload.messageType ?? '').toUpperCase();
}

function isMessagePayload(type: string) {
  return ['MESSAGE', 'CHAT_MESSAGE', 'CHAT_NOTIFICATION', 'SEND'].includes(type);
}

function getPayloadRoomId(payload: any) {
  return Number(
    payload.roomId ??
    payload.chatRoomId ??
    payload.message?.chatRoomId ??
    payload.message?.roomId ??
    payload.data?.chatRoomId ??
    payload.data?.roomId
  );
}

function mergeMessageList(messages: ChatMessage[], currentUserId?: number) {
  return sortMessages(messages.reduce<ChatMessage[]>((merged, message) => (
    mergeMessages(merged, message, currentUserId)
  ), []));
}

function mergeMessages(messages: ChatMessage[], incoming: ChatMessage, currentUserId?: number) {
  const normalizedIncoming = normalizeMine(incoming, currentUserId);

  const idIndex = normalizedIncoming.messageId > 0
    ? messages.findIndex((message) => message.messageId === normalizedIncoming.messageId)
    : -1;
  if (idIndex >= 0) {
    const next = [...messages];
    next[idIndex] = { ...next[idIndex], ...normalizedIncoming };
    return sortMessages(next);
  }

  const pendingIndex = messages.findIndex((message) => isMatchingPendingMessage(message, normalizedIncoming, currentUserId));
  if (pendingIndex >= 0) {
    const next = [...messages];
    next[pendingIndex] = { ...normalizedIncoming, mine: true };
    return sortMessages(next);
  }

  if (messages.some((message) => isSameMessage(message, normalizedIncoming))) {
    return messages;
  }

  return sortMessages([...messages, normalizedIncoming]);
}

function normalizeMine(message: ChatMessage, currentUserId?: number) {
  if (currentUserId === undefined || message.senderId === undefined) {
    return message;
  }
  return {
    ...message,
    mine: message.mine || message.senderId === currentUserId,
  };
}

function isMatchingPendingMessage(message: ChatMessage, incoming: ChatMessage, currentUserId?: number) {
  if (message.messageId >= 0 || !message.mine || message.content !== incoming.content) {
    return false;
  }

  if (incoming.mine || (currentUserId !== undefined && incoming.senderId === currentUserId)) {
    return true;
  }

  return currentUserId === undefined && areCloseMessageTimes(message.createdAt, incoming.createdAt, 15000);
}

function isSameMessage(message: ChatMessage, incoming: ChatMessage) {
  if (message.messageId > 0 && incoming.messageId > 0 && message.messageId === incoming.messageId) {
    return true;
  }

  if (message.content !== incoming.content || message.systemMessage !== incoming.systemMessage) {
    return false;
  }

  const sameSender = message.senderId !== undefined && incoming.senderId !== undefined
    ? message.senderId === incoming.senderId
    : message.mine === incoming.mine && message.senderNickname === incoming.senderNickname;

  return sameSender && areCloseMessageTimes(message.createdAt, incoming.createdAt, 2000);
}

function hasEquivalentMessage(messages: ChatMessage[], incoming: ChatMessage) {
  return messages.some((message) => isSameMessage(message, incoming));
}

function areMessageListsEqual(left: ChatMessage[], right: ChatMessage[]) {
  if (left.length !== right.length) return false;

  return left.every((message, index) => {
    const other = right[index];
    return Boolean(other) &&
      message.messageId === other.messageId &&
      message.senderId === other.senderId &&
      message.content === other.content &&
      message.mine === other.mine &&
      message.systemMessage === other.systemMessage &&
      Boolean(message.unreadByPartner) === Boolean(other.unreadByPartner) &&
      message.createdAt === other.createdAt;
  });
}

function areCloseMessageTimes(left?: string, right?: string, thresholdMs = 2000) {
  if (!left || !right) return left === right;
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return left === right;
  return Math.abs(leftTime - rightTime) <= thresholdMs;
}

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort((left, right) => {
    const leftTime = getMessageTime(left);
    const rightTime = getMessageTime(right);
    if (leftTime !== rightTime) return leftTime - rightTime;

    const leftId = left.messageId > 0 ? left.messageId : Number.MAX_SAFE_INTEGER + Math.abs(left.messageId);
    const rightId = right.messageId > 0 ? right.messageId : Number.MAX_SAFE_INTEGER + Math.abs(right.messageId);
    return leftId - rightId;
  });
}

function getMessageTime(message: ChatMessage) {
  const time = message.createdAt ? new Date(message.createdAt).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
}

function MessageMeta({ message, align }: { message: ChatMessage; align: 'left' | 'right' }) {
  return (
    <div className={`flex shrink-0 self-end pb-1 text-[10px] leading-tight text-[#a0aec0] ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
      <div>
        {message.mine && (
          <p className={message.unreadByPartner ? 'text-[#f59e0b]' : 'text-[#a0aec0]'}>
            {message.unreadByPartner ? '1' : '읽음'}
          </p>
        )}
        <p>{formatMessageTime(message.createdAt)}</p>
      </div>
    </div>
  );
}

function formatMessageTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function sortRoomsForDisplay(left: ChatRoom, right: ChatRoom) {
  if (Boolean(left.pinned) !== Boolean(right.pinned)) {
    return left.pinned ? -1 : 1;
  }

  return getRoomSortTime(right) - getRoomSortTime(left);
}

function getRoomSortTime(room: ChatRoom) {
  const time = room.lastMessageAt ? new Date(room.lastMessageAt).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
}

function RoomQuickActionSheet({
  room,
  onClose,
  onTogglePin,
  onToggleMute,
}: {
  room: ChatRoom;
  onClose: () => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/25 flex items-end" onClick={onClose}>
      <div
        className="w-full rounded-t-[24px] bg-white px-5 pb-6 pt-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-[#e2e8f0]" />
        <p className="mb-3 truncate px-1 text-base text-[#1a202c]" style={{ fontWeight: 900 }}>
          {room.partnerNickname}
        </p>
        <div className="overflow-hidden rounded-3xl bg-[#f8fafc]">
          <RoomMenuButton icon={Pin} label={room.pinned ? '채팅방 상단 고정 해제' : '채팅방 상단 고정'} onClick={onTogglePin} />
          <RoomMenuButton icon={BellOff} label={room.muted ? '채팅방 알림 켜기' : '채팅방 알림 끄기'} onClick={onToggleMute} />
        </div>
      </div>
    </div>
  );
}

function ChatProfileAvatar({ src, alt, className }: { src?: string | null; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(src && src.trim() && !src.includes('food-placeholder'));

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!hasImage || failed) {
    return (
      <img
        src={PROFILE_PLACEHOLDER}
        alt={alt}
        className={`${className} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div className={`${className} overflow-hidden rounded-full bg-[#e2e8f0] flex-shrink-0`}>
      <img
        src={resolveImageUrl(src)}
        alt={alt}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function RoomMenuButton({
  icon: Icon,
  label,
  danger = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-5 border-b border-[#e2e8f0] px-5 py-5 last:border-b-0"
    >
      <Icon size={26} className={danger ? 'text-[#ef4444]' : 'text-[#1a202c]'} />
      <span className={`text-lg ${danger ? 'text-[#ef4444]' : 'text-[#1a202c]'}`} style={{ fontWeight: 700 }}>
        {label}
      </span>
    </button>
  );
}
