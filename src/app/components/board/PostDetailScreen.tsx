import { showToast, showConfirm, showPrompt } from '../../utils/feedback';
﻿import { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, Send, User, Leaf, MoreVertical, Edit2, Trash2, Flag, Ban } from 'lucide-react';
import { API_ENDPOINTS, apiRequest, resolveImageUrl, createReport, blockUser, type ReportTargetType } from '../../api/config';
import BackendImage from '../common/BackendImage';
import { getStoredUserInfo } from '../../auth/session';

interface Post {
  id: number;
  title: string;
  content: string;
  price: string;
  amount: string;
  postType: 'SHARE' | 'SALE' | 'GROUP_BUY';
  status?: 'OPEN' | 'CLOSED';
  image: string;
  emoji?: string;
  createdAt: string;
  expiry?: string;
  deadline?: string;
  currentCount?: number;
  targetCount?: number;
  tradeLocation?: string;
  address?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  author?: string;
  authorId?: number;
  writerId?: number;
  userId?: number;
  memberId?: number;
  nickname?: string;
  authorNickname?: string;
  writerNickname?: string;
  memberNickname?: string;
  writerProfileImage?: string;
  authorProfileImage?: string;
  profileImage?: string;
  user?: any;
  writer?: any;
  member?: any;
  rating?: number;
  freshness?: number;
  freshnessLevel?: string;
  freshnessIcon?: string;
  freshnessLabel?: string;
  isMine?: boolean;
  mine?: boolean;
  owner?: boolean;
  editable?: boolean;
}

interface Comment {
  id: number;
  postId: number;
  author: string;
  authorId?: number;
  rating?: number;
  freshness?: number;
  authorImage?: string;
  isMine?: boolean;
  content: string;
  createdAt: string;
}

type TradeRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';

interface TradeRequestSummary {
  requestId: number;
  postId: number;
  status: TradeRequestStatus;
}

interface PostDetailScreenProps {
  postId: number;
  onClose: () => void;
}

