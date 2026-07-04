import { X, Star, Leaf } from 'lucide-react';
import { getStoredUserInfo } from '../../auth/session';

interface RatingDetailScreenProps {
  onClose: () => void;
}

interface Review {
  id: number;
  reviewer: string;
  rating: number;
  comment: string;
  date: string;
  type: '나눔' | '판매' | '공동구매';
}

export default function RatingDetailScreen({ onClose }: RatingDetailScreenProps) {
  const userInfo = getStoredUserInfo<{ freshness?: number; freshnessLabel?: string }>();
  const freshnessPercent = getFreshnessPercent(userInfo?.freshness);
  const freshnessLabel = getFreshnessLabel(freshnessPercent);
  const totalReviews = 0;

  const freshnessLevels = [
    { min: 95, max: 100, range: '95~100%', label: '👑 전설 반띵러' },
    { min: 85, max: 94.9, range: '85~94.9%', label: '💎 모범 반띵러' },
    { min: 70, max: 84.9, range: '70~84.9%', label: '✨ 든든한 반띵러' },
    { min: 55, max: 69.9, range: '55~69.9%', label: '🌿 성장 반띵러' },
    { min: 40, max: 54.9, range: '40~54.9%', label: '🌱 일반 반띵러' },
    { min: 30, max: 39.9, range: '30~39.9%', label: '🍂 주의 반띵러' },
    { min: 20, max: 29.9, range: '20~29.9%', label: '⚠️ 위험 반띵러' },
    { min: 0, max: 19.9, range: '0~19.9%', label: '🤮 제한 반띵러' },
  ];

  const ratingDistribution = [
    { stars: 5, count: 0, percentage: 0 },
    { stars: 4, count: 0, percentage: 0 },
    { stars: 3, count: 0, percentage: 0 },
    { stars: 2, count: 0, percentage: 0 },
    { stars: 1, count: 0, percentage: 0 },
  ];

  const reviews: Review[] = [];

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          나의 신선도
        </h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f7fafc]">
        <div className="bg-white px-5 py-6 mb-2">
          <div className="flex items-center justify-center mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Leaf size={32} className="text-[#16a34a] fill-[#16a34a]" />
                <span className="text-5xl text-[#2d3748]" style={{ fontWeight: 700 }}>
                  {Math.round(freshnessPercent)}%
                </span>
              </div>
              <div className="inline-flex items-center rounded-full bg-[#dcfce7] px-3 py-1 text-sm text-[#16a34a] mb-2" style={{ fontWeight: 700 }}>
                신선도 {Math.round(freshnessPercent)}% · {stripFreshnessIcon(freshnessLabel)}
              </div>
              <p className="text-sm text-[#718096]">
                기본 신선도는 50%에서 시작합니다
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {ratingDistribution.map((dist) => (
              <div key={dist.stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <Star size={14} className="text-[#fbbf24] fill-[#fbbf24]" />
                  <span className="text-sm text-[#2d3748]">{dist.stars}</span>
                </div>
                <div className="flex-1 h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#bef264] rounded-full"
                    style={{ width: `${dist.percentage}%` }}
                  />
                </div>
                <span className="text-sm text-[#718096] w-8 text-right">
                  {dist.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white px-5 py-4 mb-2">
          <h2 className="text-sm text-[#718096] mb-4" style={{ fontWeight: 600 }}>
            신선도 등급 기준
          </h2>
          <div className="space-y-2">
            {freshnessLevels.map((level) => {
              const isCurrentLevel = freshnessPercent >= level.min && freshnessPercent <= level.max;

              return (
                <div
                  key={level.label}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                    isCurrentLevel
                      ? 'border-[#bef264] bg-[#f0fff4]'
                      : 'border-[#e2e8f0] bg-[#f7fafc]'
                  }`}
                >
                  <span className="text-sm text-[#2d3748]" style={{ fontWeight: isCurrentLevel ? 700 : 500 }}>
                    {level.label}
                  </span>
                  <span className="text-xs text-[#718096]">
                    {level.range}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white px-5 py-4">
          <h2 className="text-sm text-[#718096] mb-4" style={{ fontWeight: 600 }}>
            받은 평가
          </h2>

          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[#a0aec0]">아직 받은 평가가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="pb-4 border-b border-[#e2e8f0] last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#2d3748]" style={{ fontWeight: 600 }}>
                        {review.reviewer}
                      </span>
                      <span className="text-xs text-white bg-gradient-to-r from-[#86efac] to-[#bef264] px-2 py-0.5 rounded-full">
                        {review.type}
                      </span>
                    </div>
                    <span className="text-xs text-[#a0aec0]">
                      {new Date(review.date).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < review.rating
                            ? 'text-[#fbbf24] fill-[#fbbf24]'
                            : 'text-[#e2e8f0] fill-[#e2e8f0]'
                        }
                      />
                    ))}
                  </div>

                  <p className="text-sm text-[#2d3748]">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-6">
          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4">
            <p className="text-sm text-[#1e3a8a]">
              신선도는 거래를 완료한 사용자들의 평가를 기반으로 산출합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getFreshnessPercent(value?: number) {
  const numeric = Number(value ?? 50);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : 50;
}

function getFreshnessLabel(value: number) {
  if (value >= 95) return '👑 전설 반띵러';
  if (value >= 85) return '💎 모범 반띵러';
  if (value >= 70) return '✨ 든든한 반띵러';
  if (value >= 55) return '🌿 성장 반띵러';
  if (value >= 40) return '🌱 일반 반띵러';
  if (value >= 30) return '🍂 주의 반띵러';
  if (value >= 20) return '⚠️ 위험 반띵러';
  return '🤮 제한 반띵러';
}

function stripFreshnessIcon(label: string) {
  return label.replace(/^[^\w가-힣]+/u, '').trim();
}
