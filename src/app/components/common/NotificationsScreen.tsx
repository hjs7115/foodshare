import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Handshake,
  MessageCircle,
  RefreshCw,
  ShoppingBag,
  Star,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  deleteNotification,
  deleteReadNotifications,
  getNotifications,
  readNotification,
  resolveImageUrl,
} from '../../api/config';
import BackendImage from './BackendImage';
import { showConfirm, showToast } from '../../utils/feedback';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt?: string;
  postId?: number;
  requesterNickname?: string;
  requesterProfileImage?: string;
  requesterFreshness?: number;
  requesterFreshnessLabel?: string;
  requesterShareCompletedCount?: number;
  requesterReceivedShareCount?: number;
  requesterGroupBuyCount?: number;
  boardType?: 'sharing' | 'group';
}

interface NotificationsScreenProps {
  onClose: () => void;
  onOpenPost?: (postId: number) => void;
  onOpenTradeHistory?: () => void;
}

function getArrayPayload(response: any): any[] {
  const candidates = [
    response?.notifications,
    response?.data?.notifications,
    response?.data?.content,
    response?.data?.items,
    response?.content,
    response?.items,
    response?.data,
    response,
  ];

  return candidates.find(Array.isArray) || [];
}

function getNumberValue(value: any): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeNotification(raw: any): NotificationItem {
  const postId = getNumberValue(
    raw.postId ||
    raw.post?.id ||
    raw.targetPostId ||
    raw.referenceId ||
    raw.relatedPostId
  );

  return {
    id: Number(raw.id || raw.notificationId || raw.noticeId || Date.now()),
    title: raw.title || raw.subject || getDefaultTitle(raw.type),
    message: raw.message || raw.content || raw.body || raw.text || '새 알림이 도착했습니다.',
    type: String(raw.type || raw.notificationType || raw.category || 'GENERAL'),
    isRead: Boolean(raw.isRead || raw.read || raw.readAt || raw.status === 'READ'),
    createdAt: raw.createdAt || raw.createdDate || raw.sentAt || raw.regDate,
    postId,
    requesterNickname:
      raw.requesterNickname ||
      raw.requester?.nickname ||
      raw.senderNickname ||
      raw.sender?.nickname ||
      raw.userNickname ||
      raw.user?.nickname,
    requesterProfileImage:
      raw.requesterProfileImage ||
      raw.requester?.profileImage ||
      raw.requester?.profileImageUrl ||
      raw.senderProfileImage ||
      raw.sender?.profileImage ||
      raw.sender?.profileImageUrl ||
      raw.user?.profileImage ||
      raw.user?.profileImageUrl,
    requesterFreshness: getNumberValue(
      raw.requesterFreshness ||
      raw.requester?.freshness ||
      raw.senderFreshness ||
      raw.sender?.freshness ||
      raw.user?.freshness
    ),
    requesterFreshnessLabel:
      raw.requesterFreshnessLabel ||
      raw.requester?.freshnessLabel ||
      raw.senderFreshnessLabel ||
      raw.sender?.freshnessLabel ||
      raw.user?.freshnessLabel,
    requesterShareCompletedCount: getNumberValue(
      raw.requesterShareCompletedCount ||
      raw.requester?.shareCompletedCount ||
      raw.requester?.shareCount ||
      raw.sender?.shareCompletedCount ||
      raw.user?.shareCompletedCount
    ),
    requesterReceivedShareCount: getNumberValue(
      raw.requesterReceivedShareCount ||
      raw.requester?.receivedShareCount ||
      raw.sender?.receivedShareCount ||
      raw.user?.receivedShareCount
    ),
    requesterGroupBuyCount: getNumberValue(
      raw.requesterGroupBuyCount ||
      raw.requester?.groupBuyCount ||
      raw.requester?.groupPurchaseCount ||
      raw.sender?.groupBuyCount ||
      raw.user?.groupBuyCount
    ),
    boardType: getBoardType(raw),
  };
}

