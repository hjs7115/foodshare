# 카카오맵 API 연동 가이드

식재료 나눔/판매 앱의 위치 설정 기능을 위한 카카오맵 API 연동 방법입니다.

## 1. 카카오 Developers 앱 등록

1. [카카오 Developers](https://developers.kakao.com/) 접속 및 로그인
2. "내 애플리케이션" → "애플리케이션 추가하기"
3. 앱 이름 입력 후 저장
4. 생성된 앱의 "JavaScript 키" 복사

## 2. API 키 설정

### 환경변수 설정 (추천)
```bash
# .env.local 파일 생성
VITE_KAKAO_MAP_KEY=your_javascript_key_here
```

### 또는 직접 코드에 입력
`src/app/components/profile/LocationSettingsScreen.tsx` 파일의 주석 부분에서 `YOUR_APP_KEY`를 실제 키로 변경

## 3. 구현 활성화

LocationSettingsScreen.tsx의 MapModal 컴포넌트에서 주석 처리된 카카오맵 초기화 코드의 주석을 해제하세요.

## 4. 기능 설명

### 작은 지도 미리보기
- 현재 설정된 위치를 작은 지도로 표시
- 클릭하면 전체화면 지도 모달 열림

### 전체화면 지도 모달
- 지도를 드래그하여 원하는 위치로 이동
- 중앙의 빨간 핀이 선택한 위치를 표시
- 지도 이동 시 자동으로 도로명 주소를 역지오코딩
- "이 위치로 설정" 버튼으로 확정

### Geolocation API (현재 위치)
- "현재 위치로 설정" 버튼 클릭
- 브라우저의 위치 권한 요청
- 좌표를 카카오맵 역지오코딩으로 도로명 주소 변환

## 참고 문서

- [카카오맵 API 가이드](https://apis.map.kakao.com/web/guide/)
- [역지오코딩 API](https://apis.map.kakao.com/web/sample/addr2coord/)
