import { useState } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, Users } from 'lucide-react';

interface TransactionHistoryScreenProps {
  onClose: () => void;
}

type TransactionType = 'given' | 'received' | 'groupbuy';

interface Transaction {
  id: number;
  type: TransactionType;
  title: string;
  partner: string;
  date: string;
  value?: string;
  image: string;
}

export default function TransactionHistoryScreen({ onClose }: TransactionHistoryScreenProps) {
  const [activeTab, setActiveTab] = useState<TransactionType>('given');

  const transactions: Record<TransactionType, Transaction[]> = {
    given: [
      {
        id: 1,
        type: 'given',
        title: '신선한 양배추',
        partner: '감자사랑',
        date: '2024-01-15',
        value: '무료나눔',
        image: '/assets/food-placeholder.png',
      },
      {
        id: 2,
        type: 'given',
        title: '유기농 토마토',
        partner: '건강지킴이',
        date: '2024-01-10',
        value: '5,000원',
        image: '/assets/food-placeholder.png',
      },
    ],
    received: [
      {
        id: 3,
        type: 'received',
        title: '감자 3kg',
        partner: '농부아저씨',
        date: '2024-01-12',
        value: '무료나눔',
        image: '/assets/food-placeholder.png',
      },
    ],
    groupbuy: [
      {
        id: 4,
        type: 'groupbuy',
        title: '유기농 쌀 20kg',
        partner: '5명 참여',
        date: '2024-01-08',
        value: '35,000원',
        image: '/assets/food-placeholder.png',
      },
    ],
  };

  const getTabLabel = (type: TransactionType) => {
    switch (type) {
      case 'given':
        return '나눔한 내역';
      case 'received':
        return '받은 내역';
      case 'groupbuy':
        return '공구 참여';
    }
  };

  const getTabIcon = (type: TransactionType) => {
    switch (type) {
      case 'given':
        return <ArrowUpRight size={16} />;
      case 'received':
        return <ArrowDownLeft size={16} />;
      case 'groupbuy':
        return <Users size={16} />;
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
          거래 내역
        </h1>
        <div className="w-6" />
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-3">
        <div className="flex gap-2">
          {(['given', 'received', 'groupbuy'] as TransactionType[]).map((type) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-colors ${
                activeTab === type
                  ? 'bg-[#bef264] text-[#0a0a0a]'
                  : 'bg-[#f7fafc] text-[#718096] hover:bg-[#e2e8f0]'
              }`}
              style={{ fontWeight: activeTab === type ? 600 : 500 }}
            >
              {getTabIcon(type)}
              <span className="text-sm">{getTabLabel(type)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#f7fafc]">
        {/* Stats Summary */}
        <div className="bg-white px-5 py-4 mb-2">
          <div className="bg-gradient-to-r from-[#f0fff4] to-[#ecfccb] border border-[#bef264] rounded-2xl p-4">
            <h3 className="text-xs text-[#65a30d] mb-3" style={{ fontWeight: 600 }}>
              이번 달 통계
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl text-[#2d3748] mb-1" style={{ fontWeight: 700 }}>
                  {transactions.given.length}
                </p>
                <p className="text-xs text-[#718096]">나눔 완료</p>
              </div>
              <div>
                <p className="text-2xl text-[#2d3748] mb-1" style={{ fontWeight: 700 }}>
                  ₩15,000
                </p>
                <p className="text-xs text-[#718096]">절약한 금액</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="bg-white px-5 py-4">
          {transactions[activeTab].length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-lg text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
                거래 내역이 없습니다
              </p>
              <p className="text-sm text-[#718096]">
                첫 거래를 시작해보세요!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions[activeTab].map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-[#f7fafc] rounded-2xl border border-[#e2e8f0] p-4 hover:border-[#bef264] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-[#e2e8f0] overflow-hidden flex-shrink-0">
                      <img
                        src={transaction.image}
                        alt={transaction.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm text-[#2d3748] mb-1 truncate" style={{ fontWeight: 600 }}>
                        {transaction.title}
                      </h3>
                      <p className="text-xs text-[#718096] mb-1">
                        👤 {transaction.partner}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#a0aec0]">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                        <span className="text-sm text-[#65a30d]" style={{ fontWeight: 600 }}>
                          {transaction.value}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
