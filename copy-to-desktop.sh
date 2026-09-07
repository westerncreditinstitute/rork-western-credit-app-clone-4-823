#!/bin/bash

# Script to copy start-agent and stop-agent to Desktop

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DESKTOP="$HOME/Desktop"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  📋 Adding App Shortcuts to Desktop    ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Copy start-agent.command
if [ -f "$SCRIPT_DIR/start-agent.command" ]; then
    cp "$SCRIPT_DIR/start-agent.command" "$DESKTOP/start-agent.command"
    chmod +x "$DESKTOP/start-agent.command"
    echo "✅ Copied: start-agent.command → Desktop"
else
    echo "❌ Error: start-agent.command not found"
fi

# Copy stop-agent.command
if [ -f "$SCRIPT_DIR/stop-agent.command" ]; then
    cp "$SCRIPT_DIR/stop-agent.command" "$DESKTOP/stop-agent.command"
    chmod +x "$DESKTOP/stop-agent.command"
    echo "✅ Copied: stop-agent.command → Desktop"
else
    echo "❌ Error: stop-agent.command not found"
fi

echo ""
echo "✨ Done! You can now see these files on your Desktop:"
echo "   • start-agent.command"
echo "   • stop-agent.command"
echo ""
echo "Just double-click them to start or stop your app!"
echo ""
