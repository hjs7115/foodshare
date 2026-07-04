# 반띵

식재료 나눔, 판매, 공동구매를 위한 프론트엔드 프로젝트입니다.

## 실행

```bash
npm install
npm run dev
```

## 주요 폴더

- `src/`: 앱 소스 코드
- `public/assets/`: 정적 이미지
- `docs/`: API 연동, 서버 설정, 기능 문서
- `scripts/`: 테스트 및 문서 생성 보조 스크립트

## 환경 변수

`.env.example`을 참고해 루트에 `.env`를 만들 수 있습니다.

```env
VITE_API_BASE_URL=http://localhost:8080
```

설정하지 않으면 `src/app/api/config.ts`의 기본 API 주소를 사용합니다.
