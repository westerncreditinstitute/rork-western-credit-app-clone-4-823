# Railway Deployment

How this app is served on Railway, and the two settings that must be right for
it to work.

## The one thing to understand

Rork served the website and the API from a single origin: the Expo web bundle
at `/`, and the Hono API mounted under `/api`. The app was built on that
assumption, which is why it only ever needs one base URL and why
`backend/hono.ts` contains no static-file handling.

Railway does not do this for you. Something has to serve both halves on one
port, and that something is `expo/scripts/serve-production.ts`:

- `/api/*`, `/trpc/*`, `/system-status` are handed to the same Hono app used
  everywhere else.
- Everything else is served from the `expo export` output in `expo/dist`, with
  SPA history fallback so deep links like `/my-agent` survive a hard refresh.

Because both halves share one origin, requests from the deployed site are
same-origin and **CORS is not involved at all**. Other origins (local Metro on
`:8081`, Expo Go) still work, because `backend/hono.ts` applies `cors()` to
every route it owns.

## Required service variables

Set these on the Railway **service** (not just the environment), then redeploy.

| Variable | Value | Why |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Client + server Supabase access |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable key | Client + server Supabase access |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret | Server-side writes that bypass RLS |

Do **not** set `EXPO_PUBLIC_RORK_API_BASE_URL`. Leaving it empty makes the web
build call its own origin, which is exactly what is wanted now that the site
and the API are served together. Pointing it at the Railway URL from the
Railway URL only adds a pointless cross-origin hop.

Do **not** set `PORT` by hand. Railway injects it, and
`serve-production.ts` binds to `process.env.PORT` on `0.0.0.0`.

### `EXPO_PUBLIC_*` variables are baked in at BUILD time

This is the part that causes the most confusion. Anything prefixed
`EXPO_PUBLIC_` is substituted into the JavaScript bundle when
`expo export` runs — it is **not** read at runtime by the browser.

So if these variables were missing (or were added after the last deploy), the
deployed site keeps reporting:

> This build has no Supabase credentials, so your agent can't be looked up.

…even though the variables are now visibly set in the Railway dashboard. The
values only take effect in a build that ran **after** they existed. Adding a
variable and merely restarting is not enough — **redeploy** so the bundle is
rebuilt.

## Build and start commands

Committed in `railway.json` at the repo root, so Railway picks them up
automatically. The repo is a monorepo (`rork.json` defines `expo/` and
`ios-western-credit-institute/`) with no root `package.json`, hence the
`cd expo`:

```
build:  cd expo && npm install --legacy-peer-deps --include=dev && npx expo export --platform web --output-dir dist
start:  cd expo && npx tsx scripts/serve-production.ts
```

Notes on the specifics, each of which was a real failure:

- `--legacy-peer-deps` is required; a plain `npm install` fails with
  `ERESOLVE`.
- `npm install`, not `npm ci` — the repo has no `package-lock.json`, and
  `npm ci` requires one.
- `--include=dev` because Railway sets `NODE_ENV=production`, which otherwise
  skips the dev dependencies the Expo build itself needs.
- `healthcheckPath` is `/api/system-status`, which returns JSON. Pointing a
  health check at `/` would pass on the SPA shell even when the API is broken —
  the exact failure this deployment had.

If the Railway dashboard has **Build Command** or **Start Command** filled in
under Settings, those override `railway.json`. Clear them so the committed
config is authoritative, or set them to the two commands above verbatim.

## Verifying a deploy

```bash
# Must be JSON. If it returns HTML, the API is not mounted.
curl https://<your-app>.up.railway.app/api/system-status

# Must be JSON {"status":"ok","message":"API is running"}
curl https://<your-app>.up.railway.app/api

# Must be the app shell, not a 404
curl -I https://<your-app>.up.railway.app/my-agent
```

In `/api/system-status`, check `supabase.keyType`:

- `configured` — service-role key works end to end.
- `not_set` — `SUPABASE_SERVICE_ROLE_KEY` is missing; writes fall back to the
  anon client.
- `wrong_key_anon` — the anon key was pasted into the service-role variable.

## Local development

Two options.

Single origin, mirroring production:

```bash
cd expo
npm run build:web
npm run serve:production      # site + API on http://localhost:3000
```

Metro with hot reload plus a separate API process:

```bash
cd expo
npm run backend               # API on http://localhost:3000
npx expo start                # Metro on http://localhost:8081
```

For the second option, `expo/.env` needs:

```
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:3000
```

This is the one case where the base URL should be set, because Metro and the
API genuinely are on different origins. `cors()` in `backend/hono.ts` covers
it. Remember that `expo/.env` is gitignored and never reaches Railway — use
service variables there.
