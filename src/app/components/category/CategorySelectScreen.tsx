export default function CategorySelectScreen({ onSelectCategory }: { onSelectCategory: (category: string) => void }) {
  return (
    <div className="bg-white size-full flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl text-[#2d3748] mb-3" style={{ fontWeight: 600 }}>관심 카테고리를 선택하세요</h2>
          <p className="text-[#718096] text-base">원하는 게시판을 선택해주세요</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onSelectCategory('나눔 및 판매')}
            className="w-full bg-white text-[#2d3748] py-8 rounded-2xl border-2 border-[#e2e8f0] hover:border-[#bef264] hover:bg-[#f9fafb] transition-colors shadow-sm"
          >
            <div className="text-center">
              <div className="text-4xl mb-3">🥬</div>
              <div className="text-xl mb-2" style={{ fontWeight: 600 }}>나눔 및 판매</div>
              <div className="text-sm text-[#718096]">식재료 나눔과 소분 판매</div>
            </div>
          </button>

          <button
            onClick={() => onSelectCategory('공동구매')}
            className="w-full bg-white text-[#2d3748] py-8 rounded-2xl border-2 border-[#e2e8f0] hover:border-[#bef264] hover:bg-[#f9fafb] transition-colors shadow-sm"
          >
            <div className="text-center">
              <div className="text-4xl mb-3">🛒</div>
              <div className="text-xl mb-2" style={{ fontWeight: 600 }}>공동구매</div>
              <div className="text-sm text-[#718096]">이웃과 함께 공동구매</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}