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

# Check if .env exists
if [ ! -f "$SCRIPT_DIR/expo/.env.local" ]; then
    echo -e "${RED}❌ .env.local file not found!${NC}"
    echo ""
    echo "Setting up environment variables..."
    echo ""
    
    # Create it manually
    mkdir -p "$SCRIPT_DIR/expo"
    cat > "$SCRIPT_DIR/expo/.env.local" << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://ifjihaieakahqcoctmzn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmamloYWllYWthaHFjb2N0bXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNTkzODYsImV4cCI6MjA4MzgzNTM4Nn0.CyShNzA0cVZ400qkOooYEjCYdsUNAe9vVTF11qFqU-U
EOF
    echo -e "${GREEN}✅ .env.local created successfully!${NC}"
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

cd "$SCRIPT_DIR"

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
