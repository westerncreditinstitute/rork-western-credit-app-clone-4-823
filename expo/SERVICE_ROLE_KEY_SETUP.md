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

**Check the server startup logs.** If this warning appears, the key did *not* load:

```
[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is not set — falling back to the anon client.
```

Usual causes: saved as client-visible instead of server-side, name misspelled, or the
server wasn't restarted.

No warning means you're on the service-role key. Confirm the feature works: open
**My Agent**, load an agent, send a chat message.

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
