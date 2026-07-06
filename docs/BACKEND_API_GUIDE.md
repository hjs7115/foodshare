# API 명세서

계획서의 API 명세서 양식(`Method / Endpoint / 설명 / Request Body / Response`)에 맞춰 정리한 전체 API 목록입니다.

## 작성 기준

- Request Body는 API별 필요한 값을 바로 전달합니다. 예: `{ title, content, postType }`
- Request Body를 `{ data: ... }`로 감싸서 보내지 않습니다.
- Response만 공통 형식 `{ success, message, data }`로 통일합니다.
- 데이터가 없는 성공 응답은 `data: null`을 사용합니다.

## API Base URL

- 로컬 개발: `http://localhost:8080`
- 현재 기본 ngrok: `https://enticing-feel-fresh.ngrok-free.dev`
- 환경변수: `VITE_API_BASE_URL`

## API 명세

| Method | Endpoint | 설명 | Request Body | Response |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | 회원가입 | { name, nickname, email, phone, address, latitude, longitude, password } | { success, message, data: { accessToken, user } } |
| `POST` | `/api/auth/login` | 로그인 | { email, password } | { success, message, data: { accessToken, user } } |
| `POST` | `/api/auth/logout` | 로그아웃 | - | { success, message, data: null } |
| `POST` | `/api/auth/email-verifications` | 이메일 인증 코드 발송 | { email } | { success, message, data: null } |
| `POST` | `/api/auth/email-verifications/verify` | 이메일 인증 코드 확인 | { email, code } | { success, message, data: { verified } } |
| `GET` | `/api/auth/nickname/check?nickname={nickname}` | 닉네임 중복 확인 | - | { success, message, data: { available } } |
| `GET` | `/api/auth/email/check?email={email}` | 이메일 중복 확인 | - | { success, message, data: { available } } |
| `GET` | `/api/auth/phone/check?phoneNumber={phoneNumber}` | 전화번호 중복 확인 | - | { success, message, data: { available } } |
| `POST` | `/api/auth/find-email` | 이메일 찾기 | { name, phoneNumber } | { success, message, data: { email } } |
| `POST` | `/api/auth/find-id` | 아이디 찾기 | { name, phoneNumber } | { success, message, data: { email } } |
| `POST` | `/api/auth/password-reset-link` | 비밀번호 재설정 인증 코드 발송 | { email } | { success, message, data: { email, expiresInSeconds } } |
| `POST` | `/api/auth/reset-password` | 이메일 인증 코드 기반 비밀번호 재설정 | { email, code, newPassword } | { success, message, data: null } |
| `GET` | `/api/posts` | 게시글 목록 조회 | Query: postType, keyword, sort, lat, lng, radiusKm | { success, message, data: { posts } } |
| `POST` | `/api/posts` | 게시글 작성 | { title, content, amount, price, postType, board, category, imageUrl, expiry, targetCount, currentCount, deadline } | { success, message, data: { post } } |
| `POST` | `/api/posts/create` | 게시글 작성 레거시 호환 | { title, content, amount, price, postType } | { success, message, data: { post } } |
| `GET` | `/api/posts/{postId}` | 게시글 상세 조회 | - | { success, message, data: { post } } |
| `PUT` | `/api/posts/{postId}` | 게시글 수정 | { title, content, amount, price, status, expiry, deadline } | { success, message, data: { post } } |
| `DELETE` | `/api/posts/{postId}` | 게시글 삭제 | - | { success, message, data: null } |
| `GET` | `/api/posts/{postId}/comments` | 댓글 목록 조회 | - | { success, message, data: { comments } } |
| `POST` | `/api/posts/{postId}/comments` | 댓글 작성 | { content } | { success, message, data: { comment } } |
| `PUT` | `/api/comments/{commentId}` | 댓글 수정 | { content } | { success, message, data: { comment } } |
| `DELETE` | `/api/comments/{commentId}` | 댓글 삭제 | - | { success, message, data: null } |
| `POST` | `/api/posts/{postId}/trade-requests` | 거래 신청 | { message } | { success, message, data: { tradeRequest } } |
| `GET` | `/api/posts/{postId}/trade-requests` | 게시글별 거래 신청 조회 | - | { success, message, data: { tradeRequests } } |
| `POST` | `/api/trade-requests/{tradeRequestId}/accept` | 거래 신청 수락 | - | { success, message, data: { tradeRequest } } |
| `POST` | `/api/trade-requests/{tradeRequestId}/reject` | 거래 신청 거절 | - | { success, message, data: { tradeRequest } } |
| `GET` | `/api/mypage` | 마이페이지 프로필 조회 | - | { success, message, data: { user } } |
| `PUT` | `/api/mypage` | 프로필 수정 | { nickname, profileImage } | { success, message, data: { user } } |
| `PUT` | `/api/mypage/location` | 내 위치 수정 | { address, latitude, longitude } | { success, message, data: { user } } |
| `GET` | `/api/mypage/posts` | 내 게시글 조회 | - | { success, message, data: { posts } } |
| `GET` | `/api/mypage/comments` | 내 댓글 조회 | - | { success, message, data: { comments } } |
| `GET` | `/api/mypage/trade-requests` | 내 거래 신청 내역 조회 | - | { success, message, data: { tradeRequests } } |
| `GET` | `/api/mypage/received-trade-requests` | 받은 거래 신청 조회 | - | { success, message, data: { tradeRequests } } |
| `POST` | `/api/posts/{postId}/favorites` | 관심 게시글 등록 | - | { success, message, data: { favorite } } |
| `DELETE` | `/api/posts/{postId}/favorites` | 관심 게시글 해제 | - | { success, message, data: null } |
| `GET` | `/api/mypage/favorites` | 관심 게시글 목록 조회 | - | { success, message, data: { favorites } } |
| `POST` | `/api/uploads/images` | 이미지 업로드 | multipart/form-data: image | { success, message, data: { imageUrl } } |
| `POST` | `/api/users/{userId}/reviews` | 후기 및 평점 등록 | { tradeRequestId, rating, content } | { success, message, data: { review } } |
| `GET` | `/api/users/{userId}/reviews` | 후기 목록 조회 | - | { success, message, data: { reviews } } |
| `GET` | `/api/users/{userId}/rating` | 사용자 신뢰도 조회 | - | { success, message, data: { rating, reviewCount } } |
| `GET` | `/api/mypage/notifications/settings` | 알림 설정 조회 | - | { success, message, data: { settings } } |
| `PUT` | `/api/mypage/notifications/settings` | 알림 설정 수정 | { tradeRequest, tradeAccepted, chatMessage, review, marketing } | { success, message, data: { settings } } |
| `GET` | `/api/notifications` | 알림 목록 조회 | Query: page, size | { success, message, data: { notifications } } |
| `PATCH` | `/api/notifications/{notificationId}/read` | 알림 읽음 처리 | - | { success, message, data: null } |
| `POST` | `/api/notifications/fcm-token` | FCM 토큰 등록 | { token } | { success, message, data: null } |

## 공통 응답 예시

```json
{
  "success": true,
  "message": "요청 성공",
  "data": {
    "id": 1
  }
}
```

## 백엔드 구현 시 확인 사항

1. 모든 성공/실패 응답은 JSON으로 반환합니다.
2. 인증이 필요한 API는 `Authorization: Bearer {token}` 헤더를 사용합니다.
3. 요청 DTO는 기존처럼 API별 필드를 바로 받습니다.
4. 컨트롤러 반환값만 공통 응답 DTO로 감싸서 반환합니다.
5. 게시글 작성은 기본적으로 `POST /api/posts`를 사용하고, `/api/posts/create`는 레거시 호환용으로만 유지합니다.
6. 이미지 업로드 후 게시글에는 base64 이미지보다 `imageUrl` 저장을 권장합니다.
7. 위치 기반 조회 파라미터는 `lat`, `lng`, `radiusKm`로 통일합니다.
