import { showToast } from '../../utils/feedback';
﻿import { useState, useEffect } from 'react';
import { X, Heart } from 'lucide-react';
import BackendImage from '../common/BackendImage';
import { API_ENDPOINTS, apiRequest, resolveImageUrl } from '../../api/config';

interface FavoritePost {
  id: number;
  title: string;
  price: string;
  image: string;
  createdAt: string;
  postType: string;
  status?: 'OPEN' | 'CLOSED';
}

export default function FavoritesScreen({ onClose }: { onClose: () => void }) {
  const [favorites, setFavorites] = useState<FavoritePost[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'share' | 'groupbuy'>('all');

  useEffect(() => {
    loadFavorites();
  }, []);

  const normalizeFavorite = (post: any): FavoritePost => ({
    id: post.id ?? post.postId,
    title: post.title || post.name || '',
    price: post.priceText || post.price || '가격미정',
    image: resolveImageUrl(post.image || post.imageUrl),
    createdAt: post.createdAt || new Date().toISOString(),
    postType: post.postType,
    status: post.status,
  });

  const extractFavorites = (response: any): any[] => {
    const rawFavorites = response.favorites || response.data?.favorites || response.data || response;
    return Array.isArray(rawFavorites) ? rawFavorites : [];
  };

  const loadFavorites = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.favorites, { method: 'GET' });
      setFavorites(extractFavorites(response).map(normalizeFavorite));
    } catch (error) {
      console.warn('관심 목록 서버 조회에 실패했습니다.', error);
      setFavorites([]);
    }
  };

  const removeFavorite = async (id: number) => {
    try {
      await apiRequest(API_ENDPOINTS.removeFavorite(id), { method: 'DELETE' });
      setFavorites((currentFavorites) => currentFavorites.filter((fav) => fav.id !== id));
    } catch (error: any) {
      showToast(error.message || '관심 목록 삭제에 실패했습니다.');
    }
  };

  const filteredFavorites = favorites.filter((fav) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'share') return fav.postType === 'SHARE' || fav.postType === 'SALE';
    if (activeTab === 'groupbuy') return fav.postType === 'GROUP_BUY';
    return true;
  });

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          관심 목록
        </h1>
        <div className="w-6" />
      </div>

      <div className="bg-white border-b border-[#e2e8f0] px-5 flex gap-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`py-3 px-2 border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-[#bef264] text-[#2d3748]'
              : 'border-transparent text-[#718096]'
          }`}
          style={{ fontWeight: activeTab === 'all' ? 600 : 400 }}
        >
          전체 ({favorites.length})
        </button>
        <button
          onClick={() => setActiveTab('share')}
          className={`py-3 px-2 border-b-2 transition-colors ${
            activeTab === 'share'
              ? 'border-[#bef264] text-[#2d3748]'
              : 'border-transparent text-[#718096]'
          }`}
          style={{ fontWeight: activeTab === 'share' ? 600 : 400 }}
        >
          나눔/판매
        </button>
        <button
          onClick={() => setActiveTab('groupbuy')}
          className={`py-3 px-2 border-b-2 transition-colors ${
            activeTab === 'groupbuy'
              ? 'border-[#bef264] text-[#2d3748]'
              : 'border-transparent text-[#718096]'
          }`}
          style={{ fontWeight: activeTab === 'groupbuy' ? 600 : 400 }}
        >
          공동구매
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f7fafc]">
        {filteredFavorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-5">
            <Heart size={64} className="text-[#cbd5e0] mb-4" />
            <p className="text-[#718096] text-center mb-2" style={{ fontWeight: 500 }}>
              관심 목록이 비어 있습니다
            </p>
            <p className="text-sm text-[#a0aec0] text-center">
              마음에 드는 게시글의 하트를 눌러<br />
              관심 목록에 추가해보세요
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            {filteredFavorites.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2e8f0]"
              >
                <div className="flex gap-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#f7fafc] flex-shrink-0">
                    <BackendImage
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex min-w-0 items-center gap-2">
                      <h3 className="truncate text-[#2d3748]" style={{ fontWeight: 600 }}>
                        {item.title}
                      </h3>
                      {item.status === 'CLOSED' && (
                        <span className="shrink-0 rounded-md bg-[#e2e8f0] px-2 py-0.5 text-xs text-[#475569]" style={{ fontWeight: 600 }}>
                          거래완료
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#718096] mb-2">{item.price}</p>
                    <p className="text-xs text-[#a0aec0]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFavorite(item.id)}
                    className="flex-shrink-0 self-start p-2 text-[#e53e3e] hover:bg-[#fff5f5] rounded-lg transition-colors"
                  >
                    <Heart size={20} fill="currentColor" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
