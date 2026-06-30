import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface NotificationSettings {
  newPost: boolean;
  comment: boolean;
  tradeRequest: boolean;
  tradeAccepted: boolean;
  marketing: boolean;
}

export default function NotificationSettingsScreen({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<NotificationSettings>({
    newPost: true,
    comment: true,
    tradeRequest: true,
    tradeAccepted: true,
    marketing: false,
  });

  useEffect(() => {
    // localStorage에서 알림 설정 불러오기
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleToggle = (key: keyof NotificationSettings) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };
    setSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  const settingItems = [
    { key: 'newPost' as const, label: '새 게시글 알림', description: '내 지역에 새 게시글이 올라올 때' },
    { key: 'comment' as const, label: '댓글 알림', description: '내 게시글에 댓글이 달릴 때' },
    { key: 'tradeRequest' as const, label: '거래 요청 알림', description: '거래 요청을 받았을 때' },
    { key: 'tradeAccepted' as const, label: '거래 수락 알림', description: '내 거래 요청이 수락되었을 때' },
    { key: 'marketing' as const, label: '마케팅 알림', description: '이벤트 및 프로모션 정보' },
  ];

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          알림 설정
        </h1>
        <div className="w-6" /> {/* 균형을 위한 빈 공간 */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#f7fafc]">
        <div className="bg-white mt-2">
          {settingItems.map((item, index) => (
            <div
              key={item.key}
              className={`px-5 py-4 ${index !== settingItems.length - 1 ? 'border-b border-[#e2e8f0]' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-[#2d3748] mb-1" style={{ fontWeight: 500 }}>
                    {item.label}
                  </h3>
                  <p className="text-sm text-[#718096]">{item.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(item.key)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings[item.key] ? 'bg-[#bef264]' : 'bg-[#e2e8f0]'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                      settings[item.key] ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 px-5">
          <div className="bg-[#fffbeb] border border-[#fde68a] rounded-2xl p-4">
            <p className="text-sm text-[#92400e]">
              💡 알림은 브라우저 설정에서도 허용되어야 합니다. 브라우저 설정에서 알림을 차단한 경우 알림을 받을 수 없습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
