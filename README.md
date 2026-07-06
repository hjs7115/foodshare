# 반띵
<p align="center">
  <img width="254" height="254" alt="image" src="https://github.com/user-attachments/assets/36fba8d8-fe6c-49f8-bd4d-34c25b1736cd" />
</p>

<p align="center">
  <strong>위치 기반 식재료 공유 플랫폼</strong><br/>
  남는 식재료를 주변 사용자와 나누고, 공동구매·거래 요청·리뷰를 통해 신뢰 기반 공유를 지원하는 서비스
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Java-21-007396?logo=openjdk&logoColor=white" alt="Java" />
  <img src="https://img.shields.io/badge/Spring_Boot-4.0.6-6DB33F?logo=springboot&logoColor=white" alt="Spring Boot" />
  <img src="https://img.shields.io/badge/Spring_Security-6DB33F?logo=springsecurity&logoColor=white" alt="Spring Security" />
  <img src="https://img.shields.io/badge/JPA-59666C?logo=hibernate&logoColor=white" alt="JPA" />
  <img src="https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6.3.5-646CFF?logo=vite&logoColor=white" alt="Vite" />
</p>

---
<img width="1491" height="1055" alt="image" src="https://github.com/user-attachments/assets/e7c69210-546d-4df7-abca-4ff181a77505" />

## 📖 소개

**반띵**은 혼자 쓰기엔 많고 버리기엔 아까운 식재료를 가까운 이웃과 나눌 수 있도록 돕는 **위치 기반 식재료 공유 플랫폼**입니다.

사용자는 보유한 식재료를 나눔·판매·공동구매 게시글로 등록하고, 주변 사용자는 게시글을 탐색한 뒤 댓글이나 거래 요청을 통해 공유에 참여할 수 있습니다.

식재료는 일반 중고 물품보다 신선도, 유통기한, 거래 위치, 사용자 신뢰도가 중요하기 때문에 반띵은 게시글 작성부터 거래 완료, 리뷰와 평점까지 이어지는 흐름을 하나의 서비스 경험으로 설계했습니다.

### ✨ 주요 특징

| 기능 | 설명 |
|------|------|
| 📍 **위치 기반 탐색** | 사용자 위치와 거리 조건을 기준으로 주변 식재료 게시글 조회 |
| 🥬 **식재료 게시판** | 나눔, 판매, 공동구매 목적에 맞춰 식재료 게시글 등록·수정·삭제 |
| 🛒 **공동구매 모집** | 목표 인원과 날짜·시간 마감일을 설정하고, 모집마감 시 1대1 또는 단체 채팅방 개설 |
| 🔍 **검색과 필터링** | 게시글 타입, 키워드, 거리, 유통기한 임박순, 신선도순, 가격순 등 조건별 조회 |
| 📄 **페이지네이션** | 게시글, 댓글, 알림, 리뷰 목록을 `page`/`size` 기준으로 나눠 조회 |
| 💬 **댓글 소통** | 게시글에 대한 문의와 거래 전 소통을 위한 댓글 기능 |
| 🤝 **거래 요청** | 관심 있는 게시글에 거래 요청을 보내고 작성자가 수락·거절·완료 처리, 완료 게시글은 일반 목록에서 숨김 |
| 💬 **채팅** | 거래 수락 후 1대1 채팅방을 열고, 공동구매 모집마감 시 참여자 단체 채팅방 개설 |
| 📌 **채팅방 관리** | 채팅방 읽음 처리, 상단 고정, 알림 끄기, 상대 프로필 이미지 표시 |
| ⭐ **리뷰와 평점** | 완료된 거래를 기반으로 리뷰를 작성하고 사용자 신뢰도 확인 |
| ❤️ **관심 게시글** | 다시 보고 싶은 게시글을 관심 목록으로 저장 |
| 🔔 **알림 설정** | 거래와 서비스 알림을 위한 설정, DB 알림 목록, FCM 푸시 알림 관리 |
| 🔐 **회원 인증** | JWT·Refresh Token 기반 로그인, 이메일 인증, 비밀번호 재설정 코드 인증, 닉네임·이메일·전화번호 중복 확인 제공 |
| 🖼️ **이미지 업로드** | 게시글 이미지 업로드와 이미지 교체·삭제 시 로컬 파일 정리 지원 |
| 🚨 **신고와 차단** | 사용자·게시글·댓글 신고, 사용자 차단/해제, 차단 사용자 콘텐츠 숨김 |
| 🏅 **배지와 업적** | 게시글 작성, 나눔, 판매, 공동구매, 거래 완료, 리뷰, 평점 기반 배지 진행률 제공 |
| 📊 **활동 통계** | 나눔 완료, 판매 완료, 공구 참여 수를 실제 완료 거래 기준으로 집계 |
| 🛠️ **관리자 기능** | 서비스 통계 조회, 신고 목록 확인, 신고 처리 상태 변경 API 제공 |

