# 📍 현재 위치 기능 (Geolocation API)

회원가입 시 주소 검색에 **현재 위치 자동 탐지 기능**이 추가되었습니다.

---

## 🎯 기능 개요

사용자가 "현재 위치로 이동" 버튼을 클릭하면:

1. 브라우저의 Geolocation API로 현재 위치(위도/경도) 획득
2. 카카오맵이 현재 위치로 자동 이동
3. 현재 위치에 마커 표시
4. 좌표를 주소로 변환하여 자동 입력

---

## 🔒 보안 요구사항

**Geolocation API는 보안 컨텍스트에서만 작동합니다:**

### ✅ 작동하는 환경:
- `https://` (HTTPS)
- `http://localhost` (개발 환경 예외)
- `http://127.0.0.1` (개발 환경 예외)

### ❌ 작동하지 않는 환경:
- `http://` (일반 HTTP - localhost 제외)
- `file://` (로컬 파일)

**배포 시 반드시 HTTPS를 사용하세요!**

---

## 🛠️ 사용 방법

### 1. 회원가입 화면 접속

1. 회원가입 화면으로 이동
2. 주소 입력란 찾기
3. 돋보기 아이콘(🔍) 클릭

### 2. 현재 위치 가져오기

1. 지도 모달이 열리면 **"현재 위치로 이동"** 버튼 클릭
2. 브라우저에서 위치 권한 요청 팝업 표시
3. **"허용"** 클릭

### 3. 주소 확인 및 선택

1. 지도가 현재 위치로 자동 이동
2. 현재 위치 주소가 자동으로 표시됨
3. **"선택 완료"** 버튼 클릭
4. 회원가입 화면의 주소 입력란에 자동 입력됨

---

## ⚙️ 옵션 설정

코드에서 다음 옵션을 조정할 수 있습니다:

```typescript
{
  enableHighAccuracy: true,  // 고정밀도 활성화 (GPS 사용)
  timeout: 10000,            // 최대 대기시간 (10초)
  maximumAge: 0,             // 캐시 사용 안함 (항상 최신 위치)
}
```

### 옵션 설명:

- **enableHighAccuracy**: `true`면 GPS 사용 (더 정확하지만 느림), `false`면 Wi-Fi/IP 기반 (빠르지만 덜 정확)
- **timeout**: 위치 탐지 최대 대기 시간 (밀리초)
- **maximumAge**: 캐시된 위치의 최대 수명 (0 = 항상 새로 조회)

---

## 🚨 오류 처리

### 1. 권한 거부 (PERMISSION_DENIED)

**오류 메시지:**
```
위치 정보 접근이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.
```

**해결 방법:**

#### Chrome:
1. 주소창 왼쪽의 자물쇠/정보 아이콘 클릭
2. "위치" → "허용" 선택
3. 페이지 새로고침

또는:
1. `chrome://settings/content/location` 접속
2. 차단된 사이트 목록에서 해당 사이트 제거

#### Firefox:
1. 주소창 왼쪽의 자물쇠 아이콘 클릭
2. "권한" → "위치 접근" → "허용" 선택
3. 페이지 새로고침

#### Safari:
1. Safari → 설정 → 웹사이트 → 위치
2. 해당 사이트 권한을 "허용"으로 변경

---

### 2. 위치 정보 사용 불가 (POSITION_UNAVAILABLE)

**원인:**
- GPS/Wi-Fi가 꺼져 있음
- 실내에서 GPS 신호를 받을 수 없음
- 네트워크 문제

**해결:**
- Wi-Fi 또는 위치 서비스 활성화
- 창가나 야외로 이동
- 네트워크 연결 확인

---

### 3. 시간 초과 (TIMEOUT)

**원인:**
- 위치 탐지에 10초 이상 소요

**해결:**
- 다시 시도
- Wi-Fi 활성화
- `timeout` 값을 늘림 (예: 20000ms)

---

## 💡 브라우저 지원

Geolocation API는 대부분의 최신 브라우저에서 지원됩니다:

| 브라우저 | 지원 여부 |
|---------|---------|
| Chrome | ✅ 5.0+ |
| Firefox | ✅ 3.5+ |
| Safari | ✅ 5.0+ |
| Edge | ✅ 모든 버전 |
| Opera | ✅ 10.6+ |
| IE | ✅ 9.0+ |

**모바일 브라우저도 모두 지원합니다.**

---

## 📱 모바일 사용 시 주의사항

### Android:
1. 기기 설정 → 위치 → "위치 사용" 활성화
2. Chrome 앱 권한에서 "위치" 허용

### iOS:
1. 설정 → 개인정보 보호 → 위치 서비스 활성화
2. Safari/Chrome → 위치 접근 "허용"

---

## 🔍 디버깅

### 브라우저 콘솔에서 확인:

```javascript
// Geolocation 지원 여부 확인
if ("geolocation" in navigator) {
  console.log("✅ Geolocation 지원됨");
} else {
  console.log("❌ Geolocation 미지원");
}

// 현재 위치 테스트
navigator.geolocation.getCurrentPosition(
  (position) => {
    console.log("위도:", position.coords.latitude);
    console.log("경도:", position.coords.longitude);
    console.log("정확도:", position.coords.accuracy, "미터");
  },
  (error) => {
    console.error("오류:", error.code, error.message);
  }
);
```

---

## 🎯 실제 사용 예시

### 시나리오 1: 빠른 회원가입

1. 회원가입 페이지 접속
2. 주소 검색 모달 열기
3. "현재 위치로 이동" 클릭
4. 자동으로 주소 입력 완료
5. 다른 정보 입력 후 회원가입

→ **주소를 직접 타이핑하거나 검색할 필요 없음!**

### 시나리오 2: 정확한 위치 선택

1. "현재 위치로 이동"으로 대략적인 위치 확인
2. 지도를 클릭해서 더 정확한 위치 선택
3. 선택 완료

→ **현재 위치를 시작점으로 미세 조정 가능!**

---

## 📊 성능 최적화

### 고정밀도 vs 저정밀도

**고정밀도 (enableHighAccuracy: true):**
- ✅ 더 정확한 위치 (GPS 사용)
- ❌ 배터리 소모 증가
- ❌ 느린 응답 시간 (수 초 ~ 수 분)

**저정밀도 (enableHighAccuracy: false):**
- ✅ 빠른 응답 (Wi-Fi/IP 기반)
- ✅ 배터리 절약
- ❌ 덜 정확함 (수십~수백 미터 오차)

**권장:** 주소 입력에는 **고정밀도 활성화** 추천

---

## 🔐 개인정보 보호

- 위치 정보는 **사용자 동의 없이 절대 수집되지 않음**
- 브라우저가 명시적으로 권한 요청
- 언제든지 권한 철회 가능
- 위치 정보는 서버로 전송되기 전 주소로 변환됨

---

## 📚 참고 자료

- [MDN: Geolocation API](https://developer.mozilla.org/ko/docs/Web/API/Geolocation_API/Using_the_Geolocation_API)
- [W3C Geolocation API Specification](https://www.w3.org/TR/geolocation-API/)
- [Can I use: Geolocation](https://caniuse.com/geolocation)

---

## 🆘 여전히 문제가 있나요?

1. 브라우저 콘솔 (F12) 확인
2. 위치 서비스 활성화 확인
3. HTTPS 사용 여부 확인
4. 브라우저 위치 권한 설정 확인
5. 캐시 및 쿠키 삭제 후 재시도

**그래도 안 되면:** `docs/KAKAO_MAP_SETUP.md` 파일의 "현재 위치 기능이 작동하지 않음" 섹션 참고
