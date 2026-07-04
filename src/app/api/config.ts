// 로컬 개발 시 localhost 사용, 배포 시 ngrok 주소로 변경
// .env에 VITE_API_BASE_URL을 설정하면 그 주소를 우선 사용합니다.
// 예) VITE_API_BASE_URL=http://localhost:8080
// 예) VITE_API_BASE_URL=https://your-ngrok-url.ngrok-free.app
import { getAuthToken } from '../auth/session';

const DEFAULT_API_BASE_URL = "https://enticing-feel-fresh.ngrok-free.dev";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, '');

export function resolveImageUrl(value?: string | null): string {
  if (!value) return '/assets/food-placeholder.png';

  if (value.startsWith('data:image/') || /^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith('/uploads/')) {
    return `${API_BASE_URL}${value}`;
  }

  if (value.startsWith('uploads/')) {
    return `${API_BASE_URL}/${value}`;
  }

  return value;
}

export const API_ENDPOINTS = {
  // ========== 인증 / 회원가입 ==========
  signup: `${API_BASE_URL}/api/auth/signup`,
  login: `${API_BASE_URL}/api/auth/login`,
  logout: `${API_BASE_URL}/api/auth/logout`,

  // ========== 이메일 인증 ==========
  sendEmailCode: `${API_BASE_URL}/api/auth/email-verifications`,
  verifyEmailCode: `${API_BASE_URL}/api/auth/email-verifications/verify`,

  // ========== 중복 확인 ==========
  checkNickname: `${API_BASE_URL}/api/auth/nickname/check`,
  checkEmail: `${API_BASE_URL}/api/auth/email/check`,
  checkPhone: `${API_BASE_URL}/api/auth/phone/check`,

  // ========== 아이디 / 비밀번호 찾기 ==========
  findEmail: `${API_BASE_URL}/api/auth/find-email`,
  findId: `${API_BASE_URL}/api/auth/find-id`,
  sendPasswordResetLink: `${API_BASE_URL}/api/auth/password-reset-link`,
  resetPassword: `${API_BASE_URL}/api/auth/reset-password`,

  // ========== 게시글 ==========
  posts: `${API_BASE_URL}/api/posts`,
  createPost: `${API_BASE_URL}/api/posts`,
  createPostLegacy: `${API_BASE_URL}/api/posts/create`,
  getPost: (postId: number) => `${API_BASE_URL}/api/posts/${postId}`,
  updatePost: (postId: number) => `${API_BASE_URL}/api/posts/${postId}`,
  deletePost: (postId: number) => `${API_BASE_URL}/api/posts/${postId}`,

  // ========== 댓글 ==========
  createComment: (postId: number) => `${API_BASE_URL}/api/posts/${postId}/comments`,
  getComments: (postId: number) => `${API_BASE_URL}/api/posts/${postId}/comments`,
  updateComment: (commentId: number) => `${API_BASE_URL}/api/comments/${commentId}`,
  deleteComment: (commentId: number) => `${API_BASE_URL}/api/comments/${commentId}`,

  // ========== 거래 요청 ==========
  createTradeRequest: (postId: number) => `${API_BASE_URL}/api/posts/${postId}/trade-requests`,
  getTradeRequests: (postId: number) => `${API_BASE_URL}/api/posts/${postId}/trade-requests`,
  acceptTradeRequest: (tradeRequestId: number) => `${API_BASE_URL}/api/trade-requests/${tradeRequestId}/accept`,
  rejectTradeRequest: (tradeRequestId: number) => `${API_BASE_URL}/api/trade-requests/${tradeRequestId}/reject`,
  completeTradeRequest: (tradeRequestId: number) => `${API_BASE_URL}/api/trade-requests/${tradeRequestId}/complete`,

  // ========== 마이페이지 ==========
  mypage: `${API_BASE_URL}/api/mypage`,
  getProfile: `${API_BASE_URL}/api/mypage`,
  updateProfile: `${API_BASE_URL}/api/mypage`,
  mypagePosts: `${API_BASE_URL}/api/mypage/posts`,
  mypageComments: `${API_BASE_URL}/api/mypage/comments`,
  mypageTradeRequests: `${API_BASE_URL}/api/mypage/trade-requests`,
  mypageReceivedTradeRequests: `${API_BASE_URL}/api/mypage/received-trade-requests`,
  updateLocation: `${API_BASE_URL}/api/mypage/location`,

  // ========== 리뷰 / 평점 ==========
  createReview: (userId: number) => `${API_BASE_URL}/api/users/${userId}/reviews`,
  getReviews: (userId: number) => `${API_BASE_URL}/api/users/${userId}/reviews`,
  getRating: (userId: number) => `${API_BASE_URL}/api/users/${userId}/rating`,

  // ========== 알림 ==========
  notificationSettings: `${API_BASE_URL}/api/mypage/notifications/settings`,
  notifications: `${API_BASE_URL}/api/notifications`,
  readNotification: (notificationId: number) => `${API_BASE_URL}/api/notifications/${notificationId}/read`,
  registerFcmToken: `${API_BASE_URL}/api/notifications/fcm-token`,

  // ========== 관심 목록 ==========
  favorites: `${API_BASE_URL}/api/mypage/favorites`,
  addFavorite: (postId: number) => `${API_BASE_URL}/api/posts/${postId}/favorite`,
  removeFavorite: (postId: number) => `${API_BASE_URL}/api/posts/${postId}/favorite`,
  favoriteStatus: (postId: number) => `${API_BASE_URL}/api/posts/${postId}/favorites/status`,

  // ========== 이미지 업로드 ==========
  createReport: `${API_BASE_URL}/api/reports`,
  blockUser: (userId: number) => `${API_BASE_URL}/api/users/${userId}/block`,
  unblockUser: (userId: number) => `${API_BASE_URL}/api/users/${userId}/block`,
  blockedUsers: `${API_BASE_URL}/api/mypage/blocked-users`,
  uploadImage: `${API_BASE_URL}/api/uploads/images`,
  uploadImages: `${API_BASE_URL}/api/uploads/images`,
};

