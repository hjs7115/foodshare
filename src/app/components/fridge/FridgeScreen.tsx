import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Bell,
  Leaf,
  MessageCircle,
  Package,
  Plus,
  ShoppingCart,
  Snowflake,
  Trash2,
  User,
  X,
} from 'lucide-react';
import CreatePostScreen from '../board/CreatePostScreen';
import NotificationsScreen from '../common/NotificationsScreen';
import BottomNavIcon from '../common/BottomNavIcon';
import { getNotifications } from '../../api/config';
import { showToast, showConfirm } from '../../utils/feedback';

const FRIDGE_STORAGE_KEY = 'foodshareFridgeItems';

interface FridgeItem {
  id: number;
  name: string;
  amount: string;
  expiryDate: string;
  storagePlace: string;
  memo: string;
  createdAt: string;
}

interface FridgeItemForm {
  name: string;
  amount: string;
  expiryDate: string;
  storagePlace: string;
  memo: string;
}

const emptyForm: FridgeItemForm = {
  name: '',
  amount: '',
  expiryDate: '',
  storagePlace: '냉장',
  memo: '',
};

export default function FridgeScreen({
  onNavigate,
  chatUnreadCount = 0,
}: {
  onNavigate: (screen: string) => void;
  chatUnreadCount?: number;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [editingItem, setEditingItem] = useState<FridgeItem | null>(null);

  useEffect(() => {
    setItems(loadStoredFridgeItems());
    loadUnreadNotifications();
  }, []);

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

  const itemsByDate = useMemo(() => {
    const map = new Map<string, FridgeItem[]>();

    items.forEach((item) => {
      const key = item.expiryDate;
      map.set(key, [...(map.get(key) || []), item]);
    });

    return map;
  }, [items]);

  const selectedItems = itemsByDate.get(toDateKey(selectedDate)) || [];
  const expiringSoonItems = useMemo(
    () => [...items]
      .sort((a, b) => parseDateKey(a.expiryDate).getTime() - parseDateKey(b.expiryDate).getTime())
      .slice(0, 5),
    [items]
  );

  const monthDays = buildCalendarDays(currentMonth);
  const monthLabel = currentMonth.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });

  const saveItems = (nextItems: FridgeItem[]) => {
    const sortedItems = [...nextItems].sort(
      (a, b) => parseDateKey(a.expiryDate).getTime() - parseDateKey(b.expiryDate).getTime()
    );
    setItems(sortedItems);
    localStorage.setItem(FRIDGE_STORAGE_KEY, JSON.stringify(sortedItems));
  };

  const openCreateForm = () => {
    setEditingItem(null);
    setShowItemForm(true);
  };

  const openEditForm = (item: FridgeItem) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleSaveItem = (form: FridgeItemForm) => {
    const trimmedName = form.name.trim();
    const trimmedAmount = form.amount.trim();

    if (!trimmedName || !form.expiryDate) {
      showToast('식재료 이름과 유통기한을 입력해주세요.');
      return;
    }

    if (editingItem) {
      saveItems(items.map((item) => (
        item.id === editingItem.id
          ? {
              ...item,
              name: trimmedName,
              amount: trimmedAmount || '수량 미정',
              expiryDate: form.expiryDate,
              storagePlace: form.storagePlace,
              memo: form.memo.trim(),
            }
          : item
      )));
    } else {
      saveItems([
        ...items,
        {
          id: Date.now(),
          name: trimmedName,
          amount: trimmedAmount || '수량 미정',
          expiryDate: form.expiryDate,
          storagePlace: form.storagePlace,
          memo: form.memo.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
      setSelectedDate(parseDateKey(form.expiryDate));
      setCurrentMonth(parseDateKey(form.expiryDate));
    }

    setShowItemForm(false);
    setEditingItem(null);
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!(await showConfirm('이 식재료 기록을 삭제할까요?', '식재료 삭제', '삭제'))) return;
    saveItems(items.filter((item) => item.id !== itemId));
    setShowItemForm(false);
    setEditingItem(null);
  };

  const moveMonth = (amount: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + amount, 1));
  };

  return (
    <div className="bg-[#f7fafc] size-full flex flex-col">
      <div className="bg-gradient-to-r from-[#e0f2fe] to-[#0284c7] border-b-2 border-[#0284c7] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#e2e8f0]">
            <Snowflake size={22} className="text-[#0284c7]" />
          </div>
          <div>
            <h1 className="text-lg text-[#1a202c]" style={{ fontWeight: 800 }}>우리 냉장고</h1>
            <p className="text-xs text-[#075985]">내 식재료와 유통기한을 기록해요</p>
          </div>
        </div>
        <button onClick={() => setShowNotifications(true)} className="text-[#2d3748] relative" aria-label="알림 열기">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#e2e8f0] hover:border-[#0284c7] transition-colors">
            <Bell size={20} />
          </div>
          {hasUnreadNotifications && (
            <div className="absolute top-0 right-0 w-2 h-2 bg-[#ef4444] rounded-full border-2 border-white" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-28">
        <div className="mb-4 rounded-2xl border border-[#bae6fd] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => moveMonth(-1)}
              className="w-9 h-9 rounded-full bg-[#f8fafc] flex items-center justify-center hover:bg-[#e0f2fe] transition-colors"
              aria-label="이전 달"
            >
              <ChevronLeft size={20} className="text-[#334155]" />
            </button>
            <div className="flex items-center gap-2 text-[#1a202c]" style={{ fontWeight: 800 }}>
              <CalendarDays size={20} className="text-[#0284c7]" />
              <span>{monthLabel}</span>
            </div>
            <button
              onClick={() => moveMonth(1)}
              className="w-9 h-9 rounded-full bg-[#f8fafc] flex items-center justify-center hover:bg-[#e0f2fe] transition-colors"
              aria-label="다음 달"
            >
              <ChevronRight size={20} className="text-[#334155]" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="text-center text-xs text-[#718096]" style={{ fontWeight: 700 }}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const dateKey = toDateKey(day.date);
              const dayItems = itemsByDate.get(dateKey) || [];
              const isCurrentMonth = day.date.getMonth() === currentMonth.getMonth();
              const isSelected = toDateKey(selectedDate) === dateKey;
              const isToday = toDateKey(new Date()) === dateKey;

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(day.date)}
                  className={`relative aspect-square rounded-xl border text-sm transition-all ${
                    isSelected
                      ? 'border-[#0284c7] bg-[#e0f2fe] text-[#0f172a]'
                      : isToday
                        ? 'border-[#bef264] bg-[#f0fdf4] text-[#0f172a]'
                        : 'border-transparent bg-[#f8fafc] text-[#334155] hover:bg-[#e0f2fe]'
                  } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                  style={{ fontWeight: isSelected || isToday ? 800 : 500 }}
                >
                  <span>{day.date.getDate()}</span>
                  {dayItems.length > 0 && (
                    <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                      {dayItems.slice(0, 3).map((item) => (
                        <span key={item.id} className={`h-1.5 w-1.5 rounded-full ${getExpiryDotClass(item.expiryDate)}`} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <SummaryTile label="등록 식재료" value={items.length} />
          <SummaryTile label="오늘 만료" value={items.filter((item) => item.expiryDate === toDateKey(new Date())).length} />
          <SummaryTile label="3일 이내" value={items.filter((item) => getDaysLeft(item.expiryDate) <= 3).length} />
        </div>

        <section className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base text-[#1a202c]" style={{ fontWeight: 800 }}>
              {selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
            </h2>
            <span className="text-xs text-[#718096]">{selectedItems.length}개</span>
          </div>

          {selectedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cbd5e0] bg-white p-8 text-center">
              <Package size={32} className="mx-auto mb-3 text-[#94a3b8]" />
              <p className="text-sm text-[#2d3748]" style={{ fontWeight: 700 }}>이 날짜에는 식재료가 없어요</p>
              <p className="mt-1 text-xs text-[#718096]">추가 버튼으로 실제 보유 식재료를 기록해보세요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedItems.map((item) => (
                <FridgeItemRow key={item.id} item={item} onClick={() => openEditForm(item)} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-base text-[#1a202c]" style={{ fontWeight: 800 }}>임박한 유통기한</h2>
          <div className="space-y-2">
            {expiringSoonItems.length === 0 ? (
              <div className="rounded-2xl bg-white p-5 text-sm text-[#718096]">
                기록된 식재료가 없습니다.
              </div>
            ) : (
              expiringSoonItems.map((item) => (
                <FridgeItemRow key={item.id} item={item} onClick={() => openEditForm(item)} compact />
              ))
            )}
          </div>
        </section>
      </div>

      <button
        onClick={openCreateForm}
        className="fixed bottom-24 right-5 z-40 flex h-13 items-center justify-center gap-1.5 rounded-full bg-[#0284c7] px-5 py-3 text-white shadow-lg hover:bg-[#0369a1] transition-colors"
        aria-label="식재료 추가"
      >
        <Plus size={20} />
        <span className="text-sm" style={{ fontWeight: 800 }}>추가</span>
      </button>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-3 py-4 grid grid-cols-5 z-40">
        <button onClick={() => onNavigate('나눔 및 판매')} className="flex flex-col items-center gap-1">
          <BottomNavIcon icon={Leaf} color="#65a30d" borderColor="#bef264" />
          <span className="text-[11px] text-[#bef264]">나눔/판매</span>
        </button>
        <button onClick={() => onNavigate('공동구매')} className="flex flex-col items-center gap-1">
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
        <button className="flex flex-col items-center gap-1">
          <BottomNavIcon icon={Snowflake} color="#0284c7" borderColor="#bae6fd" />
          <span className="text-[11px] text-[#0284c7]">냉장고</span>
        </button>
        <button onClick={() => onNavigate('profile')} className="flex flex-col items-center gap-1">
          <BottomNavIcon icon={User} color="#2d3748" borderColor="#cbd5e0" />
          <span className="text-[11px] text-[#2d3748]">내정보</span>
        </button>
      </div>

      {showItemForm && (
        <FridgeItemFormScreen
          item={editingItem}
          onClose={() => {
            setShowItemForm(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          onDelete={editingItem ? () => handleDeleteItem(editingItem.id) : undefined}
        />
      )}

      {showCreatePost && (
        <CreatePostScreen
          currentBoard="나눔 및 판매"
          onClose={() => setShowCreatePost(false)}
          onCreatePost={() => setShowCreatePost(false)}
        />
      )}

      {showNotifications && (
        <NotificationsScreen
          onClose={() => {
            setShowNotifications(false);
            loadUnreadNotifications();
          }}
          onOpenTradeHistory={() => onNavigate('tradeHistory')}
        />
      )}
    </div>
  );
}

function FridgeItemFormScreen({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: FridgeItem | null;
  onClose: () => void;
  onSave: (form: FridgeItemForm) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<FridgeItemForm>(() => (
    item
      ? {
          name: item.name,
          amount: item.amount,
          expiryDate: item.expiryDate,
          storagePlace: item.storagePlace,
          memo: item.memo,
        }
      : {
          ...emptyForm,
          expiryDate: toDateKey(new Date()),
        }
  ));

  const updateForm = (key: keyof FridgeItemForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f7fafc] flex flex-col">
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f7fafc] transition-colors"
          aria-label="닫기"
        >
          <X size={24} className="text-[#2d3748]" />
        </button>
        <h1 className="text-lg text-[#1a202c]" style={{ fontWeight: 800 }}>
          {item ? '식재료 수정' : '식재료 추가'}
        </h1>
        <button
          type="submit"
          form="fridge-item-form"
          className="text-sm text-[#0284c7]"
          style={{ fontWeight: 800 }}
        >
          저장
        </button>
      </div>

      <form id="fridge-item-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 pb-28">
        <div className="space-y-5">
          <div>
            <label htmlFor="fridge-name" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 700 }}>
              식재료 이름
            </label>
            <input
              id="fridge-name"
              type="text"
              value={form.name}
              onChange={(event) => updateForm('name', event.target.value)}
              placeholder="예: 양배추, 토마토, 계란"
              className="w-full rounded-2xl border-2 border-[#e2e8f0] bg-white px-4 py-3 text-[#1a202c] outline-none focus:border-[#7dd3fc]"
              required
            />
          </div>

          <div>
            <label htmlFor="fridge-amount" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 700 }}>
              수량
            </label>
            <input
              id="fridge-amount"
              type="text"
              value={form.amount}
              onChange={(event) => updateForm('amount', event.target.value)}
              placeholder="예: 2개, 반 통, 500g"
              className="w-full rounded-2xl border-2 border-[#e2e8f0] bg-white px-4 py-3 text-[#1a202c] outline-none focus:border-[#7dd3fc]"
            />
          </div>

          <div>
            <label htmlFor="fridge-expiry" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 700 }}>
              유통기한
            </label>
            <input
              id="fridge-expiry"
              type="date"
              value={form.expiryDate}
              onChange={(event) => updateForm('expiryDate', event.target.value)}
              className="w-full rounded-2xl border-2 border-[#e2e8f0] bg-white px-4 py-3 text-[#1a202c] outline-none focus:border-[#7dd3fc]"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 700 }}>
              보관 위치
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['냉장', '냉동', '실온'].map((place) => (
                <button
                  key={place}
                  type="button"
                  onClick={() => updateForm('storagePlace', place)}
                  className={`rounded-2xl border-2 px-3 py-3 text-sm transition-colors ${
                    form.storagePlace === place
                      ? 'border-[#0284c7] bg-[#e0f2fe] text-[#075985]'
                      : 'border-[#e2e8f0] bg-white text-[#718096]'
                  }`}
                  style={{ fontWeight: 800 }}
                >
                  {place}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="fridge-memo" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 700 }}>
              메모
            </label>
            <textarea
              id="fridge-memo"
              value={form.memo}
              onChange={(event) => updateForm('memo', event.target.value)}
              placeholder="구매처, 상태, 빨리 먹어야 할 이유 등을 적어두세요"
              className="min-h-[130px] w-full resize-none rounded-2xl border-2 border-[#e2e8f0] bg-white px-4 py-3 text-[#1a202c] outline-none focus:border-[#7dd3fc]"
            />
          </div>
        </div>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#fecaca] bg-[#fff5f5] px-4 py-3 text-[#dc2626]"
            style={{ fontWeight: 800 }}
          >
            <Trash2 size={18} />
            삭제하기
          </button>
        )}
      </form>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white p-3 text-center">
      <p className="text-xl text-[#0f172a]" style={{ fontWeight: 800 }}>{value}</p>
      <p className="mt-1 text-xs text-[#718096]">{label}</p>
    </div>
  );
}

function FridgeItemRow({ item, onClick, compact = false }: { item: FridgeItem; onClick: () => void; compact?: boolean }) {
  const daysLeft = getDaysLeft(item.expiryDate);
  const status = getExpiryStatus(daysLeft);

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-[#e2e8f0] bg-white p-3 text-left shadow-sm hover:border-[#7dd3fc] transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 flex-shrink-0 rounded-xl bg-[#e0f2fe] flex items-center justify-center">
          <Package size={24} className="text-[#0284c7]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-[#1a202c]" style={{ fontWeight: 800 }}>{item.name}</p>
              {!compact && (
                <p className="mt-1 truncate text-xs text-[#718096]">
                  {item.amount} · {item.storagePlace}
                </p>
              )}
            </div>
            <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${status.className}`} style={{ fontWeight: 800 }}>
              {status.label}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-[#718096]">
            <Clock size={14} />
            <span>{formatDate(parseDateKey(item.expiryDate))}</span>
            {item.memo && !compact && <span className="truncate">· {item.memo}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

function loadStoredFridgeItems(): FridgeItem[] {
  try {
    const raw = localStorage.getItem(FRIDGE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item?.name && item?.expiryDate)
      : [];
  } catch {
    localStorage.removeItem(FRIDGE_STORAGE_KEY);
    return [];
  }
}

function buildCalendarDays(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return { date: day };
  });
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysLeft(dateKey: string): number {
  const today = startOfDay(new Date());
  const date = parseDateKey(dateKey);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function getExpiryStatus(daysLeft: number) {
  if (daysLeft < 0) return { label: '만료', className: 'bg-[#fee2e2] text-[#b91c1c]' };
  if (daysLeft === 0) return { label: '오늘', className: 'bg-[#ffedd5] text-[#c2410c]' };
  if (daysLeft <= 3) return { label: `${daysLeft}일 남음`, className: 'bg-[#fef3c7] text-[#92400e]' };
  return { label: `${daysLeft}일 남음`, className: 'bg-[#dcfce7] text-[#166534]' };
}

function getExpiryDotClass(dateKey: string): string {
  const daysLeft = getDaysLeft(dateKey);
  if (daysLeft < 0) return 'bg-[#ef4444]';
  if (daysLeft <= 3) return 'bg-[#f59e0b]';
  return 'bg-[#22c55e]';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
