# 🔧 에러 해결 가이드

## "Failed to fetch" 에러

이 에러는 프론트엔드가 백엔드 서버에 연결할 수 없을 때 발생합니다.

### 📋 체크리스트

#### 1. 백엔드 서버 실행 확인

```bash
# 터미널에서 확인
curl http://localhost:8080

# 또는 브라우저에서 확인
http://localhost:8080
```

**정상 응답 예시:**
- 상태 코드: 200, 404 등 (500번대가 아니면 OK)
- HTML 페이지 또는 JSON 응답

**에러:**
- "연결 거부됨" → 서버가 실행되지 않음
- 응답 없음 → 서버가 꺼져 있거나 포트가 다름

#### 2. 포트 번호 확인

프론트엔드 설정:
```typescript
// src/app/api/config.ts
export const API_BASE_URL = "http://localhost:8080";
```

백엔드가 다른 포트에서 실행 중이라면 수정:
```typescript
export const API_BASE_URL = "http://localhost:3000"; // 예시
```

#### 3. CORS 설정 확인

브라우저 콘솔에서 다음과 같은 에러가 보이나요?

```
Access to fetch at 'http://localhost:8080/api/...' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**해결 방법:** 백엔드에 CORS 설정 추가

**Express.js:**
```javascript
const cors = require('cors');
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
}));
```

**Spring Boot:**
```java
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                    .allowedOrigins("*")
                    .allowedMethods("*")
                    .allowedHeaders("*");
            }
        };
    }
}
```

#### 4. API 엔드포인트 확인

프론트엔드가 요청하는 주소:
```
POST http://localhost:8080/api/auth/signup
```

백엔드에 이 경로가 존재하나요?

**확인 방법:**
```bash
# POST 요청 테스트
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'
```

#### 5. 네트워크 탭 확인

브라우저 개발자 도구 → Network 탭:

1. **요청이 보이지 않음** → JavaScript 에러 확인
2. **요청이 pending 상태** → 서버가 응답하지 않음
3. **요청이 빨간색** → 상태 코드 확인
   - 404: 경로가 잘못됨
   - 500: 서버 내부 에러
   - CORS: CORS 설정 필요

---

## 🔍 디버깅 도구

### 1. 브라우저 콘솔 로그

이제 모든 API 요청이 콘솔에 로그됩니다:

```
🔍 백엔드 서버 연결 테스트: http://localhost:8080
✅ 서버 응답 상태: 200

📡 API 요청: POST http://localhost:8080/api/auth/signup
📥 응답 상태: 201
✅ 응답 데이터: { token: "...", user: {...} }
```

에러 발생 시:
```
❌ API 요청 에러: {
  url: "http://localhost:8080/api/auth/signup",
  method: "POST",
  error: "Failed to fetch"
}
```

### 2. 서버 연결 체크 화면

앱이 시작될 때 자동으로 서버 연결을 확인합니다:

- ✅ **연결 성공**: 정상적으로 앱 실행
- ❌ **연결 실패**: 에러 화면 표시

에러 화면에서:
1. 서버 주소 확인
2. 확인 사항 체크리스트
3. "다시 연결 시도" 버튼
4. "서버 연결 없이 계속하기" 버튼 (기능 제한됨)

---

## 📝 자주 발생하는 문제

### 문제 1: "백엔드 서버에 연결할 수 없습니다"

**원인:**
- 서버가 실행되지 않음
- 잘못된 포트 번호

**해결:**
```bash
# 1. 백엔드 서버 실행
cd backend
npm start
# 또는
./gradlew bootRun

# 2. 서버가 8080 포트에서 실행되는지 확인
netstat -an | grep 8080
# 또는
lsof -i :8080
```

### 문제 2: "서버가 올바른 형식(JSON)으로 응답하지 않았습니다"

**원인:**
- 서버가 HTML 에러 페이지를 반환
- JSON이 아닌 텍스트 응답

**해결:**
백엔드에서 모든 응답을 JSON 형식으로 변경:

```javascript
// 에러 응답도 JSON으로
app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    message: err.message
  });
});
```

### 문제 3: "CORS policy"

**원인:**
- 백엔드에 CORS 설정 없음
- OPTIONS preflight 요청 처리 안됨

**해결:**
위의 "CORS 설정 확인" 참고

### 문제 4: "요청 실패 (401)"

**원인:**
- 인증 토큰이 없거나 만료됨

**해결:**
```javascript
// 토큰 확인
console.log(localStorage.getItem('authToken'));

// 토큰 삭제 후 다시 로그인
localStorage.removeItem('authToken');
```

---

## 🚀 빠른 해결 방법

### 옵션 1: 로컬 개발 환경

```bash
# 백엔드
cd backend
npm start  # 또는 ./gradlew bootRun

# 프론트엔드
cd frontend
npm run dev
```

**확인:**
- 백엔드: http://localhost:8080
- 프론트엔드: http://localhost:5173

### 옵션 2: ngrok 사용

백엔드가 원격 서버에 있다면:

```bash
ngrok http 8080
```

프론트엔드 설정:
```typescript
// src/app/api/config.ts
export const API_BASE_URL = "https://enticing-feel-fresh.ngrok-free.dev";
```

---

## 📞 도움 요청 시 제공할 정보

1. **브라우저 콘솔 로그** (F12 → Console 탭)
2. **네트워크 탭 스크린샷** (F12 → Network 탭)
3. **서버 로그**
4. **설정된 API_BASE_URL** (src/app/api/config.ts)
5. **백엔드 실행 명령어 및 포트**

---

## ✅ 정상 작동 확인

모든 것이 정상이라면:

1. 앱 시작 시 "서버 연결 확인 중..." 표시
2. 잠시 후 랜딩 페이지로 이동
3. 브라우저 콘솔에 "✅ 서버 응답 상태: 200" 표시
4. 회원가입/로그인 시 콘솔에 API 요청/응답 로그 표시

**축하합니다! 🎉 프론트엔드와 백엔드가 정상적으로 연결되었습니다.**
