# Docker 기반 FoodShare 배포 가이드

이 구성은 FoodShare 통합 저장소 하나로 프론트엔드, 백엔드, MySQL, Nginx를 Docker Compose로 실행하는 배포 구조이다.

## 구성

```text
사용자 브라우저
  -> Nginx :80
    -> /        frontend 컨테이너
    -> /api     backend 컨테이너
    -> /uploads backend 컨테이너
  -> backend
    -> mysql
```

## 로컬 또는 EC2 단일 서버 배포

### 1. 서버 준비

EC2 Ubuntu 서버 기준으로 Docker와 Docker Compose 플러그인이 필요하다.

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
newgrp docker
```

### 2. 저장소 받기

```bash
git clone https://github.com/hjs7115/foodshare.git
cd foodshare
```

### 3. 환경변수 파일 생성

```bash
cp .env.docker.example .env.docker
nano .env.docker
```

반드시 바꿀 값:

```env
MYSQL_PASSWORD=운영용_DB_비밀번호
MYSQL_ROOT_PASSWORD=운영용_ROOT_비밀번호
APP_JWT_SECRET=길고_랜덤한_JWT_SECRET
APP_ADMIN_TOKEN=관리자_API_TOKEN
MAIL_USERNAME=이메일_계정
MAIL_PASSWORD=이메일_앱_비밀번호
MAIL_FROM=보내는_이메일
```

Firebase Admin FCM 서버 발송까지 사용할 경우:

```bash
mkdir -p secrets
# Firebase Admin SDK JSON 파일을 secrets/firebase-service-account.json 위치에 둔다.
```

그리고 `.env.docker`에서 다음처럼 바꾼다.

```env
APP_FIREBASE_ENABLED=true
APP_FIREBASE_SERVICE_ACCOUNT=/run/secrets/firebase-service-account.json
```

### 4. 실행

```bash
docker compose --env-file .env.docker up -d --build
```

### 5. 상태 확인

```bash
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f backend
docker compose --env-file .env.docker logs -f nginx
```

브라우저에서 접속:

```text
http://EC2_PUBLIC_IP
```

API 확인:

```text
http://EC2_PUBLIC_IP/api/posts
```

PWA 파일 확인:

```text
http://EC2_PUBLIC_IP/manifest.webmanifest
http://EC2_PUBLIC_IP/firebase-messaging-sw.js
http://EC2_PUBLIC_IP/assets/pwa-icon-192.png
```

## AWS 보안 그룹

EC2 보안 그룹에서 최소한 아래 포트를 열어야 한다.

| 포트 | 용도 |
| --- | --- |
| 22 | SSH 접속 |
| 80 | 웹 서비스 접속 |
| 443 | HTTPS 적용 시 사용 |

MySQL `3306`은 외부에 열지 않는다. Docker 내부 네트워크에서만 백엔드가 접근한다.

## RDS MySQL을 사용할 경우

RDS를 쓰면 MySQL 컨테이너는 띄우지 않고 `docker-compose.rds.yml`을 사용한다.

`.env.docker`에 아래 값을 설정한다.

```env
SPRING_DATASOURCE_URL=jdbc:mysql://RDS_ENDPOINT:3306/foodshare?serverTimezone=Asia/Seoul&characterEncoding=UTF-8&useSSL=false&allowPublicKeyRetrieval=true
SPRING_DATASOURCE_USERNAME=foodshare
SPRING_DATASOURCE_PASSWORD=RDS_PASSWORD
```

실행:

```bash
docker compose -f docker-compose.rds.yml --env-file .env.docker up -d --build
```

## HTTPS와 PWA

HTTP로도 웹 서비스 접속은 가능하지만, 설치 가능한 PWA와 웹 푸시를 안정적으로 쓰려면 HTTPS가 필요하다.

선택지는 두 가지다.

1. EC2 앞에 CloudFront 또는 Load Balancer를 두고 HTTPS 인증서를 연결한다.
2. EC2 Nginx에 도메인과 Let's Encrypt 인증서를 직접 설정한다.

발표/시연에서는 먼저 HTTP로 기능을 확인하고, PWA 설치까지 보여줘야 하면 HTTPS를 추가한다.

## 자주 쓰는 명령

```bash
# 전체 재빌드 및 실행
docker compose --env-file .env.docker up -d --build

# 중지
docker compose --env-file .env.docker down

# DB 데이터까지 삭제할 때만 사용
docker compose --env-file .env.docker down -v

# 로그 확인
docker compose --env-file .env.docker logs -f

# 백엔드만 다시 빌드
docker compose --env-file .env.docker up -d --build backend nginx
```