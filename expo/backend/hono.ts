import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

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

export default app;
