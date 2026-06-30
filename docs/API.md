# 반띵 API

Base URL:

```text
http://localhost:8080
```

## Auth

Most write APIs require JWT.

```text
Authorization: Bearer {accessToken}
```

### Signup

```http
POST /api/auth/signup
Content-Type: application/json
```

Request:

```json
{
  "name": "허준서",
  "nickname": "junseo",
  "email": "test@email.com",
  "password": "password123",
  "carrier": "SKT",
  "phoneNumber": "01012345678",
  "location": "충북 충주시"
}
```

`carrier`: `SKT`, `KT`, `LGU`, `MVNO`, `UNKNOWN`

Response:

```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다.",
  "data": {
    "accessToken": "eyJ...",
    "tokenType": "Bearer",
    "user": {
      "userId": 1,
      "email": "test@email.com",
      "name": "허준서",
      "nickname": "junseo",
      "location": "충북 충주시"
    }
  }
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "test@email.com",
  "password": "password123"
}
```

Response shape is the same as signup.

### Find Email

Development-only basic ID lookup. Uses name and phone number.

```http
POST /api/auth/find-email
Content-Type: application/json
```

Request:

```json
{
  "name": "허준서",
  "phoneNumber": "01012345678"
}
```

Response:

```json
{
  "success": true,
  "message": "Email found.",
  "data": {
    "email": "test@email.com"
  }
}
```

### Reset Password

Development-only basic password reset. No email verification is sent yet.

```http
POST /api/auth/reset-password
Content-Type: application/json
```

Request:

```json
{
  "email": "test@email.com",
  "newPassword": "newpassword123"
}
```

### Duplicate Checks

Public.

```http
GET /api/auth/nickname/check?nickname=mero
GET /api/auth/email/check?email=test@email.com
GET /api/auth/phone/check?phoneNumber=01012345678
```

Response:

```json
{
  "success": true,
  "message": "Nickname checked.",
  "data": {
    "duplicated": false,
    "available": true
  }
}
```

## Posts

`postType`: `SHARE`, `SALE`, `GROUP_BUY`

### Create Post

Requires JWT.

```http
POST /api/posts
Content-Type: application/json
Authorization: Bearer {accessToken}
```

Request:

```json
{
  "postType": "SHARE",
  "title": "상추 나눔",
  "ingredientName": "상추",
  "quantity": "300g",
  "price": 0,
  "tradeLocation": "충북 충주시",
  "distanceKm": 0.5,
  "expirationDate": "2026-05-20",
  "imageUrl": "/uploads/example.png",
  "content": "상추 나눔합니다."
}
```

### Get Posts

Public.

```http
GET /api/posts
```

Query parameters:

```text
postType=SHARE | SALE | GROUP_BUY
keyword=상추
maxDistanceKm=1.0
sort=LATEST | EXPIRING_SOON | DISTANCE
```

Examples:

```http
GET /api/posts?postType=SHARE
GET /api/posts?keyword=상추
GET /api/posts?maxDistanceKm=1.0
GET /api/posts?sort=EXPIRING_SOON
GET /api/posts?postType=GROUP_BUY&keyword=양배추&sort=DISTANCE
```

### Get Post

Public.

```http
GET /api/posts/{postId}
```

### Update Post

Requires JWT. Only the writer can update.

```http
PUT /api/posts/{postId}
Content-Type: application/json
Authorization: Bearer {accessToken}
```

Request body is the same as create post.

### Delete Post

Requires JWT. Only the writer can delete.

```http
DELETE /api/posts/{postId}
Authorization: Bearer {accessToken}
```

Delete is soft delete. The row remains in DB but is hidden from list/detail APIs.

Post response example:

```json
{
  "success": true,
  "message": "Posts found.",
  "data": [
    {
      "postId": 1,
      "writerId": 1,
      "writerNickname": "junseo",
      "postType": "SHARE",
      "status": "OPEN",
      "title": "상추 나눔",
      "ingredientName": "상추",
      "quantity": "300g",
      "price": 0,
      "priceText": "무료나눔",
      "tradeLocation": "충북 충주시",
      "distanceKm": 0.5,
      "expirationDate": "2026-05-20",
      "daysUntilExpiration": 2,
      "expirationText": "유통기한 2일 남음",
      "imageUrl": "/uploads/example.png",
      "content": "상추 나눔합니다.",
      "createdAt": "2026-05-18T20:00:00"
    }
  ]
}
```

## Comments

### Create Comment

Requires JWT.

```http
POST /api/posts/{postId}/comments
Content-Type: application/json
Authorization: Bearer {accessToken}
```

Request:

```json
{
  "content": "거래 가능한가요?"
}
```

### Get Comments

Public.

```http
GET /api/posts/{postId}/comments
```

Response item:

```json
{
  "commentId": 1,
  "postId": 1,
  "writerId": 2,
  "writerNickname": "buyer",
  "content": "거래 가능한가요?",
  "createdAt": "2026-05-18T20:00:00"
}
```