// 게시글 필터링 파라미터 타입
export type PostType = 'SHARE' | 'SALE' | 'GROUP_BUY';
export type SortType = 'LATEST' | 'EXPIRING_SOON' | 'DISTANCE';

export interface PostQueryParams {
  postType?: PostType;
  keyword?: string;
  sort?: SortType;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

// 게시글 조회 URL 생성 헬퍼
export function buildPostsUrl(params?: PostQueryParams): string {
  if (!params) return API_ENDPOINTS.posts;

  const searchParams = new URLSearchParams();
  if (params.postType) searchParams.append('postType', params.postType);
  if (params.keyword) searchParams.append('keyword', params.keyword);
  if (params.sort) searchParams.append('sort', params.sort);
  if (params.lat !== undefined) searchParams.append('lat', String(params.lat));
  if (params.lng !== undefined) searchParams.append('lng', String(params.lng));
  if (params.radiusKm !== undefined) searchParams.append('radiusKm', String(params.radiusKm));

  const queryString = searchParams.toString();
  return queryString ? `${API_ENDPOINTS.posts}?${queryString}` : API_ENDPOINTS.posts;
}

function isPublicAuthEndpoint(url: string): boolean {
  const publicAuthPaths = [
    '/api/auth/signup',
    '/api/auth/login',
    '/api/auth/email-verifications',
    '/api/auth/email-verifications/verify',
    '/api/auth/nickname/check',
    '/api/auth/email/check',
    '/api/auth/phone/check',
    '/api/auth/find-email',
    '/api/auth/find-id',
    '/api/auth/password-reset-link',
    '/api/auth/reset-password',
  ];

  return publicAuthPaths.some((path) => url.startsWith(`${API_BASE_URL}${path}`));
}

function translateApiErrorMessage(message: string): string {
  const translations: Record<string, string> = {
    'You cannot request your own post.': '본인 게시글에는 거래 요청할 수 없습니다.',
    'You already requested this post.': '이미 이 게시글에 거래 요청을 보냈습니다.',
    'Post is closed.': '이미 마감된 게시글입니다.',
    'Only pending requests can be accepted.': '대기 중인 요청만 수락할 수 있습니다.',
    'Only pending requests can be rejected.': '대기 중인 요청만 거절할 수 있습니다.',
    'Only accepted requests can be completed.': '수락된 거래만 완료 처리할 수 있습니다.',
    'Only trade participants can complete this request.': '거래 참여자만 완료 처리할 수 있습니다.',
  };

  return translations[message] || message;
}

async function readJsonSafely(response: Response): Promise<any> {
  const text = await response.text();
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    if (!response.ok) {
      return { message: text };
    }
    throw new Error('서버 응답을 해석하지 못했습니다.');
  }
}

// 백엔드 서버 연결 테스트
export async function testServerConnection(): Promise<boolean> {
  try {
    console.log(`🔍 백엔드 서버 연결 테스트: ${API_BASE_URL}`);

    const response = await fetch(API_BASE_URL, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      mode: 'cors',
    });

    console.log(`📥 서버 응답 상태: ${response.status}`);

    // 403은 서버는 실행 중이지만 접근 거부
    if (response.status === 403) {
      console.warn('⚠️ 서버는 실행 중이지만 접근이 거부되었습니다 (403)');
      console.warn('💡 ngrok URL이 만료되었거나 백엔드 보안 설정을 확인하세요');
      return false;
    }

    return response.ok || response.status < 500;
  } catch (error) {
    console.error('❌ 백엔드 서버 연결 실패:', error);
    return false;
  }
}

