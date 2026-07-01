import { useState, useEffect } from 'react';
import { Bell, ArrowUpDown, MapPin } from 'lucide-react';
import CreatePostScreen from './CreatePostScreen';
import BoardSwitchModal from './BoardSwitchModal';
import PostDetailScreen from './PostDetailScreen';
import LocationSettingsScreen from '../profile/LocationSettingsScreen';
import BackendImage from '../common/BackendImage';
import { API_ENDPOINTS, apiRequest, buildPostsUrl, resolveImageUrl } from '../../api/config';

interface GroupItem {
  id: number;
  emoji: string;
  name: string;
  currentCount: number;
  targetCount: number;
  price: string;
  distance: string;
  distanceValue?: number;
  deadline: string;
  image: string;
  createdAt?: string;
  rating?: number;
}

type GroupSortType = 'latest' | 'deadline' | 'rating' | 'distance' | 'participation';

export default function GroupBuyingBoard({ onSwitchBoard, onNavigate }: { onSwitchBoard: (board: string) => void; onNavigate: (screen: string) => void }) {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showBoardSwitch, setShowBoardSwitch] = useState(false);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [groupItems, setGroupItems] = useState<GroupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState('위치를 설정해주세요');
  const [sortType, setSortType] = useState<GroupSortType>('latest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
  const [showRadiusFilter, setShowRadiusFilter] = useState(false);

  // ?꾩튂 ?뺣낫 遺덈윭?ㅺ린
  useEffect(() => {
    loadLocation();
  }, []);

  // ?쒕쾭?먯꽌 寃뚯떆湲 紐⑸줉 遺덈윭?ㅺ린
  useEffect(() => {
    loadPosts();
  }, []);

  // ?뺣젹 ???蹂寃????ъ젙??
  useEffect(() => {
    if (groupItems.length > 0) {
      setGroupItems(sortPosts(groupItems));
    }
  }, [sortType]);

  // 諛섍꼍 ?꾪꽣 蹂寃????щ줈??
  useEffect(() => {
    loadPosts();
  }, [radiusKm]);

  const loadLocation = () => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      setLocation(savedLocation);
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
        .filter((post: any) => (post.postType || post.type || post.category) === 'GROUP_BUY' || post.category === '공동구매')
        .map((post: any) => {
          const distanceValue = getDistanceValue(post);
          return {
            id: post.id,
            emoji: post.emoji || '🛒',
            name: post.title || post.name,
            currentCount: post.currentCount || 1,
            targetCount: post.targetCount || 5,
            price: `${post.amount || ''} / ${post.price || '가격미정'}`,
            distance: post.distance || `${distanceValue.toFixed(1)}km`,
            distanceValue,
            deadline: post.deadline || '마감일 미정',
            image: resolveImageUrl(post.image || post.imageUrl),
            createdAt: post.createdAt || new Date().toISOString(),
            rating: post.rating || 4.5,
          };
        });

      filteredPosts = filteredPosts.filter((post: any) => post.distanceValue <= radiusKm);
      filteredPosts = sortPosts(filteredPosts);
      setGroupItems(filteredPosts);
    } catch (error) {
      console.warn('공동구매 게시글 서버 조회에 실패했습니다.', error);
      setGroupItems([]);
    } finally {
      setIsLoading(false);
    }
  };
  const sortPosts = (posts: GroupItem[]) => {
    const sorted = [...posts];

    switch (sortType) {
      case 'latest':
        return sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      case 'deadline':
        // 留덇컧???뺣낫?먯꽌 ?レ옄 異붿텧 (?? "3???⑥쓬" -> 3)
        return sorted.sort((a, b) => {
          const daysA = parseInt(a.deadline.match(/\d+/)?.[0] || '999');
          const daysB = parseInt(b.deadline.match(/\d+/)?.[0] || '999');
          return daysA - daysB;
        });

      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));

      case 'distance':
        // 嫄곕━?먯꽌 ?レ옄 異붿텧 (?? "0.5km" -> 0.5)
        return sorted.sort((a, b) => {
          const distA = parseFloat(a.distance.replace(/[^0-9.]/g, ''));
          const distB = parseFloat(b.distance.replace(/[^0-9.]/g, ''));
          return distA - distB;
        });

      case 'participation':
        // 李몄뿬???믪???
        return sorted.sort((a, b) => {
          const rateA = (a.currentCount / a.targetCount) * 100;
          const rateB = (b.currentCount / b.targetCount) * 100;
          return rateB - rateA;
        });

      default:
        return sorted;
    }
  };

  const getDistanceValue = (post: any) => {
    if (typeof post.distanceValue === 'number') return post.distanceValue;
    const parsedDistance = parseFloat(String(post.distance || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsedDistance) ? parsedDistance : 0.5;
  };

  const handleCreatePost = (newItem: GroupItem) => {
    setGroupItems((prevItems) => sortPosts([...prevItems, newItem]));
    setShowCreatePost(false);
  };

  return (
    <div className="bg-[#f7fafc] size-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-white to-[#fef3c7] border-b-2 border-[#fbbf24] px-5 py-4 flex items-center justify-between">
        <button onClick={() => setShowLocationSettings(true)} className="text-left flex items-center gap-2 bg-white px-3 py-2 rounded-full shadow-sm border border-[#e2e8f0] hover:border-[#fbbf24] transition-colors max-w-[70%]">
          <span className="text-lg flex-shrink-0">📍</span>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-[#718096]">내 위치</div>
            <div className="text-sm text-[#2d3748] truncate" style={{ fontWeight: 600 }}>{location}</div>
          </div>
        </button>
        <button className="text-[#2d3748] relative">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#e2e8f0] hover:border-[#fbbf24] transition-colors">
            <Bell size={20} />
          </div>
          <div className="absolute top-0 right-0 w-2 h-2 bg-[#ef4444] rounded-full border-2 border-white"></div>
        </button>
      </div>

      {/* Sort Options */}
      <div className="px-5 py-3 bg-white border-b border-[#e2e8f0]">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <button
              onClick={() => {
                setShowSortMenu(!showSortMenu);
                setShowRadiusFilter(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#f7fafc] border border-[#e2e8f0] rounded-full hover:border-[#fbbf24] transition-colors"
            >
              <ArrowUpDown size={16} className="text-[#718096]" />
              <span className="text-sm text-[#2d3748]" style={{ fontWeight: 500 }}>
                {sortType === 'latest' && '최신순'}
                {sortType === 'deadline' && '마감 임박순'}
                {sortType === 'rating' && '신선도 높은순'}
                {sortType === 'distance' && '가까운 거리순'}
                {sortType === 'participation' && '참여율 높은순'}
              </span>
            </button>

            {showSortMenu && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-[#e2e8f0] rounded-2xl shadow-lg py-2 z-10 min-w-[180px]">
                <button
                  onClick={() => {
                    setSortType('latest');
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[#f7fafc] transition-colors ${sortType === 'latest' ? 'text-[#92400e] bg-[#fef3c7]' : 'text-[#2d3748]'}`}
                  style={{ fontWeight: sortType === 'latest' ? 600 : 400 }}
                >
                  최신순
                </button>
                <button
                  onClick={() => {
                    setSortType('deadline');
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[#f7fafc] transition-colors ${sortType === 'deadline' ? 'text-[#92400e] bg-[#fef3c7]' : 'text-[#2d3748]'}`}
                  style={{ fontWeight: sortType === 'deadline' ? 600 : 400 }}
                >
                  마감 임박순
                </button>
                <button
                  onClick={() => {
                    setSortType('rating');
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[#f7fafc] transition-colors ${sortType === 'rating' ? 'text-[#92400e] bg-[#fef3c7]' : 'text-[#2d3748]'}`}
                  style={{ fontWeight: sortType === 'rating' ? 600 : 400 }}
                >
                  신선도 높은순
                </button>
                <button
                  onClick={() => {
                    setSortType('distance');
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[#f7fafc] transition-colors ${sortType === 'distance' ? 'text-[#92400e] bg-[#fef3c7]' : 'text-[#2d3748]'}`}
                  style={{ fontWeight: sortType === 'distance' ? 600 : 400 }}
                >
                  가까운 거리순
                </button>
                <button
                  onClick={() => {
                    setSortType('participation');
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[#f7fafc] transition-colors ${sortType === 'participation' ? 'text-[#92400e] bg-[#fef3c7]' : 'text-[#2d3748]'}`}
                  style={{ fontWeight: sortType === 'participation' ? 600 : 400 }}
                >
                  참여율 높은순
                </button>
              </div>
            )}
          </div>

          {/* Radius Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setShowRadiusFilter(!showRadiusFilter);
                setShowSortMenu(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#f7fafc] border border-[#e2e8f0] rounded-full hover:border-[#fbbf24] transition-colors whitespace-nowrap"
            >
              <MapPin size={16} className="text-[#718096]" />
              <span className="text-sm text-[#2d3748]" style={{ fontWeight: 500 }}>
                {radiusKm}km
              </span>
            </button>

            {showRadiusFilter && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-[#e2e8f0] rounded-2xl shadow-lg p-4 z-10 w-[280px]">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#718096]">검색 반경</span>
                    <span className="text-lg text-[#f59e0b]" style={{ fontWeight: 700 }}>
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
                    className="w-full h-2 bg-[#e2e8f0] rounded-full appearance-none cursor-pointer slider slider-yellow"
                    style={{
                      background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${((radiusKm - 0.5) / (10 - 0.5)) * 100}%, #e2e8f0 ${((radiusKm - 0.5) / (10 - 0.5)) * 100}%, #e2e8f0 100%)`
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
                          ? 'bg-[#fbbf24] text-[#0a0a0a]'
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

      {/* Group Items List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
        {groupItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-32 h-32 bg-gradient-to-br from-[#fef3c7] to-[#fbbf24] rounded-full flex items-center justify-center mb-6 shadow-lg">
              <div className="text-6xl">🛒</div>
            </div>
            <p className="text-xl text-[#2d3748] mb-2" style={{ fontWeight: 600 }}>
              진행 중인 공동구매가 없어요
            </p>
            <p className="text-sm text-[#718096] mb-6">
              이웃과 함께 구매하면<br />더 저렴하게 살 수 있어요
            </p>
            <button
              onClick={() => setShowCreatePost(true)}
              className="bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-[#0a0a0a] px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all"
              style={{ fontWeight: 600 }}
            >
              공동구매 시작하기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {groupItems.map((item) => {
              const progress = (item.currentCount / item.targetCount) * 100;
              const isAlmostFull = progress >= 80;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedPostId(item.id);
                    setShowPostDetail(true);
                  }}
                  className="w-full bg-white rounded-2xl border-2 border-[#e2e8f0] p-4 flex items-start justify-between shadow-sm hover:border-[#fbbf24] hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
                        {item.emoji} {item.name}
                      </h3>
                    </div>

                    <div className="mb-2">
                      <span className="text-sm text-[#2d3748]" style={{ fontWeight: 600 }}>
                        {item.price}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#718096]">참여 현황</span>
                        <span className="text-xs" style={{ fontWeight: 600, color: isAlmostFull ? '#dc2626' : '#65a30d' }}>
                          {item.currentCount}/{item.targetCount}명
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isAlmostFull ? 'bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]' : 'bg-gradient-to-r from-[#bef264] to-[#84cc16]'}`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#718096]">
                      <span className="flex items-center gap-1">
                        <span className="text-[#16a34a]">?뱧</span> {item.distance}
                      </span>
                      <span className="text-[#cbd5e0]">|</span>
                      <span className="flex items-center gap-1">
                        <span className="text-[#dc2626]">⏰</span> {item.deadline}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#fef3c7] to-[#fde68a] overflow-hidden border-2 border-[#fbbf24] shadow-sm">
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-12 py-4 flex items-center justify-between z-40">
        <button onClick={() => setShowBoardSwitch(true)} className="flex flex-col items-center gap-1">
          <svg className="w-6 h-6 text-[#bef264]" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs text-[#bef264]">홈</span>
        </button>
        <button onClick={() => setShowCreatePost(true)} className="flex flex-col items-center gap-1">
          <svg className="w-6 h-6 text-[#2d3748]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs text-[#2d3748]">작성</span>
        </button>
        <button onClick={() => onNavigate('profile')} className="flex flex-col items-center gap-1">
          <svg className="w-6 h-6 text-[#2d3748]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs text-[#2d3748]">내정보</span>
        </button>
      </div>

      {showCreatePost && (
        <CreatePostScreen
          currentBoard="공동구매"
          onClose={() => setShowCreatePost(false)}
          onCreatePost={handleCreatePost}
        />
      )}

      {showBoardSwitch && (
        <BoardSwitchModal
          currentBoard="공동구매"
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
            loadPosts(); // ?볤? 異붽? ?깆쑝濡?蹂寃??ы빆???덉쓣 ???덉쑝誘濡??덈줈怨좎묠
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
    </div>
  );
}
