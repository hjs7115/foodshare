import { useEffect, useState } from 'react';
import { Bell, CheckCheck, MessageCircle, Trash2, X } from 'lucide-react';

interface ChatSettings {
  push: boolean;
  readReceipt: boolean;
  hideLeftRooms: boolean;
}

const CHAT_SETTINGS_KEY = 'chatSettings';

export default function ChatSettingsScreen({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<ChatSettings>({
    push: true,
    readReceipt: true,
    hideLeftRooms: false,
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem(CHAT_SETTINGS_KEY);
    if (!savedSettings) return;

    try {
      setSettings({ ...settings, ...JSON.parse(savedSettings) });
    } catch {
      localStorage.removeItem(CHAT_SETTINGS_KEY);
    }
  }, []);

  const handleToggle = (key: keyof ChatSettings) => {
    const nextSettings = {
      ...settings,
      [key]: !settings[key],
    };
    setSettings(nextSettings);
    localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(nextSettings));
  };

  const items = [
    {
      key: 'push' as const,
      icon: Bell,
      title: '채팅 알림',
      description: '새 메시지가 오면 알림으로 알려줘요.',
    },
    {
      key: 'readReceipt' as const,
      icon: CheckCheck,
      title: '읽음 표시',
      description: '내가 채팅방을 확인하면 읽음 상태로 처리해요.',
    },
    {
      key: 'hideLeftRooms' as const,
      icon: Trash2,
      title: '나간 채팅방 숨기기',
      description: '정리한 채팅방을 목록에서 숨겨요.',
    },
  ];

  return (
    <div className="fixed inset-0 bg-[#f7fafc] z-50 flex flex-col">
      <div className="bg-gradient-to-r from-[#ccfbf1] to-[#14b8a6] border-b-2 border-[#14b8a6] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#e2e8f0]" aria-label="닫기">
          <X size={22} className="text-[#1a202c]" />
        </button>
        <div className="text-center">
          <h1 className="text-lg text-[#1a202c]" style={{ fontWeight: 800 }}>채팅 설정</h1>
          <p className="text-xs text-[#0f766e]">채팅방 표시와 알림을 관리해요</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <section className="rounded-3xl border border-[#99f6e4] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#f0fdfa] flex items-center justify-center">
              <MessageCircle size={22} className="text-[#14b8a6]" />
            </div>
            <div>
              <h2 className="text-base text-[#1a202c]" style={{ fontWeight: 800 }}>채팅 환경</h2>
              <p className="text-xs text-[#718096]">이 기기에서 사용할 채팅 설정입니다.</p>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.key}
                onClick={() => handleToggle(item.key)}
                className="w-full rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-left flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <item.icon size={20} className="text-[#14b8a6]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-[#1a202c]" style={{ fontWeight: 800 }}>{item.title}</p>
                    <p className="mt-0.5 text-xs text-[#718096]">{item.description}</p>
                  </div>
                </div>
                <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${settings[item.key] ? 'bg-[#14b8a6]' : 'bg-[#cbd5e0]'}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${settings[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
