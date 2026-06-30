@echo off
chcp 65001 >nul
echo 🔍 백엔드 서버 연결 테스트
echo ======================================
echo.

REM 테스트 1: 기본 접속
echo 📡 테스트 1: 기본 접속 테스트
echo    URL: http://localhost:8080
echo.

curl -s -o nul -w "%%{http_code}" http://localhost:8080 > temp_status.txt 2>nul
set /p STATUS=<temp_status.txt
del temp_status.txt >nul 2>&1

if "%STATUS:~0,1%"=="2" (
    echo ✅ 성공: 서버가 응답합니다!
    echo    응답 코드: %STATUS%
) else if "%STATUS:~0,1%"=="4" (
    echo ✅ 서버는 실행 중입니다 (응답 코드: %STATUS%^)
) else (
    echo ❌ 실패: 서버에 연결할 수 없습니다
    echo.
    echo    해결:
    echo    1. 백엔드 서버를 실행하세요
    echo    2. 서버가 8080 포트에서 실행되는지 확인하세요
)

echo.
echo ======================================
echo.

REM 테스트 2: 포트 확인
echo 🔌 테스트 2: 8080 포트 사용 확인
echo.

netstat -an | findstr ":8080" > temp_port.txt 2>nul
for /f %%i in ("temp_port.txt") do set SIZE=%%~zi
if %SIZE% gtr 0 (
    echo ✅ 8080 포트가 사용 중입니다
    type temp_port.txt
) else (
    echo ❌ 8080 포트에 실행 중인 프로세스가 없습니다
    echo    백엔드 서버를 실행해주세요
)
del temp_port.txt >nul 2>&1

echo.
echo ======================================
echo.

REM 테스트 3: API 엔드포인트
echo 🎯 테스트 3: API 엔드포인트 접근
echo    URL: http://localhost:8080/api/auth/signup
echo.

curl -s http://localhost:8080/api/auth/signup > temp_api.txt 2>nul
curl -s -o nul -w "%%{http_code}" http://localhost:8080/api/auth/signup > temp_api_status.txt 2>nul
set /p API_STATUS=<temp_api_status.txt

if "%API_STATUS%"=="000" (
    echo ❌ API 엔드포인트에 접근할 수 없습니다
) else (
    echo ✅ API 엔드포인트가 응답합니다
    echo    응답 코드: %API_STATUS%
)

del temp_api.txt >nul 2>&1
del temp_api_status.txt >nul 2>&1

echo.
echo ======================================
echo.

echo 📋 요약
echo.
echo 위의 모든 테스트가 ✅ 성공이면 프론트엔드가 정상 작동합니다.
echo ❌ 실패가 있다면 해당 항목을 수정해주세요.
echo.
echo 문제가 계속되면 docs/CHECK_SERVER.md 파일을 참고하세요.
echo.

pause