function getBoardType(raw: any): 'sharing' | 'group' | undefined {
  const value = String(
    raw.boardType ||
    raw.board ||
    raw.postType ||
    raw.post?.postType ||
    raw.post?.type ||
    raw.post?.category ||
    raw.category ||
    ''
  ).toUpperCase();

  if (value.includes('GROUP') || value.includes('공동구매')) return 'group';
  if (value.includes('SHARE') || value.includes('SALE') || value.includes('나눔') || value.includes('판매')) return 'sharing';
  return undefined;
}

function getDefaultTitle(type?: string): string {
  const normalizedType = String(type || '').toUpperCase();

  if (normalizedType.includes('TRADE')) return '거래 알림';
  if (normalizedType.includes('COMMENT')) return '댓글 알림';
  if (normalizedType.includes('REVIEW')) return '리뷰 알림';
  if (normalizedType.includes('POST')) return '게시글 알림';

  return '알림';
}

function getTypeIcon(type: string) {
  const normalizedType = type.toUpperCase();

  if (normalizedType.includes('TRADE')) return Handshake;
  if (normalizedType.includes('COMMENT')) return MessageCircle;
  if (normalizedType.includes('REVIEW')) return Star;
  if (normalizedType.includes('POST')) return ShoppingBag;

  return Bell;
}

function isTradeNotification(notification: NotificationItem): boolean {
  const normalizedType = notification.type.toUpperCase();
  return normalizedType.includes('TRADE') || notification.title.includes('거래');
}

function hasRequesterProfile(notification: NotificationItem): boolean {
  return Boolean(
    notification.requesterNickname ||
    notification.requesterProfileImage ||
    notification.requesterFreshness !== undefined ||
    notification.requesterFreshnessLabel
  );
}

function getBoardTone(boardType?: 'sharing' | 'group') {
  if (boardType === 'group') {
    return {
      card: 'bg-[#fffbeb] border-[#fbbf24] shadow-sm hover:shadow-md',
      profileBorder: 'border-[#fbbf24]',
      profileButton: 'border-[#fbbf24] text-[#92400e] hover:bg-[#fef3c7]',
      actionButton: 'bg-[#fbbf24] hover:bg-[#f59e0b]',
      stats: 'border-[#fbbf24] bg-gradient-to-r from-[#fef3c7] to-[#fde68a]',
      statsTitle: 'text-[#92400e]',
      divider: 'border-[#fbbf24]/30',
    };
  }

  return {
    card: 'bg-[#f0fdf4] border-[#bef264] shadow-sm hover:shadow-md',
    profileBorder: 'border-[#bef264]',
    profileButton: 'border-[#bef264] text-[#65a30d] hover:bg-[#f0fdf4]',
    actionButton: 'bg-[#bef264] hover:bg-[#a3e635]',
    stats: 'border-[#bef264] bg-gradient-to-r from-[#f0fff4] to-[#ecfccb]',
    statsTitle: 'text-[#65a30d]',
    divider: 'border-[#bef264]/30',
  };
}

function formatDate(value?: string): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });
}

