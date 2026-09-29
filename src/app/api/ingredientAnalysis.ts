import { API_BASE_URL } from './config';
import { getAuthToken, isLocalTestSession } from '../auth/session';

export type StorageMethod = 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE';
export type OpenStatus = 'UNOPENED' | 'OPENED' | 'UNKNOWN';
export type QualityGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface IngredientAnalysisResult {
  analysisId: number | null;
  analyzedAt: string;
  analysisMode: 'AI' | 'DEMO';
  ingredient: {
    name: string;
    qualityGrade: QualityGrade;
    qualityReason: string;
  };
  consumptionEstimate: {
    daysMin: number;
    daysMax: number;
  };
  confidenceLevel: ConfidenceLevel;
  pricing: {
    recommendedPrice: number | null;
    quickSalePrice: number | null;
    policyVersion: string;
  };
}

export interface IngredientAnalysisInput {
  storageMethod: StorageMethod;
  openStatus: OpenStatus;
  purchaseDate?: string;
  quantity: string;
  originalPrice?: number;
}

export async function analyzeIngredient(
  image: File,
  input: IngredientAnalysisInput
): Promise<IngredientAnalysisResult> {
  if (isLocalTestSession()) {
    return createDemoResult(image, input);
  }

  const token = getAuthToken();
  const formData = new FormData();
  formData.append('image', image);
  formData.append('storageMethod', input.storageMethod);
  formData.append('openStatus', input.openStatus);
  formData.append('quantity', input.quantity);
  if (input.purchaseDate) formData.append('purchaseDate', input.purchaseDate);
  if (input.originalPrice && input.originalPrice > 0) {
    formData.append('originalPrice', String(input.originalPrice));
  }

  const response = await fetch(`${API_BASE_URL}/api/ai/ingredient-analysis`, {
    method: 'POST',
    headers: {
      'ngrok-skip-browser-warning': 'true',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
  return payload.data || payload;
}

function createDemoResult(image: File, input: IngredientAnalysisInput): IngredientAnalysisResult {
  const filename = image.name.toLowerCase();
  const ingredientName = filename.includes('tomato') || filename.includes('토마토')
    ? '토마토'
    : filename.includes('milk') || filename.includes('우유')
      ? '우유'
      : filename.includes('apple') || filename.includes('사과')
        ? '사과'
        : filename.includes('food-placeholder')
          ? '상추'
        : '식재료';
  const openedPenalty = input.openStatus === 'OPENED' ? 1 : 0;
  const frozenBonus = input.storageMethod === 'FROZEN' ? 3 : 0;
  const daysMin = Math.max(1, 2 - openedPenalty + frozenBonus);
  const daysMax = Math.max(daysMin, 4 - openedPenalty + frozenBonus);
  const originalPrice = input.originalPrice || 0;
  const recommendedPrice = originalPrice > 0 ? roundToHundred(originalPrice * 0.55) : null;
  const quickSalePrice = recommendedPrice ? roundToHundred(recommendedPrice * 0.8) : null;

  return {
    analysisId: null,
    analyzedAt: new Date().toISOString(),
    analysisMode: 'DEMO',
    ingredient: {
      name: ingredientName,
      qualityGrade: 'GOOD',
      qualityReason: ingredientName === '상추'
        ? '잎의 색이 비교적 고르고 심한 변색이나 무름이 보이지 않습니다.'
        : '데모 모드에서 외관이 비교적 고르게 유지된 상태로 표시한 결과입니다.',
    },
    consumptionEstimate: { daysMin, daysMax },
    confidenceLevel: 'MEDIUM',
    pricing: { recommendedPrice, quickSalePrice, policyVersion: 'demo-v1' },
  };
}

function roundToHundred(value: number) {
  return Math.max(100, Math.round(value / 100) * 100);
}
