import { useEffect, useState } from 'react';
import { Ban, Bell, ChevronRight, FileText, Heart, History, Leaf, LogOut, MessageCircle, Plus, Settings, ShoppingCart, Snowflake, Star, Trophy, User } from 'lucide-react';
import { API_ENDPOINTS, apiRequest, getNotifications, resolveImageUrl } from '../../api/config';
import { clearAuthSession, getAuthToken, getStoredUserInfo, saveStoredUserInfo } from '../../auth/session';
import EditProfileScreen from './EditProfileScreen';
import BackendImage from '../common/BackendImage';
import FavoritesScreen from './FavoritesScreen';
import MyPostsScreen from './MyPostsScreen';
import SettingsScreen from './SettingsScreen';
import RatingDetailScreen from './RatingDetailScreen';
import TransactionHistoryScreen from './TransactionHistoryScreen';
import BadgesScreen from './BadgesScreen';
import BlockedUsersScreen from './BlockedUsersScreen';
import NotificationsScreen from '../common/NotificationsScreen';
import BottomNavIcon from '../common/BottomNavIcon';
import { showConfirm } from '../../utils/feedback';

interface UserInfo {
  name: string;
  nickname: string;
  email: string;
  phone?: string;
  profileImage?: string;
  rating?: number;
  freshness?: number;
  freshnessIcon?: string;
  freshnessLabel?: string;
  freshnessLevel?: string;
}