export default function PostDetailScreen({ postId, onClose }: PostDetailScreenProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [showMenuForComment, setShowMenuForComment] = useState<number | null>(null);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [tradeRequestStatus, setTradeRequestStatus] = useState<TradeRequestStatus | null>(null);
  const [isTradeRequestSubmitting, setIsTradeRequestSubmitting] = useState(false);
  const [isClosingRecruitment, setIsClosingRecruitment] = useState(false);
  const [isSafetyActionSubmitting, setIsSafetyActionSubmitting] = useState(false);

  useEffect(() => {
    loadPost();
    loadComments();
    checkFavorite();
    checkMyTradeRequest();
  }, [postId]);

  const extractPost = (response: any): Post | null => {
    const rawPost =
      response.post ||
      response.data?.post ||
      response.data ||
      response;

    return rawPost?.id ? rawPost : null;
  };

  const normalizePostDetail = (serverPost: Post): Post => ({
    ...serverPost,
    status: (serverPost as any).status,
    currentCount: Number(
      (serverPost as any).currentCount ??
      (serverPost as any).currentParticipantCount ??
      1
    ),
    targetCount: Number(
      (serverPost as any).targetCount ??
      (serverPost as any).targetParticipantCount ??
      5
    ),
    deadline:
      (serverPost as any).deadline ||
      (serverPost as any).deadlineDate ||
      serverPost.deadline,
    image: resolveImageUrl(
      (serverPost as any).image ||
      (serverPost as any).imageUrl ||
      (Array.isArray((serverPost as any).images) ? (serverPost as any).images[0] : '')
    ),
  });

  const loadPost = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.getPost(postId), { method: 'GET' });
      const serverPost = extractPost(response);

      if (serverPost) {
        setPost(normalizePostDetail(serverPost));
      } else {
        setPost(null);
      }
    } catch (error) {
      console.warn('게시글 상세 서버 조회에 실패했습니다.', error);
      setPost(null);
    }
  };
  const getCurrentUser = () => getStoredUserInfo() || {};

  const getUserId = (user: any): number | undefined => {
    const id = user?.id ?? user?.userId ?? user?.memberId;
    return id == null ? undefined : Number(id);
  };

  const getUserNickname = (user: any): string => (
    user?.nickname ||
    user?.name ||
    user?.username ||
    user?.email ||
    ''
  );

  const getPostAuthor = (postData: any): string => (
    postData.authorNickname ||
    postData.writerNickname ||
    postData.memberNickname ||
    postData.nickname ||
    postData.user?.nickname ||
    postData.author?.nickname ||
    postData.writer?.nickname ||
    postData.member?.nickname ||
    postData.createdBy ||
    postData.author ||
    '작성자'
  );

  const getPostAuthorId = (postData: any): number | undefined => (
    getUserId(postData.user || postData.author || postData.writer || postData.member) ??
    getUserId({
      id:
        postData.authorId ??
        postData.writerId ??
        postData.userId ??
        postData.memberId ??
        postData.createdById,
    })
  );

  const getCommentAuthor = (comment: any, fallbackToCurrentUser = false): string => {
    const currentUser = getCurrentUser();
    const currentUserId = getUserId(currentUser);
    const commentAuthorId = getUserId(comment.user || comment.author || comment.writer || comment.member) ??
      getUserId({ id: comment.userId ?? comment.authorId ?? comment.writerId ?? comment.memberId });

    return (
      comment.authorNickname ||
      comment.writerNickname ||
      comment.memberNickname ||
      comment.nickname ||
      comment.user?.nickname ||
      comment.author?.nickname ||
      comment.writer?.nickname ||
      comment.member?.nickname ||
      comment.createdBy ||
      (commentAuthorId && currentUserId && commentAuthorId === currentUserId ? getUserNickname(currentUser) : '') ||
      (comment.isMine || comment.mine || comment.owner || comment.editable || fallbackToCurrentUser ? getUserNickname(currentUser) : '') ||
      '익명'
    );
  };

  const getRatingValue = (source: any, fallback?: number): number => {
    const rating =
      source?.freshness ??
      source?.rating ??
      source?.freshnessScore ??
      source?.ratingScore ??
      source?.trustScore ??
      source?.mannerScore ??
      source?.freshnessRating ??
      source?.mannerTemperature ??
      source?.user?.freshness ??
      source?.user?.rating ??
      source?.user?.freshnessScore ??
      source?.user?.ratingScore ??
      source?.user?.trustScore ??
      source?.user?.mannerScore ??
      source?.user?.freshnessRating ??
      source?.user?.mannerTemperature ??
      source?.author?.freshness ??
      source?.author?.rating ??
      source?.author?.freshnessScore ??
      source?.author?.ratingScore ??
      source?.author?.trustScore ??
      source?.author?.mannerScore ??
      source?.author?.freshnessRating ??
      source?.author?.mannerTemperature ??
      source?.writer?.freshness ??
      source?.writer?.rating ??
      source?.writer?.freshnessScore ??
      source?.writer?.ratingScore ??
      source?.writer?.trustScore ??
      source?.writer?.mannerScore ??
      source?.writer?.freshnessRating ??
      source?.writer?.mannerTemperature ??
      source?.member?.freshness ??
      source?.member?.rating ??
      source?.member?.freshnessScore ??
      source?.member?.ratingScore ??
      source?.member?.trustScore ??
      source?.member?.mannerScore ??
      source?.member?.freshnessRating ??
      source?.member?.mannerTemperature ??
      fallback ??
      0;

    return Number(rating) || 0;
  };

  const getCurrentUserRating = (): number => getRatingValue(getCurrentUser(), 0);

  const getProfileImage = (source: any): string => {
    const image =
      source?.writerProfileImage ||
      source?.authorProfileImage ||
      source?.memberProfileImage ||
      source?.profileImage ||
      source?.profileImageUrl ||
      source?.avatar ||
      source?.avatarUrl ||
      source?.user?.profileImage ||
      source?.user?.profileImageUrl ||
      source?.author?.profileImage ||
      source?.author?.profileImageUrl ||
      source?.writer?.profileImage ||
      source?.writer?.profileImageUrl ||
      source?.member?.profileImage ||
      source?.member?.profileImageUrl ||
      '';

    return image ? resolveImageUrl(image) : '';
  };

  const formatFreshness = (rating?: number): string => {
    const value = Number(rating) || 0;
    const percent = value <= 5 ? Math.round(value * 20) : Math.round(value);
    return `${Math.max(0, Math.min(100, percent))}%`;
  };

  const getFreshnessPercent = (source: any): number => {
    const value = Number(source?.freshness ?? 50);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
  };

  const getFreshnessIcon = (source: any): string => source?.freshnessIcon || '🌱';

  const getFreshnessLabel = (source: any): string => {
    const value = getFreshnessPercent(source);
    if (value >= 95) return '👑 전설 반띵러';
    if (value >= 85) return '💎 모범 반띵러';
    if (value >= 70) return '✨ 든든한 반띵러';
    if (value >= 55) return '🌿 성장 반띵러';
    if (value >= 40) return '🌱 일반 반띵러';
    if (value >= 30) return '🍂 주의 반띵러';
    if (value >= 20) return '⚠️ 위험 반띵러';
    return '🤮 제한 반띵러';
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

  const getPostLocation = (postData: any): string => (
    postData.tradeLocation ||
    postData.address ||
    postData.location ||
    postData.user?.address ||
    postData.author?.address ||
    postData.writer?.address ||
    postData.member?.address ||
    ''
  );

  const normalizeComment = (comment: any, fallbackToCurrentUser = false): Comment => ({
    id: Number(comment.id ?? comment.commentId ?? Date.now()),
    postId: comment.postId || postId,
    author: getCommentAuthor(comment, fallbackToCurrentUser),
    authorId: getUserId(comment.user || comment.author || comment.writer || comment.member) ??
      getUserId({ id: comment.userId ?? comment.authorId ?? comment.writerId ?? comment.memberId }),
    authorImage: getProfileImage(comment),
    rating: getRatingValue(comment, fallbackToCurrentUser ? getCurrentUserRating() : 0),
    freshness: getRatingValue(comment, fallbackToCurrentUser ? getCurrentUserRating() : 0),
    isMine: Boolean(comment.isMine || comment.mine || comment.owner || comment.editable),
    content: comment.content || comment.comment || '',
    createdAt: comment.createdAt || comment.createdDate || comment.updatedAt || new Date().toISOString(),
  });

  const extractComments = (response: any): Comment[] => {
    const rawComments =
      response.comments ||
      response.data?.comments ||
      response.data ||
      response;

    return Array.isArray(rawComments) ? rawComments.map(normalizeComment) : [];
  };

  const extractComment = (response: any): Comment => {
    const rawComment =
      response.comment ||
      response.data?.comment ||
      response.data ||
      response;

    return normalizeComment(rawComment, true);
  };

  const loadComments = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.getComments(postId), { method: 'GET' });
      setComments(extractComments(response));
    } catch (error: any) {
      console.error('댓글 조회 실패:', error);
      showToast(error.message || '댓글을 불러오지 못했습니다.');
      setComments([]);
    }
  };

  const checkFavorite = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.favoriteStatus(postId), { method: 'GET' });
      const status = response.data || response.favorite || response;
      setIsFavorite(Boolean(status.favorite ?? status.isFavorite));
    } catch (error) {
      console.warn('관심 상태 조회에 실패했습니다.', error);
      setIsFavorite(false);
    }
  };
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsCommentSubmitting(true);
    try {
      const response = await apiRequest(API_ENDPOINTS.createComment(postId), {
        method: 'POST',
        body: JSON.stringify({ content: newComment.trim() }),
      });
      const comment = extractComment(response);
      setComments((prevComments) => [...prevComments, comment]);
      setNewComment('');
    } catch (error: any) {
      showToast(error.message || '댓글 작성에 실패했습니다.');
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!(await showConfirm('댓글을 삭제하시겠습니까?', '댓글 삭제', '삭제'))) return;

    try {
      await apiRequest(API_ENDPOINTS.deleteComment(commentId), { method: 'DELETE' });
      setComments((prevComments) => prevComments.filter((c) => c.id !== commentId));
      setShowMenuForComment(null);
    } catch (error: any) {
      showToast(error.message || '댓글 삭제에 실패했습니다.');
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
    setShowMenuForComment(null);
  };

  const handleSaveEdit = async (commentId: number) => {
    if (!editingContent.trim()) return;

    try {
      const response = await apiRequest(API_ENDPOINTS.updateComment(commentId), {
        method: 'PUT',
        body: JSON.stringify({ content: editingContent.trim() }),
      });
      const updatedComment = extractComment(response);

      setComments(
        comments.map((c) =>
          c.id === commentId ? { ...c, ...updatedComment } : c
        )
      );
      setEditingCommentId(null);
      setEditingContent('');
    } catch (error: any) {
      showToast(error.message || '댓글 수정에 실패했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleToggleFavorite = async () => {
    try {
      if (isFavorite) {
        await apiRequest(API_ENDPOINTS.removeFavorite(postId), { method: 'DELETE' });
        setIsFavorite(false);
      } else {
        await apiRequest(API_ENDPOINTS.addFavorite(postId), { method: 'POST' });
        setIsFavorite(true);
      }
    } catch (error: any) {
      showToast(error.message || '관심 목록 처리에 실패했습니다.');
    }
  };

  const handleCreateReport = async (targetType: ReportTargetType, targetId: number, targetLabel: string) => {
    if (isSafetyActionSubmitting) return;

    const reason = await showPrompt(`${targetLabel} 신고 사유를 입력해주세요.`, '신고하기', '신고 사유');
    if (!reason?.trim()) return;

    setIsSafetyActionSubmitting(true);
    try {
      await createReport({
        targetType,
        targetId,
        reason: reason.trim(),
      });
      showToast('신고가 접수되었습니다.');
      setShowMenuForComment(null);
    } catch (error: any) {
      showToast(error.message || '신고 접수에 실패했습니다.');
    } finally {
      setIsSafetyActionSubmitting(false);
    }
  };

  const handleBlockUser = async (userId: number | undefined, nickname: string) => {
    if (!userId || isSafetyActionSubmitting) {
      if (!userId) showToast('차단할 사용자 정보를 찾을 수 없습니다.');
      return;
    }

    if (!(await showConfirm(`${nickname || '사용자'}님을 차단하시겠습니까?`, '사용자 차단', '차단'))) return;

    setIsSafetyActionSubmitting(true);
    try {
      await blockUser(userId);
      showToast('사용자를 차단했습니다.');
      onClose();
    } catch (error: any) {
      showToast(error.message || '사용자 차단에 실패했습니다.');
    } finally {
      setIsSafetyActionSubmitting(false);
    }
  };

  const extractTradeRequests = (response: any): TradeRequestSummary[] => {
    const rawRequests =
      response.tradeRequests ||
      response.requests ||
      response.data?.tradeRequests ||
      response.data?.requests ||
      response.data ||
      response;

    if (!Array.isArray(rawRequests)) return [];

    return rawRequests.map((request: any) => ({
      requestId: Number(request.requestId ?? request.id ?? request.tradeRequestId),
      postId: Number(request.postId ?? request.post?.id),
      status: request.status ?? 'PENDING',
    }));
  };

  const checkMyTradeRequest = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.mypageTradeRequests, { method: 'GET' });
      const existingRequest = extractTradeRequests(response)
        .filter((request) => request.postId === postId && request.status !== 'REJECTED')
        .sort((a, b) => b.requestId - a.requestId)[0];

      setTradeRequestStatus(existingRequest?.status || null);
    } catch (error) {
      console.warn('내 거래 요청 상태 조회에 실패했습니다.', error);
      setTradeRequestStatus(null);
    }
  };

  const handleTradeRequest = async () => {
    if (!post) return;

    const userInfo = getCurrentUser();

    if (!userInfo.nickname) {
      showToast('로그인이 필요합니다.');
      return;
    }

    const currentUserId = getUserId(userInfo);
    const currentUserNickname = getUserNickname(userInfo);
    const postAuthor = getPostAuthor(post);
    const postAuthorId = getPostAuthorId(post);
    const isMyPost =
      Boolean(post.isMine || post.mine || post.owner || post.editable) ||
      (postAuthorId != null && currentUserId != null && postAuthorId === currentUserId) ||
      (!!currentUserNickname && postAuthor === currentUserNickname);

    if (isMyPost) {
      showToast('본인 게시글에는 거래 요청할 수 없습니다.');
      return;
    }

    if (tradeRequestStatus) {
      showToast('이미 이 게시글에 거래 요청을 보냈습니다.');
      return;
    }

    const typeLabel = post?.postType === 'SHARE' ? '나눔' : post?.postType === 'SALE' ? '구매' : '공동구매 참여';

    if (!(await showConfirm(`${typeLabel} 요청을 보내시겠습니까?`, '거래 요청', '요청'))) return;

    setIsTradeRequestSubmitting(true);
    try {
      const response = await apiRequest(API_ENDPOINTS.createTradeRequest(postId), { method: 'POST' });
      const tradeRequest = response?.data || response?.tradeRequest || response;
      const nextStatus = tradeRequest?.status || 'PENDING';
      setTradeRequestStatus(nextStatus);
      await loadPost();
      if (nextStatus === 'ACCEPTED' && tradeRequest?.chatRoomId) {
        showToast('목표 인원이 모여 공동구매 채팅방이 개설되었습니다.');
      } else {
        showToast(`${typeLabel} 요청이 전송되었습니다.\n게시글 작성자가 확인 후 연락드릴 예정입니다.`);
      }
    } catch (error: any) {
      if (error.message === '이미 이 게시글에 거래 요청을 보냈습니다.') {
        setTradeRequestStatus('PENDING');
      }
      showToast(error.message || `${typeLabel} 요청에 실패했습니다.`);
    } finally {
      setIsTradeRequestSubmitting(false);
    }
  };

  const handleCloseGroupBuyRecruitment = async () => {
    if (!post || post.postType !== 'GROUP_BUY') return;
    if (!(await showConfirm('현재 참여 요청자들과 공동구매 채팅방을 만들고 모집을 마감할까요?', '모집마감', '마감'))) return;

    setIsClosingRecruitment(true);
    try {
      const response = await apiRequest(API_ENDPOINTS.closeGroupBuyRecruitment(post.id), { method: 'POST' });
      const openedRequests = response?.data || response?.tradeRequests || response || [];
      await loadPost();
      showToast(
        Array.isArray(openedRequests) && openedRequests.length > 0
          ? `모집을 마감했습니다.\n${openedRequests.length}개의 채팅방이 개설되었습니다.`
          : '모집을 마감했습니다.'
      );
    } catch (error: any) {
      showToast(error.message || '모집마감에 실패했습니다.');
    } finally {
      setIsClosingRecruitment(false);
    }
  };

  const getTradeButtonLabel = () => {
    if (isTradeRequestSubmitting) return '요청 중';
    switch (tradeRequestStatus) {
      case 'PENDING':
        return '요청 완료';
      case 'ACCEPTED':
        return '거래 수락됨';
      case 'COMPLETED':
        return '거래 완료됨';
      default:
        if (post?.postType === 'SHARE') return '나눔 요청하기';
        if (post?.postType === 'SALE') return '구매 요청하기';
        return '공동구매 참여하기';
    }
  };

  const getPostTypeBadge = () => {
    switch (post?.postType) {
      case 'SHARE':
        return <span className="bg-[#dcfce7] text-[#166534] px-3 py-1 rounded-full text-sm" style={{ fontWeight: 500 }}>나눔</span>;
      case 'SALE':
        return <span className="bg-[#dbeafe] text-[#1e40af] px-3 py-1 rounded-full text-sm" style={{ fontWeight: 500 }}>판매</span>;
      case 'GROUP_BUY':
        return <span className="bg-[#fef3c7] text-[#92400e] px-3 py-1 rounded-full text-sm" style={{ fontWeight: 500 }}>공동구매</span>;
      default:
        return null;
    }
  };

  if (!post) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <p className="text-[#718096]">게시글을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const currentUser = getCurrentUser();
  const currentUserId = getUserId(currentUser);
  const currentUserNickname = getUserNickname(currentUser);
  const postAuthor = getPostAuthor(post);
  const postAuthorId = getPostAuthorId(post);
  const isMyPost =
    Boolean((post as any).isMine || (post as any).mine || (post as any).owner || (post as any).editable) ||
    (postAuthorId != null && currentUserId != null && postAuthorId === currentUserId) ||
    (!!currentUserNickname && postAuthor === currentUserNickname);
  const postRating = getRatingValue(post, isMyPost ? getCurrentUserRating() : 0);
  const postFreshness = getFreshnessPercent(post);
  const postFreshnessIcon = getFreshnessIcon(post);
  const postFreshnessLabel = getFreshnessLabel(post);
  const postLocation = getPostLocation(post);
  const postAuthorImage = getProfileImage(post) || (isMyPost ? getProfileImage(currentUser) : '');
  const isGroupBuyClosed = post.postType === 'GROUP_BUY' && post.status === 'CLOSED';

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          게시글
        </h1>
        <div className="flex items-center gap-2">
          {!isMyPost && (
            <button
              onClick={() => handleCreateReport('POST', post.id, '게시글')}
              className="text-[#718096] hover:text-[#e53e3e] p-1"
              disabled={isSafetyActionSubmitting}
              title="게시글 신고"
            >
              <Flag size={20} />
            </button>
          )}
          <button onClick={handleToggleFavorite} className="text-[#2d3748]">
            <Heart size={24} fill={isFavorite ? '#e53e3e' : 'none'} className={isFavorite ? 'text-[#e53e3e]' : ''} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#f7fafc]">
        {/* Image */}
        <div className="bg-white">
          <BackendImage
            src={resolveImageUrl(post.image)}
            alt={post.title}
            className="w-full h-80 object-cover"
          />
        </div>

        {/* Post Info */}
        <div className="bg-white px-5 py-6 mb-2">
          <div className="flex items-center gap-3 mb-4">
            {getPostTypeBadge()}
            <span className="text-xs text-[#a0aec0]">
              {formatKoreanDate(post.createdAt)}
            </span>
          </div>

          <h2 className="text-2xl text-[#2d3748] mb-3" style={{ fontWeight: 600 }}>
            {post.emoji} {post.title}
          </h2>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center overflow-hidden">
                {postAuthorImage ? (
                  <BackendImage
                    src={postAuthorImage}
                    alt={postAuthor}
                    className="w-full h-full object-cover"
                    fallbackSrc="/assets/profile-placeholder.svg"
                  />
                ) : (
                  <User size={16} className="text-[#718096]" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#2d3748]" style={{ fontWeight: 500 }}>
                  {postAuthor}
                </span>
                <div className="flex items-center gap-1 bg-[#dcfce7] px-2 py-0.5 rounded-full">
                  <span className="text-xs">{postFreshnessIcon}</span>
                  <span className="text-xs text-[#16a34a]" style={{ fontWeight: 600 }}>
                    신선도 {Math.round(postFreshness)}% · {stripFreshnessIcon(postFreshnessLabel)}
                  </span>
                </div>
              </div>
            </div>
            {!isMyPost && (
              <button
                onClick={() => handleBlockUser(postAuthorId, postAuthor)}
                disabled={isSafetyActionSubmitting}
                className="flex items-center gap-1 rounded-full border border-[#fee2e2] px-3 py-1.5 text-xs text-[#dc2626] hover:bg-[#fef2f2] disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                <Ban size={14} />
                차단
              </button>
            )}
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-[#718096]">가격</span>
              <span className="text-[#2d3748]" style={{ fontWeight: 600 }}>{post.price}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#718096]">수량</span>
              <span className="text-[#2d3748]" style={{ fontWeight: 500 }}>{post.amount}</span>
            </div>
            {postLocation && (
              <div className="flex justify-between text-sm gap-4">
                <span className="text-[#718096] shrink-0">거래 기준 위치</span>
                <span className="text-[#2d3748] text-right" style={{ fontWeight: 500 }}>
                  {postLocation}
                </span>
              </div>
            )}
            {post.postType !== 'GROUP_BUY' && post.expiry && (
              <div className="flex justify-between text-sm">
                <span className="text-[#718096]">유통기한</span>
                <span className="text-[#2d3748]" style={{ fontWeight: 500 }}>{formatExpiry(post.expiry)}</span>
              </div>
            )}
            {post.deadline && (
              <div className="flex justify-between text-sm">
                <span className="text-[#718096]">마감일</span>
                <span className="text-[#2d3748]" style={{ fontWeight: 500 }}>{post.deadline}</span>
              </div>
            )}
            {post.postType === 'GROUP_BUY' && (
              <div className="flex justify-between text-sm">
                <span className="text-[#718096]">참여 인원</span>
                <span className="text-[#2d3748]" style={{ fontWeight: 500 }}>
                  {post.currentCount || 1} / {post.targetCount || 5}명
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#e2e8f0]">
            <p className="text-[#2d3748] whitespace-pre-wrap">
              {post.content || '내용이 없습니다.'}
            </p>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white px-5 py-6">
          <h3 className="text-lg text-[#2d3748] mb-4 flex items-center gap-2" style={{ fontWeight: 600 }}>
            <MessageCircle size={20} />
            댓글 {comments.length}
          </h3>

          <div className="space-y-4 mb-4">
            {comments.length === 0 ? (
              <p className="text-sm text-[#a0aec0] text-center py-8">
                첫 댓글을 남겨보세요
              </p>
            ) : (
              comments.map((comment) => {
                const isMyComment =
                  comment.isMine ||
                  (comment.authorId != null && currentUserId != null && comment.authorId === currentUserId) ||
                  (!!currentUserNickname && comment.author === currentUserNickname);
                const isEditing = editingCommentId === comment.id;
                const commentFreshness = getRatingValue(comment, postAuthor === comment.author ? postRating : 0);

                return (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {comment.authorImage ? (
                        <BackendImage
                          src={comment.authorImage}
                          alt={comment.author}
                          className="w-full h-full object-cover"
                          fallbackSrc="/assets/profile-placeholder.svg"
                        />
                      ) : (
                        <User size={16} className="text-[#718096]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-[#2d3748]" style={{ fontWeight: 600 }}>
                          {comment.author}
                        </span>
                        <div className="flex items-center gap-1 bg-[#dcfce7] px-1.5 py-0.5 rounded-full">
                          <Leaf size={10} className="text-[#16a34a] fill-[#16a34a]" />
                          <span className="text-xs text-[#16a34a]" style={{ fontWeight: 600 }}>
                            {formatFreshness(commentFreshness)}
                          </span>
                        </div>
                        <span className="text-xs text-[#a0aec0]">
                          {formatKoreanDate(comment.createdAt)}
                        </span>
                        {!isEditing && (
                          <div className="ml-auto relative">
                            {!isMyComment && (
                              <button
                                onClick={() => handleCreateReport('COMMENT', comment.id, '댓글')}
                                className="flex items-center gap-1 text-xs text-[#718096] hover:text-[#e53e3e] px-2 py-1"
                                disabled={isSafetyActionSubmitting}
                              >
                                <Flag size={14} />
                                신고
                              </button>
                            )}
                            {isMyComment && (
                              <>
                            <button
                              onClick={() => setShowMenuForComment(showMenuForComment === comment.id ? null : comment.id)}
                              className="text-[#718096] hover:text-[#2d3748] p-1"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {showMenuForComment === comment.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-[#e2e8f0] rounded-xl shadow-lg py-1 z-10 min-w-[100px]">
                                <button
                                  onClick={() => handleStartEdit(comment)}
                                  className="w-full px-4 py-2 text-sm text-left text-[#2d3748] hover:bg-[#f7fafc] flex items-center gap-2"
                                >
                                  <Edit2 size={14} />
                                  수정
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="w-full px-4 py-2 text-sm text-left text-[#e53e3e] hover:bg-[#fff5f5] flex items-center gap-2"
                                >
                                  <Trash2 size={14} />
                                  삭제
                                </button>
                              </div>
                            )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit(comment.id);
                              }
                            }}
                            className="flex-1 px-3 py-2 rounded-xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc] text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(comment.id)}
                            className="px-3 py-2 rounded-xl bg-[#bef264] text-[#0a0a0a] hover:bg-[#a3e635] text-sm"
                            style={{ fontWeight: 500 }}
                          >
                            저장
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-2 rounded-xl bg-[#e2e8f0] text-[#2d3748] hover:bg-[#cbd5e0] text-sm"
                            style={{ fontWeight: 500 }}
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-[#2d3748]">{comment.content}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Comment Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddComment();
                }
              }}
              placeholder="댓글을 입력하세요"
              className="flex-1 px-4 py-3 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim() || isCommentSubmitting}
              className="px-4 py-3 rounded-2xl bg-[#bef264] text-[#0a0a0a] hover:bg-[#a3e635] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-[#e2e8f0] px-5 py-4">
        {isMyPost ? (
          post.postType === 'GROUP_BUY' ? (
            <button
              onClick={handleCloseGroupBuyRecruitment}
              disabled={isClosingRecruitment || isGroupBuyClosed}
              className="w-full bg-[#bef264] text-[#0a0a0a] py-4 rounded-2xl hover:bg-[#a3e635] disabled:bg-[#e2e8f0] disabled:text-[#718096] disabled:cursor-not-allowed transition-colors shadow-sm"
              style={{ fontWeight: 600 }}
            >
              {isGroupBuyClosed ? '모집 마감됨' : isClosingRecruitment ? '마감 중' : '모집마감'}
            </button>
          ) : (
            <div
              className="w-full bg-[#f1f5f9] text-[#718096] py-4 rounded-2xl text-center"
              style={{ fontWeight: 600 }}
            >
              내 게시글입니다
            </div>
          )
        ) : (
          <button
            onClick={handleTradeRequest}
            disabled={Boolean(tradeRequestStatus) || isTradeRequestSubmitting}
            className="w-full bg-[#bef264] text-[#0a0a0a] py-4 rounded-2xl hover:bg-[#a3e635] disabled:bg-[#e2e8f0] disabled:text-[#718096] disabled:cursor-not-allowed transition-colors shadow-sm"
            style={{ fontWeight: 600 }}
          >
            {getTradeButtonLabel()}
          </button>
        )}
      </div>
    </div>
  );
}

function stripFreshnessIcon(label: string) {
  return label.replace(/^[^\w가-힣]+/u, '').trim();
}
