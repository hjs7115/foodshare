import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Package,
  Plus,
  Snowflake,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { apiRequest, API_ENDPOINTS } from '../../api/config';

const FRIDGE_STORAGE_KEY = 'foodshareFridgeItems';

interface FridgeItem {
  id: number;
  name: string;
  amount: string;
  expiryDate: string;
  storagePlace: string;
  memo: string;
  createdAt: string;
  updatedAt?: string;
  daysLeft?: number;
  expired?: boolean;
  expiringSoon?: boolean;
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

export default function FridgeScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<FridgeItem | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiRequest(API_ENDPOINTS.fridgeItems, { method: 'GET' });
      const serverItems = unwrapItems(response);
      setItems(sortItems(serverItems));

      if (serverItems.length > 0) {
        localStorage.removeItem(FRIDGE_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('냉장고 목록 조회에 실패했습니다.', error);
      const fallbackItems = loadStoredFridgeItems();
      setItems(sortItems(fallbackItems));
      setErrorMessage('서버 냉장고를 불러오지 못해 이 기기의 임시 기록을 표시합니다.');
    } finally {
      setIsLoading(false);
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

  const openCreateForm = () => {
    setEditingItem(null);
    setShowItemForm(true);
  };

  const openEditForm = (item: FridgeItem) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleSaveItem = async (form: FridgeItemForm) => {
    const trimmedName = form.name.trim();
    const trimmedAmount = form.amount.trim();

    if (!trimmedName || !form.expiryDate) {
      alert('식재료 이름과 유통기한을 입력해주세요.');
      return;
    }

    const payload = {
      name: trimmedName,
      amount: trimmedAmount || '수량 미정',
      expiryDate: form.expiryDate,
      storagePlace: form.storagePlace || '냉장',
      memo: form.memo.trim(),
    };

    try {
      if (editingItem) {
        const response = await apiRequest(API_ENDPOINTS.updateFridgeItem(editingItem.id), {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        const updatedItem = unwrapItem(response);
        setItems((current) => sortItems(current.map((item) => item.id === editingItem.id ? updatedItem : item)));
      } else {
        const response = await apiRequest(API_ENDPOINTS.createFridgeItem, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const createdItem = unwrapItem(response);
        setItems((current) => sortItems([...current, createdItem]));
        setSelectedDate(parseDateKey(createdItem.expiryDate));
        setCurrentMonth(parseDateKey(createdItem.expiryDate));
      }

      localStorage.removeItem(FRIDGE_STORAGE_KEY);
      setShowItemForm(false);
      setEditingItem(null);
      setErrorMessage('');
    } catch (error) {
      console.error('냉장고 저장에 실패했습니다.', error);
      alert('냉장고 저장에 실패했습니다. 로그인 상태와 서버 연결을 확인해주세요.');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('이 식재료 기록을 삭제할까요?')) return;

    try {
      await apiRequest(API_ENDPOINTS.deleteFridgeItem(itemId), { method: 'DELETE' });
      setItems((current) => current.filter((item) => item.id !== itemId));
      setShowItemForm(false);
      setEditingItem(null);
      localStorage.removeItem(FRIDGE_STORAGE_KEY);
    } catch (error) {
      console.error('냉장고 삭제에 실패했습니다.', error);
      alert('냉장고 삭제에 실패했습니다. 서버 연결을 확인해주세요.');
    }
  };

  const moveMonth = (amount: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + amount, 1));
  };

  return (
    <div className="bg-[#f7fafc] size-full flex flex-col">
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#e0f2fe] flex items-center justify-center">
            <Snowflake size={22} className="text-[#0284c7]" />
          </div>
          <div>
            <h1 className="text-lg text-[#1a202c]" style={{ fontWeight: 800 }}>우리 냉장고</h1>
            <p className="text-xs text-[#718096]">보유 식재료와 유통기한을 기록해요</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-28">
        {errorMessage && (
          <div className="mb-4 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-xs text-[#92400e]">
            {errorMessage}
          </div>
        )}

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

          {isLoading ? (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-[#718096]">
              냉장고를 불러오는 중입니다.
            </div>
          ) : selectedItems.length === 0 ? (
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

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-12 py-4 flex items-center justify-between z-40">
        <button onClick={() => onNavigate('board')} className="flex flex-col items-center gap-1">
          <Home size={24} className="text-[#2d3748]" />
          <span className="text-xs text-[#2d3748]">홈</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <Snowflake size={24} className="text-[#0284c7]" />
          <span className="text-xs text-[#0284c7]">냉장고</span>
        </button>
        <button onClick={() => onNavigate('profile')} className="flex flex-col items-center gap-1">
          <User size={24} className="text-[#2d3748]" />
          <span className="text-xs text-[#2d3748]">내정보</span>
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
              placeholder="구매처, 상태, 빨리 먹어야 하는 이유 등을 적어보세요"
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

function unwrapItems(response: any): FridgeItem[] {
  const data = response?.data ?? response;
  if (Array.isArray(data)) return data.map(normalizeItem).filter(Boolean) as FridgeItem[];
  if (Array.isArray(data?.items)) return data.items.map(normalizeItem).filter(Boolean) as FridgeItem[];
  return [];
}

function unwrapItem(response: any): FridgeItem {
  const item = normalizeItem(response?.data ?? response);
  if (!item) throw new Error('냉장고 응답을 해석할 수 없습니다.');
  return item;
}

function normalizeItem(item: any): FridgeItem | null {
  if (!item?.name || !item?.expiryDate) return null;
  return {
    id: Number(item.id),
    name: String(item.name),
    amount: item.amount || '수량 미정',
    expiryDate: String(item.expiryDate).slice(0, 10),
    storagePlace: item.storagePlace || '냉장',
    memo: item.memo || '',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt,
    daysLeft: item.daysLeft,
    expired: item.expired,
    expiringSoon: item.expiringSoon,
  };
}

function sortItems(nextItems: FridgeItem[]): FridgeItem[] {
  return [...nextItems].sort(
    (a, b) => parseDateKey(a.expiryDate).getTime() - parseDateKey(b.expiryDate).getTime()
      || a.name.localeCompare(b.name, 'ko-KR')
  );
}

function loadStoredFridgeItems(): FridgeItem[] {
  try {
    const raw = localStorage.getItem(FRIDGE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map(normalizeItem).filter(Boolean) as FridgeItem[]
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
