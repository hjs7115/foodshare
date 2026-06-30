# Foodshare

반띵(Foodshare) 통합 저장소입니다.

이 저장소는 기존에 분리되어 있던 백엔드와 프론트엔드 저장소를 한 곳에서 함께 볼 수 있도록 구성한 monorepo입니다.

```text
foodshare/
├── backend/    # https://github.com/hjs7115/foodshare-backend
├── frontend/   # https://github.com/hjs7115/foodshare-frontend
└── scripts/    # 원본 저장소 변경사항을 통합 저장소로 가져오는 스크립트
```

## 작업 방식

기본 개발은 기존 저장소에서 먼저 진행합니다.

| 담당 | 우선 작업 저장소 | 통합 저장소 반영 위치 |
|------|------------------|----------------------|
| Backend | `foodshare-backend` | `backend/` |
| Frontend | `foodshare-frontend` | `frontend/` |

즉, 백엔드 코드는 먼저 `foodshare-backend`에 커밋/푸시하고, 프론트엔드 코드는 먼저 `foodshare-frontend`에 커밋/푸시합니다. 이후 통합 저장소에서 subtree pull을 실행하면 각 저장소의 최신 상태가 `backend/`, `frontend/` 폴더로 들어옵니다.

## 최신 변경 가져오기

### 백엔드만 가져오기

```powershell
.\scripts\sync-backend.ps1
```

직접 실행할 경우:

```bash
git subtree pull --prefix=backend backend main --squash
```

### 프론트엔드만 가져오기

```powershell
.\scripts\sync-frontend.ps1
```

직접 실행할 경우:

```bash
git subtree pull --prefix=frontend frontend main --squash
```

### 둘 다 가져오기

```powershell
.\scripts\sync-all.ps1
```

## 원격 저장소

```bash
git remote -v
```

현재 구성:

```text
origin    https://github.com/hjs7115/foodshare.git
backend   https://github.com/hjs7115/foodshare-backend.git
frontend  https://github.com/hjs7115/foodshare-frontend.git
```

`origin`은 통합 저장소용 원격입니다. 아직 GitHub에 `hjs7115/foodshare` 저장소가 없다면 GitHub에서 먼저 생성한 뒤 push하면 됩니다.

## 실행

백엔드 실행:

```powershell
cd backend
.\gradlew.bat bootRun
```

프론트엔드 실행:

```powershell
cd frontend
npm install
npm run dev
```

자세한 내용은 각 폴더의 README를 확인하세요.

- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)
