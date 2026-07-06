import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { API_ENDPOINTS, apiRequest } from '../../api/config';

interface BadgesScreenProps {
  onClose: () => void;
}

interface BadgeResponse {
  badgeId: string;
  name: string;
  description: string;
  currentValue: number;
  targetValue: number;
  achieved: boolean;
  progress: number;
}

interface BadgeSummaryResponse {
  totalCount: number;
  achievedCount: number;
  badges: BadgeResponse[];
}

const BADGE_EMOJIS: Record<string, string> = {
  FIRST_POST: '📝',
  POST_EXPLORER: '🔎',
  ACTIVE_POSTER: '📣',
  POST_MASTER: '🖋️',
  SHARING_STARTER: '🥬',
  SHARING_KEEPER: '🤝',
  SHARING_HERO: '💚',
  SALE_STARTER: '🛒',
  SALE_REGULAR: '💰',
  GROUP_BUY_HOST: '🧺',
  GROUP_BUY_LEADER: '👥',
  TRADE_FINISHER: '✅',
  TRADE_FRIEND: '🤗',
  TRADE_REGULAR: '🔁',
  TRADE_EXPERT: '🎯',
  TRADE_MASTER: '🏆',
  FIRST_REVIEW: '💬',
  GOOD_NEIGHBOR: '😊',
  TRUSTED_REVIEW: '📌',
  REVIEW_STAR: '🌟',
  KIND_NEIGHBOR: '✨',
  MANNER_PRO: '🙌',
  TOP_RATED: '⭐',
  PERFECT_MANNER: '💯',
  FRESH_START: '🌿',
  FRESH_TRUST: '🌱',
  FRESH_MODEL: '💎',
  FRESH_LEGEND: '👑',
  COMMENT_STARTER: '💭',
  COMMUNITY_HELPER: '🗣️',
  FAVORITE_STARTER: '💚',
  FAVORITE_COLLECTOR: '📚',
  POPULAR_POST: '🔥',
  HOT_POST_OWNER: '🚀',
  LOW_RISK_KEEPER: '🛡️',
};

export default function BadgesScreen({ onClose }: BadgesScreenProps) {
  const [summary, setSummary] = useState<BadgeSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let alive = true;

    const loadBadges = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await apiRequest(API_ENDPOINTS.myBadges, { method: 'GET' });
        const data = response?.data ?? response;
        if (!alive) return;
        setSummary({
          totalCount: Number(data?.totalCount ?? data?.badges?.length ?? 0),
          achievedCount: Number(data?.achievedCount ?? 0),
          badges: Array.isArray(data?.badges) ? data.badges : [],
        });
      } catch (error: any) {
        if (!alive) return;
        setErrorMessage(error?.message || '매너 뱃지를 불러오지 못했습니다.');
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    loadBadges();

    return () => {
      alive = false;
    };
  }, []);

  const badges = summary?.badges ?? [];
  const achievedBadges = useMemo(() => badges.filter((badge) => badge.achieved), [badges]);
  const inProgressBadges = useMemo(() => badges.filter((badge) => !badge.achieved), [badges]);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]" aria-label="닫기">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          매너 뱃지
        </h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f7fafc]">
        <div className="bg-white px-5 py-6 mb-2">
          <div className="bg-gradient-to-r from-[#fef3c7] to-[#fde68a] border border-[#fbbf24] rounded-2xl p-4 text-center">
            <p className="text-sm text-[#92400e] mb-2" style={{ fontWeight: 600 }}>
              획득한 뱃지
            </p>
            <p className="text-4xl text-[#92400e] mb-1" style={{ fontWeight: 700 }}>
              {summary?.achievedCount ?? 0}
            </p>
            <p className="text-xs text-[#92400e]">
              총 {summary?.totalCount ?? 0}개 중
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#718096]">
            <Loader2 className="animate-spin mb-3" size={28} />
            <p className="text-sm">매너 뱃지를 불러오는 중입니다</p>
          </div>
        ) : errorMessage ? (
          <div className="mx-5 mt-5 bg-[#fff5f5] border border-[#fed7d7] rounded-2xl p-4 flex gap-3 text-[#c53030]">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">{errorMessage}</p>
          </div>
        ) : (
          <>
            <div className="bg-white px-5 py-4 mb-2">
              <h2 className="text-sm text-[#718096] mb-4" style={{ fontWeight: 600 }}>
                획득한 뱃지
              </h2>

              {achievedBadges.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-[#a0aec0]">아직 획득한 뱃지가 없습니다</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {achievedBadges.map((badge) => (
                    <div
                      key={badge.badgeId}
                      className="bg-gradient-to-br from-[#fef3c7] to-[#fde68a] border-2 border-[#fbbf24] rounded-2xl p-4 text-center"
                    >
                      <div className="text-4xl mb-2">{getBadgeEmoji(badge.badgeId)}</div>
                      <h3 className="text-sm text-[#92400e] mb-1" style={{ fontWeight: 700 }}>
                        {badge.name}
                      </h3>
                      <p className="text-xs text-[#92400e] mb-2 leading-relaxed">{badge.description}</p>
                      <div className="inline-flex items-center gap-1 text-xs text-[#a16207]">
                        <CheckCircle2 size={13} />
                        달성 완료
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white px-5 py-4">
              <h2 className="text-sm text-[#718096] mb-4" style={{ fontWeight: 600 }}>
                도전 중인 뱃지
              </h2>

              <div className="space-y-3">
                {inProgressBadges.map((badge) => {
                  const percent = Math.round(Math.min(Math.max(badge.progress, 0), 1) * 100);

                  return (
                    <div
                      key={badge.badgeId}
                      className="bg-[#f7fafc] border border-[#e2e8f0] rounded-2xl p-4"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-3xl grayscale opacity-60">{getBadgeEmoji(badge.badgeId)}</div>
                        <div className="flex-1">
                          <h3 className="text-sm text-[#2d3748] mb-1" style={{ fontWeight: 600 }}>
                            {badge.name}
                          </h3>
                          <p className="text-xs text-[#718096] mb-1 leading-relaxed">{badge.description}</p>
                          <p className="text-xs text-[#a0aec0]">
                            {formatValue(badge.currentValue)} / {formatValue(badge.targetValue)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#718096]">진행률</span>
                          <span className="text-xs text-[#2d3748]" style={{ fontWeight: 600 }}>
                            {percent}%
                          </span>
                        </div>
                        <div className="h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#bef264] to-[#84cc16] rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-6">
              <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4">
                <p className="text-sm text-[#1e3a8a] leading-relaxed">
                  매너 뱃지는 게시글 작성, 나눔, 공동구매, 거래 완료, 리뷰 평점, 신선도 점수를 기준으로 자동 반영됩니다.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getBadgeEmoji(badgeId: string): string {
  return BADGE_EMOJIS[badgeId] || '🏅';
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