---

## 🎯 기획 배경

반띵은 다음 문제의식에서 출발했습니다.

- 냉장고에 남아 있는 식재료가 사용되지 못하고 버려지는 경우가 많음
- 필요한 양보다 많이 사야 하는 식재료를 이웃과 나누거나 공동구매할 수 있는 방법이 필요함
- 식재료 공유는 가까운 거리에서 빠르게 이루어지는 것이 중요함
- 유통기한과 상태 확인이 필요한 만큼 거래 전후의 신뢰 장치가 필요함

따라서 반띵은 **식재료 낭비 감소**, **지역 기반 공유 활성화**, **신뢰 기반 거래 환경 제공**을 목표로 합니다.

---

## 🧭 서비스 흐름

```mermaid
sequenceDiagram
    participant 사용자 as 👤 사용자
    participant 반띵 as 🥬 반띵
    participant 작성자 as 🧑‍🍳 게시글 작성자

    사용자->>반띵: 회원가입 / 로그인
    작성자->>반띵: 식재료 게시글 등록
    사용자->>반띵: 위치·키워드·게시글 타입으로 탐색
    사용자->>반띵: 댓글 작성 또는 거래 요청
    반띵->>작성자: 거래 요청 전달
    작성자->>반띵: 수락 / 거절 / 모집마감 / 완료 처리
    반띵->>사용자: 1대1 또는 공동구매 단체 채팅방 개설
    반띵-->>사용자: DB 알림 / FCM 푸시 알림
    사용자->>반띵: 완료된 거래에 리뷰 작성
    사용자->>반띵: 냉장고 식재료 등록 / 수정 / 삭제
    반띵->>사용자: 평점과 리뷰 정보 제공
```

---

## 🏗️ 아키텍처

![System Architecture](docs/images/system_architecture_diagram.svg)

```mermaid
graph TB
    subgraph Client["👤 Client / PWA"]
        Web["React + TypeScript + Vite"]
        SW["Service Worker<br/>PWA / FCM"]
    end

    subgraph Server["🖥️ Spring Boot"]
        API["REST API"]
        WS["WebSocket Chat"]
        Security["Spring Security<br/>JWT"]
        Domain["Domain Service<br/>Auth · Post · Trade · Chat · Fridge · Review · Notification"]
        Moderation["Moderation<br/>Report · Block"]
        Badge["Badge Service"]
        Upload["Image Upload"]
    end

    subgraph Data["💾 Data"]
        MySQL["MySQL"]
        Files["uploads/"]
        Mail["SMTP Mail"]
        FCM["Firebase FCM"]
    end

    Web --> API
    Web --> WS
    SW --> FCM
    API --> Security
    Security --> Domain
    WS --> Domain
    Domain --> Moderation
    Domain --> Badge
    Domain --> MySQL
    Domain --> Mail
    Domain --> FCM
    API --> Upload
    Upload --> Files
```

---

## 🧩 핵심 도메인

### 👤 사용자

이메일, 비밀번호, 닉네임, 전화번호, 위치 정보를 기반으로 회원을 관리합니다.

로그인 이후 발급되는 Access Token과 Refresh Token을 통해 게시글 작성, 거래 요청, 리뷰 작성, 신고/차단, 배지 조회, 마이페이지 조회처럼 인증이 필요한 기능을 사용할 수 있습니다. 회원가입은 이메일 인증 완료 후 진행되며, 비밀번호 재설정도 이메일 인증 코드를 검증한 뒤 처리됩니다. 로그아웃이나 비밀번호 재설정 시 저장된 Refresh Token은 무효화됩니다.

### 🥬 게시글

게시글은 식재료 공유 목적에 따라 `SHARE`, `SALE`, `GROUP_BUY`로 구분됩니다.

식재료명, 수량, 가격, 거래 위치, 거리, 유통기한, 거래 마감일, 이미지, 상세 설명을 함께 저장하여 사용자가 식재료 상태와 거래 조건을 확인할 수 있도록 구성했습니다.

