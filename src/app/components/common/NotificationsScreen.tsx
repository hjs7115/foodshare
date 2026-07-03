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
  X,
} from 'lucide-react';
import { getNotifications, readNotification } from '../../api/config';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt?: string;
  postId?: number;
}

interface NotificationsScreenProps {
  onClose: () => void;
  onOpenPost?: (postId: number) => void;
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
  };
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

export default function NotificationsScreen({ onClose, onOpenPost }: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
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

    if (notification.postId && onOpenPost) {
      onOpenPost(notification.postId);
      onClose();
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

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    notification.isRead
                      ? 'bg-white border-[#e2e8f0] hover:border-[#cbd5e0]'
                      : 'bg-[#f0fdf4] border-[#bef264] shadow-sm hover:shadow-md'
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
                        {!notification.isRead && (
                          <span className="mt-1 w-2 h-2 rounded-full bg-[#ef4444] flex-shrink-0" />
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-5 text-[#4a5568]">
                        {notification.message}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
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
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        </div>

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
