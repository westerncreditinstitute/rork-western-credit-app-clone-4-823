# Adding a Supabase Service Role Key

A focused walkthrough for moving the backend off the anon key and onto a
service-role key, then locking down the agent tables.

**Time required:** about 10 minutes, most of it waiting for a redeploy.

For the full context this fits into, see Phase 4 of `SUPABASE_DEPLOYMENT_GUIDE.md`.

---

## Why bother

Migration 024 got the app working again by adding permissive write policies
(`USING true`) to the agent tables. That was the right emergency fix, but it means
**anyone holding the anon key can write to those tables directly** — and the anon
key ships inside the app, where any user can extract it.

A service-role key bypasses Row Level Security entirely. Once the backend uses it,
the permissive policies become unnecessary and can be dropped, which removes direct
write access from every client while the backend keeps working normally.

---

## Before you start: is this safe here?

A service-role key is only safe if the code holding it never reaches a user's device.

```bash
# Should print nothing.
grep -rn "from ['\"]@/backend" app/ components/ contexts/ hooks/ | grep -v "import type"
```

This project passes. The client talks to the backend over HTTP
(`EXPO_PUBLIC_RORK_API_BASE_URL/api/trpc`) and imports only
`import type { AppRouter }`, which vanishes at compile time. Everything under
`backend/` runs server-side.

If you fork this and that grep starts returning results, **stop** — the key would be
bundled into the app.

---

## Step 1 — Copy the key from Supabase

Supabase dashboard → **Project Settings** (gear) → **API** → **Project API keys** →
the key labelled **`service_role`** (also marked `secret`). Reveal and copy it.

It is *not* the `anon` key you already use.

> **Treat it like a root password.** It grants full read/write access to your entire
> database and ignores every RLS policy. Never put it in client code, a screenshot,
> a support ticket, or a commit.

---

## Step 2 — Save it as a server-side secret

Rork → **More → Secrets → Add Secret**:

| Field | Value |
|---|---|
| Name | `SUPABASE_SERVICE_ROLE_KEY` |
| Value | the `service_role` key |
| Visibility | **Server-side only** |

**The visibility setting is the whole security boundary.** Rork publishes anything
named `EXPO_PUBLIC_*` to all users; anything else stays on the server. Same rule that
already protects `OPENAI_API_KEY`.

- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ❌ `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` — this would hand every user full
  database access. Never do this.

For local dev, add the same line to `.env` (git-ignored):

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Don't put a real key in `.env.example` — that file is committed.

---

## Step 3 — Redeploy

Environment variables are read at server start, so a hot reload won't pick this up.
Redeploy, or restart your local dev server.

---

## Step 4 — Verify it actually loaded

`lib/supabase-admin.ts` falls back to the anon client when the key is missing, so
nothing breaks during the transition. That safety net also means a typo fails
quietly — so check.

**Open this URL in a browser** (or curl it), replacing the host with your API base
URL — the same value as `EXPO_PUBLIC_RORK_API_BASE_URL`:

> **Don't know that value?** You never set it — Rork injects it at build time.
> To read it: **More → Secrets** (look for a row named
> `EXPO_PUBLIC_RORK_API_BASE_URL`, possibly marked "Managed by Rork", and press
> the eye button), or after a rebuild open **More → Code → Logs** (bottom
> panel) and find `[tRPC] API base URL: https://…` — the app announces it
> itself. On a local clone it's simply your `.env` value.

```
https://YOUR-API-HOST/api/system-status
```

```bash
curl -s https://YOUR-API-HOST/api/system-status | jq .supabase
```

You want `"keyType": "configured"`:

```json
{
  "urlConfigured": true,
  "serviceRoleConfigured": true,
  "activeClient": "service_role",
  "keyType": "configured",
  "message": "The backend is using the service-role key and Supabase accepted it — writes bypass RLS. It is now safe to run migration 025.",
  "probe": { "client": "service_role", "authenticated": true, "detail": "read ok (ai_agent_pool)" }
}
```

`configured` is the only value that means you're done. It proves two separate
things: the key reached the server **and** Supabase accepted it on a live query.
Every response also carries a plain-English `message` and an `action` telling you
what to do next.

| `keyType` | What happened | Fix |
| --- | --- | --- |
| `configured` | Key loaded and Supabase accepted it | Nothing — proceed to Step 5 |
| `not_set` | Env var empty; backend on the anon fallback | Re-check Step 2, confirm it saved as **server-side**, redeploy |
| `wrong_key_anon` | The **anon** key was pasted in | Copy the `service_role` key instead |
| `wrong_key_publishable` | A `sb_publishable_…` client key was pasted | Copy the `service_role` secret instead |
| `invalid_key` | Truncated paste, or a user auth token | Re-copy the whole key |
| `project_mismatch` | Key is from a different Supabase project | Match the key to `SUPABASE_URL` |
| `key_rejected` | Key looks right but Supabase refused it | JWT secret was rotated — copy the current key |
| `configured_unverified` | Key looks right; couldn't reach Supabase | Retry; check the project isn't paused |

