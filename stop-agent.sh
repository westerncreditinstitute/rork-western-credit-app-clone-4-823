#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping Western Credit App...${NC}"
echo ""

# Kill Expo processes
echo -e "${RED}Stopping Expo server...${NC}"
pkill -f "expo start" || true
pkill -f "npx expo" || true

# Kill backend processes
echo -e "${RED}Stopping Backend server...${NC}"
pkill -f "npm run backend" || true
pkill -f "node.*backend" || true

# Kill any lingering npm processes related to this app
echo -e "${RED}Cleaning up processes...${NC}"
pkill -f "rork823" || true

sleep 1

echo ""
echo -e "${GREEN}✅ All servers stopped${NC}"
echo ""
echo "To start again, run: ./start-agent.sh"
