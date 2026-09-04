#!/usr/bin/env bash
# ============================================================
# Interactive .env setup for the My Agent feature
#
#   bash scripts/setup-env.sh
#
# Prompts for each value, writes .env with 600 permissions,
# and never echoes secrets to the terminal or to any log.
# ============================================================
set -euo pipefail

G='\033[32m'; R='\033[31m'; Y='\033[33m'; B='\033[1m'; D='\033[2m'; X='\033[0m'

cd "$(dirname "$0")/.."
ENV_FILE=".env"

printf "\n${B}═══ My Agent — .env Setup ═══${X}\n\n"

# --- guard: don't clobber an existing .env ---------------------
if [ -f "$ENV_FILE" ]; then
  printf "${Y}A .env file already exists.${X}\n"
  read -r -p "Overwrite it? A timestamped backup will be made. [y/N] " reply
  case "$reply" in
    [yY]*)
      backup=".env.backup.$(date +%Y%m%d%H%M%S)"
      cp "$ENV_FILE" "$backup"; chmod 600 "$backup"
      printf "${D}Backed up to %s${X}\n\n" "$backup" ;;
    *) printf "Aborted. Nothing changed.\n"; exit 0 ;;
  esac
fi

# --- 1. Supabase URL -------------------------------------------
printf "${B}1/5  Supabase Project URL${X}\n"
printf "${D}Supabase dashboard → Project Settings (gear) → API → 'Project URL'${X}\n"
printf "${D}Looks like: https://abcdefghijkl.supabase.co${X}\n"
while :; do
  read -r -p "> " SUPA_URL
  SUPA_URL="${SUPA_URL%/}"   # strip any trailing slash
  if [ -z "$SUPA_URL" ]; then
    printf "${R}Required. Please paste the URL.${X}\n"
  elif ! printf '%s' "$SUPA_URL" | grep -qE '^https://[a-z0-9-]+\.supabase\.(co|in)$'; then
    printf "${R}Doesn't look like a Supabase URL. Expected https://<ref>.supabase.co${X}\n"
  else
    printf "${G}✓ %s${X}\n\n" "$SUPA_URL"; break
  fi
done

# --- 2. Supabase anon key (hidden input) -----------------------
printf "${B}2/5  Supabase anon / public key${X}\n"
printf "${D}Same page → 'anon' 'public' key. Starts with eyJ...${X}\n"
printf "${D}Input is hidden. Use the ANON key, NOT service_role.${X}\n"
while :; do
  read -r -s -p "> " SUPA_KEY; printf "\n"
  if [ -z "$SUPA_KEY" ]; then
    printf "${R}Required.${X}\n"; continue
  fi
  case "$SUPA_KEY" in
    eyJ*) ;;
    *) printf "${R}Anon key should be a JWT starting with 'eyJ'.${X}\n"; continue ;;
  esac
  # decode the JWT payload and reject service_role
  payload=$(printf '%s' "$SUPA_KEY" | cut -d. -f2)
  case $(( ${#payload} % 4 )) in 2) payload="${payload}==";; 3) payload="${payload}=";; esac
  role=$(printf '%s' "$payload" | tr '_-' '/+' | base64 -d 2>/dev/null \
         | grep -oE '"role"[[:space:]]*:[[:space:]]*"[^"]+"' | cut -d'"' -f4 || true)
  if [ "$role" = "service_role" ]; then
    printf "${R}✗ That is the SERVICE_ROLE key — it bypasses Row Level Security.${X}\n"
    printf "${R}  Never expose it client-side. Copy the 'anon' key instead.${X}\n"; continue
  fi
  [ -n "$role" ] && printf "${G}✓ anon key accepted (role: %s)${X}\n\n" "$role" \
                 || printf "${G}✓ key accepted${X}\n\n"
  break
done

# --- 3. API base URL -------------------------------------------
printf "${B}3/5  API Base URL${X}\n"
printf "${D}REQUIRED — the app throws on startup without it.${X}\n"
printf "  ${B}1${X}) http://localhost:8081   ${D}(browser, this computer)${X}\n"
printf "  ${B}2${X}) http://<LAN-IP>:8081    ${D}(phone / simulator)${X}\n"
printf "  ${B}3${X}) enter a custom URL      ${D}(Rork tunnel / production)${X}\n"
read -r -p "Choose [1/2/3] (default 1): " choice
case "${choice:-1}" in
  2)
    LAN_IP=$(ipconfig getifaddr en0 2>/dev/null \
             || hostname -I 2>/dev/null | awk '{print $1}' \
             || echo "")
    if [ -n "$LAN_IP" ]; then
      printf "${D}Detected LAN IP: %s${X}\n" "$LAN_IP"
      read -r -p "Use it? [Y/n] " useip
      case "$useip" in [nN]*) read -r -p "Enter IP: " LAN_IP ;; esac
    else
      read -r -p "Could not auto-detect. Enter your LAN IP: " LAN_IP
    fi
    API_URL="http://${LAN_IP}:8081" ;;
  3)
    while :; do
      read -r -p "Full base URL (no trailing slash, no /api/trpc): " API_URL
      API_URL="${API_URL%/}"
      case "$API_URL" in
        */api/trpc) printf "${R}Remove /api/trpc — the client appends it.${X}\n" ;;
        http*) break ;;
        *) printf "${R}Must start with http:// or https://${X}\n" ;;
      esac
    done ;;
  *) API_URL="http://localhost:8081" ;;
