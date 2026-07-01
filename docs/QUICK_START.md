# 🚀 빠른 시작 가이드

## ❌ "Failed to fetch" 또는 "403 Forbidden" 에러가 나타나나요?

**지금 바로 해결하세요! (5분 소요)**

**⚠️ 403 Forbidden 에러라면** → **`docs/FIX_403_ERROR.md`** 파일을 먼저 확인하세요!
- ngrok URL이 만료되었을 가능성이 높습니다
- 백엔드에서 새 ngrok URL을 확인하고 프론트엔드 설정을 업데이트하세요

---

## 1️⃣ 백엔드 서버 실행 (가장 중요!)

### 백엔드 폴더로 이동
```bash
cd backend
```

### 서버 실행
```bash
# Java/Spring Boot
./gradlew bootRun

# Node.js
npm start

# Python
python main.py
```

### ✅ 성공 확인
터미널에서 이런 메시지가 보이면 성공:
```
✅ Server is running on port 8080
✅ Application started
✅ Listening on http://localhost:8080
```

---

## 2️⃣ 연결 테스트

### 방법 1: 브라우저
주소창에 입력:
```
http://localhost:8080
```

**화면이 뜨거나 응답이 오면 → ✅ 성공!**

### 방법 2: 터미널
```bash
curl http://localhost:8080
```

**응답이 오면 → ✅ 성공!**

---

## 3️⃣ 프론트엔드 새로고침

- 브라우저에서 **Ctrl+R** (Mac: **Cmd+R**)
- 또는 랜딩 화면 우측 상단 **🔍** 클릭 → "진단 시작"

---

## 🔧 여전히 안 되나요?

### 포트가 8080이 아닌가요?

백엔드 로그를 확인하세요:
```
Server running on port 3000  ← 3000 포트
```

**프론트엔드 설정 변경:**

파일: `src/app/api/config.ts`
```typescript
// 3번째 줄 수정
export const API_BASE_URL = "http://localhost:3000"; // 포트 변경
```

**저장 후 브라우저 새로고침!**

---

## 🎯 진단 도구 사용

1. 프론트엔드 랜딩 화면에서 우측 상단 **🔍** 클릭
2. "진단 시작" 버튼 클릭
3. 결과 확인:
   - ✅ 모두 성공 → 정상!
   - ❌ 연결 실패 → 백엔드 서버 실행 확인
   - ⚠️ CORS 에러 → 아래 CORS 설정 참고

---

## 🌐 CORS 설정 (필수!)

백엔드에 CORS 설정이 없으면 프론트엔드와 통신이 안 됩니다.

### Express.js
```javascript
const cors = require('cors');
app.use(cors({ origin: '*' }));
```

### Spring Boot
```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("*")
                .allowedMethods("*")
                .allowedHeaders("*");
    }
}
```

### FastAPI
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## ✅ 체크리스트

- [ ] 백엔드 서버 실행됨
- [ ] `curl http://localhost:8080` 응답 옴
- [ ] 브라우저에서 `http://localhost:8080` 접속됨
- [ ] CORS 설정 추가됨
- [ ] 프론트엔드 새로고침함
- [ ] 🔍 진단 도구에서 모두 ✅

---

## 🆘 그래도 안 되면?

### 백엔드 개발자에게 전달할 정보:

```
1. 백엔드 실행 명령어: npm start
2. 포트 번호: 8080
3. 터미널 로그 마지막 5줄: [복사해서 붙여넣기]
4. curl http://localhost:8080 결과: [복사해서 붙여넣기]
```

### 프론트엔드 개발자 확인 사항:

1. **브라우저 콘솔** (F12 → Console 탭)
2. **Network 탭** (F12 → Network 탭) - 빨간색 요청 확인
3. **진단 도구** 결과 스크린샷

---

## 🎉 정상 작동 확인

모든 것이 정상이면:

1. ✅ 랜딩 화면 표시
2. ✅ 회원가입/로그인 가능
3. ✅ 브라우저 콘솔에 `📡 API 요청:`, `✅ 응답 데이터:` 로그
4. ✅ 🔍 진단 도구 모두 녹색

**축하합니다! 🎉 모든 설정이 완료되었습니다!**

---

## 📚 추가 문서

- `docs/CHECK_SERVER.md` - 서버 연결 단계별 확인
- `README_BACKEND_SETUP.md` - 백엔드 설정 완전 가이드
- `docs/TROUBLESHOOTING.md` - 에러별 해결 방법
- `docs/API_INTEGRATION_COMPLETE.md` - API 연동 현황

---

**💡 팁:** 우측 상단 🔍 아이콘을 활용하면 언제든지 백엔드 상태를 확인할 수 있습니다!
