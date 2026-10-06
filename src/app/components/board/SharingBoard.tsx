import { useState, useEffect } from 'react';
import { Bell, ArrowUpDown, MapPin, MessageCircle, Heart, Snowflake, ShoppingCart, User, Leaf } from 'lucide-react';
import CreatePostScreen from './CreatePostScreen';
import BoardSwitchModal from './BoardSwitchModal';
import PostDetailScreen from './PostDetailScreen';
import LocationSettingsScreen from '../profile/LocationSettingsScreen';
import BackendImage from '../common/BackendImage';
import NotificationsScreen from '../common/NotificationsScreen';
import BottomNavIcon from '../common/BottomNavIcon';
import { API_ENDPOINTS, apiRequest, buildPostsUrl, getNotifications, resolveImageUrl } from '../../api/config';

interface FoodItem {
  id: number;
  tradeType: TradeType;
  emoji: string;
  name: string;
  amount: string;
  price: string;
  distance: string;
  distanceValue?: number;
  tradeLocation?: string;
  expiry: string;
  image: string;
  createdAt?: string;
  priceValue?: number;
  rating?: number;
  freshness?: number;
  freshnessLevel?: string;
  freshnessIcon?: string;
  freshnessLabel?: string;
  commentCount?: number;
  favoriteCount?: number;
}

type SortType = 'latest' | 'expiry' | 'rating' | 'distance' | 'price';
type TradeType = 'ALL' | 'SHARE' | 'SALE' | 'BUY';

const TRADE_FILTERS: { value: TradeType; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'SHARE', label: '나눔' },
  { value: 'SALE', label: '판매' },
  { value: 'BUY', label: '구매' },
];