esac
printf "${G}✓ %s${X}  ${D}→ tRPC at %s/api/trpc${X}\n\n" "$API_URL" "$API_URL"

# --- 4. OpenAI key (hidden input) ------------------------------
printf "${B}4/5  OpenAI API key${X}\n"
printf "${D}Optional — press Enter to skip and use demo mode.${X}\n"
printf "${D}Input is hidden. Starts with sk-...${X}\n"
read -r -s -p "> " OPENAI_KEY; printf "\n"
if [ -z "$OPENAI_KEY" ]; then
  printf "${Y}! Skipped — chat will run in demo mode.${X}\n\n"
else
  case "$OPENAI_KEY" in
    sk-*) printf "${G}✓ key accepted (%s chars)${X}\n\n" "${#OPENAI_KEY}" ;;
    *) printf "${Y}! Doesn't start with 'sk-' — saving anyway, verify later.${X}\n\n" ;;
  esac
fi

# --- 5. Model ---------------------------------------------------
printf "${B}5/5  OpenAI model${X}\n"
read -r -p "Model [gpt-4o-mini]: " MODEL
MODEL="${MODEL:-gpt-4o-mini}"
printf "${G}✓ %s${X}\n\n" "$MODEL"

# --- write .env (600 = owner read/write only) ------------------
umask 177
cat > "$ENV_FILE" <<EOF
# Generated by scripts/setup-env.sh on $(date)
# NEVER commit this file. It is git-ignored via .gitignore.

# --- Supabase (required) ---
EXPO_PUBLIC_SUPABASE_URL=$SUPA_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=$SUPA_KEY

# --- API base URL (required) ---
EXPO_PUBLIC_RORK_API_BASE_URL=$API_URL

# --- OpenAI (server-side only — never add EXPO_PUBLIC_ prefix) ---
OPENAI_API_KEY=$OPENAI_KEY
OPENAI_MODEL=$MODEL
OPENAI_BASE_URL=https://api.openai.com/v1
EOF
chmod 600 "$ENV_FILE"

printf "${G}${B}Wrote .env${X} ${D}(permissions 600 — owner only)${X}\n"

# --- safety re-check -------------------------------------------
if git check-ignore -q "$ENV_FILE" 2>/dev/null; then
  printf "${G}✓ .env is git-ignored — safe from commits${X}\n"
else
  printf "${R}✗ WARNING: .env is NOT git-ignored! Add '.env' to .gitignore.${X}\n"
fi

printf "\n${B}Next:${X}\n"
printf "  1. ${B}node scripts/check-env.js${X}   ${D}verify everything works${X}\n"
printf "  2. ${B}npm start${X}                   ${D}full restart (env is build-time)${X}\n\n"
