#!/bin/bash

echo "🔍 백엔드 서버 연결 테스트"
echo "======================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 테스트 1: localhost:8080 기본 접속
echo "📡 테스트 1: 기본 접속 테스트"
echo "   URL: http://localhost:8080"
echo ""

if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null | grep -q "^[2-4][0-9][0-9]"; then
    echo -e "${GREEN}✅ 성공: 서버가 응답합니다!${NC}"
    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null)
    echo "   응답 코드: $STATUS_CODE"
else
    echo -e "${RED}❌ 실패: 서버에 연결할 수 없습니다${NC}"
    echo ""
    echo "   원인:"
    echo "   1. 백엔드 서버가 실행되지 않았습니다"
    echo "   2. 포트가 8080이 아닙니다"
    echo "   3. 방화벽이 연결을 차단합니다"
    echo ""
    echo "   해결:"
    echo "   - 백엔드 서버를 실행하세요"
    echo "   - 서버가 8080 포트에서 실행되는지 확인하세요"
fi

echo ""
echo "======================================"
echo ""

# 테스트 2: 포트 확인
echo "🔌 테스트 2: 8080 포트 사용 확인"
echo ""

if command -v lsof &> /dev/null; then
    PORT_CHECK=$(lsof -i :8080 2>/dev/null)
    if [ -n "$PORT_CHECK" ]; then
        echo -e "${GREEN}✅ 8080 포트가 사용 중입니다${NC}"
        echo "$PORT_CHECK" | head -5
    else
        echo -e "${RED}❌ 8080 포트에 실행 중인 프로세스가 없습니다${NC}"
        echo "   백엔드 서버를 실행해주세요"
    fi
elif command -v netstat &> /dev/null; then
    PORT_CHECK=$(netstat -an | grep "8080" 2>/dev/null)
    if [ -n "$PORT_CHECK" ]; then
        echo -e "${GREEN}✅ 8080 포트가 사용 중입니다${NC}"
        echo "$PORT_CHECK" | head -5
    else
        echo -e "${RED}❌ 8080 포트에 실행 중인 프로세스가 없습니다${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ 포트 확인 도구가 없습니다 (lsof, netstat)${NC}"
fi

echo ""
echo "======================================"
echo ""

# 테스트 3: API 엔드포인트 테스트
echo "🎯 테스트 3: API 엔드포인트 접근"
echo "   URL: http://localhost:8080/api/auth/signup"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8080/api/auth/signup 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "000" ] || [ -z "$HTTP_CODE" ]; then
    echo -e "${RED}❌ API 엔드포인트에 접근할 수 없습니다${NC}"
    echo "   서버가 실행되지 않았습니다"
else
    echo -e "${GREEN}✅ API 엔드포인트가 응답합니다${NC}"
    echo "   응답 코드: $HTTP_CODE"
    if [ ${#BODY} -lt 500 ]; then
        echo "   응답 내용: $BODY"
    else
        echo "   응답 내용: (너무 길어서 생략)"
    fi
fi

echo ""
echo "======================================"
echo ""

# 테스트 4: CORS 헤더 확인
echo "🌐 테스트 4: CORS 설정 확인"
echo ""

CORS_HEADER=$(curl -s -I http://localhost:8080 2>/dev/null | grep -i "access-control-allow-origin")

if [ -n "$CORS_HEADER" ]; then
    echo -e "${GREEN}✅ CORS 헤더가 설정되어 있습니다${NC}"
    echo "   $CORS_HEADER"
else
    echo -e "${YELLOW}⚠️ CORS 헤더를 찾을 수 없습니다${NC}"
    echo "   백엔드 개발자에게 CORS 설정을 요청하세요"
    echo ""
    echo "   Express.js 예시:"
    echo "   app.use(cors({ origin: '*' }));"
fi

echo ""
echo "======================================"
echo ""
echo "📋 요약"
echo ""
echo "위의 모든 테스트가 ✅ 성공이면 프론트엔드가 정상 작동합니다."
echo "❌ 실패가 있다면 해당 항목을 수정해주세요."
echo ""
echo "문제가 계속되면 docs/CHECK_SERVER.md 파일을 참고하세요."
echo ""