나눔·판매 게시글은 유통기한과 별도로 거래 마감일을 둘 수 있고, 공동구매 게시글은 날짜와 시간을 포함한 모집 마감일을 관리합니다.

| 타입 | 설명 |
|------|------|
| `SHARE` | 무료 나눔 |
| `SALE` | 판매 |
| `GROUP_BUY` | 공동구매 |

### 💬 댓글

게시글 상세 화면에서 문의나 거래 전 확인이 필요한 내용을 댓글로 주고받을 수 있습니다.

작성자는 자신의 댓글을 수정하거나 삭제할 수 있습니다.

### 🛒 공동구매

공동구매 게시글은 `GROUP_BUY` 타입으로 등록되며, 일반 나눔·판매 게시글과 달리 목표 인원과 날짜·시간 마감일 정보를 함께 관리합니다.

사용자는 공동구매 게시판에서 진행 중인 모집글을 확인하고, 거래 요청을 통해 참여 의사를 전달할 수 있습니다. 작성자는 신청자 목록을 확인한 뒤 목표 인원이 모두 채워지지 않아도 모집마감을 눌러 현재 대기·수락된 참여자와 함께 공동구매 채팅방을 열 수 있습니다.

신청자가 1명이면 1대1처럼, 여러 명이면 단체 채팅방처럼 동작합니다. 목표 인원은 모집 규모를 표시하고 추가 요청을 제한하는 기준으로 사용되며, 게시글은 작성자의 모집마감 처리 또는 마감일 경과에 따라 닫힙니다.

| 항목 | 설명 |
|------|------|
| 목표 인원 | 공동구매 모집에 필요한 전체 참여 인원 |
| 현재 참여 인원 | 현재까지 참여한 사용자 수 |
| 마감일 | 날짜와 시간을 포함한 공동구매 모집 종료 시점 |

### 🤝 거래 요청

사용자는 원하는 게시글에 거래 요청을 보낼 수 있고, 게시글 작성자는 요청을 수락·거절·완료 처리할 수 있습니다. 일반 나눔/판매 게시글은 거래 요청 수락 시 게시글이 닫히며, 다른 대기 요청은 거절됩니다.

거래 완료된 게시글은 홈/게시판/검색/거리 필터 결과에서는 숨겨지지만, 작성자의 내정보 > 내 게시글에는 남아 상세 화면으로 다시 진입할 수 있습니다. 완료된 게시글에서는 추가 거래 요청과 댓글 작성이 제한됩니다.

공동구매는 개별 요청 수락도 가능하고, 모집마감 시 현재 대기·수락 요청을 함께 수락하여 공동구매 채팅방을 개설합니다.

| 상태 | 설명 |
|------|------|
| `PENDING` | 거래 요청 대기 |
| `ACCEPTED` | 거래 요청 수락 |
| `REJECTED` | 거래 요청 거절 |
| `COMPLETED` | 거래 완료 |

### 💬 채팅

나눔·판매 거래 요청을 수락하면 작성자와 요청자 사이의 1대1 채팅방이 열립니다. 공동구매는 모집마감 시 현재 참여자들을 채팅방 참여자로 묶어 단체 채팅방을 개설할 수 있습니다.

채팅방은 메시지 조회와 전송, 읽음 처리, 읽지 않은 메시지 수, 상단 고정, 알림 끄기, 상대 프로필 이미지 표시를 지원하며, FCM 토큰이 등록된 사용자는 새 메시지 푸시 알림도 받을 수 있습니다.

### ⭐ 리뷰

거래가 완료된 뒤에는 상대 사용자에 대한 리뷰와 평점을 남길 수 있습니다.

리뷰는 거래 이후의 신뢰 정보를 쌓기 위한 장치이며, 사용자는 다른 사용자의 평점과 리뷰 목록을 조회할 수 있습니다.

### 🔔 알림

댓글, 거래 요청, 거래 수락, 거래 완료, 유통기한 임박 상황에서 사용자별 DB 알림을 생성합니다. 알림은 읽음 처리와 페이지 조회를 지원하며, FCM 토큰이 등록된 경우 웹 푸시 전송도 함께 시도합니다.

### 🚨 신고와 차단

