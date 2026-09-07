#!/bin/bash

# Setup Environment Script for Western Credit App
#
# NOTE: This creates expo/.env (NOT .env.local). The local backend
# (expo/scripts/bootstrap.ts) only loads expo/.env — it does not read
# .env.local. Expo/Metro reads both, so a .env.local-only setup can look
# fine in the app while the backend silently runs in demo mode.
#
# In normal use you don't need to run this manually: start-agent-v2.command
# creates expo/.env automatically on first run if it's missing.

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  🔧 Setting Up Your Environment       ║"
echo "╚══════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if .env already exists
if [ -f "$SCRIPT_DIR/expo/.env" ]; then
    echo "✅ expo/.env already exists!"
    echo ""
    echo "Your environment is already set up."
    echo ""
    echo "You can now run: ./start-agent-v2.command"
    echo ""
    exit 0
fi

echo "📝 Creating environment configuration..."
echo ""

mkdir -p "$SCRIPT_DIR/expo"

# Create the .env file with the working Supabase credentials
cat > "$SCRIPT_DIR/expo/.env" << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://ifjihaieakahqcoctmzn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmamloYWllYWthaHFjb2N0bXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNTkzODYsImV4cCI6MjA4MzgzNTM4Nn0.CyShNzA0cVZ400qkOooYEjCYdsUNAe9vVTF11qFqU-U
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:3000
EOF

if [ $? -eq 0 ]; then
    echo "✅ Environment file created successfully!"
    echo ""
    echo "Location: $SCRIPT_DIR/expo/.env"
    echo ""
    echo "✨ Setup complete!"
    echo ""
    echo "You can now run: ./start-agent-v2.command"
    echo ""
else
    echo "❌ Error creating .env file"
    echo ""
    exit 1
fi
