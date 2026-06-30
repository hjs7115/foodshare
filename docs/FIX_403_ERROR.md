# ⛔ 403 Forbidden 에러 해결 가이드

## 🔍 문제 상황

백엔드 서버는 실행 중이지만 **403 Forbidden** 에러를 반환합니다.

```
현재 백엔드 URL: https://enticing-feel-fresh.ngrok-free.dev
응답 상태: HTTP 403 Forbidden
```

---

## ✅ 해결 방법

### 1️⃣ ngrok URL 만료 확인 (가장 흔한 원인)

**무료 ngrok URL은 임시적이며 터널을 재시작하면 변경됩니다.**

#### 백엔드에서 확인하기:

```bash
# 백엔드 터미널에서 ngrok 상태 확인
# ngrok가 실행 중이라면 현재 URL이 표시됩니다

# 예시 출력:
Forwarding   https://new-url-here.ngrok-free.dev -> http://localhost:8080
```

#### 새 URL로 업데이트:

1. 백엔드 터미널에서 **현재 ngrok URL**을 복사하세요
2. 프론트엔드 설정 파일 수정:

**파일:** `/workspaces/default/code/src/app/api/config.ts`

```typescript
// 2번째 줄에서 URL 변경
export const API_BASE_URL = "https://새로운-ngrok-url.ngrok-free.dev";
```

3. **저장 후 브라우저 새로고침** (Ctrl+R 또는 Cmd+R)

---

### 2️⃣ ngrok 재시작

ngrok가 중단되었거나 만료된 경우:

```bash
# 백엔드 폴더에서
ngrok http 8080

# 또는 특정 포트로
ngrok http 3000
```

**새 URL이 생성되면 위의 1️⃣번 단계를 따라 프론트엔드 설정을 업데이트하세요.**

---

### 3️⃣ 백엔드 인증 설정 확인

일부 API 엔드포인트가 **인증 없이 접근 가능**해야 합니다:

- `/api/auth/signup` ← 회원가입
- `/api/auth/login` ← 로그인
- `/api/auth/email-verifications` ← 이메일 인증

#### Spring Boot 예시:

```java
@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .authorizeRequests()
            .antMatchers("/api/auth/**").permitAll()  // 인증 엔드포인트 허용
            .anyRequest().authenticated();
    }
}
```

#### Express.js 예시:

```javascript
// 인증 미들웨어 적용 전에 공개 라우트 정의
app.use('/api/auth', authRoutes);  // 인증 불필요
app.use(authMiddleware);           // 나머지는 인증 필요
```

---

### 4️⃣ CORS 헤더 확인

백엔드가 프론트엔드의 요청을 허용하도록 설정:

#### Express.js:

```javascript
const cors = require('cors');

app.use(cors({
  origin: '*',  // 개발 시
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  credentials: true
}));
```

#### Spring Boot:

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("*")
                .allowedMethods("*")
                .allowedHeaders("*")
                .allowCredentials(false);
    }
}
```

---

## 🧪 테스트 방법

### 방법 1: 브라우저에서 직접 접속

현재 ngrok URL을 브라우저 주소창에 입력:

```
https://enticing-feel-fresh.ngrok-free.dev
```

**예상 결과:**
- ✅ 페이지가 로드됨 (JSON, HTML, 아무거나) → URL이 유효함
- ❌ "사이트에 연결할 수 없음" → ngrok가 중단됨
- ❌ 403 Forbidden → 백엔드 보안 설정 문제

### 방법 2: API 엔드포인트 테스트

```
https://enticing-feel-fresh.ngrok-free.dev/api/auth/signup
```

**예상 결과:**
- ✅ JSON 응답 (에러여도 괜찮음, 응답이 오면 OK)
- ❌ 403 → 인증 설정 확인 필요

### 방법 3: 터미널 테스트

```bash
curl -I https://enticing-feel-fresh.ngrok-free.dev

# 성공 예시:
# HTTP/2 200 OK
# HTTP/2 404 Not Found  ← 404도 OK (연결은 됨)

# 실패 예시:
# HTTP/2 403 Forbidden  ← 접근 거부
```

---

## 📋 빠른 체크리스트

- [ ] 백엔드에서 현재 ngrok URL 확인
- [ ] 프론트엔드 config.ts에 올바른 URL 입력
- [ ] 브라우저에서 ngrok URL 접속 테스트
- [ ] 공개 API 엔드포인트 인증 설정 확인
- [ ] CORS 헤더 설정 확인
- [ ] 프론트엔드 새로고침

---

## 🆘 여전히 안 되나요?

### 백엔드 개발자에게 전달:

```
1. ngrok 현재 상태:
   - 실행 중인가요? (ps aux | grep ngrok)
   - 현재 URL: [복사해서 붙여넣기]

2. 백엔드 로그:
   - 터미널 마지막 10줄 복사
   - 403 에러 관련 로그 확인

3. 테스트 결과:
   - curl -I https://your-ngrok-url.ngrok-free.dev
   - [결과 복사]

4. 보안 설정:
   - /api/auth/** 엔드포인트가 public인가요?
   - CORS 설정이 되어 있나요?
```

---

## 🎯 정상 작동 확인

모든 것이 해결되면:

```bash
# 터미널 테스트
curl -I https://새로운-ngrok-url.ngrok-free.dev

# 예상 출력:
HTTP/2 200 OK
HTTP/2 404 Not Found  ← 404도 정상 (403이 아니면 OK)
```

프론트엔드에서:
1. ✅ 브라우저 새로고침
2. ✅ 회원가입/로그인 화면 로드
3. ✅ 진단 도구 (🔍) 모두 통과
4. ✅ 콘솔에 `📡 API 요청`, `✅ 응답 데이터` 로그

---

## 💡 예방 방법

### ngrok URL을 고정하려면 (유료):

```bash
# ngrok 유료 계정으로 고정 도메인 사용
ngrok http 8080 --domain=my-fixed-domain.ngrok-free.dev
```

### 또는 localhost 사용 (개발 시):

**프론트엔드와 백엔드가 같은 머신에서 실행되면:**

```typescript
// config.ts
export const API_BASE_URL = "http://localhost:8080";
```

단, CORS 설정은 여전히 필요합니다!
