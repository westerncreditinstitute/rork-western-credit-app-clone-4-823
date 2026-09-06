/**
 * Bootstrap for the local backend server.
 *
 * This module MUST be imported before `backend/hono.ts` (and therefore before
 * anything that touches Supabase). It exists as a separate file on purpose:
 * ES `import` statements are hoisted, so any setup written inline inside
 * serve-backend.ts would run AFTER the Hono app had already been evaluated —
 * far too late to matter.
 *
 * It does two things Rork's cloud runner did for us automatically:
 *
 *   1. Loads .env into process.env.
 *      Expo/Metro reads .env by itself, but plain Node does not. Without this
 *      the backend silently boots in "demo mode" with urlConfigured:false and
 *      every database write fails in a confusing way.
 *
 *   2. Installs a global WebSocket.
 *      Node 20 has no global WebSocket, and @supabase/realtime-js constructs a
 *      RealtimeClient during createClient(), which throws on startup.
 *      (Node 22+ has it natively; this is a no-op there.)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import WebSocket from "ws";

// --- 1. Load .env from the project root (one level up from scripts/) --------
const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, "..", ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn(
    `[bootstrap] No .env found at ${envPath}\n` +
      `            The backend will start in demo mode.\n` +
      `            Run: bash scripts/setup-env.sh`,
  );
}

// --- 2. WebSocket polyfill for Node 20 -------------------------------------
if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}
