import TradeChatReportDialog from './TradeChatReportDialog';
import GroupReopenDialog from './GroupReopenDialog';
import MarketTradeActionDialog from './MarketTradeActionDialog';
import ReviewDialog from './ReviewDialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle, RefreshCw, User } from 'lucide-react';
import { API_ENDPOINTS, apiRequest, resolveImageUrl, createReport } from '../../api/config';
import BackendImage from '../common/BackendImage';
import { showToast, showConfirm, showPrompt } from '../../utils/feedback';
import { getStoredUserInfo } from '../../auth/session';
import { useNestedBack } from '../../utils/useNestedBack';

interface TransactionHistoryScreenProps {
  onClose: () => void;
}

type TransactionTab = 'received' | 'sent' | 'completed';
type TradeStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

interface TradeRequest {
  requestId: number;
  cancelledBy?: number;
  cancellationReason?: string;
  marketTrade?: boolean;
  exchangeTrade?: boolean;
  postOpen?: boolean;
  writerConfirmedAt?:string;
  requesterConfirmedAt?:string;
  reopenCandidate?: boolean;
  expirationDate?: string;
  postId: number;
  postTitle: string;
  requesterId: number;
  requesterNickname: string;
  requesterProfileImage?: string;
  requesterFreshness?: number;
  requesterFreshnessLabel?: string;
  requesterShareCompletedCount?: number;
  requesterSaleCompletedCount?: number;
  requesterReceivedShareCount?: number;
  requesterGroupBuyCount?: number;
  writerId?: number;
  writerNickname?: string;
  writerProfileImage?: string;
  writerFreshness?: number;
  writerFreshnessLabel?: string;
  writerShareCompletedCount?: number;
  writerSaleCompletedCount?: number;
  writerReceivedShareCount?: number;
  writerGroupBuyCount?: number;
  chatRoomId?: number;
  boardType?: 'sharing' | 'group';
  status: TradeStatus;
  createdAt: string;
  respondedAt?: string | null;
  completedAt?: string | null;
}

interface TradeRequestGroup {
  key: string;
  postId: number;
  postTitle: string;
  boardType?: 'sharing' | 'group';
  status: TradeStatus;
  date?: string | null;
  requests: TradeRequest[];
}

function toSingleRequestGroup(request: TradeRequest, key = `request-${request.requestId}`): TradeRequestGroup {
  return {
    key,
    postId: request.postId,
    postTitle: request.postTitle,
    boardType: request.boardType,
    status: request.status,
    date: getGroupDate([request]),
    requests: [request],
  };
}

function getGroupStatus(requests: TradeRequest[]): TradeStatus {
  if (requests.some((request) => request.status === 'PENDING')) return 'PENDING';
  if (requests.some((request) => request.status === 'ACCEPTED')) return 'ACCEPTED';
  if (requests.every((request) => request.status === 'COMPLETED')) return 'COMPLETED';
  return requests[0]?.status || 'PENDING';
}

function getGroupDate(requests: TradeRequest[]): string | null | undefined {
  const dates = requests
    .map((request) => request.completedAt || request.respondedAt || request.createdAt)
    .filter(Boolean)
    .sort();
  return dates[dates.length - 1];
}

