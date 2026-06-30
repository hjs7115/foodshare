import { X } from 'lucide-react';

interface BadgesScreenProps {
  onClose: () => void;
}

interface Badge {
  id: number;
  emoji: string;
  name: string;
  description: string;
  requirement: string;
  achieved: boolean;
  achievedDate?: string;
  progress?: number;
  total?: number;
}

export default function BadgesScreen({ onClose }: BadgesScreenProps) {
  const badges: Badge[] = [
    {
      id: 1,
      emoji: '🎁',
      name: '나눔 달인',
      description: '식재료를 10회 이상 나눔',
      requirement: '10회 나눔 완료',
      achieved: true,
      achievedDate: '2024-01-15',
      progress: 12,
      total: 10,
    },
    {
      id: 2,
      emoji: '⚡',
      name: '빠른 응답',
      description: '평균 5분 내 답장',
      requirement: '빠른 응답 유지',
      achieved: true,
      achievedDate: '2024-01-10',
    },
    {
      id: 3,
      emoji: '🌱',
      name: '신선도 지킴이',
      description: '신선도 평점 4.8 이상 유지',
      requirement: '평점 4.8 이상',
      achieved: false,
      progress: 4.5,
      total: 4.8,
    },
    {
      id: 4,
      emoji: '🤝',
      name: '친절왕',
      description: '좋은 평가 20개 이상 받기',
      requirement: '좋은 평가 20개',
      achieved: false,
      progress: 15,
      total: 20,
    },
    {
      id: 5,
      emoji: '🏆',
      name: '베테랑',
      description: '100회 이상 거래 완료',
      requirement: '100회 거래',
      achieved: false,
      progress: 25,
      total: 100,
    },
    {
      id: 6,
      emoji: '🌟',
      name: '첫 나눔',
      description: '첫 나눔 완료',
      requirement: '1회 나눔',
      achieved: true,
      achievedDate: '2023-12-01',
    },
    {
      id: 7,
      emoji: '💚',
      name: '환경지킴이',
      description: '식재료 낭비 방지 50회',
      requirement: '50회 달성',
      achieved: false,
      progress: 25,
      total: 50,
    },
    {
      id: 8,
      emoji: '📸',
      name: '사진작가',
      description: '사진과 함께 게시글 30개 작성',
      requirement: '사진 게시글 30개',
      achieved: false,
      progress: 12,
      total: 30,
    },
  ];

  const achievedBadges = badges.filter((b) => b.achieved);
  const inProgressBadges = badges.filter((b) => !b.achieved);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          매너 뱃지
        </h1>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#f7fafc]">
        {/* Summary */}
        <div className="bg-white px-5 py-6 mb-2">
          <div className="bg-gradient-to-r from-[#fef3c7] to-[#fde68a] border border-[#fbbf24] rounded-2xl p-4 text-center">
            <p className="text-sm text-[#92400e] mb-2" style={{ fontWeight: 600 }}>
              획득한 뱃지
            </p>
            <p className="text-4xl text-[#92400e] mb-1" style={{ fontWeight: 700 }}>
              {achievedBadges.length}
            </p>
            <p className="text-xs text-[#92400e]">
              총 {badges.length}개 중
            </p>
          </div>
        </div>

        {/* Achieved Badges */}
        <div className="bg-white px-5 py-4 mb-2">
          <h2 className="text-sm text-[#718096] mb-4" style={{ fontWeight: 600 }}>
            🏆 획득한 뱃지
          </h2>

          {achievedBadges.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-[#a0aec0]">아직 획득한 뱃지가 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {achievedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="bg-gradient-to-br from-[#fef3c7] to-[#fde68a] border-2 border-[#fbbf24] rounded-2xl p-4 text-center"
                >
                  <div className="text-4xl mb-2">{badge.emoji}</div>
                  <h3 className="text-sm text-[#92400e] mb-1" style={{ fontWeight: 700 }}>
                    {badge.name}
                  </h3>
                  <p className="text-xs text-[#92400e] mb-2">{badge.description}</p>
                  {badge.achievedDate && (
                    <p className="text-xs text-[#a16207]">
                      {new Date(badge.achievedDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* In Progress Badges */}
        <div className="bg-white px-5 py-4">
          <h2 className="text-sm text-[#718096] mb-4" style={{ fontWeight: 600 }}>
            🎯 도전 중인 뱃지
          </h2>

          <div className="space-y-3">
            {inProgressBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-[#f7fafc] border border-[#e2e8f0] rounded-2xl p-4"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl grayscale opacity-50">{badge.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-sm text-[#2d3748] mb-1" style={{ fontWeight: 600 }}>
                      {badge.name}
                    </h3>
                    <p className="text-xs text-[#718096] mb-1">{badge.description}</p>
                    <p className="text-xs text-[#a0aec0]">{badge.requirement}</p>
                  </div>
                </div>

                {badge.progress !== undefined && badge.total !== undefined && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#718096]">진행률</span>
                      <span className="text-xs text-[#2d3748]" style={{ fontWeight: 600 }}>
                        {badge.progress} / {badge.total}
                      </span>
                    </div>
                    <div className="h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#bef264] to-[#84cc16] rounded-full transition-all"
                        style={{ width: `${(badge.progress / badge.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-6">
          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4">
            <p className="text-sm text-[#1e3a8a]">
              💡 뱃지를 획득하면 프로필에 표시되어 다른 사용자들에게 신뢰를 줄 수 있습니다!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
