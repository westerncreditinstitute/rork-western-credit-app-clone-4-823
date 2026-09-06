# Local Development Setup — Build Without Rork

*September 6, 2026 · for the Western Credit Institute app*
*Goal: run the full stack (app + backend + Supabase) on your own machine so development is immune to the Rork/Freestyle outage. Everything below runs locally; zero Rork VMs are consumed.*

> **Companion docs:** `SUPABASE_DEPLOYMENT_GUIDE.md` (deeper background on each env var) and the alternatives analysis in this repo's docs. This file is the quick-start path.

---

## 0. What you need before starting (5 minutes)

| Need | Where to get it |
|---|---|
| Node.js 20+ | https://nodejs.org (or `brew install node`) |
| Git | You already have it |
| Supabase **Project URL** + **anon key** | Supabase dashboard → ⚙ Project Settings → API |
| Supabase **service_role key** | Same page — root-password equivalent, treat carefully |
| OpenAI API key (optional) | https://platform.openai.com/api-keys — without it My Agent runs in demo mode |
| Xcode (iOS Simulator) or Chrome (web) | Xcode from the Mac App Store; web needs nothing |

Everything else installs with the project (`npm install`).

---

## 1. Clone and install (5 minutes)

```bash
git clone https://github.com/westerncreditinstitute/rork-western-credit-app-clone-4-823.git
cd rork-western-credit-app-clone-4-823/expo
npm install
```

> The project historically used `bun`, but `npm install` works identically here — same manifest, full node_modules. If you prefer bun: `brew install bun`, then `bun install`.

## 2. Configure environment (5 minutes)

**Option 1 — Interactive (recommended):**

```bash
bash scripts/setup-env.sh
```

Prompts for each value with hidden input (nothing saved to shell history), auto-detects your LAN IP, rejects a `service_role` key pasted where the anon key belongs, and writes `.env` with `600` permissions.

**Option 2 — Manual:**

```bash
cp .env.example .env
```

Then edit `.env` to contain exactly these lines (names must match character-for-character):

```bash
# --- Supabase (REQUIRED) ---
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# --- API base URL (REQUIRED — how the app reaches your local backend) ---
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:8081

# --- OpenAI (optional — demo mode without it) ---
OPENAI_API_KEY=sk-proj-your-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

**Where each value comes from:**

| Variable | Where to find it |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase dashboard → ⚙ Project Settings → API → **Project URL** |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same page → **anon / public** key (starts `eyJ…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → `service_role` key — **no `EXPO_PUBLIC_` prefix**, stays server-side |
| `EXPO_PUBLIC_RORK_API_BASE_URL` | Set by you — see the device table below |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |

**Choosing `EXPO_PUBLIC_RORK_API_BASE_URL` by device:**

| How you're testing | Value |
|---|---|
| iOS Simulator / Android Emulator / browser on this machine | `http://localhost:8081` |
| Physical iPhone/Android on your Wi-Fi | `http://<LAN-IP>:8081` — find it with `ipconfig getifaddr en0` (Mac) or `hostname -I` (Linux) |
| Eventually back on Rork | Rork injects it at build time — just don't set it in Rork's Secrets |

> ⚠️ **No trailing slash, no `/api/trpc`.** The tRPC client appends those itself. `http://localhost:8081/` and `http://localhost:8081/api/trpc` both break.

## 3. Verify configuration (1 minute)

```bash
node scripts/check-env.js
```

A healthy run ends with `All checks passed. You're ready to run the app.` — it live-tests Supabase (all 5 tables: `users`, `disputes`, `ai_agent_pool`, `user_agent_assignments`, `agent_chat_messages`, plus the 10,000-agent seed) and, if present, your OpenAI key. Secrets are masked in the output.

## 4. Run the full stack (2 minutes)

**Terminal 1 — one command:**

```bash
npm start
```

That runs `bunx rork start -p ulx77mlx9b7syygnanmal`. If `bun` isn't installed, use either of these instead:

```bash
npx rork start -p ulx77mlx9b7syygnanmal   # rork CLI is on public npm (v1.0.1)
npx expo start                            # pure-Expo path, fully Rork-independent
```

