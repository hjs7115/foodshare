import { useEffect, useState } from 'react';
import { Ban, RefreshCw, User, X } from 'lucide-react';
import { getBlockedUsers, unblockUser, resolveImageUrl } from '../../api/config';
import BackendImage from '../common/BackendImage';

interface BlockedUsersScreenProps {
  onClose: () => void;
}

interface BlockedUser {
  id: number;
  nickname: string;
  email?: string;
  profileImage?: string;
  blockedAt?: string;
}

export default function BlockedUsersScreen({ onClose }: BlockedUsersScreenProps) {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const normalizeBlockedUser = (item: any): BlockedUser => {
    const user = item.user || item.blockedUser || item.targetUser || item;
    return {
      id: Number(user.id ?? user.userId ?? user.memberId ?? item.userId ?? item.blockedUserId),
      nickname: user.nickname ?? user.name ?? user.username ?? item.nickname ?? '사용자',
      email: user.email ?? item.email,
      profileImage: user.profileImage ?? user.profileImageUrl ?? item.profileImage,
      blockedAt: item.blockedAt ?? item.createdAt,
    };
  };

  const extractBlockedUsers = (response: any): BlockedUser[] => {
    const rawUsers =
      response.blockedUsers ||
      response.users ||
      response.data?.blockedUsers ||
      response.data?.users ||
      response.data ||
      response;

    return Array.isArray(rawUsers)
      ? rawUsers.map(normalizeBlockedUser).filter((user) => Number.isFinite(user.id))
      : [];
  };

  const loadBlockedUsers = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await getBlockedUsers();
      setBlockedUsers(extractBlockedUsers(response));
    } catch (error: any) {
      console.warn('차단 목록 조회에 실패했습니다.', error);
      setLoadError(error.message || '차단 목록을 불러오지 못했습니다.');
      setBlockedUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (user: BlockedUser) => {
    if (!confirm(`${user.nickname}님 차단을 해제하시겠습니까?`)) return;

    setProcessingId(user.id);
    try {
      await unblockUser(user.id);
      setBlockedUsers((prevUsers) => prevUsers.filter((blockedUser) => blockedUser.id !== user.id));
      alert('차단을 해제했습니다.');
    } catch (error: any) {
      alert(error.message || '차단 해제에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          차단 목록
        </h1>
        <button onClick={loadBlockedUsers} className="text-[#2d3748]" disabled={isLoading}>
          <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f7fafc] px-5 py-4">
        {loadError && (
          <div className="mb-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-xs leading-5 text-[#92400e]">
            {loadError}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-20">
            <RefreshCw size={36} className="mx-auto mb-4 text-[#a0aec0] animate-spin" />
            <p className="text-sm text-[#718096]">차단 목록을 불러오는 중입니다</p>
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-[#e2e8f0] rounded-full flex items-center justify-center mx-auto mb-4">
              <Ban size={36} className="text-[#a0aec0]" />
            </div>
            <p className="text-lg text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
              차단한 사용자가 없습니다
            </p>
            <p className="text-sm text-[#718096]">
              차단한 사용자는 이곳에서 해제할 수 있습니다
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-2xl border border-[#e2e8f0] p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#e2e8f0] flex items-center justify-center overflow-hidden">
                  {user.profileImage ? (
                    <BackendImage
                      src={resolveImageUrl(user.profileImage)}
                      alt={user.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={22} className="text-[#718096]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#2d3748] truncate" style={{ fontWeight: 600 }}>
                    {user.nickname}
                  </p>
                  {user.email && <p className="text-xs text-[#718096] truncate">{user.email}</p>}
                  {user.blockedAt && <p className="text-xs text-[#a0aec0] mt-0.5">{formatDate(user.blockedAt)} 차단</p>}
                </div>
                <button
                  onClick={() => handleUnblock(user)}
                  disabled={processingId === user.id}
                  className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs text-[#2d3748] hover:border-[#bef264] disabled:opacity-50"
                  style={{ fontWeight: 600 }}
                >
                  해제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
