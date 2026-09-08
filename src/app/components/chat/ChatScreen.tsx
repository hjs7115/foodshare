import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Ban, Bell, BellOff, Camera, ChevronDown, ChevronUp, File as FileIcon, Flag, Image as ImageIcon, Leaf, Loader2, MapPin, MessageCircle, MoreVertical, Pencil, Pin, Plus, Search, Send, ShoppingCart, Snowflake, Trash2, User, X, type LucideIcon } from 'lucide-react';
import { API_ENDPOINTS, WS_BASE_URL, apiRequest, blockUser, createReport, getNotifications, resolveImageUrl, uploadImage } from '../../api/config';
import { getAuthToken, getStoredUserInfo } from '../../auth/session';
import NotificationsScreen from '../common/NotificationsScreen';
import BottomNavIcon from '../common/BottomNavIcon';
import { showToast, showConfirm, showPrompt } from '../../utils/feedback';
import { getChatSettings } from '../profile/ChatSettingsScreen';
import KakaoMapModal from '../KakaoMapModal';

type ChatFilter = 'ALL' | 'SHARING' | 'GROUP_BUY' | 'UNREAD';
const PROFILE_PLACEHOLDER = '/assets/profile-placeholder.svg';

interface ChatRoom {
  chatRoomId: number;
  partnerId?: number;
  postTitle: string;
  postType?: string;
  roomName?: string;
  partnerNickname: string;
  partnerProfileImage?: string;
  groupRoom?: boolean;
  participantCount?: number;
  participants?: ChatParticipant[];
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
  unreadCount?: number;
  unreadByPartner?: boolean;
  readByUserIds?: number[];
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
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [showChatMapModal, setShowChatMapModal] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
      setShowAttachmentMenu(false);
      setShowChatMapModal(false);
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
    partnerId: getNumberValue(room.partnerId ?? room.partner?.id ?? room.opponentId ?? room.opponent?.id),
    postTitle: room.postTitle ?? room.post?.title ?? '거래 채팅',
    postType: room.postType ?? room.post?.postType,
    roomName: room.roomName ?? room.name,
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
    participants: Array.isArray(room.participants)
      ? room.participants.map((participant: any) => ({
          userId: Number(participant.userId ?? participant.id),
          nickname: participant.nickname ?? participant.name ?? '사용자',
          profileImage: participant.profileImage ?? participant.profileImageUrl,
        })).filter((participant: ChatParticipant) => participant.userId)
      : [],
    lastMessage: room.lastMessage ?? room.latestMessage ?? '',
    lastMessageAt: room.lastMessageAt ?? room.updatedAt ?? room.createdAt,
    unreadCount: Number(room.unreadCount ?? 0),
    pinned: Boolean(room.pinned ?? room.isPinned),
    muted: Boolean(room.muted ?? room.isMuted),
  });

  const normalizeMessage = (message: any, room?: ChatRoom): ChatMessage => {
    const rawId = getNumberValue(message.messageId ?? message.id ?? message.chatMessageId);
    const senderId = getNumberValue(message.senderId ?? message.sender?.id ?? message.userId);
    const explicitUnreadCount = getNumberValue(
      message.unreadCount ??
      message.unread_count ??
      message.unreadByCount ??
      message.unread_by_count ??
      message.unreadUserCount ??
      message.unread_user_count
    );
    const readByUserIds = extractReadByUserIds(message);
    const mine = currentUserId !== undefined
      ? senderId !== undefined ? senderId === currentUserId : Boolean(message.mine || message.isMine)
      : Boolean(message.mine || message.isMine);
    const unreadByPartnerFlag = message.unreadByPartner ?? message.unread_by_partner;
    const unreadCount = mine
      ? explicitUnreadCount ?? (unreadByPartnerFlag !== undefined
        ? unreadByPartnerFlag ? getUnreadRecipientCount(room) : 0
        : undefined)
      : undefined;

    return {
      messageId: rawId ?? getNextTempMessageId(),
      senderId,
      senderNickname: message.senderNickname ?? message.sender?.nickname,
      senderProfileImage: message.senderProfileImage ?? message.sender?.profileImage,
      content: message.content ?? message.message ?? '',
      mine,
      systemMessage: Boolean(message.systemMessage || message.type === 'SYSTEM'),
      unreadCount,
      unreadByPartner: unreadCount !== undefined
        ? unreadCount > 0
        : Boolean(unreadByPartnerFlag),
      readByUserIds,
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
      if (shouldSendReadReceipt()) {
        socket.send(JSON.stringify({ type: 'READ', roomId: room.chatRoomId }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const type = getPayloadType(payload);
        const roomId = getPayloadRoomId(payload);

        if (type === 'READ' && roomId === room.chatRoomId) {
          const readerId = getNumberValue(payload.readerId ?? payload.userId ?? payload.memberId);
          if (readerId !== undefined && readerId !== currentUserId) {
            setMessages((prev) => prev.map((message) => applyReadReceipt(message, readerId)));
          }
          return;
        }

        if (!isMessagePayload(type) || roomId !== room.chatRoomId) return;

        const incoming = normalizeMessage(payload.message ?? payload.data ?? payload, room);
        setMessages((prev) => mergeMessages(prev, incoming, currentUserId));
        setRooms((prev) => prev.map((item) => (
          item.chatRoomId === room.chatRoomId
            ? { ...item, lastMessage: incoming.content, lastMessageAt: incoming.createdAt || new Date().toISOString(), unreadCount: 0 }
            : item
        )));
        if (incoming.mine || shouldStickToBottomRef.current) {
          window.requestAnimationFrame(() => scrollMessagesToBottom('smooth'));
        }
        if (!incoming.mine && socket.readyState === WebSocket.OPEN && shouldSendReadReceipt()) {
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
      const normalized = Array.isArray(raw) ? mergeMessageList(raw.map((message) => normalizeMessage(message, room)), currentUserId) : [];
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
    if (!shouldSendReadReceipt()) return;
    if (readInFlightRef.current) return;
    readInFlightRef.current = true;
    try {
      await apiRequest(API_ENDPOINTS.readChatRoom(chatRoomId), { method: 'PATCH' }).catch(() => null);
    } finally {
      readInFlightRef.current = false;
    }
  };

  const sendChatContent = async (rawContent: string, options: { restoreInputOnFail?: boolean } = {}) => {
    if (!selectedRoom || !rawContent.trim()) return false;

    const content = rawContent.trim();
    const unreadCount = getUnreadRecipientCount(selectedRoom);
    const optimisticMessage: ChatMessage = {
      messageId: getNextTempMessageId(),
      senderId: currentUserId,
      content,
      mine: true,
      systemMessage: false,
      unreadCount,
      unreadByPartner: unreadCount > 0,
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
        return true;
      }

      const response = await apiRequest(API_ENDPOINTS.chatMessages(selectedRoom.chatRoomId), {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      const created = normalizeMessage(response?.data || response, selectedRoom);
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
      return true;
    } catch (error: any) {
      showToast(error.message || '메시지 전송에 실패했습니다.');
      if (options.restoreInputOnFail) {
        setMessageText(content);
      }
      return false;
    }
  };

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    if (!messageText.trim()) return;

    const content = messageText;
    setMessageText('');
    setShowAttachmentMenu(false);
    sendChatContent(content, { restoreInputOnFail: true });
  };

  const handleImageAttachment = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 첨부할 수 있습니다.');
      return;
    }

    setShowAttachmentMenu(false);
    setIsUploadingAttachment(true);
    try {
      const imageUrl = await uploadImage(file);
      if (!imageUrl) {
        throw new Error('업로드된 이미지 주소를 확인하지 못했습니다.');
      }
      await sendChatContent(`[사진]\n${imageUrl}`);
    } catch (error: any) {
      showToast(error.message || '사진 첨부에 실패했습니다.');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleFileAttachment = async (file?: File | null) => {
    if (!file) return;

    setShowAttachmentMenu(false);
    const sizeLabel = formatFileSize(file.size);
    await sendChatContent(`[파일]\n${file.name}\n${sizeLabel}`);
  };

  const handleSelectChatLocation = (address: string, lat: number, lng: number) => {
    const mapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(address)},${lat},${lng}`;
    sendChatContent(`[지도]\n${address}\n${mapUrl}`);
  };

  const handleAttachmentInputChange = (
    event: ChangeEvent<HTMLInputElement>,
    handler: (file?: File | null) => void
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    handler(file);
  };

  const openAttachmentPicker = (type: 'camera' | 'photo' | 'map' | 'file') => {
    if (!selectedRoom) return;
    setShowAttachmentMenu(false);

    if (type === 'camera') {
      cameraInputRef.current?.click();
      return;
    }
    if (type === 'photo') {
      photoInputRef.current?.click();
      return;
    }
    if (type === 'file') {
      fileInputRef.current?.click();
      return;
    }
    setShowChatMapModal(true);
  };

  const filterTabs: { key: ChatFilter; label: string }[] = [
    { key: 'ALL', label: '전체' },
    { key: 'SHARING', label: '나눔 및 판매' },
    { key: 'GROUP_BUY', label: '공동구매' },
    { key: 'UNREAD', label: '안읽음' },
  ];

  const totalUnreadCount = rooms.reduce((sum, room) => sum + room.unreadCount, 0);
  const pinnedRooms = filteredRooms.filter((room) => room.pinned);

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

  const handleRoomMenuAction = async (action: 'pin' | 'block' | 'report' | 'mute' | 'rename' | 'leave', room = selectedRoom) => {
    if (!room) return;

    if (action === 'pin' || action === 'mute') {
      await toggleRoomSetting(room, action);
      setShowRoomMenu(false);
      setRoomActionTarget(null);
      return;
    }

    if (action === 'rename') {
      const nextName = await showPrompt('변경할 채팅방 이름을 입력해주세요.', '방 이름 변경', room.roomName || room.partnerNickname);
      if (nextName === null) return;
      try {
        const response = await apiRequest(API_ENDPOINTS.renameChatRoom(room.chatRoomId), {
          method: 'PATCH',
          body: JSON.stringify({ roomName: nextName.trim() }),
        });
        const updated = normalizeRoom(response?.data || response);
        applyRoomSettings(updated);
        showToast('방 이름을 변경했습니다.', 'success');
      } catch (error: any) {
        showToast(error?.message || '방 이름 변경에 실패했습니다.', 'error');
      }
    }

    if (action === 'block') {
      if (!room.partnerId) {
        showToast('차단할 사용자 정보를 찾지 못했습니다.', 'error');
        return;
      }
      if (!(await showConfirm(`${room.partnerNickname}님을 차단할까요?\n차단하면 서로의 게시글과 댓글이 보이지 않습니다.`, '사용자 차단', '차단'))) {
        return;
      }
      try {
        await blockUser(room.partnerId);
        setRooms((prev) => prev.filter((item) => item.chatRoomId !== room.chatRoomId));
        if (selectedRoom?.chatRoomId === room.chatRoomId) {
          setMessages([]);
          closeSelectedRoom();
        }
        showToast('사용자를 차단했습니다.', 'success');
      } catch (error: any) {
        showToast(error?.message || '사용자 차단에 실패했습니다.', 'error');
      }
    }
    if (action === 'report') {
      if (!room.partnerId) {
        showToast('신고할 사용자 정보를 찾지 못했습니다.', 'error');
        return;
      }
      const reason = await showPrompt(`${room.partnerNickname}님을 신고하는 이유를 입력해주세요.`, '신고하기', '신고 사유');
      if (!reason?.trim()) return;
      try {
        await createReport({
          targetType: 'USER',
          targetId: room.partnerId,
          reason: reason.trim(),
          description: `채팅방 ${room.chatRoomId}에서 신고됨`,
        });
        showToast('신고가 접수되었습니다.', 'success');
      } catch (error: any) {
        showToast(error?.message || '신고 접수에 실패했습니다.', 'error');
      }
    }
    if (action === 'leave') {
      if (await showConfirm('채팅방을 삭제할까요?\n삭제하면 이 채팅방의 메시지도 함께 삭제됩니다.', '채팅방 삭제', '삭제')) {
        try {
          await apiRequest(API_ENDPOINTS.leaveChatRoom(room.chatRoomId), { method: 'DELETE' });
          setRooms((prev) => prev.filter((item) => item.chatRoomId !== room.chatRoomId));
          if (selectedRoom?.chatRoomId === room.chatRoomId) {
            setMessages([]);
          }
          showToast('채팅방을 삭제했습니다.', 'success');
        } catch (error: any) {
          showToast(error?.message || '채팅방 삭제에 실패했습니다.', 'error');
          return;
        }
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
                {selectedRoom.roomName || selectedRoom.partnerNickname}
                {selectedRoom.groupRoom && selectedRoom.participantCount ? ` ${selectedRoom.participantCount}` : ''}
              </h1>
              <p className="text-xs text-[#0f766e] truncate">
                {selectedRoom.groupRoom ? getParticipantSummary(selectedRoom) : selectedRoom.postTitle}
              </p>
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
                <div className="max-w-[72%]">
                  {selectedRoom.groupRoom && !message.mine && message.senderNickname && (
                    <p className="mb-1 ml-2 text-[11px] text-[#64748b]" style={{ fontWeight: 800 }}>
                      {message.senderNickname}
                    </p>
                  )}
                  <div className={`rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm transition ${message.mine ? 'bg-[#14b8a6] text-white' : 'bg-white text-[#1a202c] border border-[#e2e8f0]'} ${searchHighlightClass}`}>
                    <ChatMessageContent message={message} />
                  </div>
                </div>
                {!message.mine && (
                  <MessageMeta message={message} align="left" />
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e2e8f0] bg-white px-5 py-4">
          {showAttachmentMenu && (
            <div className="absolute bottom-[84px] left-5 rounded-3xl border border-[#ccfbf1] bg-white p-2 shadow-2xl">
              <AttachmentMenuButton icon={Camera} label="카메라" onClick={() => openAttachmentPicker('camera')} />
              <AttachmentMenuButton icon={ImageIcon} label="사진" onClick={() => openAttachmentPicker('photo')} />
              <AttachmentMenuButton icon={MapPin} label="지도" onClick={() => openAttachmentPicker('map')} />
              <AttachmentMenuButton icon={FileIcon} label="파일" onClick={() => openAttachmentPicker('file')} />
            </div>
          )}

          <form onSubmit={sendMessage} className="flex items-center gap-3">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => handleAttachmentInputChange(event, handleImageAttachment)}
            />
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleAttachmentInputChange(event, handleImageAttachment)}
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => handleAttachmentInputChange(event, handleFileAttachment)}
            />
            <button
              type="button"
              onClick={() => setShowAttachmentMenu((current) => !current)}
              disabled={isUploadingAttachment}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#ccfbf1] bg-[#f0fdfa] text-[#0f766e] disabled:opacity-60"
              aria-label="첨부 메뉴 열기"
            >
              {isUploadingAttachment ? <Loader2 size={20} className="animate-spin" /> : <Plus size={22} />}
            </button>
            <input
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="메시지를 입력하세요."
              className="min-w-0 flex-1 rounded-full bg-[#f1f5f9] px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[#14b8a6]"
            />
            <button type="submit" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#14b8a6] text-white" aria-label="전송">
              <Send size={20} />
            </button>
          </form>
        </div>

        {showChatMapModal && (
          <KakaoMapModal
            isOpen={showChatMapModal}
            onClose={() => setShowChatMapModal(false)}
            onSelectAddress={handleSelectChatLocation}
          />
        )}

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
                <RoomMenuButton icon={Pin} label={selectedRoom.pinned ? '상단 고정 해제' : '상단 고정'} onClick={() => handleRoomMenuAction('pin')} />
                <RoomMenuButton icon={BellOff} label={selectedRoom.muted ? '알림 켜기' : '알림 끄기'} onClick={() => handleRoomMenuAction('mute')} />
                <RoomMenuButton icon={Pencil} label="방 이름 변경" onClick={() => handleRoomMenuAction('rename')} />
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
            {pinnedRooms.length > 0 && (
              <div className="flex items-center gap-2 px-1 text-xs text-[#0f766e]" style={{ fontWeight: 900 }}>
                <Pin size={14} className="fill-[#14b8a6] text-[#14b8a6]" />
                <span>상단 고정 {pinnedRooms.length}개</span>
              </div>
            )}
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
                            {room.roomName || room.partnerNickname}
                            {room.groupRoom && room.participantCount ? ` ${room.participantCount}` : ''}
                          </span>
                          {room.pinned && <Pin size={15} className="shrink-0 fill-[#a0aec0] text-[#a0aec0]" />}
                          {room.muted && <BellOff size={15} className="shrink-0 text-[#a0aec0]" />}
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${isGroup ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-[#ecfccb] text-[#65a30d]'}`}>
                            {isGroup ? '공동구매' : '나눔/판매'}
                          </span>
                        </div>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-[#a0aec0]">{formatTime(room.lastMessageAt)}</span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRoomMenuAction('pin', room);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                handleRoomMenuAction('pin', room);
                              }
                            }}
                            className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                              room.pinned
                                ? 'border-[#14b8a6] bg-[#ccfbf1] text-[#0f766e]'
                                : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]'
                            }`}
                            aria-label={room.pinned ? '채팅방 상단 고정 해제' : '채팅방 상단 고정'}
                            title={room.pinned ? '상단 고정 해제' : '상단 고정'}
                          >
                            <Pin size={15} className={room.pinned ? 'fill-[#14b8a6]' : ''} />
                          </span>
                        </span>
                      </div>
                      <p className="truncate text-xs text-[#718096]">
                        {room.groupRoom ? getParticipantSummary(room) : room.postTitle}
                      </p>
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

interface ChatParticipant {
  userId: number;
  nickname: string;
  profileImage?: string;
}

function shouldSendReadReceipt() {
  try {
    return getChatSettings().readReceipt;
  } catch {
    return true;
  }
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

function getUnreadRecipientCount(room?: ChatRoom | null) {
  if (!room) return 1;
  if (Array.isArray(room.participants) && room.participants.length > 0) {
    return Math.max(0, room.participants.length - 1);
  }
  return Math.max(0, Number(room.participantCount ?? 2) - 1);
}

function extractReadByUserIds(message: any): number[] {
  const raw =
    message.readByUserIds ??
    message.read_by_user_ids ??
    message.readers ??
    message.readMembers ??
    message.readBy;

  if (!Array.isArray(raw)) return [];

  return raw
    .map((reader: any) => Number(reader?.userId ?? reader?.id ?? reader))
    .filter((readerId: number) => Number.isFinite(readerId));
}

function applyReadReceipt(message: ChatMessage, readerId: number): ChatMessage {
  if (!message.mine || message.systemMessage) return message;
  if (message.readByUserIds?.includes(readerId)) return message;

  const currentUnreadCount = message.unreadCount ?? (message.unreadByPartner ? 1 : 0);
  const nextUnreadCount = Math.max(0, currentUnreadCount - 1);

  return {
    ...message,
    unreadCount: nextUnreadCount,
    unreadByPartner: nextUnreadCount > 0,
    readByUserIds: [...(message.readByUserIds || []), readerId],
  };
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
    next[idIndex] = mergeMessageState(next[idIndex], normalizedIncoming);
    return sortMessages(next);
  }

  const pendingIndex = messages.findIndex((message) => isMatchingPendingMessage(message, normalizedIncoming, currentUserId));
  if (pendingIndex >= 0) {
    const next = [...messages];
    next[pendingIndex] = mergeMessageState(next[pendingIndex], { ...normalizedIncoming, mine: true });
    return sortMessages(next);
  }

  if (messages.some((message) => isSameMessage(message, normalizedIncoming))) {
    return messages;
  }

  return sortMessages([...messages, normalizedIncoming]);
}

function mergeMessageState(existing: ChatMessage, incoming: ChatMessage): ChatMessage {
  const unreadCount = incoming.unreadCount !== undefined ? incoming.unreadCount : existing.unreadCount;

  return {
    ...existing,
    ...incoming,
    unreadCount,
    unreadByPartner: unreadCount !== undefined ? unreadCount > 0 : incoming.unreadByPartner,
    readByUserIds: incoming.readByUserIds && incoming.readByUserIds.length > 0
      ? incoming.readByUserIds
      : existing.readByUserIds,
  };
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
      (message.unreadCount ?? 0) === (other.unreadCount ?? 0) &&
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
  const unreadCount = message.unreadCount ?? (message.unreadByPartner ? 1 : 0);

  return (
    <div className={`flex shrink-0 self-end pb-1 text-[10px] leading-tight text-[#a0aec0] ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
      <div>
        {message.mine && (
          <p className={unreadCount > 0 ? 'text-[#f59e0b]' : 'text-[#a0aec0]'}>
            {unreadCount > 0 ? unreadCount : '읽음'}
          </p>
        )}
        <p>{formatMessageTime(message.createdAt)}</p>
      </div>
    </div>
  );
}

