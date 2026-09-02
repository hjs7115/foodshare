import { useEffect, useState } from 'react';
import { Bell, MessageCircle, Megaphone, ShoppingBag, UserCheck, X } from 'lucide-react';
import { API_ENDPOINTS, apiRequest } from '../../api/config';
import { showToast } from '../../utils/feedback';

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
  const [isSavingKey, setIsSavingKey] = useState<keyof NotificationSettings | null>(null);

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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0fdf4]">
                  <item.icon size={20} className="text-[#65a30d]" />
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
            푸시 알림을 받으려면 브라우저 알림 권한도 허용되어 있어야 합니다. 브라우저에서 알림을 차단하면 앱 설정이 켜져 있어도 푸시가 표시되지 않을 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
