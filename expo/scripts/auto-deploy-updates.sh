#!/bin/bash

# ============================================================================
# Automatic Update & Deploy Script
# ============================================================================
# This script is automatically called by start-agent-v2.command before
# starting services. It ensures:
# 1. Latest code is pulled from GitHub
# 2. Dependencies are updated if needed
# 3. Backend is ready to run with latest changes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔄 Automatic Update & Deploy${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# ============================================================================
# Step 1: Initialize Git if needed
# ============================================================================

if [ ! -d "$REPO_DIR/.git" ]; then
    echo -e "${YELLOW}📦 Initializing Git repository...${NC}"
    cd "$REPO_DIR"
    git init
    git remote add origin https://github.com/westerncreditinstitute/rork-western-credit-app-clone-4-823.git
    git fetch origin main
    git checkout -b main origin/main 2>/dev/null || git checkout main
    echo -e "${GREEN}✅ Git repository initialized${NC}"
    echo ""
fi

# ============================================================================
# Step 2: Pull latest changes from GitHub
# ============================================================================

echo -e "${BLUE}📥 Checking for updates from GitHub...${NC}"
cd "$REPO_DIR"

# Fetch latest
git fetch origin main 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Could not fetch from GitHub (may be offline)${NC}"
    echo -e "${YELLOW}    Continuing with local version...${NC}"
    echo ""
    exit 0
}

# Check for differences
LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/main 2>/dev/null)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo -e "${YELLOW}📦 Updates found! Pulling latest code...${NC}"
    
    # Stash any local changes and pull fresh
    git stash --quiet 2>/dev/null || true
    git reset --hard origin/main > /dev/null 2>&1
    
    echo -e "${GREEN}✅ Updates applied successfully${NC}"
    echo ""
    
    # ============================================================================
    # Step 3: Update dependencies if package.json changed
    # ============================================================================
    
    echo -e "${BLUE}📦 Checking if dependencies need updating...${NC}"
    cd "$REPO_DIR/expo"
    
    if [ -f "package.json" ]; then
        echo -e "${YELLOW}⚙️  Running npm install...${NC}"
        npm install --legacy-peer-deps > /dev/null 2>&1 &
        npm_pid=$!
        
        # Show progress
        for i in {1..30}; do
            if ! ps -p $npm_pid > /dev/null 2>&1; then
                break
            fi
            echo -n "."
            sleep 1
        done
        
        # Wait for completion
        wait $npm_pid 2>/dev/null
        
        echo ""
        echo -e "${GREEN}✅ Dependencies updated${NC}"
    fi
    echo ""
else
    echo -e "${GREEN}✅ Already up to date with latest code${NC}"
    echo ""
fi

# ============================================================================
# Step 4: Verify critical files exist
# ============================================================================

echo -e "${BLUE}🔍 Verifying installation...${NC}"

if [ ! -f "$REPO_DIR/expo/backend/trpc/routes/ai-agents.ts" ]; then
    echo -e "${RED}❌ Critical file missing: ai-agents.ts${NC}"
    exit 1
fi

if [ ! -f "$REPO_DIR/expo/.env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating minimal config...${NC}"
    mkdir -p "$REPO_DIR/expo"
    cat > "$REPO_DIR/expo/.env" << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://ifjihaieakahqcoctmzn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmamloYWllYWthaHFjb2N0bXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNTkzODYsImV4cCI6MjA4MzgzNTM4Nn0.CyShNzA0cVZ400qkOooYEjCYdsUNAe9vVTF11qFqU-U
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:3000
EOF
    echo -e "${GREEN}✅ .env created${NC}"
fi

echo -e "${GREEN}✅ Installation verified${NC}"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 Ready to start services!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
