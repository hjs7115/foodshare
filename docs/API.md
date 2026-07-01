# FoodShare Backend API

Base URL:

```text
http://localhost:8080
```

Most write APIs require JWT.

```text
Authorization: Bearer {accessToken}
```

All responses use this shape:

```json
{
  "success": true,
  "message": "Message.",
  "data": {}
}
```

## Auth

### Send Signup Email Code

```http
POST /api/auth/email-verifications
Content-Type: application/json
```

```json
{
  "email": "user@example.com"
}
```

The verification code is sent by email. It is not returned in the API response.

### Verify Signup Email Code

```http
POST /api/auth/email-verifications/verify
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

### Signup

Signup requires a verified email.

```http
POST /api/auth/signup
Content-Type: application/json
```

```json
{
  "name": "홍길동",
  "nickname": "gildong",
  "email": "user@example.com",
  "password": "password123",
  "phoneNumber": "01012345678",
  "location": "서울 강남구 역삼동"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "success": true,
  "message": "Login completed.",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "opaque-refresh-token",
    "tokenType": "Bearer",
    "user": {
      "userId": 1,
      "email": "user@example.com",
      "name": "홍길동",
      "nickname": "gildong",
      "phoneNumber": "01012345678",
      "location": "서울 강남구 역삼동"
    }
  }
}
```

### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json
```

```json
{
  "refreshToken": "opaque-refresh-token"
}
```

The backend rotates refresh tokens. Logout and password reset revoke stored refresh tokens.

### Password Reset

The endpoint name is kept for frontend compatibility, but the behavior is email-code based.

```http
POST /api/auth/password-reset-link
Content-Type: application/json
```

```json
{
  "email": "user@example.com"
}
```

Then reset with the received code.

```http
POST /api/auth/reset-password
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newpassword123"
}
```

### Duplicate Checks

```http
GET /api/auth/nickname/check?nickname=gildong
GET /api/auth/email/check?email=user@example.com
GET /api/auth/phone/check?phoneNumber=01012345678
```

## Posts

`postType`: `SHARE`, `SALE`, `GROUP_BUY`

### Create Post

```http
POST /api/posts
Content-Type: application/json
Authorization: Bearer {accessToken}
```

```json
{
  "postType": "SHARE",
  "title": "양파 나눔",
  "ingredientName": "양파",
  "quantity": "3개",
  "price": 0,
  "tradeLocation": "서울 강남구 역삼동",
  "latitude": 37.5001,
  "longitude": 127.0361,
  "expirationDate": "2026-07-08",
  "imageUrl": "/uploads/example.png",
  "content": "남은 양파 나눔합니다."
}
```

Group-buy posts require participant count and deadline.

```json
{
  "postType": "GROUP_BUY",
  "title": "사과 공동구매",
  "ingredientName": "사과",
  "quantity": "10박스",
  "price": 30000,
  "tradeLocation": "서울 강남구 역삼동",
  "latitude": 37.5001,
  "longitude": 127.0361,
  "expirationDate": "2026-07-20",
  "content": "사과 공동구매 모집합니다.",
  "currentParticipantCount": 1,
  "targetParticipantCount": 5,
  "deadlineDate": "2026-07-10"
}
```

### Search Posts

```http
GET /api/posts
```

Query parameters:

```text
postType=SHARE | SALE | GROUP_BUY
keyword=양파
lat=37.5001
lng=127.0361
radiusKm=5
expiringSoon=true
sort=LATEST | EXPIRING_SOON | DISTANCE
```

Examples:

```http
GET /api/posts?postType=SHARE
GET /api/posts?lat=37.5001&lng=127.0361&radiusKm=3&sort=DISTANCE
GET /api/posts?expiringSoon=true&sort=EXPIRING_SOON
GET /api/posts/page?page=0&size=20
```

Distance filtering uses the stored post coordinates and the requester's `lat/lng`.

### Update/Delete Post

Only the writer can update or delete a post.

```http
PUT /api/posts/{postId}
DELETE /api/posts/{postId}
Authorization: Bearer {accessToken}
```

Expired posts are hidden/closed when searched. Group-buy posts whose deadline has passed are closed by the scheduled notification job.

## Comments

### Create Comment

```http
POST /api/posts/{postId}/comments
Content-Type: application/json
Authorization: Bearer {accessToken}
```

```json
{
  "content": "거래 가능할까요?"
}
```

Creating a comment on another user's post creates a DB notification for the post writer.

If either user has blocked the other user, comment creation is rejected. When an authenticated user lists comments, comments written by blocked users are hidden.

## Trade Requests

### Create Trade Request

```http
POST /api/posts/{postId}/requests
Authorization: Bearer {accessToken}
```

Alias:

```http
POST /api/posts/{postId}/trade-requests
```

Users cannot request their own post or request the same post twice.

If either user has blocked the other user, trade request creation is rejected.

### Accept/Reject/Complete

