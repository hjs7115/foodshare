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
import FindPasswordScreen from '../auth/FindPasswordScreen';
import { clearAuthSession, getStoredUserInfo } from '../../auth/session';
import { showConfirm, showToast } from '../../utils/feedback';

type SettingsView = 'main' | 'editProfile' | 'password' | 'notifications' | 'location' | 'chat' | 'privacy' | 'terms' | 'help' | 'notice';

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [currentView, setCurrentView] = useState<SettingsView>('main');
  const storedEmail = getStoredUserInfo<{ email?: string }>()?.email || '';

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

  if (currentView === 'password') {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <FindPasswordScreen
          onBack={() => setCurrentView('main')}
          initialEmail={storedEmail}
          lockEmail={Boolean(storedEmail)}
          title="비밀번호 변경"
          description="가입한 이메일로 인증코드를 받은 뒤 새로운 비밀번호를 설정합니다."
          successMessage="비밀번호가 변경되었습니다."
          backLabel="설정으로"
          submitLabel="새 비밀번호 저장"
        />
      </div>
    );
  }

  if (currentView !== 'main') {
    return <SettingsInfoScreen view={currentView} onClose={() => setCurrentView('main')} />;
  }

  const settingsSections = [
    {
      title: '계정',
      items: [
        { icon: User, label: '프로필 수정', description: '닉네임, 연락처, 프로필 이미지를 관리합니다.', action: () => setCurrentView('editProfile') },
        { icon: Lock, label: '비밀번호 변경', description: '이메일 인증 후 새 비밀번호를 설정합니다.', action: () => setCurrentView('password') },
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

type InfoView = Exclude<SettingsView, 'main' | 'editProfile' | 'password' | 'notifications' | 'location' | 'chat'>;

const policySections = {
  privacy: {
    title: '개인정보 처리방침',
    updatedAt: '최종 수정일 2026.09.08',
    intro: '반띵은 식재료 나눔, 판매, 공동구매와 안전한 거래 경험을 제공하기 위해 필요한 개인정보만 수집하고 목적 범위 안에서 이용합니다.',
    sections: [
      {
        heading: '수집하는 개인정보',
        items: [
          '회원가입 및 로그인: 이메일, 비밀번호, 이름, 닉네임, 전화번호',
          '거래 및 위치 기반 탐색: 주소, 위도/경도, 거래 희망 장소',
          '프로필 및 활동: 프로필 이미지, 게시글, 댓글, 거래 요청, 채팅 내역, 리뷰, 신선도 점수',
          '알림 및 기기 설정: 알림 수신 설정, FCM 토큰, 차단 사용자, 관심 목록',
        ],
      },
      {
        heading: '이용 목적',
        items: [
          '회원 식별, 로그인 유지, 비밀번호 재설정 등 계정 관리',
          '가까운 게시글 탐색, 거래 요청, 채팅방 생성, 거래 완료 처리',
          '댓글, 채팅, 거래 상태, 유통기한 임박 식재료 알림 제공',
          '신고 처리, 부정 이용 방지, 서비스 안정성 개선',
        ],
      },
      {
        heading: '보관 및 파기',
        items: [
          '회원 정보는 탈퇴 요청 또는 서비스 종료 시까지 보관합니다.',
          '거래, 신고, 리뷰 기록은 분쟁 대응과 운영 안정성을 위해 필요한 기간 동안 보관될 수 있습니다.',
          '브라우저에 저장된 로그인 토큰과 화면 설정은 설정의 기기 저장 데이터에서 직접 삭제할 수 있습니다.',
        ],
      },
      {
        heading: '제3자 제공 및 외부 서비스',
        items: [
          '반띵은 법령에 따른 요청을 제외하고 개인정보를 임의로 외부에 판매하거나 제공하지 않습니다.',
          '이미지 업로드, 지도 표시, 푸시 알림처럼 서비스 제공에 필요한 외부 API가 사용될 수 있습니다.',
          '외부 서비스 이용 시 전송되는 정보는 해당 기능 수행에 필요한 범위로 제한합니다.',
        ],
      },
      {
        heading: '이용자의 권리',
        items: [
          '이용자는 내 정보에서 프로필, 위치, 알림 설정을 확인하고 수정할 수 있습니다.',
          '비밀번호는 이메일 인증 후 새로 설정할 수 있습니다.',
          '개인정보 열람, 정정, 삭제 요청은 관리자에게 문의할 수 있습니다.',
        ],
      },
    ],
  },
  terms: {
    title: '이용약관',
    updatedAt: '최종 수정일 2026.09.08',
    intro: '이 약관은 반띵 서비스 이용에 필요한 기본 규칙과 사용자 간 거래 기준을 안내합니다.',
    sections: [
      {
        heading: '서비스 목적',
        items: [
          '반띵은 남는 식재료를 나누거나 판매하고, 필요한 식재료를 함께 구매할 수 있도록 돕는 커뮤니티 서비스입니다.',
          '게시글, 거래 요청, 채팅, 알림, 리뷰, 신선도 표시 기능을 제공합니다.',
        ],
      },
      {
        heading: '회원의 의무',
        items: [
          '회원은 실제 거래 가능한 식재료 정보만 등록해야 합니다.',
          '유통기한, 보관 상태, 가격, 수량, 거래 위치를 가능한 정확하게 작성해야 합니다.',
          '타인의 계정, 연락처, 사진, 게시글을 무단으로 사용해서는 안 됩니다.',
        ],
      },
      {
        heading: '금지 행위',
        items: [
          '허위 게시글, 사기 거래, 반복적인 노쇼, 부적절한 언행',
          '식품 안전에 문제가 있는 물품 판매 또는 나눔',
          '서비스 운영을 방해하는 자동화 요청, 악성 파일 첨부, 스팸 메시지',
          '외부 결제 유도, 개인정보 요구 등 안전하지 않은 거래 행위',
        ],
      },
      {
        heading: '거래와 책임',
        items: [
          '거래는 사용자 간 합의에 따라 진행되며, 거래 전 상태와 조건을 충분히 확인해야 합니다.',
          '거래 완료 후 리뷰와 신선도 평가를 남길 수 있습니다.',
          '분쟁이 발생하면 채팅 내역, 게시글 정보, 신고 내용을 바탕으로 운영자가 검토할 수 있습니다.',
        ],
      },
      {
        heading: '제재 및 이용 제한',
        items: [
          '신고가 누적되거나 금지 행위가 확인되면 게시글 숨김, 채팅 제한, 계정 제한이 적용될 수 있습니다.',
          '명백한 안전 문제나 악의적 사용이 확인되면 사전 안내 없이 일부 기능이 제한될 수 있습니다.',
        ],
      },
    ],
  },
};

const tutorialSteps = [
  {
    title: '1. 위치와 카테고리 설정',
    body: '처음 이용할 때 관심 카테고리와 기준 위치를 설정합니다. 위치를 바꾸면 주변 게시글과 거리 정보가 새 기준으로 표시됩니다.',
  },
  {
    title: '2. 게시글 둘러보기',
    body: '나눔/판매 또는 공동구매 탭에서 게시글을 확인합니다. 검색어, 정렬, 거리 필터를 사용하면 필요한 식재료를 더 빠르게 찾을 수 있습니다.',
  },
  {
    title: '3. 거래 요청 보내기',
    body: '게시글 상세 화면에서 거래 요청을 보냅니다. 작성자가 요청을 수락하면 채팅방이 생성되고 거래 조건을 조율할 수 있습니다.',
  },
  {
    title: '4. 채팅으로 약속 잡기',
    body: '채팅방에서 메시지, 사진, 위치, 파일 정보를 공유합니다. 방 이름 변경, 상단 고정, 알림 끄기, 신고 및 차단 기능도 사용할 수 있습니다.',
  },
  {
    title: '5. 거래 완료와 리뷰',
    body: '거래가 끝나면 거래 내역에서 완료 상태를 확인하고 상대방 리뷰를 남깁니다. 리뷰는 신선도와 매너 평가에 반영됩니다.',
  },
  {
    title: '6. 냉장고 관리',
    body: '냉장고 화면에 보관 중인 식재료와 유통기한을 등록합니다. 임박한 식재료를 확인하고 필요한 경우 게시글로 나눔 또는 판매할 수 있습니다.',
  },
];

const patchNotes = [
  {
    version: 'v1.3.0',
    date: '2026.09.08',
    title: '채팅 사용성 개선',
    items: [
      '단체 채팅방에서 보낸 메시지의 안 읽은 수가 참여자 수 기준으로 표시됩니다.',
      '채팅 입력창에 카메라, 사진, 지도, 파일 첨부 메뉴를 추가했습니다.',
      '채팅방 검색, 상단 고정, 방별 알림 설정 흐름을 정리했습니다.',
    ],
  },
  {
    version: 'v1.2.0',
    date: '2026.09.08',
    title: '계정 설정 보강',
    items: [
      '내 정보 설정에서 이메일 인증 후 비밀번호를 변경할 수 있게 했습니다.',
      '개인정보 처리방침과 이용약관 내용을 세부 항목으로 확장했습니다.',
      '도움말 화면을 단계별 튜토리얼 형태로 개편했습니다.',
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026.09.07',
    title: '알림과 게시글 안정화',
    items: [
      '알림 삭제 후 읽지 않은 알림 표시가 남는 문제를 개선했습니다.',
      '게시글 거리 필터와 정렬 결과가 더 일관되게 보이도록 조정했습니다.',
      '거래 요청과 채팅방 목록 갱신 흐름을 보강했습니다.',
    ],
  },
];

function SettingsInfoScreen({ view, onClose }: { view: InfoView; onClose: () => void }) {
  const title = view === 'help'
    ? '도움말'
    : view === 'notice'
      ? '공지사항'
      : policySections[view].title;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <SettingsHeader title={title} onClose={onClose} />
      <div className="flex-1 overflow-y-auto bg-[#f7fafc] px-5 py-5">
        {(view === 'privacy' || view === 'terms') && <PolicyDetail content={policySections[view]} />}
        {view === 'help' && <HelpTutorial />}
        {view === 'notice' && <PatchNoteCards />}
      </div>
    </div>
  );
}

function PolicyDetail({ content }: { content: typeof policySections.privacy }) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#ccfbf1] bg-white p-5 shadow-sm">
        <p className="mb-2 text-xs text-[#0f766e]" style={{ fontWeight: 800 }}>{content.updatedAt}</p>
        <p className="text-sm leading-6 text-[#4a5568]">{content.intro}</p>
      </section>

      {content.sections.map((section) => (
        <section key={section.heading} className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base text-[#1a202c]" style={{ fontWeight: 900 }}>{section.heading}</h2>
          <ul className="space-y-2">
            {section.items.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-6 text-[#4a5568]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#14b8a6]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function HelpTutorial() {
  return (
    <div className="space-y-3">
      {tutorialSteps.map((step) => (
        <section key={step.title} className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-base text-[#1a202c]" style={{ fontWeight: 900 }}>{step.title}</h2>
          <p className="text-sm leading-6 text-[#4a5568]">{step.body}</p>
        </section>
      ))}
      <section className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] p-5">
        <h2 className="mb-2 text-sm text-[#1e3a8a]" style={{ fontWeight: 900 }}>문제가 생겼을 때</h2>
        <p className="text-sm leading-6 text-[#1e3a8a]">
          게시글, 채팅, 거래 요청 화면에서 오류가 반복되면 화면 캡처와 함께 어떤 버튼을 눌렀는지 기록해 관리자에게 전달해주세요.
        </p>
      </section>
    </div>
  );
}

function PatchNoteCards() {
  return (
    <div className="space-y-4">
      {patchNotes.map((note) => (
        <section key={note.version} className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-xs text-[#14b8a6]" style={{ fontWeight: 900 }}>{note.version}</p>
              <h2 className="text-lg text-[#1a202c]" style={{ fontWeight: 900 }}>{note.title}</h2>
            </div>
            <span className="shrink-0 rounded-full bg-[#f1f5f9] px-3 py-1 text-xs text-[#64748b]" style={{ fontWeight: 800 }}>
              {note.date}
            </span>
          </div>
          <ul className="space-y-2">
            {note.items.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-6 text-[#4a5568]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#14b8a6]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
