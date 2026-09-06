# Local Development Setup — Build Without Rork

*September 6, 2026 · for the Western Credit Institute app*
*Goal: run the full stack (app + backend + Supabase) on your own machine so development is immune to the Rork/Freestyle outage. Everything below runs locally; zero Rork VMs are consumed.*

> **Companion docs:** `SUPABASE_DEPLOYMENT_GUIDE.md` (deeper background on each env var) and the alternatives analysis in this repo's docs. This file is the quick-start path.

---

## The one-command path (start here)

If you would rather not follow fifteen manual steps, this single command does **all** of section 0–2 for you: it checks your prerequisites, downloads the project, installs every package with the correct flags, adds the backend tooling, and then walks you through your Supabase keys.

Open **Terminal** (Applications → Utilities → Terminal, or press `⌘ + Space` and type `Terminal`), paste this one line, and press Return:

```bash
curl -fsSL https://raw.githubusercontent.com/westerncreditinstitute/rork-western-credit-app-clone-4-823/main/expo/scripts/quickstart.sh | bash
```

It is safe to re-run at any time — it never overwrites an existing `.env`, and on a second run it just updates the code. If it stops, it prints the exact reason and the exact command to fix it.

When it finishes, running the app takes **two Terminal windows** (open the second with `⌘N`):

```bash
# Window 1 — the API (leave it running)
cd ~/Documents/rork-western-credit-app-clone-4-823/expo
npm run backend            # → http://localhost:3000

# Window 2 — the app
cd ~/Documents/rork-western-credit-app-clone-4-823/expo
npx expo start             # → then press w for web, or i for iOS Simulator
```

**Why two windows?** Rork ran two programs for you inside one cloud machine behind one URL: Metro (the app bundler) and the Hono API server. Locally they are two separate processes on two ports — `npx expo start` runs Metro on **8081**, and `npm run backend` runs the API on **3000**. Metro does not know how to serve `backend/hono.ts`, so if you skip the backend window every data-loading screen fails. This is the single most common local-setup mistake.

The rest of this document explains the same steps manually, plus troubleshooting.

---

## 0. What you need before starting (10 minutes, one-time)

**The only application you type commands into is Terminal** — already on your Mac (Applications → Utilities → Terminal, or press `⌘ + Space` and type `Terminal`). Windows: PowerShell or Git Bash. Everything else installs through it or via normal installer packages.

Install two things first (one-time):

| Need | How to install it |
|---|---|
| **Node.js 20+** (includes `npm`) | Go to https://nodejs.org → click the green **LTS** button → open the downloaded `.pkg` (Windows: `.msi`) → click through the installer |
| **Git** | Mac: run `xcode-select --install` in Terminal → click **Install** in the popup. Windows: download from https://git-scm.com and run the installer |

Have these values ready too (credentials, not installs):

| Value | Where to find it |
|---|---|
| Supabase **Project URL** + **anon key** | Supabase dashboard → ⚙ Project Settings → API |
| Supabase **service_role key** | Same page — root-password equivalent, treat carefully |
| OpenAI API key (optional) | https://platform.openai.com/api-keys — without it My Agent runs in demo mode |
| Xcode (iOS Simulator) or Chrome (web) | Xcode from the Mac App Store — only needed for the iOS Simulator; web testing needs nothing |

Everything else (the ~70 project packages) installs with one command in step 1.

---

## 1. Clone and install (10 minutes)

**1a. Open Terminal** (Applications → Utilities → Terminal). Everything below happens in this one window.

**1b. Verify the installs worked** — type each line, press Return after each; each should print a version number:

```bash
node -v
npm -v
git --version
```

If any line prints `command not found`, that installer didn't finish — re-run it before continuing.

**1c. Choose a home for the project** — this example uses your Documents folder:

```bash
cd ~/Documents
```

**1d. Download the repository (clone):**

```bash
git clone https://github.com/westerncreditinstitute/rork-western-credit-app-clone-4-823.git
```

Progress bars ending in `Resolving deltas: 100%` mean success. The repo is **public**, so no login or password is needed.

**1e. Enter the project folder** — note the app lives one level down, inside `expo/`:

```bash
cd rork-western-credit-app-clone-4-823/expo
```

**1f. Install the project's ~70 packages** — the flag is required, not optional:

```bash
npm install --legacy-peer-deps
```

Takes a few minutes (a wall of package names is normal). Success looks like `added 1045 packages in 47s`.

> **Why `--legacy-peer-deps`?** Plain `npm install` **fails** on this project with a red `ERESOLVE could not resolve` block. `lucide-react-native` (the icon set) declares it supports React 18 or lower, while this app runs React 19 via Expo 54. The icons work fine with React 19 — the package's metadata simply hasn't been updated. The flag tells npm to proceed instead of refusing. If you already hit that error, just re-run the command above.

