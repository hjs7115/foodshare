# Scripts

FoodShare 통합본 관리에 사용하는 보조 스크립트입니다.

| 파일 | 설명 |
|------|------|
| `sync-backend.ps1` | 백엔드 단독 저장소 변경분을 통합본으로 가져올 때 사용 |
| `sync-frontend.ps1` | 프론트엔드 단독 저장소 변경분을 통합본으로 가져올 때 사용 |
| `sync-all.ps1` | 프론트엔드와 백엔드를 한 번에 통합본으로 동기화 |
| `test-backend.bat` | Windows에서 백엔드 테스트 실행 |
| `test-backend.sh` | Unix 계열 환경에서 백엔드 테스트 실행 |
| `fix_docx_korean.py` | 설계서 문서의 한글 표시를 보정할 때 사용 |
| `update_docx_pwa_focus.py` | 설계서에 PWA 관련 내용을 반영할 때 사용 |

스크립트 실행 전에는 각 저장소의 변경 사항을 커밋하거나 백업해 두는 것이 좋습니다.
