#!/usr/bin/env bash
# ============================================================
#  stop-my-agent.command — ONE double-click stops everything:
#    - the backend (port 3000)
#    - the app / Metro (port 8081)
# ============================================================
set -uo pipefail

G='\033[32m'; R='\033[31m'; Y='\033[33m'; B='\033[1m'; D='\033[2m'; X='\033[0m'

printf "\n${B}═══ My Agent — stop everything ═══${X}\n\n"

printf "${D}Stopping the backend (:3000) ...${X}\n"
B1=$(lsof -ti :3000 2>/dev/null || true)
if [ -n "$B1" ]; then
  printf '%s\n' "$B1" | awk 'NF' | while read -r p; do kill -9 "$p" 2>/dev/null || true; done
  printf "${G}✓ backend stopped${X}\n"
else
  printf "${D}  (nothing running on :3000)${X}\n"
fi

printf "${D}Stopping the app (:8081) ...${X}\n"
M1=$(lsof -ti :8081 2>/dev/null || true)
if [ -n "$M1" ]; then
  printf '%s\n' "$M1" | awk 'NF' | while read -r p; do kill -9 "$p" 2>/dev/null || true; done
  printf "${G}✓ app stopped${X}\n"
else
  printf "${D}  (nothing running on :8081)${X}\n"
fi

printf "\n${G}✓ Done. Both windows can be closed.${X}\n\n"
exit 0