export default function SharingBoard({
  onSwitchBoard,
  onNavigate,
  chatUnreadCount = 0,
}: {
  onSwitchBoard: (board: string) => void;
  onNavigate: (screen: string) => void;
  chatUnreadCount?: number;
}) {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showBoardSwitch, setShowBoardSwitch] = useState(false);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState('위치를 설정해주세요');
  const [sortType, setSortType] = useState<SortType>('latest');
  const [tradeType, setTradeType] = useState<TradeType>('ALL');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
  const [showRadiusFilter, setShowRadiusFilter] = useState(false);

  // 위치 정보 불러오기
  useEffect(() => {
    loadLocation();
    loadUnreadNotifications();
  }, []);

  // 서버에서 게시글 목록 불러오기
  // 정렬 타입 변경 시 재정렬
  useEffect(() => {
    if (foodItems.length > 0) {
      setFoodItems(sortPosts(foodItems));
    }
  }, [sortType]);

  // 반경 필터 변경 시 새로고침
  useEffect(() => {
    loadPosts();
  }, [radiusKm, tradeType]);

  const loadLocation = () => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      setLocation(savedLocation);
    }
  };

  const getNotificationItems = (response: any): any[] => {
    const candidates = [
      response?.notifications,
      response?.data?.notifications,
      response?.data?.content,
      response?.data?.items,
      response?.content,
      response?.items,
      response?.data,
      response,
    ];

    return candidates.find(Array.isArray) || [];
  };

  const isUnreadNotification = (notification: any) => !(
    notification.isRead ||
    notification.read ||
    notification.readAt ||
    notification.status === 'READ'
  );

  const loadUnreadNotifications = async () => {
    try {
      const response = await getNotifications(0, 10);
      setHasUnreadNotifications(getNotificationItems(response).some(isUnreadNotification));
    } catch (error) {
      console.warn('읽지 않은 알림 조회에 실패했습니다.', error);
      setHasUnreadNotifications(false);
    }
  };

  const getPostQueryParams = () => {
    const savedCoords = localStorage.getItem('userLocationCoords');
    const params: any = { radiusKm };

    if (!savedCoords) return params;

    try {
      const coords = JSON.parse(savedCoords);
      if (typeof coords.lat === 'number' && typeof coords.lng === 'number') {
        params.lat = coords.lat;
        params.lng = coords.lng;
      }
    } catch {
      localStorage.removeItem('userLocationCoords');
    }

    return params;
  };

  const loadPosts = async () => {
    setIsLoading(true);

    try {
      const response = await apiRequest(buildPostsUrl(getPostQueryParams()), { method: 'GET' });
      const serverPosts = response.posts || response.data?.posts || response.data || response || [];
      const allPosts = Array.isArray(serverPosts) ? serverPosts : [];

      let filteredPosts = allPosts
        .filter((post: any) => ['SHARE', 'SALE', 'BUY', '나눔', '판매', '구매'].includes(post.postType || post.type || post.category))
        .filter((post: any) => {
          if (tradeType === 'ALL') return true;
          return getTradeType(post) === tradeType;
        })
        .map((post: any) => {
          const distanceValue = getDistanceValue(post);
          const postType = getTradeType(post);
          return {
            id: post.id,
            tradeType: postType,
            emoji: post.emoji || '🥬',
            name: post.title || post.name,
            amount: post.amount || '수량 미정',
            price: post.price || (postType === 'SHARE' ? '무료나눔' : postType === 'BUY' ? '희망가 협의' : '가격미정'),
            distance: post.distance || `${distanceValue.toFixed(1)}km`,
            distanceValue,
            tradeLocation: getPostLocation(post),
            expiry: post.expiry || '유통기한 정보 없음',
            image: resolveImageUrl(post.image || post.imageUrl),
            createdAt: post.createdAt || new Date().toISOString(),
            priceValue: postType === 'SHARE' ? 0 : parseInt(String(post.price || '').replace(/[^0-9]/g, '') || '999999'),
            rating: post.rating ?? 0,
            freshness: Number(post.freshness ?? 50),
            freshnessLevel: post.freshnessLevel || '',
            freshnessIcon: post.freshnessIcon || '🌱',
            freshnessLabel: getFreshnessLabel(Number(post.freshness ?? 50)),
            commentCount: getCountValue(post, ['commentCount', 'commentsCount', 'replyCount', 'commentCnt']),
            favoriteCount: getCountValue(post, ['favoriteCount', 'favoritesCount', 'likeCount', 'likesCount', 'heartCount', 'wishCount']),
          };
        });

      filteredPosts = filteredPosts.filter((post: any) => post.distanceValue <= radiusKm);
      filteredPosts = sortPosts(filteredPosts);
      setFoodItems(filteredPosts);
    } catch (error) {
      console.warn('게시글 서버 조회에 실패했습니다.', error);
      setFoodItems([]);
    } finally {
      setIsLoading(false);
    }
  };
  const sortPosts = (posts: any[]) => {
    const sorted = [...posts];

    switch (sortType) {
      case 'latest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      case 'expiry':
        // 유통기한 정보에서 숫자 추출 (예: "3일 남음" -> 3)
        return sorted.sort((a, b) => {
          const daysA = parseInt(a.expiry.match(/\d+/)?.[0] || '999');
          const daysB = parseInt(b.expiry.match(/\d+/)?.[0] || '999');
          return daysA - daysB;
        });

      case 'rating':
        return sorted.sort((a, b) => (b.freshness || 0) - (a.freshness || 0));

      case 'distance':
        // 거리에서 숫자 추출 (예: "0.5km" -> 0.5)
        return sorted.sort((a, b) => {
          const distA = parseFloat(a.distance.replace(/[^0-9.]/g, ''));
          const distB = parseFloat(b.distance.replace(/[^0-9.]/g, ''));
          return distA - distB;
        });

      case 'price':
        return sorted.sort((a, b) => a.priceValue - b.priceValue);

      default:
        return sorted;
    }
  };

  const getDistanceValue = (post: any) => {
    if (typeof post.distanceValue === 'number') return post.distanceValue;
    const parsedDistance = parseFloat(String(post.distance || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsedDistance) ? parsedDistance : 0.5;
  };

  const getTradeType = (post: any): TradeType => {
    const rawType = post.postType || post.type || post.category;
    if (rawType === 'SHARE' || rawType === '나눔') return 'SHARE';
    if (rawType === 'SALE' || rawType === '판매') return 'SALE';
    if (rawType === 'BUY' || rawType === '구매') return 'BUY';
    return 'SALE';
  };

  const getPostLocation = (post: any): string => (
    post.tradeLocation ||
    post.address ||
    post.location ||
    post.user?.address ||
    post.author?.address ||
    post.writer?.address ||
    post.member?.address ||
    ''
  );

  const getNeighborhood = (address?: string): string => {
    if (!address) return '';

    const parts = address
      .replace(/\([^)]*\)/g, ' ')
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    const neighborhood = [...parts].reverse().find((part) => /[가-힣0-9]+(동|읍|면|리)$/.test(part));
    return neighborhood || parts[parts.length - 1] || '';
  };

  const formatDistance = (item: FoodItem): string => {
    const distanceValue = typeof item.distanceValue === 'number'
      ? item.distanceValue
      : parseFloat(String(item.distance || '').replace(/[^0-9.]/g, ''));

    if (Number.isFinite(distanceValue)) {
      if (distanceValue < 1) {
        return `${Math.round(distanceValue * 1000)}m`;
      }

      return `${Number.isInteger(distanceValue) ? distanceValue : distanceValue.toFixed(1)}km`;
    }

    return item.distance;
  };

  const getCountValue = (post: any, keys: string[]) => {
    for (const key of keys) {
      const value = post[key];
      if (value !== undefined && value !== null && value !== '') {
        const count = Number(value);
        return Number.isFinite(count) ? count : 0;
      }
    }

    return 0;
  };

  const formatKoreanDate = (value?: string): string => {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatExpiry = (value?: string): string => {
    if (!value) return '';

    const expiresInDays = value.match(/expires?\s+in\s+(\d+)\s+days?/i);
    if (expiresInDays) {
      return `${expiresInDays[1]}일 남음`;
    }

    const daysLeft = value.match(/(\d+)\s*days?\s+left/i);
    if (daysLeft) {
      return `${daysLeft[1]}일 남음`;
    }

    return formatKoreanDate(value);
  };

  const handleCreatePost = (newItem: FoodItem) => {
    setFoodItems((prevItems) => sortPosts([...prevItems, newItem]));
    setShowCreatePost(false);
  };

  return (
    <div className="bg-[#f7fafc] size-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#f0fdf4] to-[#bef264] border-b-2 border-[#bef264] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#e2e8f0]">
            <Leaf size={22} className="text-[#65a30d]" />
          </div>
          <div>
            <h1 className="text-lg text-[#1a202c]" style={{ fontWeight: 800 }}>시장</h1>
            <p className="text-xs text-[#365314]">이웃과 식재료를 나누고 거래해요</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLocationSettings(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-[#2d3748] shadow-sm transition-colors hover:border-[#bef264]"
            aria-label="위치 설정"
            title={location}
          >
            <MapPin size={20} className="text-[#65a30d]" />
          </button>
          <button onClick={() => setShowNotifications(true)} className="text-[#2d3748] relative" aria-label="알림 열기">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#e2e8f0] hover:border-[#bef264] transition-colors">
              <Bell size={20} />
            </div>
            {hasUnreadNotifications && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-[#ef4444] rounded-full border-2 border-white" />
            )}
          </button>
        </div>
      </div>

      {/* Sort Options */}
      <div className="px-5 py-3 bg-white border-b border-[#e2e8f0]">
        <div className="mb-3 grid grid-cols-4 rounded-full bg-[#f1f5f9] p-1">
          {TRADE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setTradeType(filter.value)}
              className={`rounded-full px-2 py-2 text-sm transition-colors ${
                tradeType === filter.value
                  ? 'bg-white text-[#1a202c] shadow-sm'
                  : 'text-[#718096] hover:text-[#2d3748]'
              }`}
              style={{ fontWeight: tradeType === filter.value ? 800 : 600 }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setShowSortMenu(!showSortMenu);
                setShowRadiusFilter(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#f7fafc] border border-[#e2e8f0] rounded-full hover:border-[#bef264] transition-colors"
            >
              <ArrowUpDown size={16} className="text-[#718096]" />
              <span className="text-sm text-[#2d3748]" style={{ fontWeight: 500 }}>
                {sortType === 'latest' && '최신순'}
                {sortType === 'expiry' && '유통기한 임박순'}
                {sortType === 'rating' && '신선도 높은순'}
                {sortType === 'distance' && '가까운 거리순'}
                {sortType === 'price' && '가격 낮은순'}
              </span>
            </button>

            {showSortMenu && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-[#e2e8f0] rounded-2xl shadow-lg py-2 z-10 min-w-[180px]">
                <button
                  onClick={() => {
                    setSortType('latest');
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[#f7fafc] transition-colors ${sortType === 'latest' ? 'text-[#65a30d] bg-[#f0fdf4]' : 'text-[#2d3748]'}`}
                  style={{ fontWeight: sortType === 'latest' ? 600 : 400 }}
                >
                  최신순
                </button>
                <button
                  onClick={() => {
                    setSortType('expiry');
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[#f7fafc] transition-colors ${sortType === 'expiry' ? 'text-[#65a30d] bg-[#f0fdf4]' : 'text-[#2d3748]'}`}
                  style={{ fontWeight: sortType === 'expiry' ? 600 : 400 }}
                >
                  유통기한 임박순
                </button>
                <button
                  onClick={() => {
                    setSortType('rating');
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[#f7fafc] transition-colors ${sortType === 'rating' ? 'text-[#65a30d] bg-[#f0fdf4]' : 'text-[#2d3748]'}`}
                  style={{ fontWeight: sortType === 'rating' ? 600 : 400 }}
                >
                  신선도 높은순
                </button>
                <button
                  onClick={() => {
                    setSortType('distance');
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[#f7fafc] transition-colors ${sortType === 'distance' ? 'text-[#65a30d] bg-[#f0fdf4]' : 'text-[#2d3748]'}`}
                  style={{ fontWeight: sortType === 'distance' ? 600 : 400 }}
                >
                  가까운 거리순
                </button>
                <button
                  onClick={() => {
                    setSortType('price');
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[#f7fafc] transition-colors ${sortType === 'price' ? 'text-[#65a30d] bg-[#f0fdf4]' : 'text-[#2d3748]'}`}
                  style={{ fontWeight: sortType === 'price' ? 600 : 400 }}
                >
                  가격 낮은순
                </button>
              </div>
            )}
          </div>

          {/* Radius Filter */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setShowRadiusFilter(!showRadiusFilter);
                setShowSortMenu(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#f7fafc] border border-[#e2e8f0] rounded-full hover:border-[#bef264] transition-colors whitespace-nowrap"
            >
              <MapPin size={16} className="text-[#718096]" />
              <span className="text-sm text-[#2d3748]" style={{ fontWeight: 500 }}>
                {radiusKm}km
              </span>
            </button>

            {showRadiusFilter && (
              <div className="absolute left-1/2 top-full z-20 mt-2 w-[min(280px,calc(100vw-2.5rem))] -translate-x-1/2 rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-lg">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#718096]">검색 반경</span>
                    <span className="text-lg text-[#65a30d]" style={{ fontWeight: 700 }}>
                      {radiusKm}km
                    </span>
                  </div>
                  <p className="text-xs text-[#a0aec0]">
                    설정한 거리 이내의 게시글만 표시합니다.
                  </p>
                </div>

                {/* Slider */}
                <div className="py-4">
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#e2e8f0] rounded-full appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #bef264 0%, #bef264 ${((radiusKm - 0.5) / (10 - 0.5)) * 100}%, #e2e8f0 ${((radiusKm - 0.5) / (10 - 0.5)) * 100}%, #e2e8f0 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-[#a0aec0] mt-2">
                    <span>500m</span>
                    <span>10km</span>
                  </div>
                </div>

                {/* Quick Select */}
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 5].map((km) => (
                    <button
                      key={km}
                      onClick={() => setRadiusKm(km)}
                      className={`py-1.5 rounded-lg text-xs transition-colors ${
                        radiusKm === km
                          ? 'bg-[#bef264] text-[#0a0a0a]'
                          : 'bg-[#f7fafc] text-[#718096] hover:bg-[#e2e8f0]'
                      }`}
                      style={{ fontWeight: radiusKm === km ? 600 : 400 }}
                    >
                      {km}km
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Food Items List */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-28">
        {foodItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="mb-6 flex h-32 w-32 items-center justify-center">
              <Leaf size={78} strokeWidth={2.35} className="text-[#65a30d]" />
            </div>
            <p className="text-xl text-[#2d3748] mb-2" style={{ fontWeight: 600 }}>
              아직 표시할 식재료가 없어요
            </p>
            <p className="text-sm text-[#718096] mb-6">
              냉장고에 남은 신선한 식재료를<br />이웃과 나눠보세요
            </p>
            <button
              onClick={() => setShowCreatePost(true)}
              className="bg-gradient-to-r from-[#bef264] to-[#a3e635] text-[#0a0a0a] px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all"
              style={{ fontWeight: 600 }}
            >
              첫 게시글 작성하기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {foodItems.map((item) => {
              const isFree = item.tradeType === 'SHARE' || item.price === '무료나눔' || item.price === 'Free' || item.price === 0;
              const isBuying = item.tradeType === 'BUY';
              const neighborhood = getNeighborhood(item.tradeLocation);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedPostId(item.id);
                    setShowPostDetail(true);
                  }}
                  className="w-full bg-white rounded-2xl border-2 border-[#e2e8f0] p-4 flex items-start justify-between shadow-sm hover:border-[#bef264] hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
                        {item.emoji} {item.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {isBuying ? (
                        <span className="inline-block bg-gradient-to-r from-[#fde68a] to-[#fbbf24] text-[#92400e] px-3 py-1 rounded-full text-xs" style={{ fontWeight: 700 }}>
                          구매희망
                        </span>
                      ) : isFree ? (
                        <span className="inline-block bg-gradient-to-r from-[#86efac] to-[#bef264] text-[#0a0a0a] px-3 py-1 rounded-full text-xs" style={{ fontWeight: 700 }}>
                          무료나눔
                        </span>
                      ) : (
                        <span className="inline-block bg-gradient-to-r from-[#93c5fd] to-[#bfdbfe] text-[#1e40af] px-3 py-1 rounded-full text-xs" style={{ fontWeight: 700 }}>
                          {item.price}
                        </span>
                      )}
                      <span className="text-xs text-[#718096] bg-[#f7fafc] px-2 py-1 rounded-full">
                        {item.amount}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-[#718096]">
                      <span className="flex items-center gap-1 text-[#16a34a]" style={{ fontWeight: 600 }}>
                        <span>{item.freshnessIcon || '🌱'}</span>
                        <span>신선도 {Math.round(item.freshness ?? 50)}% · {stripFreshnessIcon(item.freshnessLabel || '')}</span>
                      </span>
                      <span>·</span>
                      {neighborhood && (
                        <>
                          <span>{neighborhood}</span>
                          <span>·</span>
                        </>
                      )}
                      <span>{formatDistance(item)}</span>
                      <span>·</span>
                      <span>{formatExpiry(item.expiry)}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-[#a0aec0]">
                        <MessageCircle size={15} className="text-[#a0aec0]" />
                        <span style={{ fontWeight: 600 }}>{item.commentCount || 0}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-[#a0aec0]">
                        <Heart size={15} className="text-[#a0aec0]" />
                        <span style={{ fontWeight: 600 }}>{item.favoriteCount || 0}</span>
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7] overflow-hidden border-2 border-[#bef264] shadow-sm">
                      <BackendImage
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowCreatePost(true)}
        className="fixed bottom-24 right-5 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-[#bef264] text-[#0a0a0a] shadow-lg hover:bg-[#a3e635] transition-colors"
        aria-label="게시글 작성"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-3 py-4 grid grid-cols-5 z-40">
        <button onClick={() => onSwitchBoard('시장')} className="flex flex-col items-center gap-1">
          <BottomNavIcon icon={Leaf} color="#65a30d" borderColor="#bef264" />
          <span className="text-[11px] text-[#bef264]">시장</span>
        </button>
        <button onClick={() => onSwitchBoard('공동구매')} className="flex flex-col items-center gap-1">
          <BottomNavIcon icon={ShoppingCart} color="#f59e0b" borderColor="#fbbf24" />
          <span className="text-[11px] text-[#fbbf24]">공동구매</span>
        </button>
        <button onClick={() => onNavigate('chat')} className="relative flex flex-col items-center gap-1">
          <span className="relative">
            <BottomNavIcon icon={MessageCircle} color="#14b8a6" borderColor="#99f6e4" />
            {chatUnreadCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] leading-none text-white">
                {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
              </span>
            )}
          </span>
          <span className="text-[11px] text-[#14b8a6]">채팅</span>
        </button>
        <button onClick={() => onNavigate('fridge')} className="flex flex-col items-center gap-1">
          <BottomNavIcon icon={Snowflake} color="#0284c7" borderColor="#bae6fd" />
          <span className="text-[11px] text-[#0284c7]">냉장고</span>
        </button>
        <button onClick={() => onNavigate('profile')} className="flex flex-col items-center gap-1">
          <BottomNavIcon icon={User} color="#2d3748" borderColor="#cbd5e0" />
          <span className="text-[11px] text-[#2d3748]">내정보</span>
        </button>
      </div>

      {showCreatePost && (
        <CreatePostScreen
          currentBoard="시장"
          onClose={() => setShowCreatePost(false)}
          onCreatePost={handleCreatePost}
        />
      )}

      {showBoardSwitch && (
        <BoardSwitchModal
          currentBoard="시장"
          onClose={() => setShowBoardSwitch(false)}
          onSelect={(board) => {
            setShowBoardSwitch(false);
            onSwitchBoard(board);
          }}
        />
      )}

      {showPostDetail && selectedPostId && (
        <PostDetailScreen
          postId={selectedPostId}
          onClose={() => {
            setShowPostDetail(false);
            setSelectedPostId(null);
            loadPosts(); // 댓글 추가 등 변경 사항이 있을 수 있어 새로고침
          }}
        />
      )}

      {showLocationSettings && (
        <LocationSettingsScreen
          onClose={() => {
            setShowLocationSettings(false);
            loadLocation();
          }}
        />
      )}

      {showNotifications && (
        <NotificationsScreen
          onClose={() => {
            setShowNotifications(false);
            loadUnreadNotifications();
          }}
          onOpenTradeHistory={() => onNavigate('tradeHistory')}
          onOpenPost={(postId) => {
            setSelectedPostId(postId);
            setShowPostDetail(true);
          }}
        />
      )}
    </div>
  );
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
