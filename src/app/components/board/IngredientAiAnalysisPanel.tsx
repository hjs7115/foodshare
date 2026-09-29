import { useEffect, useMemo, useState } from 'react';
import { Check, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react';
import {
  analyzeIngredient,
  type IngredientAnalysisResult,
  type OpenStatus,
  type StorageMethod,
} from '../../api/ingredientAnalysis';
import { showToast } from '../../utils/feedback';

interface IngredientAiAnalysisPanelProps {
  imageFile?: File;
  amount: string;
  category: string;
  onApply: (result: IngredientAnalysisResult, priceMode: 'recommended' | 'quick') => void;
  onResultChange: (result: IngredientAnalysisResult | null) => void;
}

const qualityLabels = {
  EXCELLENT: '매우 양호',
  GOOD: '양호',
  FAIR: '빠른 소비 권장',
  POOR: '직접 확인 필요',
};

const confidenceLabels = {
  HIGH: '높음',
  MEDIUM: '보통',
  LOW: '낮음',
};

export default function IngredientAiAnalysisPanel({
  imageFile,
  amount,
  category,
  onApply,
  onResultChange,
}: IngredientAiAnalysisPanelProps) {
  const [storageMethod, setStorageMethod] = useState<StorageMethod>('REFRIGERATED');
  const [openStatus, setOpenStatus] = useState<OpenStatus>('UNKNOWN');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [result, setResult] = useState<IngredientAnalysisResult | null>(null);
  const [analyzedInputKey, setAnalyzedInputKey] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const inputKey = useMemo(
    () => [imageFile?.name, imageFile?.size, amount, category, storageMethod, openStatus, purchaseDate, originalPrice].join('|'),
    [imageFile, amount, category, storageMethod, openStatus, purchaseDate, originalPrice]
  );
  const isStale = Boolean(result && analyzedInputKey !== inputKey);

  useEffect(() => {
    setResult(null);
    setAnalyzedInputKey('');
    onResultChange(null);
  }, [imageFile]);

  useEffect(() => {
    if (result && analyzedInputKey !== inputKey) {
      onResultChange(null);
    }
  }, [inputKey, analyzedInputKey, result]);

  const handleAnalyze = async () => {
    if (!imageFile) {
      showToast('분석할 사진을 먼저 첨부해주세요.');
      return;
    }
    if (!amount.trim()) {
      showToast('분석에 사용할 수량을 먼저 입력해주세요.');
      return;
    }
    if (!category) {
      showToast('나눔 또는 판매 카테고리를 먼저 선택해주세요.');
      return;
    }
    if (category === '판매' && (!originalPrice || Number(originalPrice) <= 0)) {
      showToast('판매 가격 추천을 위해 등록 수량의 원래 구매가를 입력해주세요.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const nextResult = await analyzeIngredient(imageFile, {
        storageMethod,
        openStatus,
        purchaseDate: purchaseDate || undefined,
        quantity: amount.trim(),
        originalPrice: category === '판매' ? Number(originalPrice) : undefined,
      });
      setResult(nextResult);
      setAnalyzedInputKey(inputKey);
      onResultChange(nextResult);
    } catch (error: any) {
      showToast(error.message || 'AI 분석에 실패했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatPrice = (value: number | null) => value == null ? '계산 안 함' : `${value.toLocaleString('ko-KR')}원`;

  return (
    <section className="rounded-lg border border-[#d9f99d] bg-[#fbfff4] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#bef264] text-[#1a2e05]">
            <Sparkles size={19} />
          </div>
          <div>
            <h2 className="text-base text-[#1a202c]" style={{ fontWeight: 700 }}>AI 식재료 분석</h2>
            <p className="mt-0.5 text-xs leading-5 text-[#718096]">상태와 권장 소비 예상 기간을 분석하고 거래 가격을 계산합니다.</p>
          </div>
        </div>
        {result && (
          <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${result.analysisMode === 'DEMO' ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-[#dcfce7] text-[#166534]'}`}>
            {result.analysisMode === 'DEMO' ? '데모 분석' : 'AI 분석 완료'}
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm text-[#2d3748]" style={{ fontWeight: 600 }}>보관 방식</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['REFRIGERATED', '냉장'],
              ['FROZEN', '냉동'],
              ['ROOM_TEMPERATURE', '실온'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStorageMethod(value)}
                className={`h-10 rounded-lg border text-sm ${storageMethod === value ? 'border-[#84cc16] bg-white text-[#365314]' : 'border-[#e2e8f0] bg-[#f7fafc] text-[#4a5568]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-[#2d3748]" style={{ fontWeight: 600 }}>개봉 여부</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['UNOPENED', '미개봉'],
              ['OPENED', '개봉'],
              ['UNKNOWN', '모름'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setOpenStatus(value)}
                className={`h-10 rounded-lg border text-sm ${openStatus === value ? 'border-[#84cc16] bg-white text-[#365314]' : 'border-[#e2e8f0] bg-[#f7fafc] text-[#4a5568]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={category === '판매' ? 'grid grid-cols-2 gap-3' : ''}>
          <label className="block text-sm text-[#2d3748]">
            <span className="mb-2 block" style={{ fontWeight: 600 }}>구매일 <span className="text-[#a0aec0]" style={{ fontWeight: 400 }}>(선택)</span></span>
            <input
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
              className="h-11 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 outline-none focus:border-[#84cc16]"
            />
          </label>
          {category === '판매' && (
            <label className="block text-sm text-[#2d3748]">
              <span className="mb-2 block" style={{ fontWeight: 600 }}>등록 수량의 구매가</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={originalPrice}
                  onChange={(event) => setOriginalPrice(event.target.value)}
                  placeholder="예: 3000"
                  className="h-11 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 pr-8 outline-none focus:border-[#84cc16]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#718096]">원</span>
              </div>
            </label>
          )}
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !imageFile}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2d3748] text-white transition-colors hover:bg-[#1a202c] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ fontWeight: 600 }}
        >
          {isAnalyzing ? <LoaderCircle size={18} className="animate-spin" /> : result ? <RefreshCw size={18} /> : <Sparkles size={18} />}
          {isAnalyzing ? '상태와 소비 기간 분석 중' : result ? '다시 분석하기' : 'AI로 분석하기'}
        </button>
      </div>

      {result && (
        <div className="mt-4 border-t border-[#d9f99d] pt-4">
          {isStale && (
            <p className="mb-3 rounded-lg bg-[#fff7ed] px-3 py-2 text-xs text-[#9a3412]">입력 정보가 변경되었습니다. 적용하려면 다시 분석해주세요.</p>
          )}
          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <span className="text-[#718096]">품목</span>
              <span className="text-right text-[#1a202c]" style={{ fontWeight: 700 }}>{result.ingredient.name}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-[#718096]">외관 상태</span>
              <span className="text-right text-[#1a202c]" style={{ fontWeight: 700 }}>{qualityLabels[result.ingredient.qualityGrade]}</span>
            </div>
            <p className="rounded-lg bg-white px-3 py-2 text-xs leading-5 text-[#4a5568]">{result.ingredient.qualityReason}</p>
            <div className="flex items-start justify-between gap-4">
              <span className="text-[#718096]">권장 소비 예상 기간</span>
              <span className="text-right text-[#1a202c]" style={{ fontWeight: 700 }}>{result.consumptionEstimate.daysMin}~{result.consumptionEstimate.daysMax}일</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-[#718096]">분석 확실성</span>
              <span className="text-right text-[#1a202c]" style={{ fontWeight: 700 }}>{confidenceLabels[result.confidenceLevel]}</span>
            </div>
            {category === '판매' && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[#718096]">추천 가격</span>
                  <span className="text-right text-[#1a202c]" style={{ fontWeight: 700 }}>{formatPrice(result.pricing.recommendedPrice)}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[#718096]">빠른 거래 가격</span>
                  <span className="text-right text-[#1a202c]" style={{ fontWeight: 700 }}>{formatPrice(result.pricing.quickSalePrice)}</span>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isStale}
              onClick={() => onApply(result, 'recommended')}
              className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#bef264] text-sm text-[#1a2e05] disabled:opacity-40"
              style={{ fontWeight: 700 }}
            >
              <Check size={17} /> 전체 적용
            </button>
            <button
              type="button"
              disabled={isStale || category !== '판매' || result.pricing.quickSalePrice == null}
              onClick={() => onApply(result, 'quick')}
              className="h-11 rounded-lg border border-[#84cc16] bg-white text-sm text-[#365314] disabled:opacity-40"
              style={{ fontWeight: 600 }}
            >
              빠른 거래가 적용
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-[#718096]">사진과 입력 정보를 바탕으로 한 예상 결과이며, 섭취 안전을 보장하지 않습니다.</p>
        </div>
      )}
    </section>
  );
}