사용자는 부적절한 사용자, 게시글, 댓글을 신고할 수 있고, 특정 사용자를 차단하거나 차단 해제할 수 있습니다. 차단 관계가 있으면 댓글 작성과 거래 요청이 제한되며, 로그인 사용자의 목록에서는 차단된 사용자의 콘텐츠가 숨겨집니다.

### 🏅 배지와 업적

배지와 업적은 실제 활동 데이터를 기준으로 계산됩니다. 게시글 작성, 나눔, 판매, 공동구매 참여, 거래 완료, 받은 리뷰 수, 평균 평점에 따라 진행률과 획득 여부를 제공합니다.

### 🛠️ 관리자

관리자 API는 서비스 통계와 신고 처리를 위한 기능입니다. 전체 사용자 수, 게시글 수, 거래 완료 수, 신고 수를 확인할 수 있고, 신고 목록을 페이지 단위로 조회하거나 신고 상태를 변경할 수 있습니다.

---

## 📊 데이터 설계

![ERD](docs/images/erd_diagram.svg)

| 데이터 | 설명 |
|------|------|
| `User` | 회원 정보, 이메일, 닉네임, 전화번호, 위치 정보 |
| `Post` | 식재료 게시글, 게시글 타입, 거래 조건, 유통기한, 거래 마감일, 이미지 |
| `Comment` | 게시글 댓글 |
| `Favorite` | 사용자가 관심 등록한 게시글 |
| `TradeRequest` | 게시글 거래 요청과 거래 상태 |
| `ChatRoom` | 거래 요청 기반 1대1 채팅방과 공동구매 대표 채팅방 |
| `ChatRoomMember` | 공동구매 단체 채팅방 참여자, 읽음 상태, 고정/알림 설정 |
| `ChatMessage` | 채팅방 메시지와 시스템 메시지 |
| `FridgeItem` | 사용자 냉장고 식재료, 수량, 유통기한, 메모 |
| `Review` | 거래 완료 후 작성되는 리뷰와 평점 |
| `EmailVerification` | 이메일 인증 및 비밀번호 재설정 코드와 검증 상태 |
| `RefreshToken` | 로그인 유지와 Access Token 재발급을 위한 토큰 저장 정보 |
| `Notification` | 댓글, 거래, 유통기한 임박 등 사용자별 알림과 이동 대상 정보 |
| `Report` | 사용자, 게시글, 댓글 신고 내역 |
| `UserBlock` | 사용자 차단 관계 |

---

## 📂 프로젝트 구조

```bash
foodshare/
├── docs/
│   ├── README.md                      # 문서 모음 안내
│   ├── API.md                         # API 명세 문서
│   ├── deployment/                    # Docker/AWS 배포 문서
│   ├── images/                        # 아키텍처, ERD, 시퀀스 이미지
│   └── design/                        # 소프트웨어 설계서
│
├── docker/                            # 프론트엔드 Nginx 설정
├── nginx/                             # 통합 배포용 Reverse Proxy 설정
├── scripts/                           # 동기화 및 문서 보조 스크립트
│
├── public/
│   ├── assets/                        # PWA 아이콘, 기본 이미지 자산
│   ├── manifest.webmanifest           # PWA 매니페스트
│   └── firebase-messaging-sw.js       # PWA/FCM 서비스워커
│
├── src/
│   ├── app/                           # React 화면, 컴포넌트, API 클라이언트
│   │   ├── api/
│   │   └── components/
│   │       ├── auth/                  # 로그인, 회원가입, 아이디/비밀번호 찾기
│   │       ├── board/                 # 게시판, 게시글 작성, 상세 화면
│   │       ├── chat/                  # 채팅방 목록, 채팅 메시지, 채팅방 설정
│   │       ├── category/              # 카테고리 선택
│   │       ├── common/                # 공통 UI, 알림 화면, 이미지 표시
│   │       ├── fridge/                # 냉장고 식재료 관리
│   │       └── profile/               # 마이페이지, 관심 목록, 설정
│   │
│   ├── styles/                        # 프론트엔드 스타일
│   ├── main.tsx                       # 프론트엔드 진입점
│   │
│   ├── main/
│   │   ├── java/com/hjs/foodshare/
│   │   │   ├── auth/                  # 회원가입, 로그인, 인증
│   │   │   ├── post/                  # 게시글
│   │   │   ├── comment/               # 댓글
│   │   │   ├── favorite/              # 관심 게시글
│   │   │   ├── fridge/                # 냉장고 식재료
│   │   │   ├── trade/                 # 거래 요청
│   │   │   ├── chat/                  # 1대1/공동구매 채팅, 읽음, 고정, 알림 끄기
│   │   │   ├── review/                # 리뷰
│   │   │   ├── mypage/                # 마이페이지
│   │   │   ├── admin/                 # 관리자 통계, 신고 처리
│   │   │   ├── notification/          # 알림, FCM, 유통기한 임박 알림
│   │   │   ├── moderation/            # 신고, 차단
│   │   │   ├── badge/                 # 배지, 업적
│   │   │   ├── upload/                # 이미지 업로드
│   │   │   └── global/                # 공통 응답, 예외, 보안
│   │   └── resources/
│   │       └── application.yml
│   │
│   └── test/                          # 서버 테스트
│
├── package.json                       # 프론트엔드 실행 / 빌드
├── build.gradle                       # 서버 실행 / 빌드
├── docker-compose.yml                 # 로컬 Docker 통합 실행
├── docker-compose.rds.yml             # AWS RDS 연동 Docker 실행 예시
├── Dockerfile.backend                 # Spring Boot 컨테이너 빌드
├── Dockerfile.frontend                # React 정적 빌드/Nginx 컨테이너 빌드
├── gradlew
├── gradlew.bat
└── README.md
```

