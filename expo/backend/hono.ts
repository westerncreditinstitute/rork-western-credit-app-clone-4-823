import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { getSystemStatus } from "./system-status";

const app = new Hono();

app.use("*", cors());

// The app calls `{API_BASE_URL}/api/trpc/*`. Depending on how traffic reaches
// this server (edge proxy may or may not strip the `/api` prefix) the path can
// arrive as `/api/trpc/*` or `/trpc/*`, so both mounts are registered.
// NOTE: `endpoint` must match the mount path exactly — tRPC strips it from the
// request path to resolve procedure names, and a mismatch silently mangles them.
app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext,
  }),
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

// Log-free verification of the Supabase service-role configuration.
// `lib/supabase-admin.ts` warns about a missing key via console.warn at
// startup, but the Rork-hosted backend is serverless with no user-facing log
// viewer — this endpoint surfaces the same information (plus a live probe)
// over plain HTTP so it can be checked from any browser or curl.
// Mounted at both /system-status and /api/system-status because the edge
// proxy may or may not strip the /api prefix (same reason the tRPC routes
// are dual-mounted above).
app.get("/system-status", async (c) => {
  return c.json(await getSystemStatus());
});

app.get("/api/system-status", async (c) => {
  return c.json(await getSystemStatus());
});

export default app;
