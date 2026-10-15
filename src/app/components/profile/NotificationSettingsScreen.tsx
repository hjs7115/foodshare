import { useEffect, useState } from 'react';
import { Bell, MessageCircle, Megaphone, ShoppingBag, UserCheck, X } from 'lucide-react';
import { API_ENDPOINTS, apiRequest } from '../../api/config';
import { showToast } from '../../utils/feedback';
import { registerFirebaseMessaging } from '../../firebase';

interface NotificationSettings {
  newPost: boolean;
  comment: boolean;
  tradeRequest: boolean;
  tradeAccepted: boolean;
  marketing: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  newPost: true,
  comment: true,
  tradeRequest: true,
  tradeAccepted: true,
  marketing: false,
};

export default function NotificationSettingsScreen({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [connected, setConnected] = useState(Boolean(localStorage.getItem('pushToken')));
  const [isSavingKey, setIsSavingKey] = useState<keyof NotificationSettings | null>(null);
  const [isRegisteringPush, setIsRegisteringPush] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    () => typeof Notification === 'undefined' ? 'denied' : Notification.permission
  );

  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch {
        localStorage.removeItem('notificationSettings');
      }
    }

    apiRequest(API_ENDPOINTS.notificationSettings, { method: 'GET' })
      .then((response) => {
        const serverSettings = response?.data || response?.settings || response;
        const nextSettings = { ...DEFAULT_SETTINGS, ...serverSettings };
        setSettings(nextSettings);
        localStorage.setItem('notificationSettings', JSON.stringify(nextSettings));
      })
      .catch(() => null);
  }, []);

  const handleToggle = async (key: keyof NotificationSettings) => {
    const previousSettings = settings;
    const nextSettings = {
      ...settings,
      [key]: !settings[key],
    };

    setSettings(nextSettings);
    setIsSavingKey(key);
    localStorage.setItem('notificationSettings', JSON.stringify(nextSettings));

    try {
      const response = await apiRequest(API_ENDPOINTS.notificationSettings, {
        method: 'PUT',
        body: JSON.stringify(nextSettings),
      });
      const serverSettings = response?.data || response?.settings || nextSettings;
      const savedSettings = { ...nextSettings, ...serverSettings };
      setSettings(savedSettings);
      localStorage.setItem('notificationSettings', JSON.stringify(savedSettings));
      showToast('알림 설정을 저장했습니다.', 'success');
    } catch (error: any) {
      setSettings(previousSettings);
      localStorage.setItem('notificationSettings', JSON.stringify(previousSettings));
      showToast(error?.message || '알림 설정을 저장하지 못했습니다.', 'error');
    } finally {
      setIsSavingKey(null);
    }
  };

  const handleEnablePush = async () => {
    if (!('Notification' in window)) {
      showToast('아이폰은 홈 화면에 추가한 반띵 아이콘으로 실행해주세요.', 'error');
      return;
    }
    setIsRegisteringPush(true);
    try {
      const registered = await registerFirebaseMessaging({ requestPermission: true });
      setBrowserPermission(Notification.permission);
      setConnected(registered);
      if (registered) {
        const response = await apiRequest(API_ENDPOINTS.testPush, {
          method: 'POST',
          body: JSON.stringify({}),
        });
        showToast(response?.data === true ? '테스트 알림 전송을 요청했습니다. 기기에서 수신되는지 확인해주세요.' : '알림 연결은 완료됐지만 테스트 전송에 실패했습니다. 잠시 후 다시 시도해주세요.', response?.data === true ? 'success' : 'error');
      } else if (Notification.permission === 'denied') {
        showToast('브라우저 사이트 설정에서 알림 권한을 허용해주세요.', 'error');
      } else {
        showToast('알림 권한을 허용한 뒤 다시 연결해주세요. 아이폰은 홈 화면의 반띵으로 실행해야 합니다.', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || '이 기기 알림 등록에 실패했습니다.', 'error');
    } finally {
      setIsRegisteringPush(false);
    }
  };

  const settingItems = [
    { key: 'newPost' as const, icon: ShoppingBag, label: '새 게시글 알림', description: '주변에 새 식재료 게시글이 올라오면 알려줍니다.' },
    { key: 'comment' as const, icon: MessageCircle, label: '댓글 알림', description: '내 게시글에 댓글이 달리면 알려줍니다.' },
    { key: 'tradeRequest' as const, icon: Bell, label: '거래 요청 알림', description: '내 게시글에 거래 요청이 오면 알려줍니다.' },
    { key: 'tradeAccepted' as const, icon: UserCheck, label: '거래 수락 알림', description: '보낸 거래 요청이 수락되면 알려줍니다.' },
    { key: 'marketing' as const, icon: Megaphone, label: '서비스 소식', description: '이벤트와 서비스 안내를 받을 수 있습니다.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-white px-5 py-4">
        <button onClick={onClose} className="text-[#2d3748]" aria-label="닫기">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 800 }}>알림 설정</h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f7fafc] px-5 py-5">
        <section className="mb-4 rounded-2xl border border-[#bef264] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm text-[#1a202c]" style={{ fontWeight: 800 }}>이 기기 푸시 알림</h2>
              <p className="mt-1 text-xs text-[#718096]">
                {browserPermission === 'granted' && connected ? '이 기기의 알림 연결이 완료되었습니다.' : '알림 연결 버튼을 눌러 이 기기를 연결해주세요.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={isRegisteringPush}
              className="shrink-0 rounded-xl bg-[#bef264] px-4 py-2 text-sm text-[#1a202c] disabled:opacity-60"
              style={{ fontWeight: 800 }}
            >
              {isRegisteringPush ? '연결 중…' : '알림 연결'}
            </button>
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
          {settingItems.map((item, index) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleToggle(item.key)}
              disabled={isSavingKey !== null}
              className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[#f7fafc] disabled:cursor-wait disabled:opacity-70 ${
                index !== settingItems.length - 1 ? 'border-b border-[#e2e8f0]' : ''
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc]">
                  <item.icon size={20} className="text-[#475569]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm text-[#2d3748]" style={{ fontWeight: 800 }}>{item.label}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#718096]">{item.description}</p>
                </div>
              </div>
              <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${settings[item.key] ? 'bg-[#bef264]' : 'bg-[#cbd5e0]'}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${settings[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </span>
            </button>
          ))}
        </section>

        <div className="mt-5 rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4">
          <p className="text-sm leading-6 text-[#92400e]">
            앱의 알림 종류 설정과 기기 푸시 권한은 별도입니다. 푸시 알림을 받으려면 이 기기에서 알림 권한을 허용하고 연결해야 합니다.
          </p>
          {browserPermission === 'denied' && (
            <p className="mt-2 text-xs leading-5 text-[#92400e]">
              권한이 차단된 경우 브라우저 또는 기기의 앱 설정에서 반띵 알림을 허용해주세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
