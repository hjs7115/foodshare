import { useEffect, useState } from 'react';
import { Bell, CheckCheck, MessageCircle, Pin, Trash2, X } from 'lucide-react';

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
      description: '새 메시지가 오면 푸시 알림으로 알려줍니다.',
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
      title: '정리한 채팅방 숨기기',
      description: '채팅방 나가기 기능이 연결되면 목록에서 숨깁니다.',
      enabled: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f7fafc]">
      <div className="flex items-center justify-between border-b-2 border-[#14b8a6] bg-gradient-to-r from-[#ccfbf1] to-[#14b8a6] px-5 py-4">
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e2e8f0] bg-white shadow-sm" aria-label="닫기">
          <X size={22} className="text-[#1a202c]" />
        </button>
        <div className="text-center">
          <h1 className="text-lg text-[#1a202c]" style={{ fontWeight: 800 }}>채팅 설정</h1>
          <p className="text-xs text-[#0f766e]">채팅방 표시와 알림을 관리해요</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <section className="rounded-2xl border border-[#99f6e4] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f0fdfa]">
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
                type="button"
                onClick={() => item.enabled && handleToggle(item.key)}
                disabled={!item.enabled}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
                    <item.icon size={20} className="text-[#14b8a6]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-[#1a202c]" style={{ fontWeight: 800 }}>{item.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-[#718096]">{item.description}</p>
                  </div>
                </div>
                <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${settings[item.key] ? 'bg-[#14b8a6]' : 'bg-[#cbd5e0]'}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${settings[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1f5f9]">
              <Pin size={20} className="text-[#475569]" />
            </div>
            <div>
              <h2 className="text-sm text-[#1a202c]" style={{ fontWeight: 800 }}>상단 고정</h2>
              <p className="mt-1 text-xs leading-5 text-[#718096]">
                채팅방 목록에서 핀 버튼을 누르거나 방을 길게 눌러 자주 쓰는 채팅방을 위에 고정할 수 있습니다.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
