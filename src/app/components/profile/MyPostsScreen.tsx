import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { API_ENDPOINTS, apiRequest, resolveImageUrl } from '../../api/config';
import BackendImage from '../common/BackendImage';

interface MyPost {
  id: number;
  title: string;
  content: string;
  price: string;
  amount: string;
  postType: 'SHARE' | 'SALE' | 'GROUP_BUY';
  image: string;
  createdAt: string;
}

export default function MyPostsScreen({ onClose }: { onClose: () => void }) {
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'share' | 'sale' | 'groupbuy'>('all');
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

  useEffect(() => {
    loadMyPosts();
  }, []);

  const normalizePost = (post: any): MyPost => ({
    id: post.id ?? post.postId,
    title: post.title || post.name || '',
    content: post.content || '',
    price: post.priceText || post.price || '가격미정',
    amount: post.amount || post.quantity || '',
    postType: post.postType,
    image: resolveImageUrl(post.image || post.imageUrl),
    createdAt: post.createdAt || new Date().toISOString(),
  });

  const extractPosts = (response: any): any[] => {
    const rawPosts = response.posts || response.data?.posts || response.data || response;
    return Array.isArray(rawPosts) ? rawPosts : [];
  };

  const loadMyPosts = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.mypagePosts, { method: 'GET' });
      const posts = extractPosts(response).map(normalizePost);
      setMyPosts(posts);
    } catch (error) {
      console.warn('내 게시글 서버 조회에 실패했습니다.', error);
      setMyPosts([]);
    }
  };
  const deletePost = async (id: number) => {
    if (!confirm('게시글을 삭제하시겠습니까?')) return;

    setDeletingPostId(id);
    try {
      await apiRequest(API_ENDPOINTS.deletePost(id), { method: 'DELETE' });
      setMyPosts((currentPosts) => currentPosts.filter((post) => post.id !== id));
      alert('게시글이 삭제되었습니다.');
    } catch (error: any) {
      alert(error.message || '게시글 삭제에 실패했습니다.');
    } finally {
      setDeletingPostId(null);
    }
  };
  const filteredPosts = myPosts.filter(post => {
    if (activeTab === 'all') return true;
    if (activeTab === 'share') return post.postType === 'SHARE';
    if (activeTab === 'sale') return post.postType === 'SALE';
    if (activeTab === 'groupbuy') return post.postType === 'GROUP_BUY';
    return true;
  });

  const getPostTypeLabel = (type: string) => {
    switch (type) {
      case 'SHARE': return '나눔';
      case 'SALE': return '판매';
      case 'GROUP_BUY': return '공동구매';
      default: return '';
    }
  };

  const getPostTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'SHARE': return 'bg-[#dcfce7] text-[#166534]';
      case 'SALE': return 'bg-[#dbeafe] text-[#1e40af]';
      case 'GROUP_BUY': return 'bg-[#fef3c7] text-[#92400e]';
      default: return 'bg-[#f3f4f6] text-[#374151]';
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          내 게시글
        </h1>
        <div className="w-6" />
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[#e2e8f0] px-5 flex gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`py-3 px-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'all'
              ? 'border-[#bef264] text-[#2d3748]'
              : 'border-transparent text-[#718096]'
          }`}
          style={{ fontWeight: activeTab === 'all' ? 600 : 400 }}
        >
          전체 ({myPosts.length})
        </button>
        <button
          onClick={() => setActiveTab('share')}
          className={`py-3 px-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'share'
              ? 'border-[#bef264] text-[#2d3748]'
              : 'border-transparent text-[#718096]'
          }`}
          style={{ fontWeight: activeTab === 'share' ? 600 : 400 }}
        >
          나눔
        </button>
        <button
          onClick={() => setActiveTab('sale')}
          className={`py-3 px-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'sale'
              ? 'border-[#bef264] text-[#2d3748]'
              : 'border-transparent text-[#718096]'
          }`}
          style={{ fontWeight: activeTab === 'sale' ? 600 : 400 }}
        >
          판매
        </button>
        <button
          onClick={() => setActiveTab('groupbuy')}
          className={`py-3 px-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'groupbuy'
              ? 'border-[#bef264] text-[#2d3748]'
              : 'border-transparent text-[#718096]'
          }`}
          style={{ fontWeight: activeTab === 'groupbuy' ? 600 : 400 }}
        >
          공동구매
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#f7fafc]">
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-5">
            <div className="w-20 h-20 rounded-full bg-[#e2e8f0] flex items-center justify-center mb-4">
              <span className="text-4xl">📝</span>
            </div>
            <p className="text-[#718096] text-center mb-2" style={{ fontWeight: 500 }}>
              작성한 게시글이 없습니다
            </p>
            <p className="text-sm text-[#a0aec0] text-center">
              첫 게시글을 작성해보세요
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2e8f0]"
              >
                <div className="flex gap-3">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#f7fafc] flex-shrink-0">
                    <BackendImage
                      src={resolveImageUrl(post.image)}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-xs mb-2 ${getPostTypeBadgeColor(post.postType)}`}
                          style={{ fontWeight: 500 }}
                        >
                          {getPostTypeLabel(post.postType)}
                        </span>
                        <h3 className="text-[#2d3748] mb-1 truncate" style={{ fontWeight: 600 }}>
                          {post.title}
                        </h3>
                      </div>
                      <button
                        onClick={() => deletePost(post.id)}
                        disabled={deletingPostId === post.id}
                        className="flex-shrink-0 p-2 text-[#e53e3e] hover:bg-[#fff5f5] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <p className="text-sm text-[#718096] mb-2 line-clamp-2">
                      {post.content || '내용 없음'}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-[#2d3748]" style={{ fontWeight: 500 }}>
                        {post.price}
                      </p>
                      <p className="text-xs text-[#a0aec0]">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