---

## 🛠️ 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 18, TypeScript, Vite 6 |
| UI | MUI, Radix UI, Lucide React, Motion |
| Backend | Java 21, Spring Boot 4.0.6 |
| Web | Spring Web MVC |
| Security | Spring Security, JWT, Refresh Token, BCrypt |
| Database | MySQL |
| ORM | Spring Data JPA, Hibernate |
| Validation | Jakarta Validation |
| Mail | Spring Boot Mail, Angus Mail |
| Push | Firebase Cloud Messaging |
| Build | Gradle, npm |
| Test | JUnit Platform, H2 Database |
| Library | Lombok |

---

## 🔐 인증 방식

반띵은 JWT 기반 인증 방식을 사용합니다.

로그인 성공 시 발급된 Access Token을 인증이 필요한 요청의 `Authorization` 헤더에 포함합니다.

```http
Authorization: Bearer {accessToken}
```

인증 흐름은 다음과 같습니다.

1. 사용자가 회원가입 또는 로그인을 요청합니다.
2. 서버는 사용자 정보를 검증한 뒤 Access Token을 발급합니다.
3. 클라이언트는 토큰을 저장합니다.
4. 게시글 작성, 거래 요청, 리뷰 작성 등 인증이 필요한 API 요청에 토큰을 포함합니다.
5. 서버는 JWT를 검증하고 현재 로그인한 사용자를 식별합니다.

---

## 📌 주요 API

### Auth