export default function ProfileScreen({
  onNavigate,
  openTransactionHistorySignal = 0,
  chatUnreadCount = 0,
}: {
  onNavigate: (screen: string) => void;
  openTransactionHistorySignal?: number;
  chatUnreadCount?: number;
}) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRatingDetail, setShowRatingDetail] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [pendingReceivedRequestCount, setPendingReceivedRequestCount] = useState(0);

  useEffect(() => {
    loadUserInfo();
    loadPendingReceivedRequests();
    loadUnreadNotifications();
  }, []);

  useEffect(() => {
    if (openTransactionHistorySignal > 0) {
      setShowTransactionHistory(true);
    }
  }, [openTransactionHistorySignal]);

  const getNotificationItems = (response: any): any[] => {
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
  };

  const isUnreadNotification = (notification: any) => !(
    notification.isRead ||
    notification.read ||
    notification.readAt ||
    notification.status === 'READ'
  );

  const loadUnreadNotifications = async () => {
    try {
      const response = await getNotifications(0, 10);
      setHasUnreadNotifications(getNotificationItems(response).some(isUnreadNotification));
    } catch (error) {
      console.warn('읽지 않은 알림 조회에 실패했습니다.', error);
      setHasUnreadNotifications(false);
    }
  };

  const loadUserInfo = async () => {
    const savedUserInfo = getStoredUserInfo<UserInfo>();
    if (savedUserInfo) {
      setUserInfo(savedUserInfo);
    }

    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await apiRequest(API_ENDPOINTS.getProfile, { method: 'GET' });
      const user = response.user || response.data?.user || response.data || response;
      if (user) {
        setUserInfo(user);
        saveStoredUserInfo(user);
      }
    } catch (error) {
      console.warn('프로필 서버 조회에 실패했습니다. 저장된 정보를 사용합니다.', error);
    }
  };

  const loadPendingReceivedRequests = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await apiRequest(API_ENDPOINTS.mypageReceivedTradeRequests, { method: 'GET' });
      const rawRequests =
        response.tradeRequests ||
        response.requests ||
        response.data?.tradeRequests ||
        response.data?.requests ||
        response.data ||
        response;
      const requests = Array.isArray(rawRequests) ? rawRequests : [];
      setPendingReceivedRequestCount(requests.filter((request: any) => request.status === 'PENDING').length);
    } catch (error) {
      console.warn('받은 거래 요청 수 조회에 실패했습니다.', error);
      setPendingReceivedRequestCount(0);
    }
  };

  const getFreshnessPercent = () => {
    const value = Number(userInfo?.freshness ?? 50);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
  };

  const freshnessPercent = getFreshnessPercent();
  const freshnessIcon = userInfo?.freshnessIcon || '🌱';
  const freshnessLabel = getFreshnessLabel(freshnessPercent);

  const menuItems = [
    { icon: User, label: '프로필 수정', action: () => setShowEditProfile(true) },
    { icon: Star, label: '나의 신선도', action: () => setShowRatingDetail(true) },
    { icon: History, label: '거래 내역', badge: pendingReceivedRequestCount, action: () => setShowTransactionHistory(true) },
    { icon: Trophy, label: '매너 뱃지', action: () => setShowBadges(true) },
    { icon: Heart, label: '관심 목록', action: () => setShowFavorites(true) },
    { icon: Ban, label: '차단 목록', action: () => setShowBlockedUsers(true) },
    { icon: FileText, label: '내 게시글', action: () => setShowMyPosts(true) },
    { icon: Settings, label: '설정', action: () => setShowSettings(true) },
  ];

  const logout = async () => {
    if (!(await showConfirm('로그아웃 하시겠습니까?', '로그아웃', '로그아웃'))) return;

    try {
      await apiRequest(API_ENDPOINTS.logout, { method: 'POST' });
    } catch (error) {
      console.warn('서버 로그아웃 요청에 실패했습니다. 로컬 정보만 제거합니다.', error);
    } finally {
      clearAuthSession();
      window.location.reload();
    }
  };

  return (
    <div className="bg-[#f7fafc] size-full flex flex-col overflow-hidden">
      <div className="bg-gradient-to-r from-[#f8fafc] to-[#cbd5e0] border-b-2 border-[#cbd5e0] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#e2e8f0]">
            <User size={22} className="text-[#2d3748]" />
          </div>
          <div>
            <h1 className="text-lg text-[#1a202c]" style={{ fontWeight: 800 }}>내 정보</h1>
            <p className="text-xs text-[#475569]">프로필과 활동 정보를 관리해요</p>
          </div>
        </div>
        <button onClick={() => setShowNotifications(true)} className="text-[#2d3748] relative" aria-label="알림 열기">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#e2e8f0] hover:border-[#bef264] transition-colors">
            <Bell size={20} />
          </div>
          {hasUnreadNotifications && (
            <div className="absolute top-0 right-0 w-2 h-2 bg-[#ef4444] rounded-full border-2 border-white" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-28">
        <section className="rounded-3xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-[#e2e8f0] flex items-center justify-center overflow-hidden">
              {userInfo?.profileImage ? (
                <BackendImage
                  src={resolveImageUrl(userInfo.profileImage)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  fallbackSrc="/assets/profile-placeholder.svg"
                />
              ) : (
                <User size={32} className="text-[#718096]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
                  {userInfo?.nickname || '사용자 닉네임'}
                </h2>
                <div className="flex items-center gap-1 bg-[#dcfce7] px-2 py-1 rounded-full">
                  <span className="text-xs">{freshnessIcon}</span>
                  <span className="text-xs text-[#16a34a]" style={{ fontWeight: 600 }}>
                    신선도 {Math.round(freshnessPercent)}% · {stripFreshnessIcon(freshnessLabel)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#718096]">{userInfo?.email || 'user@example.com'}</p>
              {userInfo?.phone && (
                <p className="text-xs text-[#a0aec0] mt-1">
                  연락처 {userInfo.phone}
                </p>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#f0fff4] to-[#ecfccb] border border-[#bef264] rounded-2xl p-4">
            <h3 className="text-xs text-[#65a30d] mb-3" style={{ fontWeight: 600 }}>활동 통계</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl text-[#2d3748] mb-1" style={{ fontWeight: 700 }}>0</p>
                <p className="text-xs text-[#718096]">나눔 완료</p>
              </div>
              <div className="text-center border-x border-[#bef264]/30">
                <p className="text-2xl text-[#2d3748] mb-1" style={{ fontWeight: 700 }}>0</p>
                <p className="text-xs text-[#718096]">받은 나눔</p>
              </div>
              <div className="text-center">
                <p className="text-2xl text-[#2d3748] mb-1" style={{ fontWeight: 700 }}>0</p>
                <p className="text-xs text-[#718096]">공구 참여</p>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-[#e2e8f0]">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className="w-full flex items-center justify-between py-4 border-b border-[#e2e8f0] hover:bg-[#f7fafc] transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className="text-[#718096]" />
                <span className="text-[#2d3748]">{item.label}</span>
                {Boolean(item.badge) && (
                  <span className="min-w-5 rounded-full bg-[#ef4444] px-1.5 py-0.5 text-xs text-white" style={{ fontWeight: 700 }}>
                    {item.badge}
                  </span>
                )}
              </div>
              <ChevronRight size={20} className="text-[#cbd5e0]" />
            </button>
          ))}
          </div>

          <div className="pt-4">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 text-[#e53e3e] hover:bg-[#fff5f5] rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span>로그아웃</span>
          </button>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-3 py-4 grid grid-cols-5 z-40">
        <button onClick={() => onNavigate('나눔 및 판매')} className="flex flex-col items-center gap-1">
          <BottomNavIcon icon={Leaf} color="#65a30d" borderColor="#bef264" />
          <span className="text-[11px] text-[#bef264]">나눔/판매</span>
        </button>
        <button onClick={() => onNavigate('공동구매')} className="flex flex-col items-center gap-1">
          <BottomNavIcon icon={ShoppingCart} color="#f59e0b" borderColor="#fbbf24" />
          <span className="text-[11px] text-[#fbbf24]">공동구매</span>
        </button>
        <button onClick={() => onNavigate('chat')} className="relative flex flex-col items-center gap-1">
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
        <button className="flex flex-col items-center gap-1">
          <BottomNavIcon icon={User} color="#2d3748" borderColor="#cbd5e0" />
          <span className="text-[11px] text-[#2d3748]">내정보</span>
        </button>
      </div>

      {showEditProfile && (
        <EditProfileScreen
          onClose={() => setShowEditProfile(false)}
          onSave={() => {
            setShowEditProfile(false);
            loadUserInfo();
          }}
        />
      )}

      {showFavorites && (
        <FavoritesScreen
          onClose={() => setShowFavorites(false)}
        />
      )}

      {showMyPosts && (
        <MyPostsScreen
          onClose={() => setShowMyPosts(false)}
        />
      )}

      {showSettings && (
        <SettingsScreen
          onClose={() => setShowSettings(false)}
        />
      )}

      {showRatingDetail && (
        <RatingDetailScreen
          onClose={() => setShowRatingDetail(false)}
        />
      )}

      {showTransactionHistory && (
        <TransactionHistoryScreen
          onClose={() => {
            setShowTransactionHistory(false);
            loadPendingReceivedRequests();
          }}
        />
      )}

      {showBadges && (
        <BadgesScreen
          onClose={() => setShowBadges(false)}
        />
      )}

      {showBlockedUsers && (
        <BlockedUsersScreen
          onClose={() => setShowBlockedUsers(false)}
        />
      )}

      {showNotifications && (
        <NotificationsScreen
          onClose={() => {
            setShowNotifications(false);
            loadUnreadNotifications();
          }}
          onOpenTradeHistory={() => setShowTransactionHistory(true)}
        />
      )}
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