// API 요청 헬퍼 함수
export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  if (token && !isPublicAuthEndpoint(url)) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`📡 API 요청: ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      mode: 'cors',
    });

    console.log(`📥 응답 상태: ${response.status}`);

    // 403 Forbidden 특수 처리
    if (response.status === 403) {
      throw new Error(
        `⛔ 백엔드 서버 접근 거부 (403 Forbidden)\n\n` +
        `서버는 실행 중이지만 이 요청을 거부했습니다.\n\n` +
        `확인 사항:\n` +
        `1. 로그인 토큰이 없거나 만료되었는지 확인\n` +
        `2. 게시글 작성 API가 인증된 사용자에게 허용되어 있는지 확인\n` +
        `3. 백엔드 Security/CORS 설정에서 현재 Origin이 허용되어 있는지 확인\n` +
        `4. POST 엔드포인트가 /api/posts 또는 /api/posts/create 중 무엇인지 확인\n\n` +
        `현재 URL: ${API_BASE_URL}`
      );
    }

    // 204 No Content는 성공이지만 body가 없음
    if (response.status === 204) {
      return {};
    }

    // 응답이 JSON인지 확인
    const contentType = response.headers.get('content-type');

    // JSON이 아닌 응답 처리
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('❌ 서버가 JSON이 아닌 응답을 반환:', text.substring(0, 200));

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status} - ${text.substring(0, 100)}`);
      }

      // 성공이지만 JSON이 아닌 경우 (예: HTML)
      throw new Error('서버가 올바른 형식(JSON)으로 응답하지 않았습니다.');
    }

    const data = await readJsonSafely(response);
    console.log(`✅ 응답 데이터:`, data);

    if (!response.ok) {
      const errorMessage = data.message || data.error || `요청 실패 (${response.status})`;
      throw new Error(translateApiErrorMessage(errorMessage));
    }

    return data;
  } catch (error: any) {
    console.error('❌ API 요청 에러:', {
      url,
      method: options.method || 'GET',
      error: error.message,
      stack: error.stack,
    });

    // 네트워크 에러 처리
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      const isServerUp = await testServerConnection();

      if (!isServerUp) {
        throw new Error(
          `백엔드 서버(${API_BASE_URL})에 연결할 수 없습니다.\n\n` +
          `확인 사항:\n` +
          `1. 백엔드 서버가 실행 중인지 확인\n` +
          `2. 서버 주소가 올바른지 확인\n` +
          `3. CORS 설정이 되어 있는지 확인`
        );
      }

      throw new Error(
        `API 요청 실패 (${url})\n\n` +
        `서버는 실행 중이지만 이 API에 접근할 수 없습니다.\n` +
        `CORS 설정을 확인해주세요.`
      );
    }

    if (error.message.includes('403 Forbidden')) {
      throw new Error(
        token
          ? `요청 권한이 없거나 로그인 세션이 만료되었습니다. 다시 로그인한 뒤 시도해주세요. (403)`
          : `로그인이 필요한 요청입니다. 다시 로그인해주세요. (403)`
      );
    }

    // CORS 에러 처리
    if (error.message.includes('CORS')) {
      throw new Error(
        `CORS 오류: 서버 접근 권한이 없습니다.\n\n` +
        `백엔드 개발자에게 다음을 요청하세요:\n` +
        `- Access-Control-Allow-Origin 헤더 추가\n` +
        `- Access-Control-Allow-Methods 설정\n` +
        `- Access-Control-Allow-Headers 설정`
      );
    }

    throw error;
  }
}

// 이미지 업로드 전용 헬퍼 (FormData 사용)
export async function uploadImage(file: File): Promise<string> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('image', file);

  const headers: HeadersInit = {
    'ngrok-skip-browser-warning': 'true',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(API_ENDPOINTS.uploadImage, {
      method: 'POST',
      headers,
      body: formData,
      mode: 'cors',
      credentials: 'omit',
    });

    const data = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(translateApiErrorMessage(data.message || data.error || '이미지 업로드에 실패했습니다.'));
    }

    // 백엔드가 이미지 URL을 반환한다고 가정
    return data.imageUrl || data.url || data.data?.imageUrl || data.data?.url || '';
  } catch (error: any) {
    console.error('이미지 업로드 에러:', error);
    throw error;
  }
}

export type ReportTargetType = 'POST' | 'COMMENT' | 'USER';

export interface CreateReportPayload {
  targetType: ReportTargetType;
  targetId: number;
  reason: string;
}

export async function createReport(payload: CreateReportPayload): Promise<any> {
  return apiRequest(API_ENDPOINTS.createReport, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function blockUser(userId: number): Promise<any> {
  return apiRequest(API_ENDPOINTS.blockUser(userId), {
    method: 'POST',
  });
}

export async function unblockUser(userId: number): Promise<any> {
  return apiRequest(API_ENDPOINTS.unblockUser(userId), {
    method: 'DELETE',
  });
}

export async function getBlockedUsers(): Promise<any> {
  return apiRequest(API_ENDPOINTS.blockedUsers, {
    method: 'GET',
  });
}

export async function getNotifications(page = 0, size = 20): Promise<any> {
  const url = `${API_ENDPOINTS.notifications}?page=${page}&size=${size}`;
  return apiRequest(url, {
    method: 'GET',
  });
}

export async function readNotification(notificationId: number): Promise<any> {
  return apiRequest(API_ENDPOINTS.readNotification(notificationId), {
    method: 'PATCH',
  });
}
