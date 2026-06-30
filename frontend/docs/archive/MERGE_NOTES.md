# 반띵 + 졸작 API 연동 적용 내용

## 적용 방향
- 반띵의 화면 구성과 기능은 유지
- 졸작 프로젝트에 있던 백엔드 API 연동 방식을 반띵에 적용
- 실제 백엔드 서버 코드는 졸작 ZIP 안에 없어서, 서버 폴더를 통째로 가져온 것이 아니라 프론트의 API 연결 부분을 이식함

## 주요 변경 파일
- `src/app/api/config.ts`
  - `VITE_API_BASE_URL` 환경변수 지원
  - 인증, 회원가입, 게시글, 댓글, 거래요청, 마이페이지 API 엔드포인트 정리
  - 공통 `apiRequest` 사용
- `src/app/components/auth/LoginScreen.tsx`
  - localStorage 로그인 대신 `POST /api/auth/login` 호출
- `src/app/components/auth/SignupScreen.tsx`
  - 이메일 인증, 닉네임 중복확인, 회원가입 API 호출
  - 전화번호 숫자만 입력 기능 유지
  - 비밀번호 8자 이상 검증 유지
- `src/app/components/board/CreatePostScreen.tsx`
  - 게시글 작성 시 `POST /api/posts` 호출
  - 작성 성공 후 기존 반띵 화면에 바로 보이도록 localStorage에도 미러링
- `src/app/components/board/SharingBoard.tsx`
  - 게시글 목록을 서버에서 우선 조회하고 실패 시 localStorage 사용
- `src/app/components/board/GroupBuyingBoard.tsx`
  - 공동구매 목록을 서버에서 우선 조회하고 실패 시 localStorage 사용
- `src/app/components/profile/ProfileScreen.tsx`
  - 마이페이지 API 조회 및 로그아웃 API 호출
- `src/app/components/profile/EditProfileScreen.tsx`
  - 프로필 수정 API 호출

## 실행 방법
```bash
npm install
cp .env.example .env
npm run dev
```

`.env`에서 백엔드 주소를 실제 서버 주소로 바꿔주세요.

```env
VITE_API_BASE_URL=http://localhost:8080
```
