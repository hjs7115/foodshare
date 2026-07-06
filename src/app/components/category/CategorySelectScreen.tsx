import { Leaf, ShoppingCart } from 'lucide-react';
export default function CategorySelectScreen({
  onSelectCategory,
}: {
  onSelectCategory: (category: string) => void;
}) {
  return (
    <div className="bg-white size-full flex flex-col items-center justify-center px-6">
      <section className="max-w-md w-full rounded-3xl border border-[#e2e8f0] bg-white px-6 py-10 shadow-sm">
        <div className="text-center mb-10">
          <h2 className="text-3xl text-[#2d3748] mb-3" style={{ fontWeight: 600 }}>관심 카테고리를 선택하세요</h2>
          <p className="text-[#718096] text-base">원하는 게시판을 선택해주세요</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onSelectCategory('나눔 및 판매')}
            className="w-full bg-gradient-to-br from-[#f0fdf4] to-[#bef264] text-[#0a0a0a] py-8 rounded-2xl border-2 border-[#bef264] hover:from-[#dcfce7] hover:to-[#a3e635] transition-colors shadow-sm"
          >
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <Leaf size={50} strokeWidth={2.4} className="text-[#65a30d]" />
              </div>
              <div className="text-xl mb-2" style={{ fontWeight: 600 }}>나눔 및 판매</div>
              <div className="text-sm text-[#365314]">식재료 나눔과 소분 판매</div>
            </div>
          </button>

          <button
            onClick={() => onSelectCategory('공동구매')}
            className="w-full bg-gradient-to-br from-[#fef3c7] to-[#fbbf24] text-[#0a0a0a] py-8 rounded-2xl border-2 border-[#fbbf24] hover:from-[#fde68a] hover:to-[#f59e0b] transition-colors shadow-sm"
          >
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <ShoppingCart size={50} strokeWidth={2.4} className="text-[#f59e0b]" />
              </div>
              <div className="text-xl mb-2" style={{ fontWeight: 600 }}>공동구매</div>
              <div className="text-sm text-[#92400e]">이웃과 함께 공동구매</div>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