**1g. Add the backend tooling** (four small packages that let the API run outside Rork's cloud):

```bash
npm install --legacy-peer-deps --save-dev @hono/node-server tsx ws @types/ws dotenv
```

**Done?** Your prompt should look like `… rork-western-credit-app-clone-4-823/expo %`. Stay in this Terminal window — step 2 continues here.

> The project historically used `bun`, but `npm install --legacy-peer-deps` works identically here — same manifest, full node_modules. If you prefer bun: `brew install bun`, then `bun install`.

## 2. Configure environment (5 minutes)

**Option 1 — Interactive (recommended):**

```bash
bash scripts/setup-env.sh
```

Prompts for **six values** with hidden input (nothing saved to shell history): Supabase URL, anon key, **service_role key** (required — it verifies the JWT's role is actually `service_role` and rejects the anon key if you paste that here by mistake), the API base URL (port 3000, with your LAN IP auto-detected), OpenAI key, and model. Writes `.env` with `600` permissions.

> ⚠️ **Re-running with an existing `.env`:** it will ask to overwrite and make a timestamped backup first. If your current `.env` already works except for one missing value, it's simpler to edit it directly — see the manual option below.

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
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:3000

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
| iOS Simulator / Android Emulator / browser on this machine | `http://localhost:3000` |
| Physical iPhone/Android on your Wi-Fi | `http://<LAN-IP>:3000` — find it with `ipconfig getifaddr en0` (Mac) or `hostname -I` (Linux) |
| Eventually back on Rork | Rork injects it at build time — just don't set it in Rork's Secrets |

> ⚠️ **No trailing slash, no `/api/trpc`.** The tRPC client appends those itself. `http://localhost:3000/` and `http://localhost:3000/api/trpc` both break.

## 3. Verify configuration (1 minute)

```bash
node scripts/check-env.js
```

A healthy run ends with `All checks passed. You're ready to run the app.` — it live-tests Supabase (all 5 tables: `users`, `disputes`, `ai_agent_pool`, `user_agent_assignments`, `agent_chat_messages`, plus the 10,000-agent seed) and, if present, your OpenAI key. Secrets are masked in the output.

## 4. Run the full stack (2 minutes)

Local development needs **two Terminal windows**, because the app and the API are two separate programs. On Rork they ran side by side inside one cloud machine behind one URL, which is why it felt like a single service. Locally you start each one yourself.

**Window 1 — the API server (start this first, leave it running):**

```bash
npm run backend
```

Serves the Hono/tRPC backend on **http://localhost:3000**. On startup it prints exactly which credentials it loaded:

```
  Western Credit backend is running
     http://localhost:3000

  Environment loaded from .env:
     Supabase URL ......... yes
     Supabase anon key .... yes
     Service role key ..... yes
```

If any line says `NO`, your `.env` is incomplete — run `bash scripts/setup-env.sh` again. All backend logs print in this window, including `[Supabase Admin]` warnings.

**Window 2 — the app (open with `⌘N`, then `cd` back into the project):**

```bash
npx expo start
```

Starts Metro (the bundler) on **8081**, then press `w` for web or `i` for the iOS Simulator.

> **Why the API isn't on 8081 too:** Metro only bundles and serves your app's JavaScript. Nothing in this repo tells Metro about `backend/hono.ts` — on Rork, *their* platform runner imported and served it for you. Locally, if you request `/api/trpc` on port 8081 you get the app's HTML page back instead of JSON, and every data screen fails with a confusing parse error. That is why `.env` must point at **port 3000**, and why `npm run backend` must be running.

> **Build-time rule:** env vars are baked at build time. After editing `.env`, fully stop **both** windows (Ctrl+C) and restart — hot reload will not pick them up. If values seem stale: `npx expo start --clear`.

## 4b. Load the app (pick your surface)

| Surface | How |
|---|---|
| **iOS Simulator** | Press `i` in the Metro window (needs Xcode). `localhost` works — the simulator shares your machine's loopback. |
| **Android Emulator** | Press `a` (needs Android Studio). `localhost` works — Expo handles the emulator aliasing. |
| **Web browser** | Press `w`, or `npm run start-web`. Chrome on the same machine — `localhost:8081` as-is. |
| **Physical phone** | Scan the QR code with the Camera app → opens **Expo Go**. ⚠️ Requires `EXPO_PUBLIC_RORK_API_BASE_URL` set to your **LAN IP with the backend port** (`http://192.168.x.x:3000`), not `localhost` — a phone cannot see your machine's loopback. Same Wi-Fi network as the computer. |

## 4c. First-run health check (2 minutes)

With **both** windows running, open a third terminal:

```bash
curl http://localhost:3000/api/system-status
```

Expect `"status":"ok"`, `"service":"western-credit-api"`, and `"keyType":"configured"` (your service-role key accepted by Supabase — already proven working by the Sep 4 probe). Then open the app → **More** tab → **My Agent**: the agent pool should load and chat should respond (real AI with your OpenAI key; keyword-matched demo replies without).

> If `keyType` isn't `configured`, run `node scripts/check-env.js` — it pinpoints which value is wrong.
> If `curl` says `Connection refused`, Window 1 isn't running — that is the fix 90% of the time.

## 5. Day-to-day loop

**Morning:** open two windows — `npm run backend` in the first, `npx expo start` in the second → press `i` / `a` / `w` → build features.

**Evening:** Ctrl+C in both windows. Commit and push as usual — `.env` is git-ignored (`.gitignore` line 43), so secrets never land in the repo.

**Backend changes** (`backend/`): the backend window does **not** hot-reload. After editing anything under `backend/`, press Ctrl+C in Window 1 and re-run `npm run backend`. App changes under `app/`, `components/`, etc. still hot-reload normally through Metro. Env-var edits require restarting both.

**Logs:** split across the two windows — backend/Supabase/tRPC logs in Window 1, app and `[WCI-CONFIG]` output in Window 2. Locally you see everything Rork hides.

**Rork in parallel (optional):** when Rork recovers you can still use its preview — just leave `EXPO_PUBLIC_RORK_API_BASE_URL` unset in Rork's Secrets so Rork injects its own value there. Your local `.env` only affects local runs.

## 5b. Supabase migrations status

Migrations 019–021 (base schema, agent pool, agent chat) are already applied and seeded — `check-env.js` verifies all 5 tables. **Migration 025** (`migrations/025_lock_down_agent_rls.sql`) has been **applied** (confirmed Sep 6) — it dropped the permissive write policies from 024, so writes now depend on the service-role key being correct. The remaining verification is to test My Agent locally and confirm the lockdown didn't break agent chat.

## 5c. Real device builds later (EAS — when you approach production)

When you need real binaries: `npm i -g eas-cli`, `eas login`, `eas build --platform ios`. EAS is Expo's official build service (free tier, queue-based). Fully independent of Rork. This can wait until you're shipping.

## 6. Troubleshooting quick table

| Symptom | Cause → Fix |
|---|---|
| `npm install` fails with a red `ERESOLVE` block | Peer-dependency conflict (`lucide-react-native` wants React ≤18, project uses React 19) → re-run as `npm install --legacy-peer-deps` |
| `Unable to resolve ... @rork-ai/toolkit-sdk` | `npm install` not run or node_modules incomplete → rerun `npm install --legacy-peer-deps` |
| **App loads but every data screen is empty / network calls fail** | **Window 1 isn't running — the backend must be started separately → run `npm run backend`, confirm `curl http://localhost:3000/api/system-status` returns JSON** |
| `/api/trpc` returns HTML instead of JSON | `.env` points at Metro (8081) instead of the backend → set `EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:3000`, restart both windows |
| Backend prints `Supabase URL ... NO` | `.env` missing or in the wrong folder (must be in `expo/`) → run `bash scripts/setup-env.sh` |
| `Cannot find module ... serve-backend.ts` | Backend tooling step skipped → `npm install --legacy-peer-deps --save-dev @hono/node-server tsx ws @types/ws dotenv` |
| `EADDRINUSE: port 3000` | A backend is already running → reuse that window, or `BACKEND_PORT=3001 npm run backend` (then update `.env` to match) |
| `keyType` not `configured` in system-status | Wrong `SUPABASE_SERVICE_ROLE_KEY` → `node scripts/check-env.js` pinpoints it |
| Phone can't connect | `localhost` used on a physical device → switch to LAN IP, restart, same Wi-Fi |
| tRPC calls hit a `...rorktest.dev` URL | Stale bundle still pointing at Rork → check the `[WCI-CONFIG]` line, confirm local `.env`, restart with `--clear` |
| `npx expo start` fails with transformer errors | Delete `node_modules` and run `npm install --legacy-peer-deps` fresh |

## 7. What changes vs. what stays the same

**Unchanged:** your repo (same code, same commits), Supabase (data, RLS, migrations), GitHub history, all docs, all feature work. Local dev just points the app at your machine instead of Rork's VM.

**Changed:** where Metro + backend run (your machine), where you see logs (terminal — everything visible), the restart rule for `.env` edits (always restart), and phone testing via Expo Go instead of the Rork preview app.

**Cost:** $0 additional — no Rork VMs, no EAS credits, no new accounts.

---

*Verified facts in this guide: variable names and sources (`.env.example`, `SUPABASE_DEPLOYMENT_GUIDE.md` Step A2), LAN-IP guidance (guide lines 650–656), check-env tooling and output (scripts/check-env.js, Step A3), the two-process local run model (verified Sep 6 by running `npm run backend` and `npx expo start` from a clean clone and curling both ports), build-time env rule (Step A4, metro.config.js), `rork` CLI v1.0.1 on public npm (verified Sep 6), withRorkMetro is local polyfills only (source read Sep 6), service-role key verified working via the Sep 4 probe. QR/Expo-Go and npm-install steps are standard Expo behavior.*
