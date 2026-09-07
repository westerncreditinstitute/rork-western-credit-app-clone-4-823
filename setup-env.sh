#!/bin/bash

# Setup Environment Script for Western Credit App

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  🔧 Setting Up Your Environment       ║"
echo "╚════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if .env.local already exists
if [ -f "$SCRIPT_DIR/expo/.env.local" ]; then
    echo "✅ .env.local already exists!"
    echo ""
    echo "Your environment is already set up."
    echo ""
    echo "You can now run: ./start-agent.command"
    echo ""
    exit 0
fi

echo "📝 Creating environment configuration..."
echo ""

# Create the .env.local file
cat > "$SCRIPT_DIR/expo/.env.local" << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://ifjihaieakahqcoctmzn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmamloYWllYWthaHFjb2N0bXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNTkzODYsImV4cCI6MjA4MzgzNTM4Nn0.CyShNzA0cVZ400qkOooYEjCYdsUNAe9vVTF11qFqU-U
EOF

if [ $? -eq 0 ]; then
    echo "✅ Environment file created successfully!"
    echo ""
    echo "Location: $SCRIPT_DIR/expo/.env.local"
    echo ""
    echo "✨ Setup complete!"
    echo ""
    echo "You can now run: ./start-agent.command"
    echo ""
else
    echo "❌ Error creating .env.local file"
    echo ""
    exit 1
fi
