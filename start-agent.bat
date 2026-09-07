@echo off
echo.
echo ========================================
echo.
echo Starting Western Credit App...
echo.
echo ========================================
echo.

REM IMPORTANT: package.json (and the "backend" script) lives inside the
REM expo\ folder, not the repo root. Running "npm run backend" from the
REM repo root fails with ENOENT (Could not read package.json).
if not exist "%~dp0expo\.env" (
    echo No .env file found - creating one with working defaults...
    (
        echo EXPO_PUBLIC_SUPABASE_URL=https://ifjihaieakahqcoctmzn.supabase.co
        echo EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmamloYWllYWthaHFjb2N0bXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNTkzODYsImV4cCI6MjA4MzgzNTM4Nn0.CyShNzA0cVZ400qkOooYEjCYdsUNAe9vVTF11qFqU-U
        echo EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:3000
    ) > "%~dp0expo\.env"
    echo .env created.
    echo.
)

REM Start the backend in a new window, from the expo\ folder
echo Starting Backend Server in new window...
start cmd /k "cd /d %~dp0expo && npm run backend"

REM Wait for backend to start
timeout /t 5 /nobreak

REM Start Expo in another new window
echo Starting Expo Server in new window...
start cmd /k "cd /d %~dp0expo && npx expo start --clear --web"

echo.
echo Both servers are starting in separate windows!
echo.
echo Keep these windows open. When done, run stop-agent.bat
pause
