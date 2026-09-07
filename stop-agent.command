#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

clear

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║  🛑 Western Credit App - Stop Agent    ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

echo -e "${RED}Stopping all servers...${NC}"
echo ""

# Stop Expo
echo "Stopping Expo server..."
pkill -f "expo start" 2>/dev/null || true
pkill -f "npx expo" 2>/dev/null || true

# Stop Backend
echo "Stopping Backend server..."
pkill -f "npm run backend" 2>/dev/null || true

# Kill any node processes from this app
echo "Cleaning up remaining processes..."
sleep 1

echo ""
echo -e "${GREEN}✅ All servers stopped successfully!${NC}"
echo ""
echo "Your app is now shut down."
echo ""
read -p "Press Enter to close this window..."
