import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Pin, Trash2, X } from 'lucide-react';

interface ChatSettings {
  push: boolean;
  readReceipt: boolean;
  hideLeftRooms: boolean;
}

export const CHAT_SETTINGS_KEY = 'chatSettings';

export function getChatSettings(): ChatSettings {
  const fallback = {
    push: true,
    readReceipt: true,
    hideLeftRooms: false,
  };
  const savedSettings = localStorage.getItem(CHAT_SETTINGS_KEY);
  if (!savedSettings) return fallback;

  try {
    return { ...fallback, ...JSON.parse(savedSettings) };
  } catch {
    localStorage.removeItem(CHAT_SETTINGS_KEY);
    return fallback;
  }
}

export default function ChatSettingsScreen({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<ChatSettings>({
    push: true,
    readReceipt: true,
    hideLeftRooms: false,
  });

  useEffect(() => {
    setSettings(getChatSettings());
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
      description: '새 메시지가 오면 즉시 알림으로 알려줍니다.',
      enabled: true,
    },
    {
      key: 'readReceipt' as const,
      icon: CheckCheck,
      title: '읽음 표시',
      description: '채팅방을 열면 상대에게 읽음 상태를 표시합니다.',
      enabled: true,
    },
    {
      key: 'hideLeftRooms' as const,
      icon: Trash2,
      title: '나간 채팅방 숨기기',
      description: '채팅방 나가기 기능이 연결되면 목록에서 숨깁니다.',
      enabled: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-white px-5 py-4">
        <button type="button" onClick={onClose} className="text-[#2d3748]" aria-label="닫기">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 800 }}>채팅 설정</h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f7fafc] px-5 py-5">
        <section>
          <h2 className="mb-2 px-1 text-xs text-[#718096]" style={{ fontWeight: 800 }}>채팅 환경</h2>
          <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
            {items.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => item.enabled && handleToggle(item.key)}
                disabled={!item.enabled}
                className={`flex min-h-[76px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60 ${
                  index !== items.length - 1 ? 'border-b border-[#e2e8f0]' : ''
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc]">
                    <item.icon size={20} className="text-[#475569]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm leading-5 text-[#1a202c]" style={{ fontWeight: 800 }}>{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#718096]">{item.description}</p>
                  </div>
                </div>
                <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${settings[item.key] ? 'bg-[#bef264]' : 'bg-[#cbd5e0]'}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${settings[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc]">
              <Pin size={20} className="text-[#475569]" />
            </div>
            <div>
              <h2 className="text-sm text-[#1a202c]" style={{ fontWeight: 800 }}>상단 고정</h2>
              <p className="mt-1 text-xs leading-5 text-[#718096]">
                채팅방 목록에서 더보기 버튼을 누르거나 방을 길게 눌러 자주 쓰는 채팅방을 위에 고정할 수 있습니다.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
