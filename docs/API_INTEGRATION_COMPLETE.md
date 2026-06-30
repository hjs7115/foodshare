# API 연동 완료 문서

## ✅ 연동 완료된 API

### 1. 인증 / 회원가입
- ✅ `POST /api/auth/signup` - 회원가입
- ✅ `POST /api/auth/login` - 로그인

### 2. 이메일 인증
- ✅ `POST /api/auth/email-verifications` - 인증번호 발송
- ✅ `POST /api/auth/email-verifications/verify` - 인증번호 확인

### 3. 중복 확인
- ✅ `GET /api/auth/nickname/check?nickname={닉네임}` - 닉네임 중복 확인
- ⚠️ `GET /api/auth/email/check?email={이메일}` - 이메일 중복 확인 (미구현)
- ⚠️ `GET /api/auth/phone/check?phoneNumber={전화번호}` - 전화번호 중복 확인 (미구현)

### 4. 게시글
- ✅ `POST /api/posts` - 게시글 작성
- ✅ `GET /api/posts?postType=SHARE` - 나눔 게시글 조회
- ✅ `GET /api/posts?postType=SALE` - 판매 게시글 조회
- ✅ `GET /api/posts?postType=GROUP_BUY` - 공동구매 게시글 조회
- ✅ `GET /api/posts?keyword={검색어}` - 검색 (준비됨)
- ✅ `GET /api/posts?sort=LATEST` - 최신순 정렬 (준비됨)
- ✅ `GET /api/posts?sort=EXPIRING_SOON` - 유통기한 임박순 (준비됨)
- ✅ `GET /api/posts?sort=DISTANCE` - 거리순 (준비됨)

### 5. 마이페이지
- ✅ `GET /api/mypage` - 마이페이지 조회

### 6. 이미지 업로드
- ✅ `POST /api/uploads/images` - 이미지 업로드 (헬퍼 함수 준비)

---

## ⚠️ 미구현 / 추가 필요

### 회원가입 화면
- 이메일 중복 확인 기능 추가 필요
- 전화번호 중복 확인 기능 추가 필요

### 아이디/비밀번호 찾기 화면
- FindIdScreen 컴포넌트에 API 연동 필요
- FindPasswordScreen 컴포넌트에 API 연동 필요

### 게시글 상세
- 게시글 상세 조회: `GET /api/posts/{postId}`
- 게시글 수정: `PUT /api/posts/{postId}`
- 게시글 삭제: `DELETE /api/posts/{postId}`

### 댓글
- 댓글 작성: `POST /api/posts/{postId}/comments`
- 댓글 조회: `GET /api/posts/{postId}/comments`
- 댓글 삭제: `DELETE /api/comments/{commentId}`

### 거래 요청
- 거래 요청 생성: `POST /api/posts/{postId}/trade-requests`
- 거래 요청 조회: `GET /api/posts/{postId}/trade-requests`
- 거래 요청 수락: `PATCH /api/trade-requests/{tradeRequestId}/accept`
- 거래 요청 거절: `PATCH /api/trade-requests/{tradeRequestId}/reject`

### 마이페이지 세부 기능
- 내 게시글 조회: `GET /api/mypage/posts`
- 내 댓글 조회: `GET /api/mypage/comments`
- 내 거래 요청 조회: `GET /api/mypage/trade-requests`
- 받은 거래 요청 조회: `GET /api/mypage/received-trade-requests`

### 리뷰 / 평점
- 리뷰 작성: `POST /api/users/{userId}/reviews`
- 리뷰 조회: `GET /api/users/{userId}/reviews`
- 평점 조회: `GET /api/users/{userId}/rating`

---

## 📝 백엔드 응답 형식 확인 필요

다음 API들의 실제 응답 형식을 백엔드 개발자에게 확인해주세요:

### 1. 닉네임 중복 확인
**프론트 기대 응답:**
```json
{
  "available": true
}
```

### 2. 회원가입
**프론트 기대 응답:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": 1,
    "name": "홍길동",
    "nickname": "테스트",
    "email": "test@example.com",
    "phone": "01012345678"
  }
}
```

### 3. 로그인
**프론트 기대 응답:**
```json
{
  "token": "jwt-token",
  "user": { ... }
}
```

### 4. 게시글 조회
**프론트 기대 응답:**
```json
{
  "posts": [
    {
      "id": 1,
      "title": "제목",
      "content": "내용",
      "amount": "300g",
      "price": "무료나눔",
      "postType": "SHARE",
      "expiry": "유통기한 3일 남음",
      "imageUrl": "https://...",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

또는 배열로 직접 반환:
```json
[
  {
    "id": 1,
    "title": "제목",
    ...
  }
]
```

### 5. 마이페이지 조회
**프론트 기대 응답:**
```json
{
  "user": {
    "id": 1,
    "name": "홍길동",
    "nickname": "테스트",
    "email": "test@example.com",
    "phone": "01012345678",
    "profileImage": "https://..."
  }
}
```

### 6. 이미지 업로드
**프론트 기대 응답:**
```json
{
  "imageUrl": "https://..."
}
```
또는
```json
{
  "url": "https://..."
}
```

---

## 🔧 사용 예시

### 게시글 조회 (필터링)
```typescript
import { buildPostsUrl, apiRequest } from './api/config';

// 나눔 게시글만 조회
const url1 = buildPostsUrl({ postType: 'SHARE' });

// 공동구매 + 최신순 정렬
const url2 = buildPostsUrl({ postType: 'GROUP_BUY', sort: 'LATEST' });

// 검색
const url3 = buildPostsUrl({ keyword: '양파' });

// 여러 필터 조합
const url4 = buildPostsUrl({ 
  postType: 'SALE', 
  keyword: '채소',
  sort: 'EXPIRING_SOON' 
});

const response = await apiRequest(url1, { method: 'GET' });
```

### 이미지 업로드
```typescript
import { uploadImage } from './api/config';

const handleImageUpload = async (file: File) => {
  try {
    const imageUrl = await uploadImage(file);
    console.log('업로드된 이미지 URL:', imageUrl);
  } catch (error) {
    alert('이미지 업로드 실패');
  }
};
```

### 게시글 작성
```typescript
import { API_ENDPOINTS, apiRequest } from './api/config';

const createPost = async () => {
  const response = await apiRequest(API_ENDPOINTS.posts, {
    method: 'POST',
    body: JSON.stringify({
      title: '상추 나눔',
      content: '신선한 상추 나눔합니다',
      amount: '300g',
      price: '무료나눔',
      postType: 'SHARE',
      expiry: '유통기한 3일 남음'
    })
  });
};
```

---

## 🚀 다음 단계

1. **백엔드 응답 형식 확인** - 위의 응답 형식들이 실제 백엔드와 일치하는지 확인
2. **추가 기능 구현** - 댓글, 거래 요청, 리뷰 등의 기능 추가
3. **에러 처리 개선** - 각 API별 특화된 에러 메시지
4. **로딩 상태 UI** - 데이터 로딩 중 스켈레톤 UI 추가
5. **무한 스크롤** - 게시글 목록 페이지네이션
