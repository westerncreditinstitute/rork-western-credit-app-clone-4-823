/**
 * Local backend server.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `backend/hono.ts` exports a Hono app but nothing starts it locally. On Rork's
 * hosted infrastructure their platform runner imports that export and serves it
 * alongside Metro, which is why the app works there with a single base URL.
 *
 * Running `expo start` (or `rork start`) locally only starts Metro — the
 * bundler. It serves your app's JavaScript, but it knows nothing about
 * `backend/hono.ts`, so `/api/trpc/*` and `/api/system-status` fall through to
 * Metro and return the app's HTML page instead of JSON. Every tRPC call then
 * fails with a parse/network error.
 *
 * This script closes that gap: it serves the very same Hono app on its own port
 * so local development matches production behaviour. No changes to
 * `backend/hono.ts` are needed — it is imported exactly as-is.
 *
 * USAGE
 * -----
 *   npm run backend          # terminal 2 (Metro runs in terminal 1)
 *
 * Then point the app at it in `.env`:
 *   EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:3000
 *
 * The tRPC client appends `/api/trpc` itself, and `backend/hono.ts` mounts both
 * `/api/trpc/*` and `/api/system-status`, so that base URL is all it needs.
 */

// MUST be the first import: loads .env and installs globalThis.WebSocket
// before Supabase is evaluated. (Import order matters — see scripts/bootstrap.ts.)
import "./bootstrap";

import { serve } from "@hono/node-server";

import app from "../backend/hono";

const port = Number(process.env.BACKEND_PORT ?? 3000);

const hasUrl = Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL);
const hasAnon = Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const mark = (ok: boolean) => (ok ? "yes" : "NO");

serve({ fetch: app.fetch, port }, (info) => {
  const url = `http://localhost:${info.port}`;
  console.log("");
  console.log("  Western Credit backend is running");
  console.log(`     ${url}`);
  console.log("");
  console.log("  Environment loaded from .env:");
  console.log(`     Supabase URL ......... ${mark(hasUrl)}`);
  console.log(`     Supabase anon key .... ${mark(hasAnon)}`);
  console.log(`     Service role key ..... ${mark(hasService)}`);

  if (!hasUrl || !hasAnon) {
    console.log("");
    console.log("  Running in DEMO MODE — the database is not connected.");
    console.log("  Fix it with:  bash scripts/setup-env.sh");
  }

  console.log("");
  console.log("  Check it:");
  console.log(`     curl ${url}/api/system-status`);
  console.log("");
  console.log("  Keep this window open and start the app in a second window:");
  console.log("     npx expo start");
  console.log("");
  console.log("  Press Ctrl+C to stop.");
  console.log("");
});
