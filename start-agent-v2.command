#!/bin/bash

# ============================================================================
# Western Credit AI Dispute Assistant - Start Agent (v2 - Fixed timing)
# ============================================================================
# This script starts both the backend server and Expo web server with proper
# initialization sequencing to prevent connection errors.

# Always use the home directory rork823 folder
SCRIPT_DIR="$HOME/rork823"

# Verify it exists
if [ ! -d "$SCRIPT_DIR" ]; then
    echo "❌ Error: rork823 folder not found at $SCRIPT_DIR"
    read -p "Press Enter to close..."
    exit 1
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

clear

echo -e "${BLUE}"
echo "╔═════════════════════════════════════════════════════════════╗"
echo "║  🚀 Western Credit App - AI Dispute Assistant              ║"
echo "║  Starting both Backend & Expo servers...                   ║"
echo "╚═════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# IMPORTANT: the local Node backend (scripts/bootstrap.ts) only loads
# "expo/.env" — it does NOT read ".env.local". Expo/Metro reads both, so a
# .env.local-only setup can look fine in the app while the backend silently
# runs in demo mode (or, before this fix, never started at all). We check
# for .env here, not .env.local.
if [ ! -f "$SCRIPT_DIR/expo/.env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo ""
    echo "Setting up minimal environment variables..."
    echo ""

    mkdir -p "$SCRIPT_DIR/expo"
    cat > "$SCRIPT_DIR/expo/.env" << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://ifjihaieakahqcoctmzn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmamloYWllYWthaHFjb2N0bXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNTkzODYsImV4cCI6MjA4MzgzNTM4Nn0.CyShNzA0cVZ400qkOooYEjCYdsUNAe9vVTF11qFqU-U
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:3000
EOF
    echo -e "${GREEN}✅ .env created with minimal (anon-only) config.${NC}"
    echo -e "${YELLOW}   No SUPABASE_SERVICE_ROLE_KEY / OPENAI_API_KEY set — the${NC}"
    echo -e "${YELLOW}   backend will run in demo mode until you run:${NC}"
    echo -e "${YELLOW}     bash $SCRIPT_DIR/expo/scripts/setup-env.sh${NC}"
    echo ""
fi

# Kill any existing processes to avoid port conflicts
echo -e "${YELLOW}🧹 Cleaning up any existing processes...${NC}"
pkill -f "npm run backend" 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true
sleep 2

# ============================================================================
# START BACKEND SERVER
# ============================================================================

echo -e "${BLUE}📦 Starting Backend Server on port 3000...${NC}"
echo "   This server handles AI Agent calls and system status."
echo ""

# IMPORTANT: package.json (and the "backend" script) lives inside expo/,
# not the repo root. Running "npm run backend" from $SCRIPT_DIR fails
# instantly with ENOENT ("Could not read package.json"), which is why the
# backend never actually started even though a PID was printed.
cd "$SCRIPT_DIR/expo"

# Make sure the backend tooling (tsx, @hono/node-server, ws, dotenv) is
# installed. If someone only ran `npm install` (without --legacy-peer-deps)
# or skipped scripts/setup-env.sh, these dev deps may be missing.
if [ ! -d "node_modules/tsx" ] || [ ! -d "node_modules/@hono/node-server" ]; then
    echo -e "${YELLOW}📥 Installing backend tooling (first run only)...${NC}"
    npm install --legacy-peer-deps --save-dev @hono/node-server tsx ws @types/ws dotenv > "$SCRIPT_DIR/install.log" 2>&1
    echo -e "${GREEN}✅ Backend tooling installed.${NC}"
    echo ""
fi

# .env (not .env.local) is what scripts/serve-backend.ts and the app read.
if [ ! -f "$SCRIPT_DIR/expo/.env" ]; then
    echo -e "${RED}❌ .env file not found in expo/!${NC}"
    echo "   Run: bash $SCRIPT_DIR/expo/scripts/setup-env.sh"
    echo ""
fi

# Start backend in background
npm run backend > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

echo "✅ Backend process started (PID: $BACKEND_PID)"
echo "   Logs: $SCRIPT_DIR/backend.log"
echo ""

# Wait for backend to be ready - this is the critical part
# We try to hit the system-status endpoint up to 15 times with 1 second delays
echo -e "${YELLOW}⏳ Waiting for backend to be ready...${NC}"

for i in {1..15}; do
    if curl -s http://localhost:3000/api/system-status > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is responding!${NC}"
        sleep 1
        break
    fi
    
    if [ $i -eq 15 ]; then
        echo -e "${RED}❌ Backend failed to start after 15 seconds${NC}"
        echo ""
        echo "Check the backend log:"
        echo "   cat $SCRIPT_DIR/backend.log"
        echo ""
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    echo "   Attempt $i/15... waiting for backend initialization"
    sleep 1
done

echo ""

# ============================================================================
# START EXPO WEB SERVER
# ============================================================================

echo -e "${BLUE}📱 Starting Expo Web Server on port 8081...${NC}"
echo "   This serves your app interface."
echo ""

cd "$SCRIPT_DIR/expo"

# Start Expo
npx expo start --clear --web

# Cleanup when done (when user exits Expo)
echo ""
echo -e "${RED}Cleaning up...${NC}"
kill $BACKEND_PID 2>/dev/null || true
pkill -f "npm run backend" 2>/dev/null || true

echo -e "${GREEN}✅ All servers stopped${NC}"
echo ""

read -p "Press Enter to close this window..."
