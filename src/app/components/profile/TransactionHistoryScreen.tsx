import { useEffect, useMemo, useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle, RefreshCw, User } from 'lucide-react';
import { API_ENDPOINTS, apiRequest, resolveImageUrl } from '../../api/config';
import BackendImage from '../common/BackendImage';
import { showToast, showConfirm } from '../../utils/feedback';

interface TransactionHistoryScreenProps {
  onClose: () => void;
}

type TransactionTab = 'received' | 'sent' | 'completed';
type TradeStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';

interface TradeRequest {
  requestId: number;
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
  const [activeTab, setActiveTab] = useState<TransactionTab>('received');
  const [sentRequests, setSentRequests] = useState<TradeRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<TradeRequest[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<TradeRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [processingGroupKey, setProcessingGroupKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    loadTradeRequests();
  }, []);

  const normalizeRequest = (request: any): TradeRequest => ({
    requestId: Number(request.requestId ?? request.id ?? request.tradeRequestId),
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
    chatRoomId: getNumberValue(request.chatRoomId ?? request.chatRoom?.id),
    boardType: getBoardType(request),
    status: request.status ?? 'PENDING',
    createdAt: request.createdAt,
    respondedAt: request.respondedAt,
    completedAt: request.completedAt,
  });

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

  const extractRequests = (response: any): TradeRequest[] => {
    const rawRequests =
      response.tradeRequests ||
      response.requests ||
      response.data?.tradeRequests ||
      response.data?.requests ||
      response.data ||
      response;

    return Array.isArray(rawRequests) ? rawRequests.map(normalizeRequest) : [];
  };

  const loadTradeRequests = async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const sentResult = await apiRequest(API_ENDPOINTS.mypageTradeRequests, { method: 'GET' })
        .then((response) => ({ ok: true as const, response }))
        .catch((error) => ({ ok: false as const, error }));

      const receivedResult = await apiRequest(API_ENDPOINTS.mypageReceivedTradeRequests, { method: 'GET' })
        .then((response) => ({ ok: true as const, response }))
        .catch((error) => ({ ok: false as const, error }));

      if (sentResult.ok) {
        setSentRequests(extractRequests(sentResult.response));
      } else {
        console.warn('보낸 거래 요청 목록 조회에 실패했습니다.', sentResult.error);
        setSentRequests([]);
      }

      if (receivedResult.ok) {
        setReceivedRequests(extractRequests(receivedResult.response));
      } else {
        console.warn('받은 거래 요청 목록 조회에 실패했습니다.', receivedResult.error);
        setReceivedRequests([]);
      }