export default function TransactionHistoryScreen({ onClose }: TransactionHistoryScreenProps) {
  const storedUser = getStoredUserInfo<{ id?: number; userId?: number }>();
  const currentUserId = Number(storedUser?.id ?? storedUser?.userId);
  const [moreHistory,setMoreHistory]=useState({sent:false,received:false});
  const [historyPage,setHistoryPage]=useState(0);
  const [loadingMore,setLoadingMore]=useState(false);
  const historyLoadRef = useRef<symbol | null>(null);
  const [reviewTarget,setReviewTarget]=useState<TradeRequest|null>(null);
  const [reviewed,setReviewed]=useState<Set<number>>(new Set());
  const [lifetimeCompleted,setLifetimeCompleted]=useState(0);
  const [activeTab, setActiveTab] = useState<TransactionTab>('received');
  const [sentRequests, setSentRequests] = useState<TradeRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<TradeRequest[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<TradeRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [processingGroupKey, setProcessingGroupKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reportTrade,setReportTrade] = useState<number|null>(null);
  const [reopenGroup,setReopenGroup] = useState<number|null>(null);
  const [marketAction,setMarketAction] = useState<{request:TradeRequest; action:'cancel'|'reopen'}|null>(null);

  useNestedBack(Boolean(selectedProfile), () => setSelectedProfile(null));

  useEffect(() => {
    loadTradeRequests();
    apiRequest(API_ENDPOINTS.posts.replace(/\/posts$/,'')+'/mypage/reviews').then(r=>setReviewed(new Set((r.data||[]).map((v:any)=>Number(v.tradeRequestId))))).catch(()=>{});
  }, []);

  const normalizeRequest = (request: any): TradeRequest => ({
    requestId: Number(request.requestId ?? request.id ?? request.tradeRequestId),
    cancelledBy: request.cancelledBy,
    cancellationReason: request.cancellationReason,
    marketTrade: request.marketTrade === true,
    exchangeTrade: request.exchangeTrade === true,
    postOpen: request.postOpen === true,
    writerConfirmedAt: request.writerConfirmedAt, requesterConfirmedAt: request.requesterConfirmedAt,
    reopenCandidate: request.reopenCandidate === true,
    expirationDate: request.expirationDate,
    postId: Number(request.postId ?? request.post?.id),
    postTitle: request.postTitle ?? request.post?.title ?? '게시글 제목 없음',
    requesterId: Number(request.requesterId ?? request.requester?.id),
    requesterNickname: request.requesterNickname ?? request.requester?.nickname ?? '사용자',
    requesterProfileImage:
      request.requesterProfileImage ??
      request.requester?.profileImage ??
      request.requester?.profileImageUrl ??
      request.user?.profileImage ??
      request.user?.profileImageUrl,
    requesterFreshness: getNumberValue(
      request.requesterFreshness ??
      request.requester?.freshness ??
      request.user?.freshness
    ),
    requesterFreshnessLabel:
      request.requesterFreshnessLabel ??
      request.requester?.freshnessLabel ??
      request.user?.freshnessLabel,
    requesterShareCompletedCount: getNumberValue(
      request.requesterShareCompletedCount ??
      request.requester?.shareCompletedCount ??
      request.requester?.shareCount ??
      request.user?.shareCompletedCount
    ),
    requesterReceivedShareCount: getNumberValue(
      request.requesterReceivedShareCount ??
      request.requester?.receivedShareCount ??
      request.user?.receivedShareCount
    ),
    requesterSaleCompletedCount: getNumberValue(
      request.requesterSaleCompletedCount ??
      request.requester?.saleCompletedCount ??
      request.user?.saleCompletedCount ??
      request.requesterReceivedShareCount ??
      request.requester?.receivedShareCount ??
      request.user?.receivedShareCount
    ),
    requesterGroupBuyCount: getNumberValue(
      request.requesterGroupBuyCount ??
      request.requester?.groupBuyCount ??
      request.requester?.groupPurchaseCount ??
      request.user?.groupBuyCount
    ),
    writerId: getNumberValue(request.writerId ?? request.writer?.id ?? request.post?.writer?.id),
    writerNickname: request.writerNickname ?? request.writer?.nickname ?? request.post?.writer?.nickname,
    writerProfileImage: request.writerProfileImage ?? request.writer?.profileImage ?? request.post?.writer?.profileImage,
    writerFreshness: getNumberValue(request.writerFreshness ?? request.writer?.freshness ?? request.post?.writer?.freshness),
    writerFreshnessLabel: request.writerFreshnessLabel ?? request.writer?.freshnessLabel ?? request.post?.writer?.freshnessLabel,
    writerShareCompletedCount: getNumberValue(request.writerShareCompletedCount ?? request.writer?.shareCompletedCount),
    writerSaleCompletedCount: getNumberValue(request.writerSaleCompletedCount ?? request.writer?.saleCompletedCount),
    writerReceivedShareCount: getNumberValue(request.writerReceivedShareCount ?? request.writer?.receivedShareCount),
    writerGroupBuyCount: getNumberValue(request.writerGroupBuyCount ?? request.writer?.groupBuyCount),
    chatRoomId: getNumberValue(request.chatRoomId ?? request.chatRoom?.id),
    boardType: getBoardType(request),
    status: request.status ?? 'PENDING',
    createdAt: request.createdAt,
    respondedAt: request.respondedAt,
    completedAt: request.completedAt,
  });

  const getPartner = (request: TradeRequest) => {
    const isRequester = Number.isFinite(currentUserId) && currentUserId === request.requesterId;
    return isRequester
      ? {
          nickname: request.writerNickname,
          profileImage: request.writerProfileImage,
          freshness: request.writerFreshness,
          freshnessLabel: request.writerFreshnessLabel,
          shareCount: request.writerShareCompletedCount,
          saleCount: request.writerSaleCompletedCount,
          groupBuyCount: request.writerGroupBuyCount,
        }
      : {
          nickname: request.requesterNickname,
          profileImage: request.requesterProfileImage,
          freshness: request.requesterFreshness,
          freshnessLabel: request.requesterFreshnessLabel,
          shareCount: request.requesterShareCompletedCount,
          saleCount: request.requesterSaleCompletedCount,
          groupBuyCount: request.requesterGroupBuyCount,
        };
  };

  const getNumberValue = (value: any): number | undefined => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  };

  const getBoardType = (request: any): 'sharing' | 'group' | undefined => {
    const value = String(
      request.boardType ??
      request.board ??
      request.postType ??
      request.post?.postType ??
      request.post?.type ??
      request.post?.category ??
      request.category ??
      ''
    ).toUpperCase();

    if (value.includes('GROUP') || value.includes('공동구매')) return 'group';
    if (value.includes('SHARE') || value.includes('SALE') || value.includes('나눔') || value.includes('판매')) return 'sharing';
    return undefined;
  };

  const getBoardTone = (boardType?: 'sharing' | 'group') => {
    if (boardType === 'group') {
      return {
        card: 'bg-[#fffbeb] border-[#fbbf24]',
        profileBorder: 'border-[#fbbf24]',
        profileButton: 'border-[#fbbf24] text-[#92400e] hover:bg-[#fef3c7]',
        stats: 'border-[#fbbf24] bg-gradient-to-r from-[#fef3c7] to-[#fde68a]',
        statsTitle: 'text-[#92400e]',
        divider: 'border-[#fbbf24]/30',
      };
    }

    return {
      card: 'bg-[#f0fdf4] border-[#bef264]',
      profileBorder: 'border-[#bef264]',
      profileButton: 'border-[#bef264] text-[#65a30d] hover:bg-[#f0fdf4]',
      stats: 'border-[#bef264] bg-gradient-to-r from-[#f0fff4] to-[#ecfccb]',
      statsTitle: 'text-[#65a30d]',
      divider: 'border-[#bef264]/30',
    };
  };
  const selectedPartner = selectedProfile ? getPartner(selectedProfile) : null;

  const extractRequests = (response: any): TradeRequest[] => {
    const rawRequests =
      response.tradeRequests ||
      response.requests ||
      response.data?.tradeRequests ||
      response.data?.requests ||
      response.data?.content ||
      response.data ||
      response;

    return Array.isArray(rawRequests) ? rawRequests.map(normalizeRequest) : [];
  };

  const loadTradeRequests = async (background = false) => {
    if (background && historyLoadRef.current) return;
    const load = Symbol();
    historyLoadRef.current = load;
    if (!background) setIsLoading(true);

    const loadPages = async (endpoint: string) => {
      const requests = new Map<number, TradeRequest>();
      let hasMore = true;
      for (let page = 0; page <= (background ? historyPage : 0) && hasMore; page++) {
        const response = await apiRequest(`${endpoint}/page?page=${page}&size=30`);
        extractRequests(response).forEach(request => requests.set(request.requestId, request));
        hasMore = !response.data?.last;
      }
      return { requests: [...requests.values()], hasMore };
    };

    try {
      const [sent, received, profile] = await Promise.allSettled([
        loadPages(API_ENDPOINTS.mypageTradeRequests),
        loadPages(API_ENDPOINTS.mypageReceivedTradeRequests),
        background ? Promise.resolve(null) : apiRequest(API_ENDPOINTS.getProfile),
      ]);
      if (historyLoadRef.current !== load) return;

      if (!background) setHistoryPage(0);
      if (sent.status === 'fulfilled') setSentRequests(sent.value.requests);
      if (received.status === 'fulfilled') setReceivedRequests(received.value.requests);
      setMoreHistory(previous => ({
        sent: sent.status === 'fulfilled' ? sent.value.hasMore : background && previous.sent,
        received: received.status === 'fulfilled' ? received.value.hasMore : background && previous.received,
      }));
      if (profile.status === 'fulfilled' && profile.value) {
        setLifetimeCompleted(Number((profile.value.data || profile.value).completedTradeCount || 0));
      }
      const failed = [sent.status === 'rejected' && '보낸 요청', received.status === 'rejected' && '받은 요청'].filter(Boolean);
      if (!background || !failed.length) {
        setLoadError(failed.length ? `${failed.join(', ')}을 불러오지 못했습니다. 잠시 후 새로고침해주세요.` : '');
      }
    } finally {
      if (historyLoadRef.current === load) {
        historyLoadRef.current = null;
        if (!background) setIsLoading(false);
      }
    }
  };

  const loadMoreHistory=async()=>{
    if (loadingMore || isLoading) return;
    const load = Symbol();
    historyLoadRef.current = load;
    setLoadingMore(true);
    try{
      const page=historyPage+1;
      const [sent,received]=await Promise.all([
        moreHistory.sent?apiRequest(API_ENDPOINTS.mypageTradeRequests+`/page?page=${page}&size=30`):null,
        moreHistory.received?apiRequest(API_ENDPOINTS.mypageReceivedTradeRequests+`/page?page=${page}&size=30`):null
      ]);
      if (historyLoadRef.current !== load) return;
      if(sent)setSentRequests(prev=>[...prev,...extractRequests(sent).filter(r=>!prev.some(p=>p.requestId===r.requestId))]);
      if(received)setReceivedRequests(prev=>[...prev,...extractRequests(received).filter(r=>!prev.some(p=>p.requestId===r.requestId))]);
      setMoreHistory({sent:Boolean(sent&&!sent.data?.last),received:Boolean(received&&!received.data?.last)});setHistoryPage(page);
    } catch (e: any) {
      showToast(e.message || '이전 내역을 불러오지 못했습니다.');
    } finally {
      if (historyLoadRef.current === load) historyLoadRef.current = null;
      setLoadingMore(false);
    }
  };
  const [deletingHistory, setDeletingHistory] = useState(false);
  useEffect(() => {
    if (isLoading || loadingMore || processingId !== null || processingGroupKey || deletingHistory) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void loadTradeRequests(true);
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [historyPage, isLoading, loadingMore, processingId, processingGroupKey, deletingHistory]);
  const canDeleteHistory = (group: TradeRequestGroup) => group.requests.every(
    request => ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(request.status)
  );
  const deleteHistory = async (group: TradeRequestGroup) => {
    if (deletingHistory || !canDeleteHistory(group)) return;
    if (!(await showConfirm('내 거래 내역에서만 삭제됩니다. 상대방의 내역과 채팅은 유지됩니다.', '거래 내역 삭제', '삭제'))) return;
    setDeletingHistory(true);
    try {
      await apiRequest(API_ENDPOINTS.deleteTradeHistory, {
        method: 'DELETE', body: JSON.stringify(group.requests.map(request => request.requestId)),
      });
      historyLoadRef.current = null;
      const ids = new Set(group.requests.map(request => request.requestId));
      setSentRequests(current => current.filter(request => !ids.has(request.requestId)));
      setReceivedRequests(current => current.filter(request => !ids.has(request.requestId)));
      showToast('거래 내역을 삭제했습니다.');
    } catch (error: any) {
      showToast(error?.message || '삭제하지 못했습니다. 다시 시도해 주세요.');
    } finally { setDeletingHistory(false); }
  };

  const completedRequests = useMemo(
    () => [...receivedRequests, ...sentRequests].filter((request) => request.status === 'COMPLETED'),
    [receivedRequests, sentRequests]
  );

  const visibleRequests = useMemo(() => {
    if (activeTab === 'received') return receivedRequests.filter((request) => request.status !== 'COMPLETED');
    if (activeTab === 'sent') return sentRequests.filter((request) => request.status !== 'COMPLETED');
    return completedRequests;
  }, [activeTab, completedRequests, receivedRequests, sentRequests]);

  const visibleGroups = useMemo(() => {
    if (activeTab !== 'received') {
      return visibleRequests.map((request) => toSingleRequestGroup(request));
    }

    const groups = new Map<string, TradeRequestGroup>();
    visibleRequests.forEach((request) => {
      const shouldGroup = request.boardType === 'group';
      const key = shouldGroup ? `post-${request.postId || request.postTitle}` : `request-${request.requestId}`;
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, toSingleRequestGroup(request, key));
        return;
      }

      existing.requests.push(request);
      existing.status = getGroupStatus(existing.requests);
      existing.date = getGroupDate(existing.requests);
    });

    return Array.from(groups.values());
  }, [activeTab, visibleRequests]);

  const completedCount = lifetimeCompleted;
  const pendingReceivedCount = receivedRequests.filter((request) => request.status === 'PENDING').length;

  const handleRequestAction = async (
    requestId: number,
    action: 'accept' | 'reject' | 'complete'
  ) => {
    const actionLabel = action === 'accept' ? '수락' : action === 'reject' ? '거절' : '완료 확인';
    if (!(await showConfirm(`${actionLabel} 처리하시겠습니까?`, '거래 요청 처리', actionLabel))) return;

    setProcessingId(requestId);
    try {
      const endpoint =
        action === 'accept'
          ? API_ENDPOINTS.acceptTradeRequest(requestId)
          : action === 'reject'
            ? API_ENDPOINTS.rejectTradeRequest(requestId)
            : API_ENDPOINTS.completeTradeRequest(requestId);

      const response = await apiRequest(endpoint, { method: 'POST' });
      if (action === 'accept') {
        const chatRoomId = response?.data?.chatRoomId ?? response?.chatRoomId;
        showToast(chatRoomId ? '수락 처리했습니다.\n채팅방이 개설되었습니다.' : '수락 처리했습니다.');
      } else {
        showToast(`${actionLabel} 처리했습니다.`);
      }
      await loadTradeRequests();
    } catch (error: any) {
      showToast(error.message || `${actionLabel} 처리에 실패했습니다.`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleGroupAction = async (
    group: TradeRequestGroup,
    action: 'closeRecruitment' | 'complete'
  ) => {
    const actionLabel = action === 'closeRecruitment' ? '모집마감' : '거래 완료';
    if (!(await showConfirm(`${actionLabel} 처리하시겠습니까?`, '거래 요청 처리', actionLabel))) return;

    setProcessingGroupKey(group.key);
    try {
      if (action === 'closeRecruitment') {
        const response = await apiRequest(API_ENDPOINTS.closeGroupBuyRecruitment(group.postId), { method: 'POST' });
        const openedRequests = response?.data || response?.tradeRequests || response || [];
        showToast(Array.isArray(openedRequests) && openedRequests.length > 0 ? '모집을 마감했습니다.\n채팅방이 개설되었습니다.' : '모집을 마감했습니다.');
      } else {
        const acceptedRequests = group.requests.filter((request) => request.status === 'ACCEPTED');
        await Promise.all(
          acceptedRequests.map((request) =>
            apiRequest(API_ENDPOINTS.completeTradeRequest(request.requestId), { method: 'POST' })
          )
        );
        showToast('거래 완료 처리했습니다.');
      }
      await loadTradeRequests();
    } catch (error: any) {
      showToast(error.message || `${actionLabel} 처리에 실패했습니다.`);
    } finally {
      setProcessingGroupKey(null);
    }
  };

  const getTabLabel = (type: TransactionTab) => {
    switch (type) {
      case 'received':
        return `받은 요청 (${receivedRequests.filter((request) => request.status !== 'COMPLETED').length})`;
      case 'sent':
        return `보낸 요청 (${sentRequests.filter((request) => request.status !== 'COMPLETED').length})`;
      case 'completed':
        return `완료 (${completedCount})`;
    }
  };

  const getTabIcon = (type: TransactionTab) => {
    switch (type) {
      case 'received':
        return <ArrowDownLeft size={16} />;
      case 'sent':
        return <ArrowUpRight size={16} />;
      case 'completed':
        return <CheckCircle2 size={16} />;
    }
  };

  const getStatusLabel = (status: TradeStatus) => {
    switch (status) {
      case 'PENDING':
        return '대기 중';
      case 'ACCEPTED':
        return '수락됨';
      case 'REJECTED':
        return '거절됨';
      case 'CANCELLED':
        return '취소됨';
      case 'COMPLETED':
        return '완료됨';
    }
  };

  const getStatusClassName = (status: TradeStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-[#fef3c7] text-[#92400e]';
      case 'ACCEPTED':
        return 'bg-[#dbeafe] text-[#1e40af]';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-[#fee2e2] text-[#991b1b]';
      case 'COMPLETED':
        return 'bg-[#dcfce7] text-[#166534]';
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const renderActions = (request: TradeRequest) => {
    const isProcessing = processingId === request.requestId;

    if (activeTab === 'received' && request.status === 'PENDING') {
      return (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={() => handleRequestAction(request.requestId, 'accept')}
            disabled={isProcessing || !request.postOpen}
            className="flex items-center justify-center gap-1 rounded-xl bg-[#bef264] py-2 text-sm text-[#0a0a0a] disabled:opacity-50"
            style={{ fontWeight: 600 }}
          >
            <CheckCircle2 size={16} />
            {request.postOpen ? '수락' : '모집 종료'}
          </button>
          <button
            onClick={() => handleRequestAction(request.requestId, 'reject')}
            disabled={isProcessing}
            className="flex items-center justify-center gap-1 rounded-xl bg-[#fee2e2] py-2 text-sm text-[#991b1b] disabled:opacity-50"
            style={{ fontWeight: 600 }}
          >
            <XCircle size={16} />
            거절
          </button>
        </div>
      );
    }

    if(request.status==='COMPLETED') return <button disabled={reviewed.has(request.requestId)} onClick={()=>setReviewTarget(request)} className="mt-3 w-full rounded-xl border border-lime-300 py-2 text-sm disabled:opacity-50">{reviewed.has(request.requestId)?'평가 작성 완료':'거래 평가하기'}</button>;
    if (request.status === 'ACCEPTED') {
      const mineConfirmed=Boolean(currentUserId===request.requesterId?request.requesterConfirmedAt:request.writerConfirmedAt);
      const recruiting=request.boardType==='group'&&request.postOpen;
      return <div className="mt-3 flex gap-2">
        <button onClick={() => handleRequestAction(request.requestId, 'complete')} disabled={isProcessing||mineConfirmed||recruiting} className="flex-1 rounded-xl bg-[#bef264] py-2.5 text-sm font-semibold disabled:opacity-50">{recruiting?'모집 종료 후 완료 확인':mineConfirmed?'상대 완료 확인 대기':'완료 확인'}</button>
        {!request.exchangeTrade && <button onClick={()=>setMarketAction({request,action:'cancel'})} disabled={isProcessing} className="flex-1 rounded-xl border border-red-200 py-2.5 text-sm text-red-700">거래 취소</button>}
      </div>;
    }
    if (!request.exchangeTrade && request.status==='PENDING' && request.requesterId===currentUserId) {
      return <button onClick={()=>setMarketAction({request,action:'cancel'})} className="mt-3 w-full rounded-xl border border-red-200 py-2.5 text-sm text-red-700">요청 취소</button>;
    }
    if (request.marketTrade && request.reopenCandidate && request.writerId===currentUserId) {
      return <button onClick={()=>setMarketAction({request,action:'reopen'})} className="mt-3 w-full rounded-xl bg-[#bef264] py-2.5 text-sm font-semibold">다시 모집하기</button>;
    }

    return null;
  };

  const renderGroupActions=(group:TradeRequestGroup)=>{
    const active=group.requests.some(r=>r.status==='PENDING'||r.status==='ACCEPTED');
    const recruiting=group.requests.some(r=>r.postOpen);
    const groupOwner=activeTab==='received'&&group.boardType==='group';
    return <div className="space-y-3">
      {group.requests.map(r=><div key={r.requestId}>{group.requests.length>1&&<p className="mt-3 text-xs text-gray-600">{r.requesterNickname} · {getStatusLabel(r.status)}</p>}{renderActions(r)}{r.chatRoomId&&<button className="mt-2 mr-3 text-xs text-red-700" onClick={()=>setReportTrade(r.requestId)}>지난 대화 신고</button>}{['ACCEPTED','COMPLETED','CANCELLED'].includes(r.status)&&<button className="mt-2 text-xs text-gray-600" onClick={async()=>{
        const reason=await showPrompt('물품 미수령·잘못된 완료 처리 등 사유를 입력해주세요.','거래 신고·분쟁 접수');if(!reason?.trim())return;
        try{await createReport({targetType:'TRADE_REQUEST',targetId:r.requestId,reason:reason.trim()});showToast('거래 기록과 함께 접수했습니다. 설정의 내 신고 내역에서 처리 결과를 확인할 수 있습니다.');}catch(e:any){showToast(e.message);}
      }}>신고·분쟁 접수</button>}</div>)}
      {groupOwner&&!recruiting&&group.requests.some(r=>r.reopenCandidate)&&!group.requests.some(r=>r.status==='COMPLETED'||(r.status==='ACCEPTED'&&(r.writerConfirmedAt||r.requesterConfirmedAt)))&&<button className="w-full rounded-xl bg-lime-200 py-3 text-sm" onClick={()=>setReopenGroup(group.postId)}>빈자리 다시 모집</button>}
      {groupOwner&&active&&recruiting&&<button disabled={processingGroupKey===group.key} onClick={()=>handleGroupAction(group,'closeRecruitment')} className="mt-3 w-full rounded-xl bg-lime-200 py-3 text-sm">남은 대기 요청도 수락하고 모집마감</button>}
      {groupOwner&&active&&<button className="w-full rounded-xl border border-red-200 py-2 text-sm text-red-700" onClick={async()=>{
        if(!await showConfirm('진행 중인 참여 요청을 모두 취소하고 모집을 닫을까요? 송금 금액은 자동 환불되지 않습니다.','공동구매 전체 취소','전체 취소'))return;
        try{await apiRequest(API_ENDPOINTS.posts+'/'+group.postId+'/cancel-trades',{method:'POST',body:JSON.stringify({reason:'기타'})});await loadTradeRequests();}catch(e:any){showToast(e.message||'취소하지 못했습니다.');}
      }}>공동구매 전체 취소</button>}
    </div>;
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          거래 내역
        </h1>
        <button onClick={() => void loadTradeRequests()} className="text-[#2d3748]" disabled={isLoading || loadingMore || deletingHistory}>
          <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white border-b border-[#e2e8f0] px-5 py-3">
        <div className="flex gap-2">
          {(['received', 'sent', 'completed'] as TransactionTab[]).map((type) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-colors ${
                activeTab === type
                  ? 'bg-[#bef264] text-[#0a0a0a]'
                  : 'bg-[#f7fafc] text-[#718096] hover:bg-[#e2e8f0]'
              }`}
              style={{ fontWeight: activeTab === type ? 600 : 500 }}
            >
              {getTabIcon(type)}
              <span className="text-xs">{getTabLabel(type)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f7fafc]">
        <div className="bg-white px-5 py-4 mb-2">
          <div className="bg-gradient-to-r from-[#f0fff4] to-[#ecfccb] border border-[#bef264] rounded-2xl p-4">
            <h3 className="text-xs text-[#65a30d] mb-3" style={{ fontWeight: 600 }}>
              거래 통계
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl text-[#2d3748] mb-1" style={{ fontWeight: 700 }}>
                  {completedCount}
                </p>
                <p className="text-xs text-[#718096]">완료 거래</p>
              </div>
              <div>
                <p className="text-2xl text-[#2d3748] mb-1" style={{ fontWeight: 700 }}>
                  {pendingReceivedCount}
                </p>
                <p className="text-xs text-[#718096]">대기 요청</p>
              </div>
            </div>
          </div>
        </div>

        {loadError && (
          <div className="mx-5 mb-2 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-xs leading-5 text-[#92400e]">
            {loadError}
          </div>
        )}

        <div className="bg-white px-5 py-4">
          {isLoading ? (
            <div className="text-center py-20">
              <RefreshCw size={36} className="mx-auto mb-4 text-[#a0aec0] animate-spin" />
              <p className="text-sm text-[#718096]">거래 내역을 불러오는 중입니다</p>
            </div>
          ) : visibleGroups.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">!</div>
              <p className="text-lg text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
                거래 내역이 없습니다
              </p>
              <p className="text-sm text-[#718096]">
                거래 요청이 생기면 이곳에서 확인할 수 있습니다
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleGroups.map((group) => {
                const tone = getBoardTone(group.boardType);

                return (
                <div
                  key={`${activeTab}-${group.key}`}
                  className={`relative rounded-2xl border p-4 ${tone.card}`}
                >
                  {canDeleteHistory(group) && (
                    <button type="button" aria-label={`${group.postTitle} 거래 내역 삭제`}
                      onClick={() => deleteHistory(group)} disabled={deletingHistory}
                      className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full text-[#718096] hover:bg-black/5 disabled:opacity-40">
                      <X size={17} />
                    </button>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2 pr-7">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusClassName(group.status)}`}>
                          {getStatusLabel(group.status)}
                        </span>
                        <span className="text-xs text-[#a0aec0]">
                          {formatDate(group.date)}
                        </span>
                      </div>
                      <h3 className="text-sm text-[#2d3748] mb-1 truncate pr-7" style={{ fontWeight: 600 }}>
                        {group.postTitle || '게시글 제목 없음'}
                      </h3>
                      {group.requests.filter(request=>request.cancellationReason).map(request=><p key={request.requestId} className="mt-2 text-xs text-gray-600">{request.cancelledBy===currentUserId?'내가 취소':'상대방이 취소'} · {request.cancellationReason}</p>)}
                      <div className="mt-3 space-y-2">
                        {group.requests.map((request) => {
                          const partner = getPartner(request);
                          return (
                          <div
                            key={request.requestId}
                            className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-2 ${tone.profileBorder}`}
                          >
                            <div className="w-9 h-9 rounded-full bg-[#e2e8f0] flex items-center justify-center overflow-hidden flex-shrink-0">
                              {partner.profileImage ? (
                                <BackendImage
                                  src={resolveImageUrl(partner.profileImage)}
                                  alt={partner.nickname || '거래 상대'}
                                  className="w-full h-full object-cover"
                                  fallbackSrc="/assets/profile-placeholder.svg"
                                />
                              ) : (
                                <User size={18} className="text-[#718096]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-[#2d3748]" style={{ fontWeight: 700 }}>
                                {partner.nickname || '사용자'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedProfile(request)}
                              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${tone.profileButton}`}
                              style={{ fontWeight: 700 }}
                            >
                              프로필보기
                            </button>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {renderGroupActions(group)}
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>

      {(moreHistory.sent||moreHistory.received)&&<button disabled={loadingMore} onClick={()=>void loadMoreHistory()} className="w-full bg-white p-3 text-sm">{loadingMore?'불러오는 중…':'이전 거래 내역 더 보기'}</button>}
      {reportTrade!==null&&<TradeChatReportDialog requestId={reportTrade} onClose={()=>setReportTrade(null)}/>}
      {reopenGroup!==null&&<GroupReopenDialog postId={reopenGroup} onClose={()=>setReopenGroup(null)} onDone={()=>{setReopenGroup(null);void loadTradeRequests();showToast('빈자리 모집을 다시 시작했습니다.');}}/>}
      {reviewTarget&&<ReviewDialog requestId={reviewTarget.requestId} title={reviewTarget.postTitle} onClose={()=>setReviewTarget(null)} onDone={()=>{setReviewed(prev=>new Set([...prev,reviewTarget.requestId]));setReviewTarget(null);}}/>}
      {marketAction && <MarketTradeActionDialog requestId={marketAction.request.requestId} title={marketAction.request.postTitle} action={marketAction.action} expirationDate={marketAction.request.expirationDate} onClose={()=>setMarketAction(null)} onDone={()=>{setMarketAction(null);void loadTradeRequests();}} />}
      {selectedProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4" onClick={() => setSelectedProfile(null)}>
          <div
            className="w-full max-w-sm rounded-3xl border border-[#e2e8f0] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#e2e8f0] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedPartner?.profileImage ? (
                    <BackendImage
                      src={resolveImageUrl(selectedPartner.profileImage)}
                      alt={selectedPartner.nickname || '거래 상대'}
                      className="w-full h-full object-cover"
                      fallbackSrc="/assets/profile-placeholder.svg"
                    />
                  ) : (
                    <User size={32} className="text-[#718096]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg text-[#2d3748]" style={{ fontWeight: 700 }}>
                      {selectedPartner?.nickname || '거래 상대'}
                    </h2>
                    <div className="flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-1">
                      <span className="text-xs">🌱</span>
                      <span className="text-xs text-[#16a34a]" style={{ fontWeight: 600 }}>
                        신선도 {Math.round(selectedPartner?.freshness ?? 50)}% · {stripFreshnessIcon(selectedPartner?.freshnessLabel || getFreshnessLabel(selectedPartner?.freshness ?? 50))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProfile(null)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f7fafc] text-[#718096] hover:bg-[#e2e8f0]"
                aria-label="프로필 닫기"
              >
                <X size={18} />
              </button>
            </div>

            <div className={`rounded-2xl border p-4 ${getBoardTone(selectedProfile.boardType).stats}`}>
              <h3 className={`mb-3 text-xs ${getBoardTone(selectedProfile.boardType).statsTitle}`} style={{ fontWeight: 600 }}>활동 통계</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="mb-1 text-2xl text-[#2d3748]" style={{ fontWeight: 700 }}>
                    {selectedPartner?.shareCount ?? 0}
                  </p>
                  <p className="text-xs text-[#718096]">나눔 완료</p>
                </div>
                <div className={`border-x text-center ${getBoardTone(selectedProfile.boardType).divider}`}>
                  <p className="mb-1 text-2xl text-[#2d3748]" style={{ fontWeight: 700 }}>
                    {selectedPartner?.saleCount ?? 0}
                  </p>
                  <p className="text-xs text-[#718096]">판매 완료</p>
                </div>
                <div className="text-center">
                  <p className="mb-1 text-2xl text-[#2d3748]" style={{ fontWeight: 700 }}>
                    {selectedPartner?.groupBuyCount ?? 0}
                  </p>
                  <p className="text-xs text-[#718096]">공구 참여</p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
