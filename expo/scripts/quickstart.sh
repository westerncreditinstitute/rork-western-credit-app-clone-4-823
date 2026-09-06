#!/usr/bin/env bash
# =============================================================================
# Western Credit Institute — One-Command Local Setup
#
# Usage (paste this ONE line into Terminal):
#   curl -fsSL https://raw.githubusercontent.com/westerncreditinstitute/rork-western-credit-app-clone-4-823/main/expo/scripts/quickstart.sh | bash
#
# What it does, in order:
#   1. Checks Node.js and git are installed (tells you exactly how to fix if not)
#   2. Clones the repo (or updates it if you already have it)
#   3. Runs npm install
#   4. Hands you off to the interactive env setup
#
# It is safe to re-run: it detects an existing clone and updates instead of
# failing, and it never overwrites an existing .env.
# =============================================================================

set -u  # (deliberately not -e: we handle errors ourselves with clear messages)

REPO_URL="https://github.com/westerncreditinstitute/rork-western-credit-app-clone-4-823.git"
REPO_DIR="rork-western-credit-app-clone-4-823"
TARGET_PARENT="${WCI_INSTALL_DIR:-$HOME/Documents}"

# --- colors (disabled if not a terminal) -------------------------------------
if [ -t 1 ]; then
  BOLD=$'\033[1m'; GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; CYAN=$'\033[36m'; RESET=$'\033[0m'
else
  BOLD=""; GREEN=""; RED=""; YELLOW=""; CYAN=""; RESET=""
fi

ok()   { echo "${GREEN}✓${RESET} $1"; }
warn() { echo "${YELLOW}!${RESET} $1"; }
fail() { echo "${RED}✗${RESET} $1"; }
step() { echo; echo "${BOLD}${CYAN}$1${RESET}"; }

echo "${BOLD}════════════════════════════════════════════════════════${RESET}"
echo "${BOLD}  Western Credit Institute — Local Setup${RESET}"
echo "${BOLD}════════════════════════════════════════════════════════${RESET}"

# -----------------------------------------------------------------------------
step "Step 1 of 4 — Checking prerequisites"
# -----------------------------------------------------------------------------
MISSING=0

if command -v node >/dev/null 2>&1; then
  NODE_RAW="$(node -v)"                 # e.g. v20.11.0
  NODE_MAJOR="${NODE_RAW#v}"; NODE_MAJOR="${NODE_MAJOR%%.*}"
  if [ "$NODE_MAJOR" -ge 20 ] 2>/dev/null; then
    ok "Node.js $NODE_RAW"
  else
    fail "Node.js $NODE_RAW is too old — version 20 or newer is required."
    echo "     Fix: download the LTS installer from https://nodejs.org and run it,"
    echo "     then run this command again."
    MISSING=1
  fi
else
  fail "Node.js is not installed."
  echo "     Fix: go to https://nodejs.org, click the green LTS button,"
  echo "     open the downloaded installer, click through it,"
  echo "     then QUIT and REOPEN Terminal and run this command again."
  MISSING=1
fi

if command -v git >/dev/null 2>&1; then
  ok "git $(git --version | awk '{print $3}')"
else
  fail "git is not installed."
  if [ "$(uname -s)" = "Darwin" ]; then
    echo "     Fix: run this in Terminal, then click Install in the popup:"
    echo "         xcode-select --install"
  else
    echo "     Fix: install git from https://git-scm.com"
  fi
  echo "     Then run this command again."
  MISSING=1
fi

if [ "$MISSING" -ne 0 ]; then
  echo
  fail "Setup stopped. Install the missing item(s) above, then re-run this command."
  exit 1
fi

# -----------------------------------------------------------------------------
step "Step 2 of 4 — Getting the code"
# -----------------------------------------------------------------------------
mkdir -p "$TARGET_PARENT" || { fail "Could not create $TARGET_PARENT"; exit 1; }
cd "$TARGET_PARENT" || { fail "Could not enter $TARGET_PARENT"; exit 1; }

if [ -d "$REPO_DIR/.git" ]; then
  warn "Project already exists at $TARGET_PARENT/$REPO_DIR — updating it instead of re-cloning."
  cd "$REPO_DIR" || exit 1
  if git pull --ff-only origin main >/tmp/wci-pull.log 2>&1; then
    ok "Updated to the latest code."
  else
    warn "Could not fast-forward (you may have local changes). Keeping what you have."
    echo "     Details: $(tail -n 2 /tmp/wci-pull.log | tr '\n' ' ')"
  fi
else
  echo "  Downloading into $TARGET_PARENT/$REPO_DIR (this takes a minute)..."
  if git clone --quiet "$REPO_URL" "$REPO_DIR"; then
    ok "Downloaded the project."
    cd "$REPO_DIR" || exit 1
  else
    fail "Download failed. Check your internet connection and try again."
    exit 1
  fi
fi

cd expo || { fail "Unexpected layout: no expo/ folder found."; exit 1; }
PROJECT_PATH="$(pwd)"
ok "Project folder: $PROJECT_PATH"

