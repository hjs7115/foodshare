import { FormEvent, useMemo, useState } from 'react';
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
  Send,
  Shield,
  User,
  X,
} from 'lucide-react';
import { API_ENDPOINTS, apiRequest } from '../../api/config';
import { clearAuthSession, getStoredUserInfo } from '../../auth/session';
import { showToast } from '../../utils/feedback';
import ChatSettingsScreen from './ChatSettingsScreen';
import EditProfileScreen from './EditProfileScreen';
import LocationSettingsScreen from './LocationSettingsScreen';
import NotificationSettingsScreen from './NotificationSettingsScreen';

type SettingsView =
  | 'main'
  | 'editProfile'
  | 'password'
  | 'privacy'
  | 'terms'
  | 'notifications'
  | 'location'
  | 'chat'
  | 'storage'
  | 'help'
  | 'notice'
  | 'inquiry';

interface StoredUserInfo {
  email?: string;
  name?: string;
  nickname?: string;
}

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [currentView, setCurrentView] = useState<SettingsView>('main');

  const settingsSections = [
    {
      title: '계정',
      items: [
        { icon: User, label: '프로필 수정', action: () => setCurrentView('editProfile') },
        { icon: Shield, label: '개인정보 처리방침', action: () => setCurrentView('privacy') },
        { icon: Lock, label: '비밀번호 변경', action: () => setCurrentView('password') },
        { icon: FileText, label: '이용약관', action: () => setCurrentView('terms') },
      ],
    },
    {
      title: '앱 설정',
      items: [
        { icon: Bell, label: '알림 설정', action: () => setCurrentView('notifications') },
        { icon: MapPin, label: '위치 설정', action: () => setCurrentView('location') },
        { icon: MessageCircle, label: '채팅 설정', action: () => setCurrentView('chat') },
        { icon: Database, label: '저장된 데이터', action: () => setCurrentView('storage') },
      ],
    },
    {
      title: '고객 지원',
      items: [
        { icon: HelpCircle, label: '도움말', action: () => setCurrentView('help') },
        { icon: FileText, label: '공지사항', action: () => setCurrentView('notice') },
        { icon: AlertCircle, label: '문의하기', action: () => setCurrentView('inquiry') },
      ],
    },
  ];

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
    return <PasswordChangeScreen onClose={() => setCurrentView('main')} />;
  }

  if (currentView === 'storage') {
    return <StorageDataScreen onClose={() => setCurrentView('main')} />;
  }

  if (currentView === 'inquiry') {
    return <InquiryScreen onClose={() => setCurrentView('main')} />;
  }

  if (currentView === 'privacy') {
    return (
      <StaticInfoScreen
        title="개인정보 처리방침"
        onClose={() => setCurrentView('main')}
        sections={[
          {
            heading: '1. 수집하는 개인정보 항목',
            body:
              '반띵은 회원가입과 서비스 이용을 위해 이메일, 이름, 닉네임, 휴대폰 번호, 비밀번호 암호화 값, 프로필 이미지, 주소 또는 위치 좌표를 처리합니다. 또한 게시글, 댓글, 관심 목록, 거래 요청, 채팅, 리뷰, 신고와 차단 기록, 알림 수신 설정, FCM 푸시 토큰처럼 서비스 이용 과정에서 생성되는 정보를 함께 저장할 수 있습니다.',
          },
          {
            heading: '2. 개인정보 이용 목적',
            body:
              '수집한 정보는 본인 확인, 이메일 인증, 로그인 유지, 비밀번호 재설정, 위치 기반 게시글 탐색, 거래 요청과 수락, 1대1 및 공동구매 채팅방 생성, 리뷰와 신선도 계산, 배지와 활동 통계 제공, 신고/차단 처리, 부정 이용 방지, 서비스 알림 발송을 위해 사용됩니다.',
          },
          {
            heading: '3. 위치 정보와 알림 정보 처리',
            body:
              '위치 정보는 사용자가 선택한 반경 안의 게시글을 보여주고 거리순 정렬을 제공하기 위해 사용됩니다. 알림 정보는 거래 요청, 수락, 채팅, 댓글, 유통기한 임박 안내처럼 사용자가 놓치기 쉬운 활동을 알려주기 위해 사용되며, 사용자는 설정 화면에서 알림 수신 여부를 조정할 수 있습니다.',
          },
          {
            heading: '4. 보관 기간과 파기 원칙',
            body:
              '회원 정보는 회원 탈퇴 또는 서비스 이용 목적 달성 시까지 보관합니다. 다만 거래 기록, 리뷰, 신고, 차단, 관리자 확인이 필요한 기록은 분쟁 대응과 서비스 안전성 유지를 위해 필요한 기간 동안 보관될 수 있습니다. 삭제된 게시글이나 완료된 거래는 일반 목록에서는 보이지 않더라도 거래내역, 리뷰, 신고 확인을 위해 내부 기록으로 유지될 수 있습니다.',
          },
          {
            heading: '5. 제3자 제공 및 외부 서비스 이용',
            body:
              '반띵은 이용자의 개인정보를 임의로 판매하거나 목적 없이 외부에 제공하지 않습니다. 다만 이메일 발송, Firebase FCM 푸시 알림, 지도와 주소 검색처럼 서비스 제공에 필요한 외부 인프라를 사용할 수 있으며, 이 경우 필요한 범위의 정보만 연동되도록 관리합니다.',
          },
          {
            heading: '6. 이용자의 권리',
            body:
              '이용자는 프로필 수정, 알림 설정 변경, 위치 설정 변경, 차단 해제, 기기 저장 정보 삭제를 직접 수행할 수 있습니다. 개인정보와 관련한 문의가 필요한 경우 문의하기 화면을 통해 요청할 수 있으며, 서비스 운영자는 요청 내용을 확인한 뒤 필요한 조치를 안내합니다.',
          },
        ]}
      />
    );
  }

  if (currentView === 'terms') {
    return (
      <StaticInfoScreen
        title="이용약관"
        onClose={() => setCurrentView('main')}
        sections={[
          {
            heading: '1. 약관의 목적',
            body:
              '이 약관은 반띵이 제공하는 식재료 나눔, 판매, 공동구매, 채팅, 리뷰, 알림 서비스를 이용할 때 서비스와 이용자 사이의 권리, 의무, 책임 사항을 정하기 위한 문서입니다. 이용자는 서비스를 사용함으로써 본 약관의 기본 운영 원칙에 동의한 것으로 봅니다.',
          },
          {
            heading: '2. 회원 계정과 인증',
            body:
              '회원은 정확한 이메일과 기본 정보를 입력하고 이메일 인증을 완료해야 서비스를 정상적으로 이용할 수 있습니다. 계정 정보와 비밀번호는 본인이 안전하게 관리해야 하며, 타인의 계정을 사용하거나 허위 정보를 입력해 서비스 질서를 해치는 행위는 제한될 수 있습니다.',
          },
          {
            heading: '3. 게시글 작성과 거래 원칙',
            body:
              '게시글에는 실제 거래 가능한 식재료의 이름, 수량, 가격, 거래 위치, 유통기한, 마감일 등 필요한 정보를 정확히 입력해야 합니다. 나눔과 판매는 기본적으로 1대1 거래 흐름을 따르며, 공동구매는 목표 인원과 마감일을 기준으로 여러 사용자가 함께 참여할 수 있습니다.',
          },
          {
            heading: '4. 공동구매와 채팅',
            body:
              '공동구매 게시글은 작성자를 포함한 참여 인원을 기준으로 모집 상태가 관리됩니다. 목표 인원이 모두 채워지지 않아도 작성자가 수락하면 현재 참여자 기준으로 단체 채팅방이 개설될 수 있으며, 목표 인원 도달 또는 마감일 경과 시 모집이 제한될 수 있습니다.',
          },
          {
            heading: '5. 금지 행위',
            body:
              '허위 게시글 작성, 거래와 무관한 광고, 타인을 속이는 행위, 욕설과 괴롭힘, 개인정보 무단 수집, 안전하지 않은 식재료 거래, 시스템을 악용하는 반복 요청, 신고 기능 남용은 금지됩니다. 위반 시 게시글 숨김, 거래 제한, 계정 이용 제한이 적용될 수 있습니다.',
          },
          {
            heading: '6. 신고, 차단 및 이용 제한',
            body:
              '이용자는 부적절한 게시글, 댓글, 사용자 활동을 신고하거나 원치 않는 사용자를 차단할 수 있습니다. 신고 내용은 운영 기준에 따라 검토되며, 반복적인 위반 또는 위험 거래로 판단되는 경우 서비스 이용이 제한될 수 있습니다.',
          },
          {
            heading: '7. 서비스 변경과 책임 범위',
            body:
              '반띵은 안정적인 운영을 위해 기능, 화면, 정책을 개선하거나 일부 기능을 중단할 수 있습니다. 이용자 간 실제 거래의 가격, 수량, 상태, 약속 이행은 당사자 간 합의를 기준으로 하며, 서비스는 안전한 연결과 기록 관리를 돕는 플랫폼 역할을 수행합니다.',
          },
        ]}
      />
    );
  }

  if (currentView === 'help') {
    return (
      <StaticInfoScreen
        title="도움말"
        onClose={() => setCurrentView('main')}
        sections={[
          {
            heading: '게시글은 어떻게 작성하나요?',
            body:
              '작성 화면에서 나눔/판매 또는 공동구매 유형을 선택한 뒤 식재료명, 설명, 수량, 가격, 위치, 사진, 유통기한과 마감일을 입력하면 됩니다. 나눔/판매 게시글은 유통기한 아래에 마감일을 함께 설정할 수 있고, 공동구매 게시글은 목표 인원과 모집 마감일을 기준으로 참여자를 모읍니다.',
          },
          {
            heading: '주변 게시글은 어떻게 찾나요?',
            body:
              '홈 화면의 거리 설정에서 500m부터 10km까지 원하는 반경을 선택할 수 있습니다. 반경을 줄이면 가까운 게시글만 표시되고, 거리순 정렬을 선택하면 사용자의 현재 좌표를 기준으로 가까운 게시글이 먼저 보입니다.',
          },
          {
            heading: '거래 요청은 어떻게 진행되나요?',
            body:
              '게시글 상세 화면에서 거래 요청을 보내면 작성자의 거래내역에 요청이 표시됩니다. 작성자가 수락하면 거래가 진행되고 채팅방이 생성됩니다. 일반 나눔/판매는 1대1 채팅으로, 공동구매는 참여자 수에 따라 1대1 또는 단체 채팅방으로 연결됩니다.',
          },
          {
            heading: '거래 완료 후에는 어떻게 되나요?',
            body:
              '거래가 완료되면 해당 게시글은 홈과 검색 목록에서는 숨김 처리됩니다. 다만 내정보의 내 게시글과 거래내역에는 계속 남아 있어 작성자 확인, 리뷰 작성, 신고, 관리자 확인이 가능합니다. 완료된 거래에 대해서만 리뷰를 작성할 수 있습니다.',
          },
          {
            heading: '신선도와 배지는 무엇인가요?',
            body:
              '신선도는 거래 후 받은 별점을 기반으로 계산되는 신뢰 지표입니다. 좋은 평가를 꾸준히 받으면 천천히 상승하고, 낮은 평가를 받으면 더 빠르게 하락합니다. 배지는 나눔 완료, 판매 완료, 공동구매 참여, 리뷰, 매너 활동 같은 기록을 바탕으로 달성률이 반영됩니다.',
          },
          {
            heading: '알림과 채팅은 어떻게 쓰나요?',
            body:
              '알림 화면에서는 거래 요청, 수락, 댓글, 채팅, 유통기한 임박 안내를 확인할 수 있습니다. 브라우저 알림 권한과 Firebase 푸시 설정이 완료된 환경에서는 앱을 보고 있지 않아도 푸시 알림을 받을 수 있습니다. 채팅방은 상단 고정과 알림 끄기 설정을 지원합니다.',
          },
          {
            heading: '문제가 생기면 어떻게 하나요?',
            body:
              '부적절한 게시글이나 댓글은 신고할 수 있고, 불편한 사용자는 차단할 수 있습니다. 차단한 사용자는 차단 목록에서 관리할 수 있으며, 추가 문의가 필요하면 설정의 문의하기 화면에서 문의 유형과 내용을 입력해 접수할 수 있습니다.',
          },
        ]}
      />
    );
  }

  if (currentView === 'notice') {
    return (
      <StaticInfoScreen
        title="공지사항"
        onClose={() => setCurrentView('main')}
        sections={[
          {
            heading: '반띵 베타 서비스 운영 안내',
            body:
              '반띵은 현재 식재료 나눔, 판매, 공동구매를 중심으로 한 베타 운영 단계입니다. 회원가입, 이메일 인증, 게시글 작성, 위치 기반 탐색, 거래 요청, 채팅, 리뷰, 신고/차단, 배지와 활동 통계 기능을 실제 사용 흐름에 맞춰 점검하고 있습니다.',
          },
          {
            heading: '거래 완료 게시글 표시 정책',
            body:
              '거래가 완료된 게시글은 홈, 검색, 거리 필터 결과에서는 더 이상 노출되지 않습니다. 대신 작성자의 내 게시글과 거래내역에는 유지되어 거래 기록 확인, 리뷰 작성, 신고 확인, 관리자 검토가 가능하도록 관리됩니다.',
          },
          {
            heading: '공동구매 기능 업데이트',
            body:
              '공동구매는 목표 인원과 모집 마감일을 기준으로 참여자를 모집합니다. 목표 인원이 모두 채워지지 않아도 작성자가 수락하면 현재 참여자 기준으로 채팅방을 개설할 수 있으며, 참여 인원과 모집 상태는 거래내역에서 확인할 수 있습니다.',
          },
          {
            heading: 'PWA 및 푸시 알림 안내',
            body:
              '반띵은 설치 가능한 PWA 형태를 지원합니다. 크롬 등 지원 브라우저에서 홈 화면에 설치할 수 있으며, HTTPS 배포 환경과 알림 권한, FCM 토큰 등록이 정상적으로 완료되면 거래와 채팅 관련 푸시 알림을 받을 수 있습니다.',
          },
          {
            heading: 'Docker 배포 환경 검증 안내',
            body:
              '통합본 프로젝트는 Docker Compose를 통해 frontend, backend, mysql, nginx 컨테이너를 함께 실행할 수 있도록 구성되어 있습니다. 로컬 검증 후 AWS 같은 서버 환경으로 옮기면 실제 외부 사용자가 접속 가능한 배포 구조로 확장할 수 있습니다.',
          },
          {
            heading: '향후 개선 예정',
            body:
              '서비스 안정화를 위해 관리자 신고 처리 화면, 공지 관리, 문의 답변 관리, 알림 세부 설정, 모바일 사용성 개선, 실시간 채팅 품질 개선, 배포 환경 HTTPS 자동화 등을 순차적으로 보강할 예정입니다.',
          },
        ]}
      />
    );
  }
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]" aria-label="닫기">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          설정
        </h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f7fafc]">
        {settingsSections.map((section) => (
          <div key={section.title} className="bg-white mb-2">
            <div className="px-5 py-3 bg-[#f7fafc]">
              <h2 className="text-xs text-[#718096]" style={{ fontWeight: 600 }}>
                {section.title}
              </h2>
            </div>
            {section.items.map((item, itemIndex) => (
              <button
                key={item.label}
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
            <p className="text-[#2d3748]" style={{ fontWeight: 500 }}>
              1.0.0
            </p>
          </div>
        </div>

        <div className="px-5 pb-6">
          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4">
            <p className="text-sm text-[#1e3a8a]">
              게시글, 댓글, 관심 목록, 거래내역은 백엔드 API와 MySQL을 기준으로 관리됩니다. 이 기기에는 로그인과 화면 표시를 위한 최소 정보만 저장됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
      <button onClick={onClose} className="text-[#2d3748]" aria-label="뒤로가기">
        <X size={24} />
      </button>
      <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
        {title}
      </h1>
      <div className="w-6" />
    </div>
  );
}

function StaticInfoScreen({
  title,
  sections,
  onClose,
}: {
  title: string;
  sections: Array<{ heading: string; body: string }>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <SettingsHeader title={title} onClose={onClose} />
      <div className="flex-1 overflow-y-auto bg-[#f7fafc] px-5 py-5 space-y-4">
        {sections.map((section) => (
          <section key={section.heading} className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-[#2d3748]" style={{ fontWeight: 700 }}>
              {section.heading}
            </h2>
            <p className="text-sm leading-6 text-[#4a5568]">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

function PasswordChangeScreen({ onClose }: { onClose: () => void }) {
  const userInfo = getStoredUserInfo<StoredUserInfo>();
  const email = userInfo?.email || '';
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maskedEmail = useMemo(() => {
    if (!email.includes('@')) return email || '등록된 이메일 없음';
    const [local, domain] = email.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }, [email]);

  const requestCode = async () => {
    if (!email) {
      showToast('로그인된 이메일 정보를 찾을 수 없습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest(API_ENDPOINTS.sendPasswordResetLink, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setStep('reset');
      showToast('비밀번호 변경 인증코드를 이메일로 보냈습니다.');
    } catch (error: any) {
      showToast(error.message || '인증코드 발송에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault();

    if (!code.trim()) {
      showToast('인증코드를 입력해주세요.');
      return;
    }
    if (newPassword.length < 8) {
      showToast('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest(API_ENDPOINTS.resetPassword, {
        method: 'POST',
        body: JSON.stringify({
          email,
          code: code.trim(),
          newPassword,
        }),
      });
      showToast('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
      clearAuthSession();
      window.location.reload();
    } catch (error: any) {
      showToast(error.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <SettingsHeader title="비밀번호 변경" onClose={onClose} />
      <div className="flex-1 overflow-y-auto bg-[#f7fafc] px-5 py-6">
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <p className="mb-2 text-sm text-[#718096]">인증코드 발송 이메일</p>
          <p className="mb-4 text-[#2d3748]" style={{ fontWeight: 700 }}>
            {maskedEmail}
          </p>
          <p className="mb-5 text-sm leading-6 text-[#718096]">
            계정 보안을 위해 현재 로그인된 이메일로 인증코드를 받은 뒤 새 비밀번호를 설정합니다.
          </p>

          {step === 'request' ? (
            <button
              onClick={requestCode}
              disabled={isSubmitting || !email}
              className="w-full rounded-2xl bg-[#bef264] py-4 text-[#0a0a0a] transition hover:bg-[#a3e635] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ fontWeight: 700 }}
            >
              {isSubmitting ? '발송 중...' : '인증코드 받기'}
            </button>
          ) : (
            <form onSubmit={resetPassword} className="space-y-4">
              <Field
                label="인증코드"
                value={code}
                onChange={setCode}
                placeholder="이메일로 받은 인증코드"
                inputMode="numeric"
              />
              <Field
                label="새 비밀번호"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="8자 이상 입력"
                type="password"
              />
              <Field
                label="새 비밀번호 확인"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="새 비밀번호 재입력"
                type="password"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-[#bef264] py-4 text-[#0a0a0a] transition hover:bg-[#a3e635] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ fontWeight: 700 }}
              >
                {isSubmitting ? '변경 중...' : '비밀번호 변경'}
              </button>
              <button
                type="button"
                onClick={requestCode}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-[#e2e8f0] bg-white py-3 text-[#4a5568]"
              >
                인증코드 다시 받기
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function StorageDataScreen({ onClose }: { onClose: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClearAllData = () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    clearAuthSession();
    localStorage.removeItem('userLocation');
    localStorage.removeItem('userLocationCoords');
    localStorage.removeItem('notificationSettings');
    localStorage.removeItem('chatSettings');
    showToast('이 기기에 저장된 로그인 및 설정 정보를 삭제했습니다. 페이지를 새로고침합니다.');
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <SettingsHeader title="저장된 데이터" onClose={onClose} />
      <div className="flex-1 overflow-y-auto bg-[#f7fafc] px-5 py-6 space-y-4">
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-[#2d3748]" style={{ fontWeight: 700 }}>
            서버에 저장되는 데이터
          </h2>
          <p className="text-sm leading-6 text-[#718096]">
            계정 정보, 프로필 이미지, 게시글, 댓글, 관심 목록, 거래 요청, 거래 완료 기록, 채팅방 정보, 리뷰, 신선도, 배지 진행률, 신고와 차단 기록, 알림 목록은 백엔드 서버와 MySQL 데이터베이스에 저장됩니다. 이 데이터는 여러 기기에서 로그인해도 동일하게 확인되어야 하거나, 거래 기록과 서비스 안전 관리를 위해 서버에서 관리되는 정보입니다.
          </p>
        </section>

        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-[#2d3748]" style={{ fontWeight: 700 }}>
            이 기기에 저장되는 데이터
          </h2>
          <p className="text-sm leading-6 text-[#718096]">
            현재 브라우저에는 로그인 토큰, 자동 로그인 상태, 마지막으로 선택한 위치와 좌표, 알림 설정, 채팅 설정처럼 화면을 빠르게 복원하기 위한 정보가 저장될 수 있습니다. 이 정보는 지금 사용하는 브라우저에만 남아 있으며, 다른 휴대폰이나 다른 PC의 서버 데이터와는 별도로 관리됩니다.
          </p>
        </section>

        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-[#2d3748]" style={{ fontWeight: 700 }}>
            삭제하면 어떻게 되나요?
          </h2>
          <p className="text-sm leading-6 text-[#718096]">
            기기 저장 정보를 삭제하면 이 브라우저의 로그인 상태와 개인 설정이 초기화됩니다. 다시 이용하려면 로그인이 필요할 수 있습니다. 단, 서버에 저장된 게시글, 거래내역, 리뷰, 알림, 신고/차단 기록은 삭제되지 않으며, 계정 자체를 삭제하거나 서버 기록을 정리하는 기능과는 다릅니다.
          </p>
        </section>

        <section className="rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-5">
          <h2 className="mb-2 text-[#991b1b]" style={{ fontWeight: 700 }}>
            기기 저장 정보 삭제
          </h2>
          <p className="mb-4 text-sm leading-6 text-[#7f1d1d]">
            공용 PC를 사용했거나, 로그인 상태가 꼬였거나, 알림/위치/채팅 설정을 처음 상태로 돌리고 싶을 때 사용할 수 있습니다. 삭제 후에는 페이지가 새로고침되며 필요한 경우 다시 로그인해야 합니다.
          </p>
          {showConfirm && (
            <p className="mb-3 rounded-xl bg-white px-3 py-2 text-sm text-[#991b1b]">
              정말로 이 기기에 저장된 로그인 및 설정 정보를 삭제하시겠습니까?
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleClearAllData}
              className="flex-1 rounded-xl bg-[#dc2626] py-3 text-white transition hover:bg-[#b91c1c]"
              style={{ fontWeight: 700 }}
            >
              {showConfirm ? '확인' : '기기 저장 정보 삭제'}
            </button>
            {showConfirm && (
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-[#e2e8f0] bg-white py-3 text-[#2d3748]"
              >
                취소
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
function InquiryScreen({ onClose }: { onClose: () => void }) {
  const userInfo = getStoredUserInfo<StoredUserInfo>();
  const [category, setCategory] = useState('서비스 이용');
  const [content, setContent] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim()) {
      showToast('문의 내용을 입력해주세요.');
      return;
    }

    showToast('문의 내용이 접수되었습니다. 발표용 버전에서는 화면 접수로 처리됩니다.');
    setContent('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <SettingsHeader title="문의하기" onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-[#f7fafc] px-5 py-6 space-y-4">
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <p className="mb-1 text-sm text-[#718096]">답변 받을 계정</p>
          <p className="text-[#2d3748]" style={{ fontWeight: 700 }}>
            {userInfo?.email || '로그인 이메일 없음'}
          </p>
        </section>
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm space-y-4">
          <div>
            <label className="mb-2 block text-sm text-[#2d3748]" style={{ fontWeight: 600 }}>
              문의 유형
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-2xl border border-[#e2e8f0] bg-[#f7fafc] px-4 py-3.5 outline-none focus:border-[#bef264]"
            >
              <option>서비스 이용</option>
              <option>거래 문제</option>
              <option>신고/차단</option>
              <option>계정/로그인</option>
              <option>기타</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm text-[#2d3748]" style={{ fontWeight: 600 }}>
              문의 내용
            </label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="문의 내용을 입력해주세요."
              className="min-h-[180px] w-full resize-none rounded-2xl border border-[#e2e8f0] bg-[#f7fafc] px-4 py-3.5 outline-none focus:border-[#bef264]"
            />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#bef264] py-4 text-[#0a0a0a] transition hover:bg-[#a3e635]"
            style={{ fontWeight: 700 }}
          >
            <Send size={18} />
            문의 접수
          </button>
        </section>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: 'text' | 'numeric';
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-[#2d3748]" style={{ fontWeight: 600 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[#e2e8f0] bg-[#f7fafc] px-4 py-3.5 outline-none focus:border-[#bef264]"
      />
    </div>
  );
}

