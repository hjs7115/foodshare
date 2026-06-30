# 서버 측 필수 설정 가이드

## CORS 설정 (필수)

프론트엔드에서 API 요청이 가능하도록 서버에서 CORS를 허용해야 합니다.

### Express.js 예시

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// CORS 설정
app.use(cors({
  origin: '*', // 모든 도메인 허용 (프로덕션에서는 특정 도메인으로 제한)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'ngrok-skip-browser-warning',
    'Accept'
  ],
  credentials: false
}));

// JSON 파싱
app.use(express.json());

// 라우트 설정
// ...
```

### FastAPI (Python) 예시

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인 허용
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "ngrok-skip-browser-warning",
        "Accept"
    ],
)
```

### Spring Boot (Java) 예시

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
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("Content-Type", "Authorization", "ngrok-skip-browser-warning", "Accept");
            }
        };
    }
}
```

## API 응답 형식 (필수)

모든 API 응답은 **반드시 JSON 형식**이어야 합니다.

### 성공 응답 예시

```json
{
  "success": true,
  "data": { ... },
  "message": "성공 메시지"
}
```

또는

```json
{
  "user": { ... },
  "token": "jwt-token-here"
}
```

### 에러 응답 예시

```json
{
  "success": false,
  "message": "에러 메시지",
  "error": "ERROR_CODE"
}
```

**중요**: `Content-Type: application/json` 헤더를 반드시 포함해야 합니다.

## ngrok 설정

ngrok를 사용하는 경우:

```bash
ngrok http 3000 --host-header=localhost:3000
```

또는 ngrok 설정 파일 (`~/.ngrok2/ngrok.yml`):

```yaml
tunnels:
  myapp:
    proto: http
    addr: 3000
    host_header: localhost:3000
```

## 테스트 방법

### 1. 서버 상태 확인

```bash
curl https://enticing-feel-fresh.ngrok-free.dev/
```

### 2. CORS 확인

브라우저 개발자 도구 → Network 탭에서 다음 확인:
- **Response Headers**에 `Access-Control-Allow-Origin: *` 있는지 확인
- OPTIONS 요청(Preflight)이 200 OK로 응답하는지 확인

### 3. API 테스트

```bash
# 회원가입 테스트
curl -X POST https://enticing-feel-fresh.ngrok-free.dev/auth/signup \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{
    "name": "테스트",
    "nickname": "test",
    "email": "test@example.com",
    "phone": "01012345678",
    "password": "password123"
  }'
```

## 자주 발생하는 에러

### 1. "Failed to fetch"
- **원인**: 서버가 꺼져있거나 CORS 설정이 안됨
- **해결**: 서버 실행 확인 및 CORS 설정

### 2. "CORS policy"
- **원인**: CORS 헤더가 누락됨
- **해결**: 위의 CORS 설정 적용

### 3. "서버가 응답하지 않거나 올바르지 않은 형식"
- **원인**: 응답이 JSON이 아님 (HTML 에러 페이지 등)
- **해결**: 모든 응답을 JSON 형식으로 변경

## 프로덕션 환경 권장 사항

1. **Origin 제한**: `origin: '*'` 대신 특정 도메인만 허용
   ```javascript
   origin: ['https://yourdomain.com', 'https://www.yourdomain.com']
   ```

2. **HTTPS 사용**: 프로덕션에서는 반드시 HTTPS 사용

3. **Rate Limiting**: API 요청 제한 설정

4. **로깅**: 모든 API 요청/응답 로깅

5. **에러 핸들링**: 명확한 에러 메시지 반환