## Trade Requests

### Create Trade Request

Requires JWT. Users cannot request their own post.

```http
POST /api/posts/{postId}/requests
Authorization: Bearer {accessToken}
```

### My Trade Requests

Requires JWT.

```http
GET /api/trade-requests/me
Authorization: Bearer {accessToken}
```

### Received Trade Requests

Requires JWT. Returns requests on posts written by the current user.

```http
GET /api/trade-requests/received
Authorization: Bearer {accessToken}
```

### Accept Trade Request

Requires JWT. Only the post writer can accept.

```http
PATCH /api/trade-requests/{requestId}/accept
Authorization: Bearer {accessToken}
```

### Reject Trade Request

Requires JWT. Only the post writer can reject.

```http
PATCH /api/trade-requests/{requestId}/reject
Authorization: Bearer {accessToken}
```

### Complete Trade Request

Requires JWT. The post writer or requester can complete an accepted trade.

```http
PATCH /api/trade-requests/{requestId}/complete
Authorization: Bearer {accessToken}
```

Trade request response item:

```json
{
  "requestId": 1,
  "postId": 1,
  "postTitle": "상추 나눔",
  "requesterId": 2,
  "requesterNickname": "buyer",
  "status": "PENDING",
  "createdAt": "2026-05-18T20:00:00",
  "respondedAt": null,
  "completedAt": null
}
```

`status`: `PENDING`, `ACCEPTED`, `REJECTED`, `COMPLETED`

## Reviews

Reviews can be written only after a trade request is `COMPLETED`.
Each user can write one review per trade request.

### Create Review

Requires JWT.

```http
POST /api/trade-requests/{requestId}/reviews
Content-Type: application/json
Authorization: Bearer {accessToken}
```

Request:

```json
{
  "rating": 5,
  "content": "친절하고 빠르게 거래했어요."
}
```

`rating`: 1 to 5

Response item:

```json
{
  "reviewId": 1,
  "tradeRequestId": 1,
  "reviewerId": 2,
  "reviewerNickname": "buyer",
  "targetUserId": 1,
  "targetUserNickname": "seller",
  "rating": 5,
  "content": "친절하고 빠르게 거래했어요.",
  "createdAt": "2026-05-18T20:00:00"
}
```

### Get User Reviews

Public.

```http
GET /api/users/{userId}/reviews
```

### Get User Rating Summary

Public.

```http
GET /api/users/{userId}/rating
```

Response:

```json
{
  "success": true,
  "message": "Rating summary found.",
  "data": {
    "userId": 1,
    "averageRating": 4.8,
    "reviewCount": 12
  }
}
```

### Get My Written Reviews

Requires JWT.

```http
GET /api/mypage/reviews
Authorization: Bearer {accessToken}
```

## My Page

All mypage APIs require JWT.

```http
GET /api/mypage
GET /api/mypage/posts
GET /api/mypage/comments
GET /api/mypage/trade-requests
GET /api/mypage/received-trade-requests
```

`GET /api/mypage` response:

```json
{
  "success": true,
  "message": "My page found.",
  "data": {
    "user": {
      "userId": 1,
      "email": "test@email.com",
      "name": "허준서",
      "nickname": "junseo",
      "location": "충북 충주시"
    },
    "myPostCount": 3,
    "myCommentCount": 5,
    "myTradeRequestCount": 2,
    "receivedTradeRequestCount": 1,
    "averageRating": 4.8,
    "reviewCount": 12
  }
}
```

## Image Upload

Requires JWT.

```http
POST /api/uploads/images
Content-Type: multipart/form-data
Authorization: Bearer {accessToken}
```

Form field:

```text
file
```

Allowed types:

```text
image/jpeg
image/png
image/webp
image/gif
```

Max size: `5MB`

Response:

```json
{
  "success": true,
  "message": "Image uploaded.",
  "data": {
    "imageUrl": "/uploads/uuid.png",
    "originalFilename": "carrot.png",
    "size": 12345
  }
}
```

Use returned `imageUrl` as `imageUrl` when creating or updating a post.

## Frontend Examples

Login:

```ts
const response = await fetch("http://localhost:8080/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "test@email.com",
    password: "password123",
  }),
});

const result = await response.json();
localStorage.setItem("accessToken", result.data.accessToken);
```

Authorized request:

```ts
const token = localStorage.getItem("accessToken");

const response = await fetch("http://localhost:8080/api/posts", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    postType: "SHARE",
    title: "상추 나눔",
    ingredientName: "상추",
    quantity: "300g",
    price: 0,
    tradeLocation: "충북 충주시",
    distanceKm: 0.5,
    expirationDate: "2026-05-20",
    imageUrl: "",
    content: "상추 나눔합니다.",
  }),
});
```

Image upload:

```ts
const token = localStorage.getItem("accessToken");
const formData = new FormData();
formData.append("file", file);

const response = await fetch("http://localhost:8080/api/uploads/images", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```