      if (!sentResult.ok || !receivedResult.ok) {
        const failedTargets = [
          !sentResult.ok ? '보낸 요청' : '',
          !receivedResult.ok ? '받은 요청' : '',
        ].filter(Boolean).join(', ');
        setLoadError(`${failedTargets}을 불러오지 못했습니다. 다시 로그인해도 반복되면 백엔드 권한 설정을 확인해야 합니다.`);
      }
    } catch (error: any) {
      console.warn('거래 요청 목록 조회에 실패했습니다.', error);
      setLoadError(error.message || '거래 요청 목록을 불러오지 못했습니다.');
      setSentRequests([]);
      setReceivedRequests([]);
    } finally {
      setIsLoading(false);
    }
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

  const completedCount = completedRequests.length;
  const pendingReceivedCount = receivedRequests.filter((request) => request.status === 'PENDING').length;

  const handleRequestAction = async (
    requestId: number,
    action: 'accept' | 'reject' | 'complete'
  ) => {
    const actionLabel = action === 'accept' ? '수락' : action === 'reject' ? '거절' : '거래 완료';
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
        showToast(
          Array.isArray(openedRequests) && openedRequests.length > 0
            ? `모집을 마감했습니다.\n${openedRequests.length}개의 채팅방이 개설되었습니다.`
            : '모집을 마감했습니다.'
        );
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
            disabled={isProcessing}
            className="flex items-center justify-center gap-1 rounded-xl bg-[#bef264] py-2 text-sm text-[#0a0a0a] disabled:opacity-50"
            style={{ fontWeight: 600 }}
          >
            <CheckCircle2 size={16} />
            수락
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

    if (request.status === 'ACCEPTED') {
      return (
        <button
          onClick={() => handleRequestAction(request.requestId, 'complete')}
          disabled={isProcessing}
          className="mt-3 w-full rounded-xl bg-[#bef264] py-2.5 text-sm text-[#0a0a0a] disabled:opacity-50"
          style={{ fontWeight: 600 }}
        >
          거래 완료
        </button>
      );
    }

    return null;
  };

  const renderGroupActions = (group: TradeRequestGroup) => {
    if (group.requests.length === 1 && group.boardType !== 'group') {
      return renderActions(group.requests[0]);
    }

    const isProcessing = processingGroupKey === group.key;
    const hasPending = group.requests.some((request) => request.status === 'PENDING');
    const hasAccepted = group.requests.some((request) => request.status === 'ACCEPTED');

    if (activeTab === 'received' && group.boardType === 'group' && hasPending) {
      return (
        <button
          onClick={() => handleGroupAction(group, 'closeRecruitment')}
          disabled={isProcessing}
          className="mt-3 w-full rounded-xl bg-[#bef264] py-2.5 text-sm text-[#0a0a0a] disabled:opacity-50"
          style={{ fontWeight: 600 }}
        >
          모집마감
        </button>
      );
    }

    if (hasAccepted) {
      return (
        <button
          onClick={() => handleGroupAction(group, 'complete')}
          disabled={isProcessing}
          className="mt-3 w-full rounded-xl bg-[#bef264] py-2.5 text-sm text-[#0a0a0a] disabled:opacity-50"
          style={{ fontWeight: 600 }}
        >
          거래 완료
        </button>
      );
    }

    return null;
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
        <button onClick={loadTradeRequests} className="text-[#2d3748]" disabled={isLoading}>
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
                  className={`rounded-2xl border p-4 ${tone.card}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusClassName(group.status)}`}>
                          {getStatusLabel(group.status)}
                        </span>
                        <span className="text-xs text-[#a0aec0]">
                          {formatDate(group.date)}
                        </span>
                      </div>
                      <h3 className="text-sm text-[#2d3748] mb-1 truncate" style={{ fontWeight: 600 }}>
                        {group.postTitle || '게시글 제목 없음'}
                      </h3>
                      <div className="mt-3 space-y-2">
                        {group.requests.map((request) => (
                          <div
                            key={request.requestId}
                            className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-2 ${tone.profileBorder}`}
                          >
                            <div className="w-9 h-9 rounded-full bg-[#e2e8f0] flex items-center justify-center overflow-hidden flex-shrink-0">
                              {request.requesterProfileImage ? (
                                <BackendImage
                                  src={resolveImageUrl(request.requesterProfileImage)}
                                  alt={request.requesterNickname || '요청자'}
                                  className="w-full h-full object-cover"
                                  fallbackSrc="/assets/profile-placeholder.svg"
                                />
                              ) : (
                                <User size={18} className="text-[#718096]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-[#2d3748]" style={{ fontWeight: 700 }}>
                                {request.requesterNickname || '사용자'}
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
                        ))}
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

      {selectedProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4" onClick={() => setSelectedProfile(null)}>
          <div
            className="w-full max-w-sm rounded-3xl border border-[#e2e8f0] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#e2e8f0] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedProfile.requesterProfileImage ? (
                    <BackendImage
                      src={resolveImageUrl(selectedProfile.requesterProfileImage)}
                      alt={selectedProfile.requesterNickname || '요청자'}
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
                      {selectedProfile.requesterNickname || '요청자'}
                    </h2>
                    <div className="flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-1">
                      <span className="text-xs">🌱</span>
                      <span className="text-xs text-[#16a34a]" style={{ fontWeight: 600 }}>
                        신선도 {Math.round(selectedProfile.requesterFreshness ?? 50)}% · {stripFreshnessIcon(getFreshnessLabel(selectedProfile.requesterFreshness ?? 50))}
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
                    {selectedProfile.requesterShareCompletedCount ?? 0}
                  </p>
                  <p className="text-xs text-[#718096]">나눔 완료</p>
                </div>
                <div className={`border-x text-center ${getBoardTone(selectedProfile.boardType).divider}`}>
                  <p className="mb-1 text-2xl text-[#2d3748]" style={{ fontWeight: 700 }}>
                    {selectedProfile.requesterSaleCompletedCount ?? 0}
                  </p>
                  <p className="text-xs text-[#718096]">판매 완료</p>
                </div>
                <div className="text-center">
                  <p className="mb-1 text-2xl text-[#2d3748]" style={{ fontWeight: 700 }}>
                    {selectedProfile.requesterGroupBuyCount ?? 0}
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
