export default function BoardSwitchModal({ onClose, onSelect, currentBoard }: { onClose: () => void; onSelect: (board: string) => void; currentBoard: string }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-3xl p-6 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-[#cbd5e0] rounded-full mx-auto mb-6" />

        <h3 className="text-xl text-[#2d3748] mb-6" style={{ fontWeight: 600 }}>게시판 전환</h3>

        <div className="space-y-3">
          <button
            onClick={() => onSelect('나눔 및 판매')}
            className={`w-full text-[#2d3748] py-4 rounded-2xl border-2 transition-colors text-left px-6 ${
              currentBoard === '나눔 및 판매'
                ? 'bg-[#f0fff4] border-[#bef264]'
                : 'bg-white border-[#e2e8f0] hover:border-[#bef264] hover:bg-[#f9fafb]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg">
                <img src="/assets/app-brand-mark.png" alt="" className="h-8 w-10 object-contain" />
                나눔 및 판매
              </span>
              {currentBoard === '나눔 및 판매' && (
                <span className="text-sm text-[#718096]">현재 게시판</span>
              )}
            </div>
          </button>

          <button
            onClick={() => onSelect('공동구매')}
            className={`w-full text-[#2d3748] py-4 rounded-2xl border-2 transition-colors text-left px-6 ${
              currentBoard === '공동구매'
                ? 'bg-[#f0fff4] border-[#bef264]'
                : 'bg-white border-[#e2e8f0] hover:border-[#bef264] hover:bg-[#f9fafb]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">🛒 공동구매</span>
              {currentBoard === '공동구매' && (
                <span className="text-sm text-[#718096]">현재 게시판</span>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