All three start Metro on **8081** and serve your Hono/tRPC backend through it (the backend is mounted inside the Metro dev server via the Rork toolkit's local config in `metro.config.js` — that code is local polyfills only, no cloud dependency). So `http://localhost:8081/api/trpc` and `http://localhost:8081/api/system-status` both answer, and **backend logs print directly in your terminal** — including the `[WCI-CONFIG]` base-URL announcement and any `[Supabase Admin]` warnings. No hidden log panel; you see everything.

> **Build-time rule:** env vars are baked at build time. After editing `.env`, fully stop (Ctrl+C) and restart — hot reload will not pick them up. If values seem stale: `npx expo start --clear`.

## 4b. Load the app (pick your surface)

| Surface | How |
|---|---|
| **iOS Simulator** | Press `i` in the Expo terminal (needs Xcode). `localhost` works — the simulator shares your machine's loopback. |
| **Android Emulator** | Press `a` (needs Android Studio). `localhost` works — Expo handles the emulator aliasing. |
| **Web browser** | Press `w`, or `npm run start-web`. Chrome on the same machine — `localhost:8081` as-is. |
| **Physical phone** | Scan the terminal QR code with the Camera app → opens **Expo Go**. ⚠️ Requires `EXPO_PUBLIC_RORK_API_BASE_URL` set to your **LAN IP** (`http://192.168.x.x:8081`), not `localhost` — a phone cannot see your machine's loopback. Same Wi-Fi network as the computer. |

## 4c. First-run health check (2 minutes)

With the stack running, in a second terminal:

```bash
curl http://localhost:8081/api/system-status
```

Expect `"status":"ok"`, `"service":"western-credit-api"`, and `"keyType":"configured"` (your service-role key accepted by Supabase — already proven working by the Sep 4 probe). Then open the app → **More** tab → **My Agent**: the agent pool should load and chat should respond (real AI with your OpenAI key; keyword-matched demo replies without).

> If `keyType` isn't `configured`, run `node scripts/check-env.js` — it pinpoints which value is wrong.

## 5. Day-to-day loop

**Morning:** `npm start` (or `npx expo start`) → press `i` / `a` / `w` → build features.

**Evening:** Ctrl+C to stop. Commit and push as usual — `.env` is git-ignored (`.gitignore` line 43), so secrets never land in the repo.

**Backend changes** (`backend/`): picked up on save through Metro. If a change doesn't appear, restart the dev server. Env-var edits always require a restart.

**Logs:** everything prints in your terminal — the `[Supabase Admin]` warning, tRPC warm-up, the `[WCI-CONFIG]` line. Locally you can see everything Rork hides.

**Rork in parallel (optional):** when Rork recovers you can still use its preview — just leave `EXPO_PUBLIC_RORK_API_BASE_URL` unset in Rork's Secrets so Rork injects its own value there. Your local `.env` only affects local runs.

## 5b. Supabase migrations status

Migrations 019–021 (base schema, agent pool, agent chat) are already applied and seeded — `check-env.js` verifies all 5 tables. **Migration 025** (`migrations/025_lock_down_agent_rls.sql`) is still pending — it drops the permissive write policies from 024. It only touches Supabase (not Rork), so it's safe to run **now** from the Supabase SQL Editor: open the file, paste, Run. Then test My Agent locally to confirm the lockdown didn't break anything.

## 5c. Real device builds later (EAS — when you approach production)

When you need real binaries: `npm i -g eas-cli`, `eas login`, `eas build --platform ios`. EAS is Expo's official build service (free tier, queue-based). Fully independent of Rork. This can wait until you're shipping.

## 6. Troubleshooting quick table

| Symptom | Cause → Fix |
|---|---|
| `Unable to resolve ... @rork-ai/toolkit-sdk` | `npm install` not run or node_modules incomplete → rerun `npm install` |
| App loads but every network call fails | Wrong/missing `EXPO_PUBLIC_RORK_API_BASE_URL` → check the `[WCI-CONFIG]` line in the terminal, fix, restart |
| `keyType` not `configured` in system-status | Wrong `SUPABASE_SERVICE_ROLE_KEY` → `node scripts/check-env.js` pinpoints it |
| Phone can't connect | `localhost` used on a physical device → switch to LAN IP, restart, same Wi-Fi |
| tRPC calls hit a `...rorktest.dev` URL | Stale bundle still pointing at Rork → check the `[WCI-CONFIG]` line, confirm local `.env`, restart with `--clear` |
| `npx expo start` fails with transformer errors | Delete `node_modules` and `npm install` fresh |

## 7. What changes vs. what stays the same

**Unchanged:** your repo (same code, same commits), Supabase (data, RLS, migrations), GitHub history, all docs, all feature work. Local dev just points the app at your machine instead of Rork's VM.

**Changed:** where Metro + backend run (your machine), where you see logs (terminal — everything visible), the restart rule for `.env` edits (always restart), and phone testing via Expo Go instead of the Rork preview app.

**Cost:** $0 additional — no Rork VMs, no EAS credits, no new accounts.

---

*Verified facts in this guide: variable names and sources (`.env.example`, `SUPABASE_DEPLOYMENT_GUIDE.md` Step A2), LAN-IP guidance (guide lines 650–656), check-env tooling and output (scripts/check-env.js, Step A3), Metro-on-8081 serving + build-time env rule (Step A4, metro.config.js), `rork` CLI v1.0.1 on public npm (verified Sep 6), withRorkMetro is local polyfills only (source read Sep 6), service-role key verified working via the Sep 4 probe. QR/Expo-Go and npm-install steps are standard Expo behavior.*
