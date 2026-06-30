import { useState, useEffect } from 'react';
import { ChevronRight, User, Bell, MapPin, Heart, FileText, Settings, LogOut, Leaf, Star, History, Trophy } from 'lucide-react';
import { API_ENDPOINTS, apiRequest, resolveImageUrl } from '../../api/config';
import EditProfileScreen from './EditProfileScreen';
import BackendImage from '../common/BackendImage';
import NotificationSettingsScreen from './NotificationSettingsScreen';
import LocationSettingsScreen from './LocationSettingsScreen';
import FavoritesScreen from './FavoritesScreen';
import MyPostsScreen from './MyPostsScreen';
import SettingsScreen from './SettingsScreen';
import RatingDetailScreen from './RatingDetailScreen';
import TransactionHistoryScreen from './TransactionHistoryScreen';
import BadgesScreen from './BadgesScreen';

interface UserInfo {
  name: string;
  nickname: string;
  email: string;
  phone?: string;
  profileImage?: string;
  rating?: number;
}

export default function ProfileScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRatingDetail, setShowRatingDetail] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showBadges, setShowBadges] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    const savedUserInfo = localStorage.getItem('userInfo');
    if (savedUserInfo) {
      setUserInfo(JSON.parse(savedUserInfo));
    }

    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const response = await apiRequest(API_ENDPOINTS.getProfile, { method: 'GET' });
      const user = response.user || response.data?.user || response.data || response;
      if (user) {
        setUserInfo(user);
        localStorage.setItem('userInfo', JSON.stringify(user));
      }
    } catch (error) {
      console.warn('프로필 서버 조회 실패, localStorage 정보를 사용합니다.', error);
    }
  };

  const menuItems = [
    { icon: User, label: '프로필 수정', action: () => setShowEditProfile(true) },
    { icon: Star, label: '신선도 평가 상세', action: () => setShowRatingDetail(true) },
    { icon: History, label: '거래 내역', action: () => setShowTransactionHistory(true) },
    { icon: Trophy, label: '매너 뱃지', action: () => setShowBadges(true) },
    { icon: Bell, label: '알림 설정', action: () => setShowNotificationSettings(true) },
    { icon: MapPin, label: '위치 설정', action: () => setShowLocationSettings(true) },
    { icon: Heart, label: '관심 목록', action: () => setShowFavorites(true) },
    { icon: FileText, label: '내 게시글', action: () => setShowMyPosts(true) },
    { icon: Settings, label: '설정', action: () => setShowSettings(true) },
  ];

  return (
    <div className="bg-[#f7fafc] size-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4">
        <h1 className="text-xl text-[#2d3748]" style={{ fontWeight: 600 }}>내정보</h1>
      </div>

      {/* Profile Section */}
      <div className="bg-white px-5 py-6 mb-2">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-[#e2e8f0] flex items-center justify-center overflow-hidden">
            {userInfo?.profileImage ? (
              <BackendImage
                src={resolveImageUrl(userInfo.profileImage)}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={32} className="text-[#718096]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
                {userInfo?.nickname || '사용자 닉네임'}
              </h2>
              <div className="flex items-center gap-1 bg-[#dcfce7] px-2 py-1 rounded-full">
                <Leaf size={14} className="text-[#16a34a] fill-[#16a34a]" />
                <span className="text-xs text-[#16a34a]" style={{ fontWeight: 600 }}>
                  신선도 {Math.round((userInfo?.rating || 4.5) * 20)}%
                </span>
              </div>
            </div>
            <p className="text-sm text-[#718096]">{userInfo?.email || 'user@example.com'}</p>
            {userInfo?.phone && (
              <p className="text-xs text-[#a0aec0] mt-1">
                📱 {userInfo.phone}
              </p>
            )}
          </div>
        </div>

        {/* Activity Stats Card */}
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
      </div>

      {/* Menu Items */}
      <div className="flex-1 bg-white px-5">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className="w-full flex items-center justify-between py-4 border-b border-[#e2e8f0] hover:bg-[#f7fafc] transition-colors"
          >
            <div className="flex items-center gap-3">
              <item.icon size={20} className="text-[#718096]" />
              <span className="text-[#2d3748]">{item.label}</span>
            </div>
            <ChevronRight size={20} className="text-[#cbd5e0]" />
          </button>
        ))}
      </div>

      {/* Logout Button */}
      <div className="bg-white px-5 py-4 border-t border-[#e2e8f0] pb-20">
        <button
          onClick={async () => {
            if (confirm('로그아웃 하시겠습니까?')) {
              try {
                await apiRequest(API_ENDPOINTS.logout, { method: 'POST' });
              } catch (error) {
                console.warn('서버 로그아웃 요청 실패, 로컬 정보는 삭제합니다.', error);
              } finally {
                localStorage.removeItem('autoLogin');
                localStorage.removeItem('userInfo');
                localStorage.removeItem('authToken');
                window.location.reload();
              }
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-3 text-[#e53e3e] hover:bg-[#fff5f5] rounded-xl transition-colors"
        >
          <LogOut size={20} />
          <span>로그아웃</span>
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-12 py-4 flex items-center justify-between z-40">
        <button onClick={() => onNavigate('board')} className="flex flex-col items-center gap-1">
          <svg className="w-6 h-6 text-[#2d3748]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs text-[#2d3748]">홈</span>
        </button>
        <button onClick={() => onNavigate('board')} className="flex flex-col items-center gap-1">
          <svg className="w-6 h-6 text-[#2d3748]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs text-[#2d3748]">작성</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <svg className="w-6 h-6 text-[#bef264]" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs text-[#bef264]">내정보</span>
        </button>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileScreen
          onClose={() => setShowEditProfile(false)}
          onSave={() => {
            setShowEditProfile(false);
            loadUserInfo();
          }}
        />
      )}

      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <NotificationSettingsScreen
          onClose={() => setShowNotificationSettings(false)}
        />
      )}

      {/* Location Settings Modal */}
      {showLocationSettings && (
        <LocationSettingsScreen
          onClose={() => setShowLocationSettings(false)}
        />
      )}

      {/* Favorites Modal */}
      {showFavorites && (
        <FavoritesScreen
          onClose={() => setShowFavorites(false)}
        />
      )}

      {/* My Posts Modal */}
      {showMyPosts && (
        <MyPostsScreen
          onClose={() => setShowMyPosts(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsScreen
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Rating Detail Modal */}
      {showRatingDetail && (
        <RatingDetailScreen
          onClose={() => setShowRatingDetail(false)}
        />
      )}

      {/* Transaction History Modal */}
      {showTransactionHistory && (
        <TransactionHistoryScreen
          onClose={() => setShowTransactionHistory(false)}
        />
      )}

      {/* Badges Modal */}
      {showBadges && (
        <BadgesScreen
          onClose={() => setShowBadges(false)}
        />
      )}
    </div>
  );
}