| Method | URL | 설명 |
|------|------|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/refresh` | Refresh Token 기반 Access Token 재발급 |
| POST | `/api/auth/logout` | 로그아웃 및 Refresh Token 무효화 |
| POST | `/api/auth/find-email` | 이메일 찾기 |
| POST | `/api/auth/find-id` | 아이디 찾기 |
| POST | `/api/auth/password-reset-link` | 비밀번호 재설정 인증 코드 발송 |
| POST | `/api/auth/reset-password` | 이메일 인증 코드 기반 비밀번호 재설정 |
| POST | `/api/auth/phone-verifications` | 휴대폰 인증번호 발송 |
| POST | `/api/auth/phone-verifications/verify` | 휴대폰 인증번호 검증 |
| GET | `/api/auth/nickname/check` | 닉네임 중복 확인 |
| GET | `/api/auth/email/check` | 이메일 중복 확인 |
| GET | `/api/auth/phone/check` | 전화번호 중복 확인 |
| POST | `/api/auth/email-verifications` | 이메일 인증번호 발송 |
| POST | `/api/auth/email-verifications/verify` | 이메일 인증번호 검증 |

### Posts

| Method | URL | 설명 |
|------|------|------|
| POST | `/api/posts` | 게시글 작성 |
| POST | `/api/posts/create` | 게시글 작성 |
| GET | `/api/posts` | 게시글 목록 조회 |
| GET | `/api/posts/page` | 게시글 목록 페이지 조회 |
| GET | `/api/posts/{postId}` | 게시글 상세 조회 |
| PUT | `/api/posts/{postId}` | 게시글 수정 |
| DELETE | `/api/posts/{postId}` | 게시글 삭제 |

게시글 타입은 다음 세 가지로 구분됩니다.

| 타입 | 설명 |
|------|------|
| `SHARE` | 무료 나눔 |
| `SALE` | 판매 |
| `GROUP_BUY` | 공동구매 |

게시글 목록 조회는 다음 조건을 지원합니다.

```text
postType=SHARE | SALE | GROUP_BUY
keyword=상추
maxDistanceKm=1.0
lat=37.5001
lng=127.0361
radiusKm=1.0
expiringSoon=true
sort=LATEST | EXPIRING_SOON | DISTANCE | FRESHNESS | PRICE_LOW
```

### Comments

| Method | URL | 설명 |
|------|------|------|
| POST | `/api/posts/{postId}/comments` | 댓글 작성 |
| GET | `/api/posts/{postId}/comments` | 게시글 댓글 조회 |
| GET | `/api/posts/{postId}/comments/page` | 게시글 댓글 페이지 조회 |
| PUT | `/api/comments/{commentId}` | 댓글 수정 |
| DELETE | `/api/comments/{commentId}` | 댓글 삭제 |

### Favorites

| Method | URL | 설명 |
|------|------|------|
| POST | `/api/posts/{postId}/favorite` | 관심 게시글 등록 |
| DELETE | `/api/posts/{postId}/favorite` | 관심 게시글 해제 |
| GET | `/api/posts/{postId}/favorite` | 관심 여부 조회 |
| GET | `/api/favorites` | 내 관심 게시글 조회 |

### Trade Requests

| Method | URL | 설명 |
|------|------|------|
| POST | `/api/posts/{postId}/requests` | 거래 요청 생성 |
| POST | `/api/posts/{postId}/trade-requests` | 거래 요청 생성 |
| GET | `/api/posts/{postId}/trade-requests` | 특정 게시글의 거래 요청 조회 |
| GET | `/api/trade-requests/me` | 내가 보낸 거래 요청 조회 |
| GET | `/api/trade-requests/received` | 내가 받은 거래 요청 조회 |
| POST/PATCH/PUT | `/api/trade-requests/{requestId}/accept` | 거래 요청 수락 |
| POST/PATCH/PUT | `/api/trade-requests/{requestId}/reject` | 거래 요청 거절 |
| POST/PATCH/PUT | `/api/trade-requests/{requestId}/complete` | 거래 완료 처리 |
| POST/PATCH/PUT | `/api/posts/{postId}/group-buy/close-recruitment` | 공동구매 모집마감 및 채팅방 개설 |

### Chat

| Method | URL | 설명 |
|------|------|------|
| GET | `/api/chat/rooms` | 내 채팅방 목록 조회 |
| GET | `/api/chat/rooms/by-trade-request/{tradeRequestId}` | 거래 요청 기준 채팅방 조회 |
| GET | `/api/chat/rooms/{roomId}/messages` | 채팅 메시지 조회 |
| POST | `/api/chat/rooms/{roomId}/messages` | 채팅 메시지 전송 |
| PATCH | `/api/chat/rooms/{roomId}/read` | 채팅방 읽음 처리 |
| PATCH | `/api/chat/rooms/{roomId}/pin` | 채팅방 상단 고정/해제 |
| PATCH | `/api/chat/rooms/{roomId}/mute` | 채팅방 알림 끄기/켜기 |

### Fridge

| Method | URL | 설명 |
|------|------|------|
| GET | `/api/fridge/items` | 내 냉장고 식재료 조회 |
| POST | `/api/fridge/items` | 냉장고 식재료 등록 |
| PUT | `/api/fridge/items/{itemId}` | 냉장고 식재료 수정 |
| DELETE | `/api/fridge/items/{itemId}` | 냉장고 식재료 삭제 |

### Reviews

| Method | URL | 설명 |
|------|------|------|
| POST | `/api/trade-requests/{requestId}/reviews` | 거래 요청 기반 리뷰 작성 |
| POST | `/api/users/{userId}/reviews` | 특정 사용자 대상 리뷰 작성 |
| GET | `/api/users/{userId}/reviews` | 특정 사용자 리뷰 조회 |
| GET | `/api/users/{userId}/reviews/page` | 특정 사용자 리뷰 페이지 조회 |
| GET | `/api/users/{userId}/rating` | 특정 사용자 평점 요약 조회 |
| GET | `/api/mypage/reviews` | 내가 작성한 리뷰 조회 |
| GET | `/api/mypage/reviews/page` | 내가 작성한 리뷰 페이지 조회 |

### My Page

| Method | URL | 설명 |
|------|------|------|
| GET | `/api/mypage` | 내 정보 요약 및 나눔 완료/판매 완료/공구 참여 통계 조회 |
| GET | `/api/mypage/posts` | 내가 작성한 게시글 조회 |
| GET | `/api/mypage/comments` | 내가 작성한 댓글 조회 |
| GET | `/api/mypage/trade-requests` | 내가 보낸 거래 요청 조회 |
| GET | `/api/mypage/received-trade-requests` | 내가 받은 거래 요청 조회 |
| GET | `/api/mypage/blocks`, `/api/mypage/blocked-users` | 차단 사용자 목록 조회 |
| GET | `/api/mypage/badges` | 내 배지/업적 조회 |
| PUT | `/api/mypage` | 프로필 수정 |
| PUT | `/api/mypage/location` | 위치 수정 |

### Notifications

| Method | URL | 설명 |
|------|------|------|
| GET | `/api/mypage/notifications/settings` | 알림 설정 조회 |
| PUT | `/api/mypage/notifications/settings` | 알림 설정 수정 |
| GET | `/api/notifications` | 알림 목록 조회 |
| GET | `/api/notifications/page` | 알림 목록 페이지 조회 |
| POST/PUT/PATCH | `/api/notifications/{notificationId}/read` | 알림 읽음 처리 |
| POST | `/api/notifications/fcm-token` | FCM 토큰 등록 |
| POST | `/api/notifications/test-push` | 테스트 푸시 알림 전송 |

### Reports / Blocks

| Method | URL | 설명 |
|------|------|------|
| POST | `/api/reports` | 사용자, 게시글, 댓글 신고 |
| GET | `/api/reports/me` | 내가 작성한 신고 목록 조회 |
| POST | `/api/users/{userId}/block` | 사용자 차단 |
| DELETE | `/api/users/{userId}/block` | 사용자 차단 해제 |
| GET | `/api/mypage/blocks`, `/api/mypage/blocked-users` | 차단 사용자 목록 조회 |

### Badges

| Method | URL | 설명 |
|------|------|------|
| GET | `/api/badges/me` | 내 배지/업적 진행률 조회 |
| GET | `/api/mypage/badges` | 마이페이지 배지/업적 조회 |

### Admin

| Method | URL | 설명 |
|------|------|------|
| GET | `/api/admin/stats` | 서비스 통계 조회 |
| GET | `/api/admin/reports` | 신고 목록 페이지 조회 |
| PATCH | `/api/admin/reports/{reportId}` | 신고 처리 상태 변경 |
### Image Upload

| Method | URL | 설명 |
|------|------|------|
| POST | `/api/uploads/images` | 이미지 업로드 |

지원 파일 형식은 `image/jpeg`, `image/png`, `image/webp`, `image/gif`이며 최대 파일 크기는 `5MB`입니다.

---

## 🚀 시작하기

### 사전 요구사항

- Java 21
- MySQL
- Node.js / npm
- Gradle 또는 프로젝트에 포함된 Gradle Wrapper

### 1. 저장소 클론

```bash
git clone https://github.com/hjs7115/foodshare.git
cd foodshare
```

### 2. 로컬 설정 파일 생성

프로젝트 루트에 `application-local.properties` 파일을 생성하고 로컬 환경 값을 설정합니다.

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/foodshare?serverTimezone=Asia/Seoul&characterEncoding=UTF-8
spring.datasource.username=root
spring.datasource.password=your-password

app.jwt.secret=replace-with-a-long-random-secret

MAIL_USERNAME=your-email@example.com
MAIL_PASSWORD=your-mail-password
MAIL_FROM=your-email@example.com
```

