import { trpcServer } from "@hono/trpc-server";
import { Hono, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { getSystemStatus } from "./system-status";

const app = new Hono();

app.use("*", cors());
app.use("*", async (c, next) => {
  console.log("[Hono] Incoming request:", c.req.method, c.req.url);
  console.log("[Hono] Authorization header:", c.req.header("authorization") ? "PRESENT" : "MISSING");
  await next();
});

/**
 * The endpoint prefix tRPC must strip off, derived from the *raw* request URL.
 *
 * `endpoint` cannot be hardcoded per mount. The edge proxy rewrites the path it
 * routes on (dropping `/api`) while `c.req.raw.url` keeps the original
 * `/api/trpc/...`. tRPC resolves procedures against the raw URL, so a mount
 * declared as `endpoint: "/trpc"` sliced only 5 characters off
 * `/api/trpc/users.login` and looked up the procedure `trpc/users.login`,
 * which does not exist — every call failed with "No procedure found on path".
 *
 * Taking the prefix from the raw path itself is correct under any proxy
 * behaviour: with or without `/api`, and under any additional base path.
 */
function resolveTrpcEndpoint(rawUrl: string): string {
  try {
    const { pathname } = new URL(rawUrl);
    const match = pathname.match(/^(.*\/trpc)(?=\/|$)/);
    if (match?.[1]) return match[1];
  } catch {
    // Malformed URL - fall back to the canonical mount below.
  }
  return "/api/trpc";
}

const trpcHandler: MiddlewareHandler = async (c, next) => {
  const endpoint = resolveTrpcEndpoint(c.req.raw.url);
  return trpcServer({
    endpoint,
    router: appRouter,
    createContext,
  })(c, next);
};

// The app calls `{API_BASE_URL}/api/trpc/*`. Depending on how traffic reaches
// this server (the edge proxy may or may not strip the `/api` prefix) the path
// can arrive as `/api/trpc/*` or `/trpc/*`, so both mounts are registered.
app.use("/api/trpc/*", trpcHandler);
app.use("/trpc/*", trpcHandler);

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
