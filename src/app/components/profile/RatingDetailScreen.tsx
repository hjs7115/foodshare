import { X, Star, Leaf } from 'lucide-react';

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
  // 임시 데이터
  const overallRating = 4.5;
  const totalReviews = 23;

  const ratingDistribution = [
    { stars: 5, count: 15, percentage: 65 },
    { stars: 4, count: 6, percentage: 26 },
    { stars: 3, count: 2, percentage: 9 },
    { stars: 2, count: 0, percentage: 0 },
    { stars: 1, count: 0, percentage: 0 },
  ];

  const reviews: Review[] = [
    {
      id: 1,
      reviewer: '감자사랑',
      rating: 5,
      comment: '신선한 채소 나눔해주셔서 감사합니다! 너무 좋았어요 :)',
      date: '2024-01-15',
      type: '나눔',
    },
    {
      id: 2,
      reviewer: '건강지킴이',
      rating: 5,
      comment: '빠른 응답과 친절한 거래 감사합니다!',
      date: '2024-01-10',
      type: '판매',
    },
    {
      id: 3,
      reviewer: '요리왕',
      rating: 4,
      comment: '공동구매 잘 진행해주셨어요. 다음에도 참여하고 싶습니다.',
      date: '2024-01-05',
      type: '공동구매',
    },
  ];

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          신선도 평가 상세
        </h1>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#f7fafc]">
        {/* Overall Rating */}
        <div className="bg-white px-5 py-6 mb-2">
          <div className="flex items-center justify-center mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Leaf size={32} className="text-[#16a34a] fill-[#16a34a]" />
                <span className="text-5xl text-[#2d3748]" style={{ fontWeight: 700 }}>
                  {Math.round(overallRating * 20)}%
                </span>
              </div>
              <p className="text-sm text-[#718096]">
                총 {totalReviews}개의 평가
              </p>
            </div>
          </div>

          {/* Rating Distribution */}
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

        {/* Reviews List */}
        <div className="bg-white px-5 py-4">
          <h2 className="text-sm text-[#718096] mb-4" style={{ fontWeight: 600 }}>
            받은 평가
          </h2>

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
        </div>

        <div className="px-5 py-6">
          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4">
            <p className="text-sm text-[#1e3a8a]">
              💡 신선도는 거래를 완료한 사용자들이 남긴 평가를 기반으로 산출됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
