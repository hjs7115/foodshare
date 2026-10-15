# 서버 변경 통합 (2026-10-16)

GitHub main `6c3bc98`을 기준으로 EC2의 `db981cd`까지 기능 변경을 통합했습니다. 기존 GitHub 커밋 이력은 유지하며 서버의 중간 커밋은 하나의 변경으로 정리했습니다.

## 포함한 기능

- 채팅 참여자 권한 검사, 개인별 방 나가기, 토큰 갱신, 냉장고 기한 집계 수정
- 소개 페이지와 PWA 설치 흐름, 사진 최적화, 인증 메일 형식 개선
- 위치 저장과 표시, 로그인 후 알림 연결 복구, 프로필 사진 및 채팅 프로필 연결
- 한 끼 추천과 먼저 확인할 재료, AI 레시피 생성 및 기본 추천
- 선택 공개형 열린 냉장고, 직접 맞교환 제안과 채팅 연결
- 계정별 주간 장보기, 선택형 알림, 확인 후 구매 재료 냉장고 등록

## 비밀 설정

실제 `.env`, `.env.docker`, 서비스 계정 JSON, 인증서 개인키, DB 덤프, 업로드 데이터는 포함하지 않습니다. `.env.example`과 `.env.docker.example`을 복사해 각 실행 환경에서 설정하세요. DB 비밀번호와 JWT 시크릿은 더 이상 코드의 기본값에 의존하지 않습니다.

Firebase 웹 설정은 `VITE_FIREBASE_*` 환경변수로 전달합니다. Vite가 프런트엔드와 서비스 워커용 `firebase-config.js`를 같은 설정으로 빌드합니다. Firebase 콘솔의 웹 앱 설정값과 VAPID 공개키가 필요합니다. `VITE_*` 값은 브라우저에 공개되므로 서버용 OpenAI 키, 메일 비밀번호, Firebase 서비스 계정 개인키를 절대 넣지 마세요. 서버용 값은 백엔드 환경변수 및 `secrets/` 파일로만 제공하세요.

기존 GitHub 이력에 있던 하드코딩 설정값은 이번 파일 정리로 과거 이력에서 삭제되지 않습니다. 이전 DB 기본 비밀번호를 실제로 사용했다면 별도로 교체하세요. 브라우저 공개키는 서비스 콘솔에서 허용 도메인/API 제한을 적용하세요.

## 실행 및 배포

- 로컬: Java 21, Node 22 이상. `npm ci`, `npm run dev`, `./gradlew bootRun`.
- 테스트: `./gradlew test bootJar`, `npm test`, `npm run build`.
- 기본 Docker 구성: `docker compose --env-file .env.docker up -d --build` (HTTP 8080).
- EC2 HTTPS 구성: `docker compose --env-file .env.docker -f docker-compose.production.yml up -d --build`.
- HTTPS 구성은 서버의 `/etc/letsencrypt/live/bantting.store/` 인증서를 마운트합니다. 인증서와 개인키 자체는 저장소에 포함하지 않습니다. MySQL 관리 포트는 루프백에만 연결됩니다.
- 새 코드로 프런트엔드를 빌드하기 전에 `.env.docker`에 Firebase 웹 설정을 채워야 합니다. 설정이 없으면 앱을 열 수 있지만 푸시를 연결할 수 없습니다.
- 운영 DB 백업 후 배포하세요. 추가 테이블 및 컬럼은 현재 프로젝트의 Hibernate `ddl-auto=update` 설정을 사용합니다.

주간 알림은 한국 시간 기준으로 살 품목이 있는 주에만 1회 생성합니다. 실제 기기의 푸시 수신은 권한과 유효한 FCM 연결이 필요합니다. 냉장고 수량은 임의로 합산/차감하지 않습니다.
