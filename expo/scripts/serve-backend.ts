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

// MUST be first: installs globalThis.WebSocket before Supabase is evaluated.
// (Import order matters here — see scripts/ws-polyfill.ts for why.)
import "./ws-polyfill";

import { serve } from "@hono/node-server";

import app from "../backend/hono";

const port = Number(process.env.BACKEND_PORT ?? 3000);

serve({ fetch: app.fetch, port }, (info) => {
  const url = `http://localhost:${info.port}`;
  console.log("");
  console.log("  Western Credit backend is running");
  console.log(`     ${url}`);
  console.log("");
  console.log("  Check it:");
  console.log(`     curl ${url}/api/system-status`);
  console.log("");
  console.log("  Your .env should contain:");
  console.log(`     EXPO_PUBLIC_RORK_API_BASE_URL=${url}`);
  console.log("");
  console.log("  Press Ctrl+C to stop.");
  console.log("");
});
