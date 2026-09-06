#!/usr/bin/env bash
# ============================================================
#  window-backend.command
#  Opens a new Terminal window titled "My Agent — Backend"
#  and runs the backend server (npm run backend) inside it.
#  Opened automatically by start-my-agent.command — or run directly.
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

printf '\e]0;My Agent — Backend\a'   # set the window title

if [ ! -f .env ]; then
  echo ""
  echo "✗ No .env file found."
  echo "  Run this first:  bash scripts/setup-env.sh"
  exit 1
fi

npm run backend
