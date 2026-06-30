# 🔍 백엔드 서버 연결 확인

## 1단계: 백엔드 서버가 실행 중인가요?

백엔드 터미널에서 다음 중 하나가 보여야 합니다:

```
✅ 정상 실행 메시지 예시:
- "Server is running on port 8080"
- "Application started on port 8080"
- "Tomcat started on port(s): 8080"
```

**서버가 실행되지 않았다면:**

```bash
# 백엔드 프로젝트 폴더로 이동
cd backend

# Java/Spring Boot
./gradlew bootRun
# 또는
mvn spring-boot:run

# Node.js/Express
npm start
# 또는
node server.js
```

---

## 2단계: 어느 포트에서 실행되고 있나요?

백엔드 로그에서 포트 번호를 확인하세요:

```
예시:
Server running on http://localhost:3000  ← 포트 3000
Tomcat started on port(s): 8080          ← 포트 8080
```

**현재 프론트엔드 설정:**
```typescript
API_BASE_URL = "http://localhost:8080"
```

**포트가 다르다면 아래 파일을 수정하세요:**

파일: `/workspaces/default/code/src/app/api/config.ts`

```typescript
// 백엔드가 3000 포트라면
export const API_BASE_URL = "http://localhost:3000";

// 백엔드가 8080 포트라면 (현재 설정)
export const API_BASE_URL = "http://localhost:8080";
```

---

## 3단계: 브라우저에서 직접 접속 테스트

백엔드 서버 주소를 브라우저에 입력:

**테스트 1: 기본 접속**
```
http://localhost:8080
```

**예상 결과:**
- ✅ 화면이 뜨거나 JSON 응답 → 서버 정상
- ❌ "사이트에 연결할 수 없음" → 서버가 안 켜져 있거나 포트 오류

**테스트 2: API 엔드포인트 접속**
```
http://localhost:8080/api/auth/signup
```

**예상 결과:**
- ✅ JSON 응답 (에러여도 괜찮음, 응답이 오면 됨)
- ❌ 연결 안됨 → 경로가 잘못됨

---

## 4단계: 터미널에서 테스트

```bash
# 방법 1: curl로 테스트
curl http://localhost:8080

# 방법 2: 특정 API 테스트
curl http://localhost:8080/api/auth/signup

# 정상 응답 예시:
# - HTML 페이지
# - JSON: {"message": "..."}
# - 404 에러도 OK (연결은 됨)

# 에러 응답 예시:
# curl: (7) Failed to connect to localhost port 8080
# → 서버가 안 켜져 있음
```

---

## 5단계: 포트 사용 확인

### Windows:
```bash
netstat -an | findstr "8080"
```

### Mac/Linux:
```bash
lsof -i :8080
# 또는
netstat -an | grep 8080
```

**결과:**
- ✅ 뭔가 나옴 → 8080 포트 사용 중
- ❌ 아무것도 안 나옴 → 8080 포트에 서버 없음

---

## 6단계: CORS 설정 확인

백엔드 코드에 CORS 설정이 있나요?

### Express.js 예시:
```javascript
const cors = require('cors');

app.use(cors({
  origin: '*',  // 개발 시에는 * 사용
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
}));
```

### Spring Boot 예시:
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

**CORS가 없다면:** 백엔드 개발자에게 CORS 설정 요청

---

## 빠른 체크리스트

- [ ] 백엔드 서버가 실행 중인가?
- [ ] 포트 번호가 8080인가?
- [ ] 브라우저에서 http://localhost:8080 접속되나?
- [ ] curl http://localhost:8080 응답 오나?
- [ ] CORS 설정이 되어 있나?

---

## 다음 단계

위의 모든 항목을 확인한 후:

1. **서버가 실행 중이고 접속되면:**
   - 프론트엔드 새로고침
   - "다시 연결 시도" 버튼 클릭

2. **여전히 안 되면:**
   - 브라우저 콘솔(F12) 스크린샷
   - Network 탭 스크린샷
   - 백엔드 로그 복사
   → 이 정보를 제공해주세요!

3. **포트가 다르면:**
   - `/workspaces/default/code/src/app/api/config.ts` 파일 수정
   - 올바른 포트 번호 입력