export default function NotificationsScreen({ onClose, onOpenPost, onOpenTradeHistory }: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<NotificationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );
  const readCount = useMemo(
    () => notifications.filter((notification) => notification.isRead).length,
    [notifications]
  );

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await getNotifications();
      setNotifications(getArrayPayload(response).map(normalizeNotification));
    } catch (error: any) {
      console.warn('알림 목록 조회에 실패했습니다.', error);
      setErrorMessage(error?.message || '알림을 불러오지 못했습니다.');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item
        )
      );

      try {
        await readNotification(notification.id);
      } catch (error) {
        console.warn('알림 읽음 처리에 실패했습니다.', error);
      }
    }

    if (!isTradeNotification(notification) && notification.postId && onOpenPost) {
      onOpenPost(notification.postId);
      onClose();
    }
  };

  const handleDeleteReadNotifications = async () => {
    if (readCount === 0) return;
    if (!(await showConfirm('읽은 알림을 삭제할까요?', '알림 삭제', '삭제'))) return;

    const previousNotifications = notifications;
    setNotifications((prev) => prev.filter((notification) => !notification.isRead));

    try {
      await deleteReadNotifications();
    } catch (error: any) {
      setNotifications(previousNotifications);
      showToast(error?.message || '읽은 알림 삭제에 실패했습니다.', 'error');
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    const previousNotifications = notifications;
    setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));

    try {
      await deleteNotification(notificationId);
    } catch (error: any) {
      setNotifications(previousNotifications);
      showToast(error?.message || '알림 삭제에 실패했습니다.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/10" />
      <div
        className="absolute right-4 top-16 flex max-h-[min(620px,calc(100vh-5rem))] w-[calc(100vw-2rem)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#f7fafc] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-white border-b border-[#e2e8f0] px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base text-[#1a202c]" style={{ fontWeight: 700 }}>알림</h1>
          <p className="text-xs text-[#718096]">
            읽지 않은 알림 {unreadCount}개
          </p>
        </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDeleteReadNotifications}
              disabled={readCount === 0}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f7fafc] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="읽은 알림 삭제"
              title="읽은 알림 삭제"
            >
              <Trash2 size={17} className="text-[#718096]" />
            </button>
            <button
              onClick={loadNotifications}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f7fafc] transition-colors"
              aria-label="알림 새로고침"
            >
              <RefreshCw size={18} className="text-[#2d3748]" />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f7fafc] transition-colors"
              aria-label="알림창 닫기"
            >
              <X size={20} className="text-[#2d3748]" />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mx-4 mt-3 rounded-xl border border-[#fbbf24] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
            {errorMessage}
          </div>
        )}

        <div className="min-h-[320px] flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <RefreshCw size={32} className="animate-spin text-[#84cc16] mb-3" />
            <p className="text-sm text-[#718096]">알림을 불러오는 중입니다</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-[#e2e8f0] flex items-center justify-center mb-4">
              <Bell size={34} className="text-[#94a3b8]" />
            </div>
            <p className="text-lg text-[#2d3748] mb-1" style={{ fontWeight: 600 }}>
              도착한 알림이 없습니다
            </p>
            <p className="text-sm text-[#718096]">
              거래 요청, 댓글, 리뷰 소식이 이곳에 표시됩니다
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = getTypeIcon(notification.type);
              const tone = getBoardTone(notification.boardType);

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  role="button"
                  tabIndex={0}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    notification.isRead
                      ? 'bg-white border-[#e2e8f0] hover:border-[#cbd5e0]'
                      : tone.card
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notification.isRead ? 'bg-[#f1f5f9]' : 'bg-[#dcfce7]'
                    }`}>
                      <Icon size={20} className={notification.isRead ? 'text-[#718096]' : 'text-[#65a30d]'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-sm text-[#1a202c]" style={{ fontWeight: notification.isRead ? 600 : 800 }}>
                          {notification.title}
                        </h2>
                        <div className="flex items-center gap-2">
                          {!notification.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#ef4444] flex-shrink-0" />
                          )}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteNotification(notification.id);
                            }}
                            className="flex size-7 items-center justify-center rounded-full text-[#a0aec0] hover:bg-[#f7fafc] hover:text-[#e53e3e]"
                            aria-label="알림 삭제"
                            title="알림 삭제"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-[#4a5568]">
                        {notification.message}
                      </p>
                      {isTradeNotification(notification) && hasRequesterProfile(notification) && (
                        <div className={`mt-3 flex items-center gap-3 rounded-xl border bg-white/80 px-3 py-2 ${tone.profileBorder}`}>
                          <div className="w-9 h-9 rounded-full bg-[#e2e8f0] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {notification.requesterProfileImage ? (
                              <BackendImage
                                src={resolveImageUrl(notification.requesterProfileImage)}
                                alt={notification.requesterNickname || '요청자'}
                                className="w-full h-full object-cover"
                                fallbackSrc="/assets/profile-placeholder.svg"
                              />
                            ) : (
                              <User size={18} className="text-[#718096]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-[#2d3748]" style={{ fontWeight: 700 }}>
                              {notification.requesterNickname || '요청자'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedProfile(notification);
                            }}
                            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${tone.profileButton}`}
                            style={{ fontWeight: 700 }}
                          >
                            프로필보기
                          </button>
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-xs text-[#94a3b8]">
                          {formatDate(notification.createdAt)}
                        </span>
                        {notification.isRead && (
                          <span className="flex items-center gap-1 text-xs text-[#94a3b8]">
                            <CheckCircle2 size={14} />
                            읽음
                          </span>
                        )}
                      </div>
                      {isTradeNotification(notification) && onOpenTradeHistory && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleNotificationClick(notification);
                            onOpenTradeHistory();
                            onClose();
                          }}
                          className={`mt-3 w-full rounded-xl px-4 py-2.5 text-sm text-[#0a0a0a] transition-colors ${tone.actionButton}`}
                          style={{ fontWeight: 700 }}
                        >
                          거래 내역 보기
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {selectedProfile && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4" onClick={() => setSelectedProfile(null)}>
            <div
              className="w-full max-w-sm rounded-3xl border border-[#e2e8f0] bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#e2e8f0] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedProfile.requesterProfileImage ? (
                      <BackendImage
                        src={resolveImageUrl(selectedProfile.requesterProfileImage)}
                        alt={selectedProfile.requesterNickname || '요청자'}
                        className="w-full h-full object-cover"
                        fallbackSrc="/assets/profile-placeholder.svg"
                      />
                    ) : (
                      <User size={32} className="text-[#718096]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg text-[#2d3748]" style={{ fontWeight: 700 }}>
                        {selectedProfile.requesterNickname || '요청자'}
                      </h2>
                      <div className="flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-1">
                        <span className="text-xs">🌱</span>
                        <span className="text-xs text-[#16a34a]" style={{ fontWeight: 600 }}>
                          신선도 {Math.round(selectedProfile.requesterFreshness ?? 50)}% · {stripFreshnessIcon(getFreshnessLabel(selectedProfile.requesterFreshness ?? 50))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProfile(null)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f7fafc] text-[#718096] hover:bg-[#e2e8f0]"
                  aria-label="프로필 닫기"
                >
                  <X size={18} />
                </button>
              </div>

              <div className={`rounded-2xl border p-4 ${getBoardTone(selectedProfile.boardType).stats}`}>
                <h3 className={`mb-3 text-xs ${getBoardTone(selectedProfile.boardType).statsTitle}`} style={{ fontWeight: 600 }}>활동 통계</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="mb-1 text-2xl text-[#2d3748]" style={{ fontWeight: 700 }}>
                      {selectedProfile.requesterShareCompletedCount ?? 0}
                    </p>
                    <p className="text-xs text-[#718096]">나눔 완료</p>
                  </div>
                  <div className={`border-x text-center ${getBoardTone(selectedProfile.boardType).divider}`}>
                    <p className="mb-1 text-2xl text-[#2d3748]" style={{ fontWeight: 700 }}>
                      {selectedProfile.requesterReceivedShareCount ?? 0}
                    </p>
                    <p className="text-xs text-[#718096]">받은 나눔</p>
                  </div>
                  <div className="text-center">
                    <p className="mb-1 text-2xl text-[#2d3748]" style={{ fontWeight: 700 }}>
                      {selectedProfile.requesterGroupBuyCount ?? 0}
                    </p>
                    <p className="text-xs text-[#718096]">공구 참여</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoading && notifications.length > 0 && errorMessage && (
          <div className="px-4 pb-4">
            <div className="rounded-xl bg-[#fff5f5] px-4 py-3 text-xs text-[#c53030] flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>일부 알림 정보가 최신 상태가 아닐 수 있습니다.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getFreshnessLabel(value: number) {
  if (value >= 95) return '👑 전설 반띵러';
  if (value >= 85) return '💎 모범 반띵러';
  if (value >= 70) return '✨ 든든한 반띵러';
  if (value >= 55) return '🌿 성장 반띵러';
  if (value >= 40) return '🌱 일반 반띵러';
  if (value >= 30) return '🍂 주의 반띵러';
  if (value >= 20) return '⚠️ 위험 반띵러';
  return '🤮 제한 반띵러';
}

function stripFreshnessIcon(label: string) {
  return label.replace(/^[^\w가-힣]+/u, '').trim();
}
