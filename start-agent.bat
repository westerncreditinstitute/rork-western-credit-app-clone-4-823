@echo off
echo.
echo ========================================
echo.
echo 🚀 Starting Western Credit App...
echo.
echo ========================================
echo.

REM Start the backend in a new window
echo 📦 Starting Backend Server in new window...
start cmd /k "cd /d %~dp0 && npm run backend"

REM Wait for backend to start
timeout /t 3 /nobreak

REM Start Expo in another new window
echo 📱 Starting Expo Server in new window...
start cmd /k "cd /d %~dp0expo && npx expo start --clear --web"

echo.
echo ✅ Both servers are starting in separate windows!
echo.
echo Keep these windows open. When done, run stop-agent.bat
pause
