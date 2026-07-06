import { showToast } from '../../utils/feedback';
﻿import { useState } from 'react';
import { X, ChevronRight, Shield, Lock, Bell, Database, HelpCircle, FileText, AlertCircle, User, MapPin, MessageCircle } from 'lucide-react';
import EditProfileScreen from './EditProfileScreen';
import NotificationSettingsScreen from './NotificationSettingsScreen';
import LocationSettingsScreen from './LocationSettingsScreen';
import ChatSettingsScreen from './ChatSettingsScreen';
import { clearAuthSession } from '../../auth/session';

type SettingsView = 'main' | 'editProfile' | 'notifications' | 'location' | 'chat';

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [currentView, setCurrentView] = useState<SettingsView>('main');
  const [showDataClearConfirm, setShowDataClearConfirm] = useState(false);

  const handleClearAllData = () => {
    if (!showDataClearConfirm) {
      setShowDataClearConfirm(true);
      return;
    }

    clearAuthSession();
    localStorage.removeItem('userLocation');
    localStorage.removeItem('userLocationCoords');
    localStorage.removeItem('notificationSettings');
    showToast('기기 안에 저장된 로그인 및 화면 설정 정보를 삭제했습니다. 페이지를 새로고침합니다.');
    window.location.reload();
  };

  const settingsSections = [
    {
      title: '계정',
      items: [
        { icon: User, label: '프로필 수정', action: () => setCurrentView('editProfile') },
        { icon: Shield, label: '개인정보 처리방침', action: () => showToast('개인정보 처리방침 페이지') },
        { icon: Lock, label: '비밀번호 변경', action: () => showToast('비밀번호 변경 기능은 준비 중입니다.') },
        { icon: FileText, label: '이용약관', action: () => showToast('이용약관 페이지') },
      ],
    },
    {
      title: '앱 설정',
      items: [
        { icon: Bell, label: '알림 설정', action: () => setCurrentView('notifications') },
        { icon: MapPin, label: '위치 설정', action: () => setCurrentView('location') },
        { icon: MessageCircle, label: '채팅 설정', action: () => setCurrentView('chat') },
        { icon: Database, label: '저장된 데이터', action: () => showToast('게시글과 관심 목록은 백엔드 서버에서 관리됩니다.') },
      ],
    },
    {
      title: '고객 지원',
      items: [
        { icon: HelpCircle, label: '도움말', action: () => showToast('도움말 페이지') },
        { icon: FileText, label: '공지사항', action: () => showToast('공지사항 페이지') },
        { icon: AlertCircle, label: '문의하기', action: () => showToast('문의하기 기능은 준비 중입니다.') },
      ],
    },
  ];

  if (currentView === 'editProfile') {
    return (
      <EditProfileScreen
        onClose={() => setCurrentView('main')}
        onSave={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'notifications') {
    return <NotificationSettingsScreen onClose={() => setCurrentView('main')} />;
  }

  if (currentView === 'location') {
    return <LocationSettingsScreen onClose={() => setCurrentView('main')} />;
  }

  if (currentView === 'chat') {
    return <ChatSettingsScreen onClose={() => setCurrentView('main')} />;
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          설정
        </h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f7fafc]">
        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="bg-white mb-2">
            <div className="px-5 py-3 bg-[#f7fafc]">
              <h2 className="text-xs text-[#718096]" style={{ fontWeight: 600 }}>
                {section.title}
              </h2>
            </div>
            {section.items.map((item, itemIndex) => (
              <button
                key={itemIndex}
                onClick={item.action}
                className={`w-full flex items-center justify-between px-5 py-4 hover:bg-[#f7fafc] transition-colors ${
                  itemIndex !== section.items.length - 1 ? 'border-b border-[#e2e8f0]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className="text-[#718096]" />
                  <span className="text-[#2d3748]">{item.label}</span>
                </div>
                <ChevronRight size={20} className="text-[#cbd5e0]" />
              </button>
            ))}
          </div>
        ))}

        <div className="bg-white px-5 py-4 mb-2">
          <div className="text-center">
            <p className="text-sm text-[#718096] mb-1">앱 버전</p>
            <p className="text-[#2d3748]" style={{ fontWeight: 500 }}>1.0.0</p>
          </div>
        </div>

        <div className="bg-white px-5 py-6">
          <div className="bg-[#fff5f5] border border-[#fecaca] rounded-2xl p-4">
            <h3 className="text-[#991b1b] mb-2" style={{ fontWeight: 600 }}>
              기기 데이터 삭제
            </h3>
            <p className="text-sm text-[#7f1d1d] mb-4">
              로그인 토큰, 자동 로그인 여부, 화면 표시용 위치/알림 설정만 삭제합니다. 서버에 저장된 게시글과 관심 목록은 삭제되지 않습니다.
            </p>
            {showDataClearConfirm ? (
              <div className="space-y-2">
                <p className="text-sm text-[#991b1b] mb-3">
                  정말로 이 기기의 저장 정보를 삭제하시겠습니까?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearAllData}
                    className="flex-1 py-2 bg-[#dc2626] text-white rounded-xl hover:bg-[#b91c1c] transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    확인
                  </button>
                  <button
                    onClick={() => setShowDataClearConfirm(false)}
                    className="flex-1 py-2 bg-white text-[#2d3748] rounded-xl border border-[#e2e8f0] hover:bg-[#f7fafc] transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleClearAllData}
                className="w-full py-3 bg-white text-[#dc2626] rounded-xl border border-[#dc2626] hover:bg-[#fef2f2] transition-colors"
                style={{ fontWeight: 500 }}
              >
                기기 저장 정보 삭제
              </button>
            )}
          </div>
        </div>

        <div className="px-5 pb-6">
          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4">
            <p className="text-sm text-[#1e3a8a]">
              게시글, 댓글, 관심 목록은 백엔드 API를 기준으로 관리됩니다. 브라우저에는 로그인과 화면 표시를 위한 최소 정보만 저장합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
