#!/usr/bin/env bash
# ============================================================
#  window-app.command
#  Opens a new Terminal window titled "My Agent — App"
#  and runs the Expo app dev server (Metro) inside it.
#  Opened automatically by start-my-agent.command — or run directly.
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

printf '\e]0;My Agent — App\a'   # set the window title

npx expo start --clear
