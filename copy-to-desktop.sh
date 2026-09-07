#!/bin/bash

# Script to copy start-agent and stop-agent to Desktop

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DESKTOP="$HOME/Desktop"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  📋 Adding App Shortcuts to Desktop    ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Copy start-agent-v2.command (the correct, up-to-date starter script).
# NOTE: we intentionally copy start-agent-v2.command here, not the legacy
# start-agent.command, because the legacy file used to contain outdated
# startup logic that created the wrong .env file and ran commands from the
# wrong directory, causing the backend to silently fail to start.
if [ -f "$SCRIPT_DIR/start-agent-v2.command" ]; then
    cp "$SCRIPT_DIR/start-agent-v2.command" "$DESKTOP/start-agent.command"
    chmod +x "$DESKTOP/start-agent.command"
    echo "✅ Copied: start-agent-v2.command → Desktop/start-agent.command"
else
    echo "❌ Error: start-agent-v2.command not found"
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
echo "⚠️  If you already have OLDER copies of these files on your Desktop"
echo "   from before, please delete them first and re-run this script so"
echo "   you don't accidentally double-click the outdated version."
echo ""