### 3. 서버 실행

```powershell
.\gradlew.bat bootRun
```

macOS / Linux 환경에서는 다음 명령을 사용할 수 있습니다.

```bash
./gradlew bootRun
```

서버 기본 주소는 다음과 같습니다.

```text
http://localhost:8080
```

### 4. 프론트엔드 실행

```powershell
npm install
npm run dev
```

프론트엔드 개발 서버 기본 주소는 다음과 같습니다.

```text
http://localhost:5173
```

---

## 🧪 API 테스트 예시

### 회원가입

```http
POST /api/auth/signup
Content-Type: application/json
```

```json
{
  "name": "홍길동",
  "nickname": "gildong",
  "email": "test@email.com",
  "password": "password123",
  "phoneNumber": "01012345678",
  "location": "경기도 수원시"
}
```

### 로그인

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "test@email.com",
  "password": "password123"
}
```

### 게시글 작성

```http
POST /api/posts
Content-Type: application/json
Authorization: Bearer {accessToken}
```

```json
{
  "postType": "SHARE",
  "title": "상추 나눔",
  "ingredientName": "상추",
  "quantity": "300g",
  "price": 0,
  "tradeLocation": "충북 충주시",
  "distanceKm": 0.5,
  "expirationDate": "2026-05-20",
  "deadlineDate": "2026-05-19T18:00",
  "imageUrl": "/uploads/example.png",
  "content": "상추 나눔합니다."
}
```

### 이미지 업로드

```http
POST /api/uploads/images
Content-Type: multipart/form-data
Authorization: Bearer {accessToken}
```

Form field:

```text
file
```

---

## 📄 문서

| 문서 | 설명 |
|------|------|
| `docs/API.md` | API 명세 |
| `docs/design/` | 소프트웨어 설계서 |
| `docs/images/system_architecture_diagram.svg` | 시스템 아키텍처 |
| `docs/images/erd_diagram.svg` | ERD |
| `docs/images/trade_sequence_diagram.png` | 거래 요청 시퀀스 |

---

## 🔄 개발 진행 상태

현재 반띵은 핵심 기능 구현과 화면 연동을 중심으로 개발되었습니다.

- 회원가입 / 로그인
- JWT 기반 인증과 Refresh Token 재발급
- 이메일 인증
- 게시글 CRUD
- 나눔/판매 유통기한 및 거래 마감일, 공동구매 날짜·시간 마감일 저장
- 위치 좌표와 반경 기반 게시글 검색 및 필터링
- 주요 목록 페이지네이션
- 댓글 작성 / 조회 / 수정 / 삭제
- 관심 게시글 등록 / 해제 / 조회
- 거래 요청 생성
- 거래 요청 수락 / 거절 / 완료
- 거래 완료 게시글 일반 목록 숨김 및 내 게시글 상세 진입 유지
- 공동구매 모집마감과 1대1/단체 채팅방 개설
- 채팅 메시지, 읽음 처리, 상단 고정, 알림 끄기, 상대 프로필 이미지 표시
- 완료된 거래 기반 리뷰 작성
- 사용자 리뷰 및 평점 조회
- 마이페이지 조회, 나눔 완료/판매 완료/공구 참여 통계, 프로필·위치 수정
- DB 알림 목록/읽음 처리, 알림 설정, FCM 토큰 등록 및 테스트 푸시 API
- 이미지 업로드와 게시글 이미지 파일 정리
- 신고/차단, 배지/업적 진행률과 종류 확장, 관리자 통계/신고 처리 API
- React 기반 사용자 화면 구성

백엔드 테스트와 통합본 테스트는 Gradle 기준으로 통과했으며, MySQL 연결과 JPA 스키마 반영도 확인했습니다. 아직 실제 서비스 운영 결과나 사용자 통계는 확보되지 않았기 때문에 운영 성과 지표는 포함하지 않았습니다.

---

## 👥 팀원

| 이름 | 역할 |
|------|------|
| 허준서 | PM / 서버 개발, DB 설계, API 구현, 문서 정리 |
| 강신혁 | 프론트엔드 / 디자인, 화면 설계 및 UI 구현 |

---

## 📚 프로젝트 의의

반띵은 단순 게시판이 아니라, 식재료 공유 서비스에 필요한 **위치 기반 탐색**, **게시글 관리**, **거래 요청**, **채팅**, **리뷰**, **알림**, **마이페이지**, **이미지 업로드** 흐름을 하나로 연결한 프로젝트입니다.

이를 통해 Spring Boot 기반 REST API 설계, JWT 인증, JPA를 활용한 데이터 관리, React 기반 화면 구현, 프론트엔드와 백엔드의 API 연동 흐름을 경험할 수 있었습니다.

또한 식재료 공유라는 서비스 특성을 고려하여 거래 상태와 리뷰 구조를 함께 설계하면서, 실제 사용자 흐름에 가까운 서비스 구조를 구현하는 데 초점을 맞췄습니다.





