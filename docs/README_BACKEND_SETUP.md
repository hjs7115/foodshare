# ⚠️ 백엔드 서버 연결 실패 해결 가이드

## 현재 상황

프론트엔드가 다음 에러를 표시하고 있습니다:
```
❌ 백엔드 서버 연결 실패: TypeError: Failed to fetch
```

## 🚀 빠른 해결 방법

### 1단계: 백엔드 서버 실행 확인

**백엔드 터미널에서 다음 중 하나를 실행하세요:**

```bash
# Java/Spring Boot
cd backend
./gradlew bootRun

# 또는 Maven
mvn spring-boot:run

# Node.js/Express
cd backend
npm start

# Python/FastAPI
cd backend
uvicorn main:app --reload --port 8080
```

**서버가 실행되면 다음과 같은 메시지가 보여야 합니다:**
```
✅ Server is running on port 8080
✅ Application started on port 8080
✅ Tomcat started on port(s): 8080
```

---

### 2단계: 자동 테스트 실행

**Mac/Linux:**
```bash
./scripts/test-backend.sh
```

**Windows:**
```cmd
scripts/test-backend.bat
```

**또는 수동 테스트:**
```bash
curl http://localhost:8080
```

브라우저에서 접속:
```
http://localhost:8080
```

---

### 3단계: 결과 확인

#### ✅ 성공 (다음 중 하나가 보이면 OK)
- 웹페이지가 표시됨
- JSON 응답: `{"message": "..."}`
- 404 에러 페이지 (서버는 작동 중)

#### ❌ 실패
- "사이트에 연결할 수 없음"
- "연결 거부됨"
- 아무 응답 없음

→ **실패하면:** 백엔드 서버가 실행되지 않았습니다. 1단계로 돌아가세요.

---

## 🔧 포트가 8080이 아닌 경우

백엔드가 다른 포트(예: 3000, 8000)에서 실행 중이라면:

### 방법 1: 프론트엔드 설정 변경 (권장)

파일: `src/app/api/config.ts`

```typescript
// 현재 설정
export const API_BASE_URL = "http://localhost:8080";

// 포트 3000으로 변경
export const API_BASE_URL = "http://localhost:3000";

// 포트 8000으로 변경
export const API_BASE_URL = "http://localhost:8000";
```

**수정 후 브라우저 새로고침 (Ctrl+R 또는 Cmd+R)**

### 방법 2: 백엔드 포트 변경

백엔드 설정 파일에서 포트를 8080으로 변경:

**Spring Boot** (`application.properties`):
```properties
server.port=8080
```

**Express.js**:
```javascript
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## 🌐 CORS 설정 (중요!)

백엔드에 CORS 설정이 필요합니다.

### Express.js
```javascript
const cors = require('cors');

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
}));
```

### Spring Boot
```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
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
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## ✅ 모든 것이 정상이면

1. 프론트엔드 화면 새로고침 (Ctrl+R)
2. "다시 연결 시도" 버튼 클릭
3. 랜딩 페이지가 표시되어야 함

---

## 🆘 여전히 안 되나요?

### 확인할 정보:

1. **백엔드 서버 로그** (터미널 출력)
2. **브라우저 콘솔** (F12 → Console 탭)
3. **브라우저 Network 탭** (F12 → Network 탭)

### 제공할 정보:

```
1. 백엔드 실행 명령어:
   예) npm start, ./gradlew bootRun

2. 백엔드 포트:
   예) 8080, 3000

3. 백엔드 로그 마지막 5줄:
   (터미널에서 복사)

4. 브라우저 콘솔 에러:
   (F12 → Console 탭에서 빨간 글씨 복사)
```

---

## 📋 체크리스트

- [ ] 백엔드 서버가 실행 중인가?
- [ ] `curl http://localhost:8080` 명령어 성공?
- [ ] 브라우저에서 `http://localhost:8080` 접속 성공?
- [ ] 포트 번호가 8080인가? (아니면 프론트 설정 변경)
- [ ] CORS 설정이 되어 있는가?
- [ ] 프론트엔드 새로고침 했나?

---

## 🎯 완벽한 설정 예시

### 백엔드 (Express.js)
```javascript
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8080;

// CORS 설정 (필수!)
app.use(cors({ origin: '*' }));
app.use(express.json());

// API 라우트
app.post('/api/auth/signup', (req, res) => {
  res.json({ message: 'Signup endpoint' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
```

### 프론트엔드 (config.ts)
```typescript
export const API_BASE_URL = "http://localhost:8080";
```

### 테스트
```bash
# 터미널
curl http://localhost:8080

# 예상 응답: 서버 응답 (HTML, JSON 등)
```

---

**문제가 해결되었나요? 🎉**

프론트엔드를 새로고침하고 "다시 연결 시도" 버튼을 클릭하세요!
