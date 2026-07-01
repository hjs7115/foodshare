# Foodshare

반띵(Foodshare) 통합 저장소입니다.

기존 `foodshare-backend`, `foodshare-frontend` 저장소의 내용을 한 프로젝트처럼 사용할 수 있도록 루트 기준으로 합친 저장소입니다. 별도의 `backend/`, `frontend/` 폴더로 들어가지 않고 루트에서 프론트엔드와 서버를 함께 다룹니다.

```text
foodshare/
├── src/
│   ├── app/                    # React 화면/컴포넌트
│   ├── styles/                 # 프론트엔드 스타일
│   ├── main.tsx                # 프론트엔드 진입점
│   ├── main/java/...           # Spring Boot 서버 코드
│   ├── main/resources/         # 서버 설정
│   └── test/                   # 서버 테스트
├── public/                     # 프론트엔드 정적 자산
├── docs/                       # 설계서, API 문서, 참고 문서
├── scripts/                    # 동기화/보조 스크립트
├── package.json                # 프론트엔드 실행/빌드
├── build.gradle                # 서버 실행/빌드
└── README.md
```

## 작업 방식

기본 작업은 기존 분리 저장소에서 먼저 진행할 수 있습니다.

| 담당 | 우선 작업 저장소 | 통합 저장소 반영 |
|------|------------------|------------------|
| 서버 | `foodshare-backend` | `scripts/sync-backend.ps1` |
| 프론트 | `foodshare-frontend` | `scripts/sync-frontend.ps1` |

즉, 서버 코드는 `foodshare-backend`에 먼저 커밋/푸시하고, 프론트 코드는 `foodshare-frontend`에 먼저 커밋/푸시합니다. 이후 이 통합 저장소에서 동기화 스크립트를 실행하면 원본 저장소의 최신 파일이 루트 구조에 맞게 반영됩니다.

## 최신 변경 가져오기

서버 변경만 가져오기:

```powershell
.\scripts\sync-backend.ps1
```

프론트 변경만 가져오기:

```powershell
.\scripts\sync-frontend.ps1
```

둘 다 가져오기:

```powershell
.\scripts\sync-all.ps1
```

동기화 후에는 변경 내용을 확인하고 커밋/푸시합니다.

```powershell
git status
git add .
git commit -m "sync upstream changes"
git push
```

## 실행

서버 실행:

```powershell
.\gradlew.bat bootRun
```

프론트엔드 실행:

```powershell
npm install
npm run dev
```

기본 주소:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8080
```

## 원격 저장소

```text
origin    https://github.com/hjs7115/foodshare.git
backend   https://github.com/hjs7115/foodshare-backend.git
frontend  https://github.com/hjs7115/foodshare-frontend.git
```

참고 문서:

- `docs/README-backend.md`
- `docs/README-frontend.md`
- `docs/API.md`
- `docs/design/`
