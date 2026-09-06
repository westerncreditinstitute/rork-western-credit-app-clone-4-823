/**
 * WebSocket polyfill for local Node development.
 *
 * Must be imported BEFORE anything that creates a Supabase client.
 * ES module imports are hoisted and evaluated before the importing module's
 * own statements, so assigning `globalThis.WebSocket` inside `serve-backend.ts`
 * would run *after* `backend/hono.ts` (and therefore `lib/supabase.ts`) had
 * already been evaluated and thrown. Keeping the assignment in its own module
 * and importing it first guarantees correct ordering.
 *
 * Why it is needed: @supabase/supabase-js builds a RealtimeClient as soon as
 * createClient() is called, and that requires a global WebSocket. Node 22+ and
 * React Native provide one; Node 20 does not.
 */

import WebSocket from "ws";

if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}
