import { useState } from 'react';
import {
  AlertCircle,
  Bell,
  ChevronRight,
  Database,
  FileText,
  HelpCircle,
  Lock,
  MapPin,
  MessageCircle,
  Shield,
  User,
  X,
} from 'lucide-react';
import EditProfileScreen from './EditProfileScreen';
import NotificationSettingsScreen from './NotificationSettingsScreen';
import LocationSettingsScreen from './LocationSettingsScreen';
import ChatSettingsScreen from './ChatSettingsScreen';
import { clearAuthSession } from '../../auth/session';
import { showConfirm, showToast } from '../../utils/feedback';

type SettingsView = 'main' | 'editProfile' | 'notifications' | 'location' | 'chat' | 'privacy' | 'terms' | 'help' | 'notice';

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [currentView, setCurrentView] = useState<SettingsView>('main');

  const handleClearDeviceData = async () => {
    const confirmed = await showConfirm(
      '로그인 토큰, 위치, 알림, 채팅 표시 설정처럼 이 기기에만 저장된 정보를 삭제합니다.\n서버에 저장된 게시글, 거래 내역, 관심 목록은 삭제되지 않습니다.',
      '기기 데이터 삭제',
      '삭제'
    );
    if (!confirmed) return;

    clearAuthSession();
    localStorage.removeItem('userLocation');
    localStorage.removeItem('userLocationCoords');
    localStorage.removeItem('notificationSettings');
    localStorage.removeItem('chatSettings');
    showToast('기기 저장 정보를 삭제했습니다.', 'success');
    window.location.reload();
  };

  if (currentView === 'editProfile') {
    return <EditProfileScreen onClose={() => setCurrentView('main')} onSave={() => setCurrentView('main')} />;
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

  if (currentView !== 'main') {
    return <SettingsInfoScreen view={currentView} onClose={() => setCurrentView('main')} />;
  }

  const settingsSections = [
    {
      title: '계정',
      items: [
        { icon: User, label: '프로필 수정', description: '닉네임, 연락처, 프로필 이미지를 관리합니다.', action: () => setCurrentView('editProfile') },
        { icon: Lock, label: '비밀번호 변경', description: '로그아웃 후 비밀번호 찾기에서 재설정할 수 있습니다.', action: () => showToast('로그인 화면의 비밀번호 찾기에서 새 비밀번호를 설정할 수 있습니다.') },
        { icon: Shield, label: '개인정보 처리방침', description: '수집하는 정보와 이용 목적을 확인합니다.', action: () => setCurrentView('privacy') },
        { icon: FileText, label: '이용약관', description: '반띵 서비스 이용 기준을 확인합니다.', action: () => setCurrentView('terms') },
      ],
    },
    {
      title: '앱 설정',
      items: [
        { icon: Bell, label: '알림 설정', description: '거래, 댓글, 새 게시글 알림을 관리합니다.', action: () => setCurrentView('notifications') },
        { icon: MapPin, label: '위치 설정', description: '게시글 탐색에 사용할 기준 위치를 바꿉니다.', action: () => setCurrentView('location') },
        { icon: MessageCircle, label: '채팅 설정', description: '채팅 알림과 읽음 표시를 관리합니다.', action: () => setCurrentView('chat') },
        { icon: Database, label: '기기 저장 데이터', description: '현재 브라우저에 저장된 로그인/화면 정보를 삭제합니다.', action: handleClearDeviceData },
      ],
    },
    {
      title: '고객 지원',
      items: [
        { icon: HelpCircle, label: '도움말', description: '게시글, 거래, 채팅 이용 방법을 확인합니다.', action: () => setCurrentView('help') },
        { icon: FileText, label: '공지사항', description: '서비스 변경 사항과 운영 안내를 확인합니다.', action: () => setCurrentView('notice') },
        { icon: AlertCircle, label: '문의하기', description: '오류나 불편 사항은 프로젝트 관리자에게 전달합니다.', action: () => showToast('문의는 관리자 이메일 또는 GitHub 이슈로 전달해주세요.') },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <SettingsHeader title="설정" onClose={onClose} />

      <div className="flex-1 overflow-y-auto bg-[#f7fafc] pb-6">
        {settingsSections.map((section) => (
          <section key={section.title} className="bg-white">
            <div className="px-5 py-3 bg-[#f7fafc]">
              <h2 className="text-xs text-[#718096]" style={{ fontWeight: 800 }}>{section.title}</h2>
            </div>
            {section.items.map((item, itemIndex) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className={`w-full px-5 py-4 text-left transition-colors hover:bg-[#f7fafc] ${
                  itemIndex !== section.items.length - 1 ? 'border-b border-[#e2e8f0]' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1f5f9]">
                      <item.icon size={20} className="text-[#475569]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-[#1a202c]" style={{ fontWeight: 800 }}>{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-[#718096]">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="shrink-0 text-[#cbd5e0]" />
                </div>
              </button>
            ))}
          </section>
        ))}

        <div className="mx-5 mt-5 rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] p-4">
          <p className="text-sm leading-6 text-[#1e3a8a]">
            게시글, 댓글, 거래 내역, 관심 목록은 서버에 저장됩니다. 이 화면의 기기 저장 데이터 삭제는 현재 브라우저에 남은 로그인과 화면 설정만 정리합니다.
          </p>
        </div>

        <div className="mt-5 text-center text-xs text-[#94a3b8]">반띵 1.0.0</div>
      </div>
    </div>
  );
}

function SettingsHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-white px-5 py-4">
      <button type="button" onClick={onClose} className="text-[#2d3748]" aria-label="닫기">
        <X size={24} />
      </button>
      <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 800 }}>{title}</h1>
      <div className="w-6" />
    </div>
  );
}

function SettingsInfoScreen({ view, onClose }: { view: Exclude<SettingsView, 'main' | 'editProfile' | 'notifications' | 'location' | 'chat'>; onClose: () => void }) {
  const content = {
    privacy: {
      title: '개인정보 처리방침',
      body: [
        '반띵은 회원 식별, 거래 요청, 채팅, 알림 제공을 위해 이름, 닉네임, 이메일, 전화번호, 위치 정보를 사용합니다.',
        '위치 정보는 주변 게시글 탐색과 거래 장소 표시를 위해 사용되며, 상세 주소는 필요한 화면에서만 표시합니다.',
        '프로필, 게시글, 채팅, 거래 기록은 서비스 제공과 분쟁 대응을 위해 서버에서 관리됩니다.',
      ],
    },
    terms: {
      title: '이용약관',
      body: [
        '사용자는 실제 거래 가능한 식재료 정보만 게시해야 하며, 허위 정보나 부적절한 거래 제안을 올릴 수 없습니다.',
        '거래는 사용자 간 합의에 따라 진행되며, 완료 후 리뷰와 매너 평가를 남길 수 있습니다.',
        '신고 또는 차단 기능을 통해 불편한 사용자를 숨기거나 관리자 검토 대상으로 전달할 수 있습니다.',
      ],
    },
    help: {
      title: '도움말',
      body: [
        '나눔/판매 또는 공동구매 게시글에서 거래 요청을 보내면 상대가 수락한 뒤 채팅방이 열립니다.',
        '검색 반경과 정렬 기준을 바꾸면 현재 위치를 기준으로 가까운 게시글을 다시 불러옵니다.',
        '채팅방은 길게 누르거나 핀 버튼을 눌러 상단에 고정할 수 있고, 방별 알림도 끌 수 있습니다.',
      ],
    },
    notice: {
      title: '공지사항',
      body: [
        '알림 삭제와 게시글 거리 필터 캐시 문제를 수정했습니다.',
        '채팅방 상단 고정, 방별 알림 끄기, 읽음 표시 안정화 작업이 반영되었습니다.',
        '서비스 이용 중 이상 현상이 있으면 화면 캡처와 함께 관리자에게 전달해주세요.',
      ],
    },
  }[view];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <SettingsHeader title={content.title} onClose={onClose} />
      <div className="flex-1 overflow-y-auto bg-[#f7fafc] px-5 py-5">
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <div className="space-y-4">
            {content.body.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-6 text-[#4a5568]">{paragraph}</p>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
