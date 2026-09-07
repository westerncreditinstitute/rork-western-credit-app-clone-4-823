#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Western Credit App...${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start the backend in the background
echo -e "${BLUE}📦 Starting Backend Server...${NC}"
cd "$SCRIPT_DIR"
npm run backend > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait a moment for backend to start
sleep 3

# Start the Expo server
echo ""
echo -e "${BLUE}📱 Starting Expo Server...${NC}"
cd "$SCRIPT_DIR/expo"
npx expo start --clear --web

# If Expo exits, kill the backend too
kill $BACKEND_PID 2>/dev/null
echo -e "${GREEN}✅ All servers stopped${NC}"
