/**
 * Production server (Railway / any Node host).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * On Rork's hosted infrastructure a single origin served two things at once:
 * the Expo web bundle AND the Hono API mounted under `/api`. That is why the
 * app only ever needed one base URL and why `backend/hono.ts` has no static
 * file handling of its own.
 *
 * Moving to Railway broke that pairing. `scripts/serve-backend.ts` serves the
 * API *only*, and the Expo web export serves the site *only*, so whichever one
 * Railway happened to start, the other was missing:
 *
 *   - Starting the web export meant `/api/trpc/*` fell through to the SPA's
 *     `index.html`. Every tRPC call received HTML where it expected JSON, and
 *     the browser reported it as a CORS failure (an HTML error page carries no
 *     `Access-Control-Allow-Origin` header). On the phone the same failure
 *     showed up as "Loading Your Agent..." spinning forever, because
 *     `aiAgents.getMyAgent` never resolved.
 *   - Starting the API alone would have served JSON at `/` and no website.
 *
 * This server restores the single-origin model: API routes are matched first
 * and handed to the exact same Hono app used everywhere else, and everything
 * else falls through to the static web export with SPA history fallback.
 *
 * Because both halves share one origin, browser requests from the deployed
 * site are same-origin and CORS stops being involved at all. Requests from a
 * different origin (local Metro on :8081, Expo Go on a phone) still work,
 * since `backend/hono.ts` applies `cors()` to every route it handles.
 *
 * USAGE
 * -----
 *   npx expo export --platform web        # build the site into ./dist
 *   npx tsx scripts/serve-production.ts   # serve site + API on $PORT
 */

// MUST be the first import: loads .env and installs globalThis.WebSocket
// before Supabase is evaluated. (Import order matters - see scripts/bootstrap.ts.)
import "./bootstrap";

import fs from "node:fs";
import path from "node:path";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

import apiApp from "../backend/hono";

/**
 * Railway (and most Node hosts) inject the port to bind to via process.env.PORT.
 * Binding to anything else means the platform's health check never connects and
 * the deployment is dropped, which is why BACKEND_PORT alone was not enough.
 */
const port = Number(process.env.PORT ?? process.env.BACKEND_PORT ?? 3000);

/** Directory holding the `expo export --platform web` output. */
const webDir = process.env.WEB_BUILD_DIR ?? "dist";
const webDirAbs = path.resolve(process.cwd(), webDir);
const indexHtmlPath = path.join(webDirAbs, "index.html");
const hasWebBuild = fs.existsSync(indexHtmlPath);

/**
 * Path prefixes owned by the API. Everything here is delegated to
 * `backend/hono.ts`; everything else is treated as part of the website.
 *
 * `/trpc` and `/system-status` are listed alongside their `/api` forms because
 * `backend/hono.ts` deliberately dual-mounts both - some proxies strip the
 * `/api` prefix before the request arrives, and the app must work either way.
 */
const API_PREFIXES = ["/api", "/trpc", "/system-status"] as const;

function isApiPath(pathname: string): boolean {
  return API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const app = new Hono();

/**
 * API delegation. Registered before any static handling so a route such as
 * `/api/trpc/aiAgents.getMyAgent` can never be answered with `index.html`.
 */
app.all("*", async (c, next) => {
  const { pathname } = new URL(c.req.url);
  if (!isApiPath(pathname)) return next();

  /**
   * `lib/trpc.ts` probes reachability with a bare `GET /api` (no trailing
   * slash). Under Rork's proxy that arrived at the Hono app as `/`, which
   * `backend/hono.ts` answers with `{status:"ok"}`. No proxy strips the prefix
   * here, so the rewrite is done explicitly - otherwise the health probe 404s
   * and the app reports itself offline while the API is perfectly healthy.
   */
  if (pathname === "/api" || pathname === "/api/") {
    const rootUrl = new URL(c.req.url);
    rootUrl.pathname = "/";
    return apiApp.fetch(new Request(rootUrl, c.req.raw), c.env);
  }

  return apiApp.fetch(c.req.raw, c.env);
});

if (hasWebBuild) {
  // Static assets (JS bundles, fonts, images) straight from the export.
  app.use("*", serveStatic({ root: `./${webDir}` }));

  /**
   * SPA history fallback. Expo Router owns client-side routing, so a hard load
   * or refresh of a deep link like `/my-agent` must still be answered with the
   * app shell rather than a 404 - this is what made the Railway URL for
   * `/my-agent` unreachable directly.
   *
   * API paths are excluded: a genuinely missing endpoint must stay a JSON 404
   * instead of silently returning HTML, which is the failure mode that
   * produced "JSON Parse error: Unexpected character: <".
   */
  app.notFound((c) => {
    const { pathname } = new URL(c.req.url);
    if (isApiPath(pathname)) {
      return c.json({ error: "Not found", path: pathname }, 404);
    }
    return c.html(fs.readFileSync(indexHtmlPath, "utf8"));
  });
} else {
  // No web build present: still serve the API, but make the cause obvious
  // rather than returning a bare 404 for the site.
  app.notFound((c) => {
    const { pathname } = new URL(c.req.url);
    if (isApiPath(pathname)) {
      return c.json({ error: "Not found", path: pathname }, 404);
    }
    return c.json(
      {
        error: "Web build missing",
        detail: `No index.html found in ${webDirAbs}.`,
        fix: "Run `npx expo export --platform web` during the build step.",
      },
      503,
    );
  });
}

const mark = (ok: boolean) => (ok ? "yes" : "NO");
const hasUrl = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
);
const hasAnon = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
);
const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log("");
  console.log("  Western Credit production server");
  console.log(`     listening on 0.0.0.0:${info.port}`);
  console.log("");
  console.log(`  Web build ................ ${mark(hasWebBuild)} (${webDir})`);
  console.log(`  Supabase URL ............. ${mark(hasUrl)}`);
  console.log(`  Supabase anon key ........ ${mark(hasAnon)}`);
  console.log(`  Service role key ......... ${mark(hasService)}`);
  console.log("");

  if (!hasWebBuild) {
    console.log("  WARNING: serving API only - the web export is missing.");
    console.log("           Build it with: npx expo export --platform web");
    console.log("");
  }

  /**
   * The client bundle reads EXPO_PUBLIC_* at BUILD time, not at runtime, so a
   * server that has these set proves nothing about the site it is serving. If
   * they were absent when `expo export` ran, the deployed site still shows
   * "This build has no Supabase credentials" no matter what is set here.
   */
  if (!hasUrl || !hasAnon) {
    console.log("  WARNING: Supabase credentials are not set on this server.");
    console.log("           Set EXPO_PUBLIC_SUPABASE_URL and");
    console.log("           EXPO_PUBLIC_SUPABASE_ANON_KEY as service variables,");
    console.log("           then REDEPLOY so the web bundle is rebuilt with them.");
    console.log("");
  }

  console.log("  Verify:");
  console.log(`     curl http://localhost:${info.port}/api/system-status`);
  console.log("");
});