function ChatMessageContent({ message }: { message: ChatMessage }) {
  const attachment = parseAttachmentMessage(message.content);
  const linkClassName = message.mine ? 'text-white underline decoration-white/70' : 'text-[#0f766e] underline';

  if (attachment?.type === 'image') {
    return (
      <div className="space-y-2">
        <img
          src={resolveImageUrl(attachment.url)}
          alt="첨부 사진"
          className="max-h-64 w-full rounded-2xl object-cover"
        />
        <a href={resolveImageUrl(attachment.url)} target="_blank" rel="noreferrer" className={linkClassName}>
          사진 보기
        </a>
      </div>
    );
  }

  if (attachment?.type === 'map') {
    return (
      <div className="space-y-2">
        <div className={`rounded-2xl p-3 ${message.mine ? 'bg-white/15' : 'bg-[#f0fdfa]'}`}>
          <div className="mb-2 flex items-center gap-2" style={{ fontWeight: 800 }}>
            <MapPin size={17} />
            <span>위치 공유</span>
          </div>
          <p>{attachment.address}</p>
        </div>
        {attachment.url && (
          <a href={attachment.url} target="_blank" rel="noreferrer" className={linkClassName}>
            지도에서 보기
          </a>
        )}
      </div>
    );
  }

  if (attachment?.type === 'file') {
    return (
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${message.mine ? 'bg-white/15' : 'bg-[#f1f5f9]'}`}>
          <FileIcon size={20} />
        </span>
        <span className="min-w-0">
          <span className="block truncate" style={{ fontWeight: 800 }}>{attachment.name}</span>
          {attachment.size && <span className="block text-xs opacity-75">{attachment.size}</span>}
        </span>
      </div>
    );
  }

  return <span className="whitespace-pre-wrap break-words">{message.content}</span>;
}

function parseAttachmentMessage(content: string):
  | { type: 'image'; url: string }
  | { type: 'map'; address: string; url?: string }
  | { type: 'file'; name: string; size?: string }
  | null {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines[0] === '[사진]' && lines[1]) {
    return { type: 'image', url: lines[1] };
  }
  if (lines[0] === '[지도]' && lines[1]) {
    return { type: 'map', address: lines[1], url: lines[2] };
  }
  if (lines[0] === '[파일]' && lines[1]) {
    return { type: 'file', name: lines[1], size: lines[2] };
  }
  return null;
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
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

function getParticipantSummary(room: ChatRoom) {
  const names = (room.participants || [])
    .map((participant) => participant.nickname)
    .filter(Boolean);
  if (names.length === 0) {
    return room.postTitle;
  }
  return names.join(', ');
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
          <RoomMenuButton icon={Pin} label={room.pinned ? '상단 고정 해제' : '상단 고정'} onClick={onTogglePin} />
          <RoomMenuButton icon={BellOff} label={room.muted ? '알림 켜기' : '알림 끄기'} onClick={onToggleMute} />
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

function AttachmentMenuButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-44 items-center gap-3 rounded-2xl px-4 py-3 text-left text-[#1a202c] transition-colors hover:bg-[#f0fdfa]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ccfbf1] text-[#0f766e]">
        <Icon size={19} />
      </span>
      <span className="text-sm" style={{ fontWeight: 800 }}>{label}</span>
    </button>
  );
}
