#!/usr/bin/env bash
# ============================================================
#  start-my-agent.command — ONE double-click starts everything:
#
#    1. Opens Terminal window "My Agent — Backend"  → http://localhost:3000
#    2. Opens Terminal window "My Agent — App"      → Metro on :8081
#    3. Waits until both are up (health checks)
#    4. Opens the app's Home page in your default browser
#
#  Safe to re-run any time — stops old copies first.
#  Pair: stop-my-agent.command stops everything.
# ============================================================
set -uo pipefail

G='\033[32m'; R='\033[31m'; Y='\033[33m'; B='\033[1m'; D='\033[2m'; X='\033[0m'

cd "$(dirname "$0")"
SCRIPTS="$(pwd)/scripts"

printf "\n${B}═══ My Agent — one-click startup ═══${X}\n\n"

# --- 0. Safety: .env must exist ---------------------------------
if [ ! -f .env ]; then
  printf "${R}✗ No .env file found.${X}\n"
  printf "${R}  Run this first, then double-click again:  bash scripts/setup-env.sh${X}\n"
  exit 1
fi

# --- 1. Stop anything from a previous run -----------------------
printf "${D}Stopping any previous backend/app...${X}\n"
lsof -ti :3000 2>/dev/null | awk 'NF' | while read -r p; do kill -9 "$p" 2>/dev/null; done
lsof -ti :8081 2>/dev/null | awk 'NF' | while read -r p; do kill -9 "$p" 2>/dev/null; done
sleep 1
printf "${G}✓ done${X}\n\n"

# --- 2. Open both windows ----------------------------------------
printf "${D}Opening the two Terminal windows...${X}\n"
if open "$SCRIPTS/window-backend.command"; then
  printf "${G}✓ backend window opened${X}\n"
else
  printf "${Y}! macOS blocked window-backend.command${X}\n"
  printf "${Y}  One-time fix: in Finder, right-click it → Open → Open.${X}\n"
fi
sleep 2
if open "$SCRIPTS/window-app.command"; then
  printf "${G}✓ app window opened${X}\n"
else
  printf "${Y}! macOS blocked window-app.command${X}\n"
  printf "${Y}  One-time fix: in Finder, right-click it → Open → Open.${X}\n"
fi
printf "\n"

# --- 3. Wait for the backend (port 3000) ------------------------
printf "${D}Waiting for the backend on :3000 ...${X}\n"
BE_OK=""
for i in $(seq 1 90); do
  if curl -sf -o /dev/null "http://localhost:3000/api/system-status" 2>/dev/null; then
    BE_OK="true"; break
  fi
  sleep 1
done
if [ -n "$BE_OK" ]; then
  printf "${G}✓ Backend is UP (http://localhost:3000)${X}\n\n"
else
  printf "${Y}! Backend not up after 90s — read the 'My Agent — Backend' window.${X}\n"
  printf "${Y}  (If it mentions setup-env, run: bash scripts/setup-env.sh)${X}\n\n"
fi

# --- 4. Wait for the app (Metro, port 8081) ---------------------
printf "${D}Waiting for the app (Metro) on :8081 ...${X}\n"
printf "  ${D}(first start of the day is slower — it rebuilds the app)${X}\n"
METRO_OK=""
for i in $(seq 1 240); do
  if curl -s -o /dev/null -w '' "http://localhost:8081" 2>/dev/null; then
    METRO_OK="true"; break
  fi
  sleep 1
done
if [ -n "$METRO_OK" ]; then
  printf "${G}✓ App is UP (http://localhost:8081)${X}\n\n"
else
  printf "${Y}! App not up after 4 minutes — read the 'My Agent — App' window.${X}\n"
  printf "${Y}  (Common fix: System Settings → Privacy & Security →${X}\n"
  printf "${Y}   Local Network → turn ON 'Terminal'.)${X}\n\n"
fi

# --- 5. Open the Home page ---------------------------------------
if [ -n "$METRO_OK" ]; then
  printf "${D}Opening the app in your browser ...${X}\n"
  if open "http://localhost:8081/"; then
    printf "${G}✓ Opened http://localhost:8081/${X}\n\n"
  else
    printf "${Y}! Could not open the browser — go to: http://localhost:8081/${X}\n\n"
  fi
fi

printf "${B}All set.${X} ${D}Keep both Terminal windows open while you work.${X}\n"
printf "${D}To stop everything later: double-click  stop-my-agent.command${X}\n\n"
exit 0