# -----------------------------------------------------------------------------
step "Step 3 of 4 — Installing packages (a few minutes; lots of output is normal)"
# -----------------------------------------------------------------------------
# NOTE: --legacy-peer-deps is REQUIRED, not optional.
# Plain `npm install` fails on this project: lucide-react-native@0.475.0 declares
# a peer dependency of React <=18, while the app runs React 19.1.0 (Expo 54 /
# RN 0.81). npm 7+ treats that as a hard error. --legacy-peer-deps restores the
# npm 6 behaviour (install anyway) which is correct here — the library works
# fine with React 19 in practice; only its metadata is stale.
if npm install --legacy-peer-deps --no-audit --no-fund; then
  ok "All packages installed."
else
  echo
  fail "npm install failed. Most common fixes:"
  echo "     • Run it again — npm sometimes hiccups on flaky networks:"
  echo "         npm install --legacy-peer-deps"
  echo "     • Clear the cache and retry:"
  echo "         npm cache clean --force && npm install --legacy-peer-deps"
  echo "     • If you see EACCES/permission errors, do NOT use sudo; instead run:"
  echo "         sudo chown -R \$(whoami) ~/.npm"
  echo "       then run:  npm install --legacy-peer-deps"
  echo
  echo "     Copy the red error text and send it over — it names the exact cause."
  exit 1
fi

# -----------------------------------------------------------------------------
step "Step 4 of 5 — Preparing the local backend"
# -----------------------------------------------------------------------------
# Rork's hosted platform runs backend/hono.ts for you. Locally, Metro only
# serves the app, so the backend needs its own small server (scripts/
# serve-backend.ts). These packages make that possible; they are dev-only.
if node -e "const p=require('./package.json'); const d={...p.dependencies,...p.devDependencies}; process.exit(d['@hono/node-server']&&d.tsx&&d.ws&&d.dotenv?0:1)" 2>/dev/null; then
  ok "Backend tooling already installed."
else
  echo "  Installing the local backend runner (dev-only packages)..."
  if npm install --legacy-peer-deps --no-audit --no-fund --save-dev @hono/node-server tsx ws @types/ws dotenv >/tmp/wci-backend-install.log 2>&1; then
    ok "Backend tooling installed."
  else
    warn "Could not install backend tooling — the app will still run, but"
    warn "API calls will fail until this succeeds. Retry manually with:"
    echo "     npm install --legacy-peer-deps --save-dev @hono/node-server tsx ws @types/ws dotenv"
  fi
fi

# Register `npm run backend` if the project doesn't define it yet.
if node -e "const p=require('./package.json'); process.exit(p.scripts&&p.scripts.backend?0:1)" 2>/dev/null; then
  ok "\"npm run backend\" is available."
else
  node -e "
    const fs=require('fs');
    const p=JSON.parse(fs.readFileSync('package.json','utf8'));
    p.scripts=p.scripts||{};
    p.scripts.backend='tsx scripts/serve-backend.ts';
    fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n');
  " 2>/dev/null && ok "Added \"npm run backend\"." || warn "Could not add the backend script automatically."
fi

# -----------------------------------------------------------------------------
step "Step 5 of 5 — Next: your Supabase + OpenAI values"
# -----------------------------------------------------------------------------
if [ -f .env ]; then
  ok ".env already exists — keeping it (nothing was overwritten)."
  echo
  echo "  To check it is valid:      ${BOLD}node scripts/check-env.js${RESET}"
  echo "  To start the app:          ${BOLD}npx expo start${RESET}   ${D}(NOT npm start \u2014 that runs bunx rork, which needs Bun)${RESET}"
else
  echo "  You need 3 values from Supabase (⚙ Project Settings → API):"
  echo "     • Project URL        • anon/public key        • service_role key"
  echo "  Plus optionally an OpenAI key (platform.openai.com/api-keys)."
  echo
  echo "  ${BOLD}Run this next — it asks for each value with hidden input:${RESET}"
  echo "     ${BOLD}cd \"$PROJECT_PATH\" && bash scripts/setup-env.sh${RESET}"
fi

echo
echo "${BOLD}════════════════════════════════════════════════════════${RESET}"
ok "${BOLD}Setup complete.${RESET}"
echo
echo "  Your project lives at:"
echo "     ${BOLD}$PROJECT_PATH${RESET}"
echo
echo "  ${BOLD}Running the app needs TWO Terminal windows${RESET} (the app and the"
echo "  API are separate programs — Rork ran both for you in the cloud):"
echo
echo "     ${BOLD}Window 1 — the API:${RESET}"
echo "        cd \"$PROJECT_PATH\""
echo "        ${BOLD}npm run backend${RESET}       → serves http://localhost:3000"
echo
echo "     ${BOLD}Window 2 — the app:${RESET}"
echo "        cd \"$PROJECT_PATH\""
echo "        ${BOLD}npx expo start${RESET}        → then press w (web) or i (iOS Simulator)"
echo
echo "  Open a second window with ${BOLD}⌘N${RESET} in Terminal."
echo "  Your .env must contain: ${BOLD}EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:3000${RESET}"
echo "${BOLD}════════════════════════════════════════════════════════${RESET}"
