#!/bin/bash

# Get the directory where this script is located
# If it's on Desktop, find the actual rork823 folder
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# If we're on Desktop, the script is a copy - find the original rork823 folder
if [[ "$SCRIPT_DIR" == *"Desktop"* ]]; then
    # Look for rork823 in common locations
    for dir in "$HOME/rork823" "$HOME/Documents/rork823" "$HOME/Downloads/rork823" "$HOME/Projects/rork823"; do
        if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
            SCRIPT_DIR="$dir"
            break
        fi
    done
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

clear

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║  🚀 Western Credit App - Start Agent   ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check if .env exists
if [ ! -f "$SCRIPT_DIR/expo/.env.local" ]; then
    echo -e "${RED}❌ .env.local file not found!${NC}"
    echo ""
    echo "Setting up environment variables..."
    echo ""
    
    # Run setup script - try both locations
    if [ -f "$SCRIPT_DIR/setup-env.sh" ]; then
        bash "$SCRIPT_DIR/setup-env.sh"
    elif [ -f "$SCRIPT_DIR/scripts/setup-env.sh" ]; then
        bash "$SCRIPT_DIR/scripts/setup-env.sh"
    else
        echo -e "${RED}Error: setup-env.sh not found${NC}"
        echo "Creating .env.local manually..."
        
        # Create it manually
        mkdir -p "$SCRIPT_DIR/expo"
        cat > "$SCRIPT_DIR/expo/.env.local" << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://ifjihaieakahqcoctmzn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmamloYWllYWthaHFjb2N0bXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNTkzODYsImV4cCI6MjA4MzgzNTM4Nn0.CyShNzA0cVZ400qkOooYEjCYdsUNAe9vVTF11qFqU-U
EOF
        echo -e "${GREEN}✅ .env.local created successfully!${NC}"
    fi
fi

echo ""
echo -e "${BLUE}📦 Starting Backend Server...${NC}"
cd "$SCRIPT_DIR"

# Kill any existing processes
pkill -f "npm run backend" 2>/dev/null || true
sleep 1

# Start backend
npm run backend > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

echo "✅ Backend started (PID: $BACKEND_PID)"
echo ""

# Wait for backend to be ready
sleep 3

echo -e "${BLUE}📱 Starting Expo Web Server...${NC}"
cd "$SCRIPT_DIR/expo"

# Kill any existing Expo processes
pkill -f "expo start" 2>/dev/null || true
sleep 1

npx expo start --clear --web

# Cleanup when done
echo ""
echo -e "${RED}Cleaning up...${NC}"
kill $BACKEND_PID 2>/dev/null || true
pkill -f "npm run backend" 2>/dev/null || true

echo -e "${GREEN}✅ All servers stopped${NC}"
echo ""
read -p "Press Enter to close this window..."