> **Why an endpoint instead of the logs?** `lib/supabase-admin.ts` does log a
> warning at startup, but the Rork-hosted backend is serverless and doesn't
> expose **server-side** logs to you. (Rork's **Logs panel** — **More → Code**,
> bottom panel — shows *app-side* prints only; the `[Supabase Admin]` warning
> never shows there.) The endpoint also catches the one failure logs *cannot*: if you paste the anon key into
> `SUPABASE_SERVICE_ROLE_KEY`, the warning disappears — the key is "set" — while
> RLS still blocks every write. See "Where are my logs?" below.

The response contains only booleans and status codes. It never echoes your key,
project URL, or project ref.

Finally, confirm the feature works end to end: open **My Agent**, load an agent,
send a chat message.

---

## Where are my logs?

Useful to know, but **not** required for the check above.

**Local development** — the terminal running `bun start` (i.e.
`bunx rork start`). Server `console.log`/`console.warn` output appears there,
including the `[Supabase Admin]` warning.

**Rork-hosted backend** — split this in two:

- **App-side logs you CAN see:** open **More → Code** and expand the **Logs
  panel** at the bottom. It captures what the *app* printed while running in
  the preview (`[log]`/`[info]`/`[warn]`/`[error]`/`[debug]` tags, scroll up
  for older lines). Client `console.log`s appear there — e.g. the
  `[tRPC] API base URL: …` line — and the web preview's browser devtools show
  the same.
- **Server-side logs you cannot:** the backend runs as serverless functions
  and Rork does not expose its startup `console.log`/`console.warn` output.
  So the `[Supabase Admin]` warning from `lib/supabase-admin.ts` is unreadable
  in production — that's exactly why `/api/system-status` exists. (Paid plans
  include chat support if you need Rork to inspect something server-side.)

**Supabase side** — the database keeps its own logs, which is where you confirm
*which role* your writes arrive as. Go to **Logs → Log Explorer** in the Supabase
dashboard and run:

```sql
select
  timestamp,
  log_attributes['parsed.user_name'] as db_role,
  log_attributes['parsed.sql_state_code'] as sql_state,
  event_message
from logs
where source = 'postgres_logs'
  and log_attributes['parsed.sql_state_code'] = '42501'
order by timestamp desc
limit 100;
```

SQLSTATE `42501` is "permission denied" — an RLS refusal. After the service-role
key is working, backend writes should stop producing `42501` rows, and `db_role`
should read `service_role` rather than `anon`. (Log Explorer runs ClickHouse SQL:
use `count()` rather than `count(*)`, and avoid `select *`.)

---

## Step 5 — Lock the tables down

**Only after Step 4 passes**, run `migrations/025_lock_down_agent_rls.sql` in the
Supabase SQL Editor. It drops the permissive write policies from migration 024.

Verify — every row should say `SELECT`:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_agent_assignments', 'agent_chat_messages', 'credit_report_analyses')
ORDER BY tablename, cmd;
```

Then reopen My Agent and send one more message.

**`SELECT` policies stay on purpose.** Supabase Realtime delivers chat messages using
the anon key and reads through RLS, so dropping the `SELECT` policy on
`agent_chat_messages` would silently kill live chat.

---

## If something breaks

Migrations 024 and 025 are exact opposites, and both are safe to re-run.

| Symptom | Cause | Fix |
|---|---|---|
| "No agent found" returns after running 025 | Backend still on the anon key | Re-run `024` to restore writes, then redo Step 4 |
| "Database Permissions Blocked" mentioning a service-role key | `SUPABASE_SERVICE_ROLE_KEY` holds the `anon` key by mistake | Copy the `service_role` key instead, redeploy |
| Chat sends but messages vanish on reload | Write blocked while reads succeed | Confirm Step 4, or re-run `024` |
| Live chat stops updating | A `SELECT` policy was dropped | Re-run `024` to restore all policies |

The error screen on the My Agent tab names the specific cause and the migration that
fixes it, so read it before changing anything.

---

## Rotating the key

If the key is ever exposed:

1. Supabase → **Project Settings → API → Rotate** the `service_role` key.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in Rork Secrets.
3. Redeploy and re-check Step 4.

Rotation invalidates the old key immediately, so writes briefly fall back to the anon
path until the new key is live. If migration 025 has already run, that fallback will
fail — rotate during a quiet window, or re-run `024` first.

---

## What changed in the code

| File | Purpose |
|---|---|
| `lib/supabase-admin.ts` | Server-only client. Uses the service-role key when present, falls back to anon otherwise. Exports `isServiceRoleConfigured` |
| `backend/trpc/routes/ai-agents.ts` | Imports `supabaseAdmin` instead of the anon client |
| `migrations/025_lock_down_agent_rls.sql` | Drops the permissive write policies from 024 |
| `.env.example` | Documents the new variable and why it has no `EXPO_PUBLIC_` prefix |

The fallback is deliberate: you can deploy this code before setting the key and
nothing changes until you're ready.