Only the post writer can accept or reject. The writer or requester can complete an accepted trade.

```http
PATCH /api/trade-requests/{requestId}/accept
PATCH /api/trade-requests/{requestId}/reject
PATCH /api/trade-requests/{requestId}/complete
Authorization: Bearer {accessToken}
```

For normal share/sale posts, accepting a request closes the post and rejects other pending requests. For group-buy posts, accepting a request increases `currentParticipantCount`; the post closes when the target count is reached.

## Notifications

### List Notifications

```http
GET /api/notifications
Authorization: Bearer {accessToken}
```

### Mark As Read

```http
PATCH /api/notifications/{notificationId}/read
Authorization: Bearer {accessToken}
```

Only the notification owner can mark it as read.

### Register FCM Token

```http
POST /api/notifications/fcm-token
Content-Type: application/json
Authorization: Bearer {accessToken}
```

```json
{
  "token": "browser-fcm-token"
}
```

### Send Test Push

Creates a DB notification for the current user and attempts FCM delivery to the registered token.

```http
POST /api/notifications/test-push
Content-Type: application/json
Authorization: Bearer {accessToken}
```

```json
{
  "title": "테스트 알림",
  "message": "푸시 연결 확인"
}
```

Response `data` is `true` when FCM delivery was attempted successfully. It can be `false` when Firebase is disabled, no FCM token exists, or FCM rejects the token. The DB notification is still created.

When Firebase is enabled and a registered FCM token is rejected, the backend clears the stored token so the client can register a fresh one.

Paged notification list:

```http
GET /api/notifications/page?page=0&size=20
Authorization: Bearer {accessToken}
```

### Scheduled Expiring Notifications

Every day at 09:00 Asia/Seoul, the backend creates one `EXPIRING_SOON` notification per open post whose expiration date is within 3 days. Duplicate notifications for the same post/date message are skipped.

## Reviews

Reviews can be written only after a trade request is `COMPLETED`.

```http
POST /api/trade-requests/{requestId}/reviews
Content-Type: application/json
Authorization: Bearer {accessToken}
```

```json
{
  "rating": 5,
  "content": "친절하고 빠르게 거래했어요."
}
```

Public rating APIs:

```http
GET /api/users/{userId}/reviews
GET /api/users/{userId}/reviews/page?page=0&size=20
GET /api/users/{userId}/rating
```

## Reports And Blocks

### Create Report

```http
POST /api/reports
Content-Type: application/json
Authorization: Bearer {accessToken}
```

`targetType`: `USER`, `POST`, `COMMENT`

```json
{
  "targetType": "POST",
  "targetId": 1,
  "reason": "부적절한 게시글",
  "description": "상세 신고 사유"
}
```

For `POST` and `COMMENT`, the backend resolves the target user from the writer. Duplicate reports for the same target by the same reporter are rejected.

### My Reports

```http
GET /api/reports/me
Authorization: Bearer {accessToken}
```

### Block / Unblock User

```http
POST /api/users/{userId}/block
DELETE /api/users/{userId}/block
Authorization: Bearer {accessToken}
```

Blocked users cannot create comments or trade requests between each other. Authenticated post/comment lists hide blocked users' content.

### Blocked Users

```http
GET /api/users/blocks
GET /api/mypage/blocks
Authorization: Bearer {accessToken}
```

## Badges

Badges are calculated from existing user activity.

```http
GET /api/badges/me
GET /api/mypage/badges
Authorization: Bearer {accessToken}
```

Response data:

```json
{
  "totalCount": 6,
  "achievedCount": 2,
  "badges": [
    {
      "badgeId": "FIRST_POST",
      "name": "첫 게시글",
      "description": "게시글을 1개 이상 작성하면 획득합니다.",
      "currentValue": 1,
      "targetValue": 1,
      "achieved": true,
      "progress": 1.0
    }
  ]
}
```

## My Page

```http
GET /api/mypage
GET /api/mypage/posts
GET /api/mypage/comments
GET /api/mypage/trade-requests
GET /api/mypage/received-trade-requests
GET /api/mypage/reviews
GET /api/mypage/reviews/page?page=0&size=20
GET /api/mypage/blocks
GET /api/mypage/badges
Authorization: Bearer {accessToken}
```

## Admin

Admin APIs require both normal authentication and `X-Admin-Token`.

```http
GET /api/admin/stats
GET /api/admin/reports?page=0&size=20
PATCH /api/admin/reports/{reportId}
Authorization: Bearer {accessToken}
X-Admin-Token: {app.admin.token}
```

Report status update body:

```json
{
  "status": "REVIEWED"
}
```

Allowed report statuses: `PENDING`, `REVIEWED`, `REJECTED`.

## Image Upload

```http
POST /api/uploads/images
Content-Type: multipart/form-data
Authorization: Bearer {accessToken}
```

Form field:

```text
file
```

Allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

Max size: `5MB`

Local `/uploads/...` files are deleted when a post image is replaced or when the post is deleted.
