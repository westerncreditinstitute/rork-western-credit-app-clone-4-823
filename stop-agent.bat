@echo off
echo.
echo ========================================
echo.
echo 🛑 Stopping Western Credit App...
echo.
echo ========================================
echo.

echo Stopping Expo server...
taskkill /F /IM node.exe /T 2>nul

echo Stopping Backend server...
taskkill /F /IM npm.cmd /T 2>nul

echo Cleaning up processes...
timeout /t 2 /nobreak

echo.
echo ✅ All servers stopped!
echo.
echo To start again, run: start-agent.bat
pause
