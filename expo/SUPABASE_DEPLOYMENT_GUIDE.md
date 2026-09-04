# Supabase Deployment Guide — My Agent Feature

This is the complete, step-by-step guide for deploying the **My Agent** (AI Credit Repair Agent) feature to your Supabase project. Follow each phase in order. Every step includes the exact SQL, screenshots to expect, and verification queries so you can confirm success before moving on.

---

## Prerequisites

Before you begin, make sure you have:

1. **A Supabase project** — if you don't have one, go to [supabase.com](https://supabase.com), click "New Project", choose a name, set a database password, and pick a region close to your users. Wait for the project to finish provisioning (the dashboard will show "Project is ready").

2. **Your Supabase credentials** — you'll need these three values from your Supabase dashboard (Project Settings → API):
   - `Project URL` (looks like `https://abcdefgh.supabase.co`)
   - `anon` public key
   - `service_role` secret key (keep this secret — it bypasses Row Level Security)

3. **The base schema already deployed** — the My Agent feature depends on the `users` and `disputes` tables. If you haven't run the base schema yet, you'll run it in Phase 1 below. If you have existing data in those tables, skip Step 1 of Phase 1.

4. **An OpenAI API key** (optional) — the AI chat works without it in demo mode, but for full AI-powered responses with function calling, you'll need an OpenAI API key (or any OpenAI-compatible API key). Get one at [platform.openai.com](https://platform.openai.com/api-keys).

---

## Phase 1 — Run the Base Schema (If Not Already Done)

The AI agent route reads from and writes to the `disputes` table (generated letters are saved as dispute records, and the `get_disputes` tool queries it). The `disputes` table in turn depends on the `users` table. Both are defined in `supabase-schema.sql`.

### Step 1.1 — Open the SQL Editor

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar.
2. Click **+ New query** (or "New snippet") to create a fresh query tab.

### Step 1.2 — Run the Base Schema

> ### ⚠️ RECOMMENDED: Use the minimal script instead
>
> The full `supabase-schema.sql` is **~130,000 characters / 2,767 lines**. The Supabase web SQL Editor frequently **truncates** pastes this large, which cuts a `CREATE POLICY` statement in half and leaves an orphaned `USING (...)` line. That produces this exact error:
>
> ```
> ERROR: 42601: syntax error at or near "USING"
> LINE 1: USING (user_id = auth.uid())
> ```
>
> **If you hit that error, the SQL file is not broken — your paste was truncated.**
>
> Use **`migrations/019_minimal_base_schema.sql`** instead. It is only **4.8 KB / 106 lines**, contains just the two tables the My Agent feature actually needs (`users` and `disputes`), and has been verified to execute cleanly on PostgreSQL 15.

**Option A — Minimal script (recommended):**

1. Open `migrations/019_minimal_base_schema.sql` from your repository.
2. Copy the entire file (it's small — the paste will not truncate).
3. Paste into the SQL Editor and click **Run**.
4. You'll see some `NOTICE: ... does not exist, skipping` messages — **these are harmless and expected** on a first run.
5. The script ends by printing the two created tables: `disputes` and `users`.

**Option B — Full schema (only if you need every table in the project):**

1. Open `supabase-schema.sql`.
2. **Do not copy/paste it into the web editor.** Instead, either:
   - Use the Supabase CLI: `supabase db push`, or
   - Split the file and run it in sections of a few hundred lines at a time, or
   - Connect with `psql` directly: `psql "$DATABASE_URL" -f supabase-schema.sql`
3. Verify no errors before continuing.

> **Why the minimal script is enough:** the My Agent feature only touches `users` and `disputes`. Migration 020 creates its own three tables and references `ai_agent_pool` internally, so nothing else in the full schema is required for this feature to work.

### Step 1.3 — Verify the Base Tables Exist

Run this verification query in the SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'disputes', 'courses', 'videos', 'sections', 'video_progress')
ORDER BY table_name;
```

You should see all six table names in the results. If `users` and `disputes` are present, the base schema is ready and you can proceed to Phase 2.

> **If you already have these tables with existing data:** Do NOT re-run `supabase-schema.sql` — the `CREATE TABLE IF NOT EXISTS` statements won't overwrite your data, but running it is unnecessary. Just verify the tables exist with the query above and move on.

---

## Phase 2 — Run the AI Agent Pool Migration

This migration creates the three new tables that power the My Agent feature: `ai_agent_pool`, `user_agent_assignments`, and `agent_chat_messages`. It also creates a database trigger that automatically maintains agent capacity counts.

### Step 2.1 — Open a New SQL Query

1. In the Supabase dashboard, go to **SQL Editor**.
2. Click **+ New query** to create a fresh tab.

### Step 2.2 — Run Migration 020

1. Open the file `migrations/020_ai_agent_pool_and_assignments.sql` from your repository.
2. Copy the entire file contents (all 145 lines).
3. Paste it into the SQL Editor.
4. Click **Run**.
5. Wait for execution to complete. You should see "Success. No rows returned" (this is normal — the migration creates tables, indexes, policies, and a trigger but doesn't insert data).

### Step 2.3 — Verify the New Tables and Trigger

Run this verification query:

```sql
-- Check that all 3 new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ai_agent_pool', 'user_agent_assignments', 'agent_chat_messages')
ORDER BY table_name;
```

You should see three rows: `ai_agent_pool`, `agent_chat_messages`, `user_agent_assignments`.

Next, verify the trigger was created:

```sql
SELECT tgname, tgrelid::regclass AS table_name, tgtype
FROM pg_trigger
WHERE tgname IN ('trg_sync_agent_count_insert', 'trg_sync_agent_count_delete');
```

You should see two rows — one for the INSERT trigger and one for the DELETE trigger, both on the `user_agent_assignments` table.

Finally, verify the trigger function exists:

```sql
SELECT proname FROM pg_proc WHERE proname = 'sync_agent_user_count';
```

You should see one row. If all three queries return the expected results, the migration is complete.

---

## Phase 3 — Seed 10,000 AI Agents

This step populates the `ai_agent_pool` table with 10,000 AI agent profiles. Each agent has a unique name, specialty, bio, and DiceBear avatar. The seeder is idempotent — it only runs if the table is empty, so it's safe to run multiple times.

### Step 3.1 — Open a New SQL Query

1. Go to **SQL Editor** → **+ New query**.

### Step 3.2 — Run Migration 021 (the Seeder)

1. Open the file `migrations/021_seed_ai_agents.sql` from your repository.
2. Copy the entire file contents (all 69 lines — the `DO $$ ... $$` block).
3. Paste it into the SQL Editor.
4. Click **Run**.
5. **Be patient** — inserting 10,000 rows takes a few seconds to a minute depending on your Supabase plan. The query will show "Success" when done, and you'll see a NOTICE message: `Seeded 10,000 AI agents successfully.`

> **If you see the message** `ai_agent_pool already has X rows — skipping seed.` — this means the table already has agents. If you want to re-seed, you'd need to truncate the table first (`TRUNCATE public.ai_agent_pool RESTART IDENTITY CASCADE;`) but normally you should NOT do this if users are already assigned.

### Step 3.3 — Verify the Agents Were Seeded

Run this verification query:

```sql
SELECT COUNT(*) AS total_agents,
       COUNT(*) FILTER (WHERE is_active = true) AS active_agents,
       MIN(agent_name) AS first_agent,
       MAX(agent_name) AS last_agent
FROM public.ai_agent_pool;
```

You should see:
- `total_agents`: **10000**
- `active_agents`: **10000**
- `first_agent` and `last_agent`: agent names (like "Alex Hart #1" and something ending with "#10000")

### Step 3.4 — Run Migration 022 (Live Chat Delivery)

This enables **real-time** chat on the My Agent page. Without it the chat still works, but messages arrive by polling instead of streaming.

1. Open `migrations/022_agent_chat_realtime.sql`.
2. Paste it into a new SQL Editor query and click **Run**.

### Step 3.5 — Run Migration 023 (AI Dispute Assistant)

This migration powers the **AI Dispute Assistant** on the My Agent page — it stores the accounts parsed from a user's uploaded credit report so their agent can reference real balances and creditors during chat instead of guessing.

1. Open `migrations/023_credit_report_analysis.sql`.
2. Paste the entire file into a new SQL Editor query and click **Run**.
3. Verify with:

```sql
SELECT COUNT(*) FROM public.credit_report_analyses;
```

It should return `0` on a fresh install — that's correct. Rows appear once users upload reports.

> **If you skip 023:** credit report analysis still *works* in the moment, but nothing is saved. The agent won't remember the report in a later chat session, and the UI will show a warning saying so.

Let's also verify the distribution of specialties:

```sql
SELECT specialty, COUNT(*) AS count
FROM public.ai_agent_pool
GROUP BY specialty
ORDER BY count DESC;
```

You should see 10 specialty rows, each with approximately 1,000 agents.

### Step 3.6 — Run Migration 024 (Required: Fixes "No Agent Assigned")

**This migration is required.** Without it the My Agent tab shows *"We couldn't find an agent for your account"* even when migrations 020 and 021 ran perfectly.

Migrations 020 and 023 enabled Row Level Security on the agent tables but only created `SELECT` policies. Their comments assumed the backend used a service-role key, which bypasses RLS — but this project has no service-role key. `lib/supabase.ts` builds one client from `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and the tRPC backend imports that same client. With RLS on and no `INSERT` policy, every write was silently rejected:

- `user_agent_assignments` → agent assignment failed (the visible bug)
- `agent_chat_messages` → chat history was never saved
- `credit_report_analyses` → report analysis was never saved

1. Open `migrations/024_fix_agent_rls_policies.sql`.
2. Paste the entire file into a new SQL Editor query and click **Run**.
3. The migration ends with a verification query. Each table should list **4** policies (SELECT, INSERT, UPDATE, DELETE):

```sql
SELECT tablename, cmd, COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_agent_assignments', 'agent_chat_messages', 'credit_report_analyses')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;
```

4. Reopen the **My Agent** tab and tap **Try Again**. An agent should be assigned immediately.

> **Security note:** these policies are permissive (`USING true`), matching the pattern migration 019 already uses for `users` and `disputes` — authorization is enforced in the tRPC layer, not the database. That is fine for testing, but before launch you should either add a `SUPABASE_SERVICE_ROLE_KEY` for a server-only client and revoke these policies, or move to Supabase Auth and scope policies with `auth.uid()`. The migration file repeats this note inline.

### Step 3.7 — Preview a Few Agents (Optional but Recommended)

```sql
SELECT id, agent_name, specialty, avatar_url, bio, max_users, current_user_count
FROM public.ai_agent_pool
ORDER BY id
LIMIT 5;
```

Confirm that each agent has a name, specialty, avatar URL (a DiceBear link), a bio, `max_users = 25`, and `current_user_count = 0`. If everything looks good, the database is fully set up.

---

## Phase 4 — Row Level Security and the Service Role Key

This phase explains how the agent tables are secured, and how to move from the
emergency fix (migration 024) to the production setup (a service-role key plus
migration 025).

### Step 4.1 — Understand what went wrong, so you don't reintroduce it

Migrations 020 and 023 enabled Row Level Security on the agent tables but created
only `SELECT` policies. Their comments justified this by stating that the backend
used a service-role key, which bypasses RLS. **That was not true.** `lib/supabase.ts`
built a single client from `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and the backend imported
that same client — there was no service-role key anywhere in the project.

The result: RLS was on, no `INSERT` policy existed, and PostgreSQL rejected every
write. Agent assignment failed, chat messages were never saved, and credit report
analyses were never stored. Because the failures were silent, the app reported
"We couldn't find an agent for your account."

Migration 024 fixed this immediately by adding permissive write policies. That
restored functionality, but it is not where you want to stay: those policies allow
**anyone holding the anon key** to write to these tables directly, and the anon key
ships inside the app where any user can extract it.

The rest of this phase closes that gap.

### Step 4.2 — Confirm the backend really is server-side

A service-role key is only safe if the code using it never reaches a user's device.
Verify this before continuing:

```bash
# Should print nothing. Any output means client code imports backend runtime code.
grep -rn "from ['\"]@/backend" app/ components/ contexts/ hooks/ | grep -v "import type"
```

This project passes. The client (`lib/trpc.ts`) talks to the backend over HTTP at
`EXPO_PUBLIC_RORK_API_BASE_URL/api/trpc` and imports only `import type { AppRouter }`
— a type-only import that disappears at compile time. The `backend/` directory runs
on the server, not in the bundle.

> **If you fork this code and that grep starts returning results, stop.** Importing
> backend runtime code into `app/` would bundle the service-role key into the app and
> hand every user full database access.

### Step 4.3 — Get your service role key

1. Supabase dashboard → **Project Settings** (gear icon) → **API**.
2. Under **Project API keys**, find the key labelled **`service_role`** (Supabase
   also marks it `secret`). It is *not* the `anon` key you already use.
3. Click reveal, then copy it.

> **Treat this key like a root password.** It bypasses RLS entirely and grants full
> read/write access to your whole database. Never paste it into client code, a
> screenshot, a support ticket, or a Git commit.

### Step 4.4 — Add the key as a server-side secret

In Rork: **More → Secrets → Add Secret**.

| Field | Value |
|---|---|
| Name | `SUPABASE_SERVICE_ROLE_KEY` |
| Value | the `service_role` key you just copied |
| Visibility | **Server-side only** |

**The visibility setting is the entire security boundary.** Rork exposes any secret
named with an `EXPO_PUBLIC_` prefix to all users; anything without that prefix stays
server-side. This is the same rule that already protects `OPENAI_API_KEY`.

- ✅ `SUPABASE_SERVICE_ROLE_KEY` — server-side only
- ❌ `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` — **never do this.** It would publish
  full database access to every user of your app.

For local development, add the same line to `.env` (which is git-ignored):

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

`.env.example` documents this variable. Never fill a real key into `.env.example`
itself — that file *is* committed.

### Step 4.5 — Redeploy so the backend picks it up

Environment variables are read when the server starts, so a hot reload is not enough.
Redeploy (or restart your local dev server) after saving the secret.

### Step 4.6 — Verify the backend is actually using it

`lib/supabase-admin.ts` deliberately falls back to the anon client when the key is
missing, so the app keeps working during the transition. That safety net also means
a typo will fail quietly — so check explicitly.

Open `/api/system-status` on your API host (the same value as
`EXPO_PUBLIC_RORK_API_BASE_URL`), in a browser or with curl:

```bash
curl -s https://YOUR-API-HOST/api/system-status | jq .supabase
```

> **Don't know your `YOUR-API-HOST`?** You don't set that variable — Rork
> injects it. See the **"Need to see the injected value?"** note in Step 5.3
> (Option R) for the three ways to read it (Secrets eye button, the
> `[tRPC] API base URL:` line in **More → Code → Logs**, or your `.env` on a
> local clone). Then substitute it above.

The one value you're looking for is `"keyType": "configured"`:

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

That single value proves two things at once: the key reached the server, **and**
Supabase accepted it on a live query. Anything else means stop — the response's
`message` and `action` fields spell out the cause and the fix:

| `keyType` | Meaning | Fix |
| --- | --- | --- |
| `configured` | Key loaded, Supabase accepted it | None — continue to Step 4.7 |
| `not_set` | Env var empty; running on the anon fallback | Re-do Step 4.4 as a **server-side** secret, redeploy |
| `wrong_key_anon` | The **anon** key was pasted in | Copy the `service_role` key instead |
| `wrong_key_publishable` | A `sb_publishable_…` client key was pasted | Copy the `service_role` secret instead |
| `invalid_key` | Truncated paste, or a user auth token | Re-copy the entire key |
| `project_mismatch` | Key belongs to another Supabase project | Match the key to `SUPABASE_URL` |
| `key_rejected` | Looks right, but Supabase refused it | JWT secret was rotated — copy the current key |
| `configured_unverified` | Looks right; Supabase unreachable | Retry; check the project isn't paused |

> **Why not just read the startup logs?** `lib/supabase-admin.ts` emits
> `[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is not set — falling back to the anon
> client.` at startup, but **the Rork-hosted backend runs as serverless functions
> with no user-facing log viewer**, so in production that warning is unreadable.
> Worse, the log can't catch the most dangerous mistake: paste the *anon* key into
> `SUPABASE_SERVICE_ROLE_KEY` and the warning vanishes — the variable is "set" —
> while RLS still blocks every write. The endpoint decodes the key's role claim and
> reports `wrong_key_anon` instead. Where logs *do* live is covered in Step 4.6b.

The endpoint returns only booleans and status codes — never the key, the project
URL, or the project ref.

Then confirm the feature works end to end: open **My Agent**, load an agent, and
send a chat message.

### Step 4.6b — Where the logs actually are

Not needed for the verification above, but worth knowing when you're debugging.

**Local development.** The terminal running `bun start` (`bunx rork start`) shows
all backend `console.log`/`console.warn` output, including the `[Supabase Admin]`
warning.

**Rork-hosted backend.** Two different kinds of logs here, and the split
matters:

- **App-side logs — you CAN see these.** Open **More → Code** and expand the
  **Logs panel** at the bottom of the Code view. It captures what the *app*
  printed while running in the preview (`[log]` / `[info]` / `[warn]` /
  `[error]` / `[debug]` tags; scroll up to load older lines). Client-side
  `console.log`s appear here — for example the `[tRPC] API base URL: …` line,
  or the tRPC warm-up messages. On the web preview the same lines also show
  in the browser devtools console.
- **Server-side logs — you cannot.** The backend itself runs as serverless
  functions, and Rork doesn't expose its startup `console.log`/`console.warn`
  output to you — so the `[Supabase Admin]` warning from
  `lib/supabase-admin.ts` is unreadable in production, which is precisely why
  Step 4.6 uses an endpoint instead. (Paid plans include chat support if you
  need something inspected server-side.)

**Supabase (the database side).** This is where you confirm *which role* your
writes actually arrive as. In the Supabase dashboard go to **Logs → Log Explorer**
and run:

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

SQLSTATE `42501` is "permission denied" — an RLS refusal, the exact error behind
the original outage. Once the service-role key is live, backend writes should stop
generating `42501` rows and `db_role` should read `service_role` instead of `anon`.
Other codes worth knowing: `42P01` (table missing — a migration didn't run) and
`23505` (duplicate key).

Log Explorer runs ClickHouse SQL, so a few rules differ from Postgres: use
`count()` not `count(*)`, avoid `select *`, and cap results at 1000 rows. To see
what other fields are available:

```sql
select distinct arrayJoin(mapKeys(log_attributes)) as key
from logs
where source = 'postgres_logs'
limit 100;
```

### Step 4.7 — Lock the tables down (migration 025)

Only after Step 4.6 passes, run `migrations/025_lock_down_agent_rls.sql`. It drops
the permissive `INSERT`/`UPDATE`/`DELETE` policies from migration 024. The backend
doesn't need them anymore — the service-role key bypasses RLS — but clients holding
the anon key lose direct write access.

**`SELECT` policies are deliberately kept.** Supabase Realtime delivers chat messages
to the client using the anon key, and that subscription reads through RLS. Dropping
the `SELECT` policy on `agent_chat_messages` would silently break live chat
(migration 022).

Verify afterwards — every row should say `SELECT`:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_agent_assignments', 'agent_chat_messages', 'credit_report_analyses')
ORDER BY tablename, cmd;
```

Then reopen the My Agent tab and send one more chat message. If agent assignment or
chat breaks at this point, the backend is still on the anon key — re-run migration
024 to restore access and revisit Step 4.6.

> **Rollback:** migration 024 and migration 025 are exact opposites and both are
> safe to re-run. Run 024 to reopen writes, 025 to close them.

### Step 4.8 — Rotating or revoking the key

If the key is ever exposed (committed, pasted into a ticket, shared in a screenshot):

1. Supabase → **Project Settings → API → Rotate** the `service_role` key.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in Rork Secrets.
3. Redeploy and re-check Step 4.6.

Rotation invalidates the old key immediately, so expect a brief window where writes
fall back to the anon path until the new key is deployed.


---

## Phase 5 — Configure Environment Variables

The My Agent feature needs several environment variables. The Supabase URL and anon key are already required by your app (they're in `lib/supabase.ts`). The OpenAI variables are new and enable the AI chat functionality.

### Step 5.1 — Gather Your Supabase Credentials

1. In the Supabase dashboard, go to **Project Settings** (gear icon, bottom left) → **API**.
2. Copy the **Project URL** — this is your `EXPO_PUBLIC_SUPABASE_URL`.
3. Copy the **anon public** key — this is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. Copy the **service_role** secret key — this is your `SUPABASE_SERVICE_ROLE_KEY` (only needed if your backend uses a separate service-role client; the current code uses the anon key client from `lib/supabase.ts`).

### Step 5.2 — Gather Your OpenAI API Key (Optional but Recommended)

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Click **Create new secret key**.
3. Name it (e.g., "Western Credit AI Agents").
4. Copy the key (starts with `sk-...`).

If you're using an OpenAI-compatible provider (like Azure OpenAI, Together AI, Groq, etc.), gather:
- The API key for that provider
- The base URL (e.g., `https://api.together.xyz/v1`)
- The model name you want to use (e.g., `gpt-4o-mini`, `llama-3.1-8b-instant`, etc.)

### Step 5.3 — Set Environment Variables in Your Deployment

The exact method depends on where you deploy. Here are the common scenarios:

#### Option R — Rork Secrets editor (if you build in the Rork web/VS Code interface)

If you build and preview your app inside Rork (rork.com or the Rork VS Code
extension), **do not create a `.env` file manually**. Rork has a built-in
Secrets editor that manages environment variables for you, keeps them out of
your Git history, and routes them to the right place automatically.

**Open the editor:** In your Rork project, go to **More → Secrets**.

**Add each variable below with "Add Variable"** (or use **Bulk Edit** and paste
all five lines at once). Type the name in capitals with underscores, paste the
value, then press **Save**. Rork hides the value immediately and shows a label
under each key indicating how far it travels.

```text
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon-key-here
OPENAI_API_KEY=sk-proj-your-new-rotated-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

| Variable | Label Rork shows | Why |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Available to all users | A public address, protected by database (RLS) rules |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Available to all users | The anon key is designed to be public; RLS enforces security |
| `OPENAI_API_KEY` | **Server-side only** | No `EXPO_PUBLIC_` prefix, so Rork keeps it on the server — `backend/trpc/routes/ai-agents.ts` reads it server-side. Users can never extract it |
| `OPENAI_MODEL` | Server-side only | Read only by the server route |
| `OPENAI_BASE_URL` | Server-side only | Read only by the server route |

> ⚠️ **Do NOT name the OpenAI key `EXPO_PUBLIC_OPENAI_API_KEY`.** The
> `EXPO_PUBLIC_` prefix bakes the value into the app bundle, where anyone who
> installs the app can extract it and rack up charges on your account. The code
> in `ai-agents.ts` already prefers the server-side `OPENAI_API_KEY`, so use
> that name.

**You do NOT need to set `EXPO_PUBLIC_RORK_API_BASE_URL`.** Rork injects that
automatically at build time for projects that use its hosted Hono/tRPC backend.
Setting it yourself can conflict with Rork's tunnel and break the tRPC
connection. (If you later run the app outside Rork — a local clone — you will
need it then; see Option A below.)

> **Need to see the injected value?** Because Rork writes it, it may not appear
> in your Secrets list — that's expected, not a bug. To find it:
>
> 1. **More → Secrets** — look for a row named `EXPO_PUBLIC_RORK_API_BASE_URL`
>    possibly marked **"Managed by Rork"**, and press the eye button to reveal
>    the value (it will look like `https://…rork.com/…`).
> 2. **After a rebuild**, the app itself announces it: **More → Code → Logs**
>    (the panel at the bottom of the Code view) shows a line reading
>    `[tRPC] API base URL: https://…`. On the web preview, the browser devtools
>    console shows the same line.
> 3. On a **local clone** it's simply your `.env` value (`http://localhost:8081`
>    for web, your LAN IP for a device).
>
> Whatever value you find there is also your `YOUR-API-HOST` for Step 4.6:
> `curl -s https://<that-value>/api/system-status`.

**After saving, rebuild the preview.** Rork reads env vars at build time, so
press **Restart / Rebuild** (or stop and restart the preview). If a "clear
cache" option is available, use it — stale env vars are a common cause of
"still can't see it" errors.

**If you connected Supabase through Rork's integration**, the two
`EXPO_PUBLIC_SUPABASE_*` rows may already be present and marked "Managed by the
Supabase integration." Leave those as-is and only add the three `OPENAI_*` rows.

**Alternative — Rork Cloud AI (no OpenAI key needed):** Rork's Toolkit provides
built-in AI models (Claude Sonnet 4.5 for chat, GPT-5 / GPT-4.1 for text and
structured data) billed through Rork Cloud credits, with no provider key of
your own. If you'd rather not manage an OpenAI key, you can ask Rork in chat to
rewire the My Agent feature to use the Toolkit instead. This is a product
decision, not a configuration step — the current code uses a direct OpenAI key.

#### Option A — Local Development (.env file)

**Option 1 — Interactive setup (recommended, keeps secrets off-screen)**

```bash
bash scripts/setup-env.sh
```

Prompts for each value, hides secret input, decodes your Supabase JWT to
reject a `service_role` key, strips trailing slashes, auto-detects your LAN IP,
and writes `.env` with `600` permissions. Then run `node scripts/check-env.js`.

**Option 2 — Manual**

**Step A1 — Create the file from the template**

```bash
cp .env.example .env
```

**Step A2 — Fill in your four values**

Open `.env` and set these. All four lines matter:

```bash
# --- Supabase (REQUIRED) ---
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....

# --- API base URL (REQUIRED — app crashes without it) ---
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:8081

# --- OpenAI (optional, enables real AI chat) ---
OPENAI_API_KEY=sk-proj-your-real-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

**Where each value comes from:**

| Variable | Where to find it |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings (gear) → API → **Project URL** |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same page → **anon / public** key (starts with `eyJ`) |
| `EXPO_PUBLIC_RORK_API_BASE_URL` | Where your app is served (see table below) |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys (starts with `sk-`) |

**Choosing the right `EXPO_PUBLIC_RORK_API_BASE_URL`:**

| How you're testing | Value to use |
|---|---|
| Browser on the same computer | `http://localhost:8081` |
| Phone or simulator on your Wi-Fi | `http://<your-LAN-IP>:8081` — e.g. `http://192.168.1.50:8081` |
| Rork tunnel (`npm start` uses `--tunnel`) | The `https://...` URL Rork prints in the terminal |

Find your LAN IP with `ipconfig getifaddr en0` (macOS) or `hostname -I | awk '{print $1}'` (Linux).

> ⚠️ **No trailing slash, and do not append `/api/trpc`.** The tRPC client in `lib/trpc.ts` adds that itself. `http://localhost:8081/` or `http://localhost:8081/api/trpc` will both break.

**Step A3 — Verify your configuration**

Run the checker script:

```bash
node scripts/check-env.js
```

It validates formats, confirms `.env` is git-ignored, then live-tests your Supabase connection (checking all 5 tables exist and that 10,000 agents are seeded) and your OpenAI key. Secrets are masked in the output.

A healthy run looks like:

```
1. Supabase (required)
  ✓ EXPO_PUBLIC_SUPABASE_URL = https://abcdefgh.supabase.co
  ✓ EXPO_PUBLIC_SUPABASE_ANON_KEY = eyJhbG...x4Qk (208 chars)
  ✓ Key role confirmed: anon

2. API Base URL (required)
  ✓ EXPO_PUBLIC_RORK_API_BASE_URL = http://localhost:8081
    tRPC endpoint -> http://localhost:8081/api/trpc

3. OpenAI (optional — demo mode without it)
  ✓ OPENAI_API_KEY = sk-pro...4bXa (164 chars)
  ✓ OPENAI_MODEL = gpt-4o-mini

4. Secret safety
  ✓ .env is listed in .gitignore — safe from commits

5. Live test — Supabase + My Agent tables
  ✓ Table 'users' reachable
  ✓ Table 'disputes' reachable
  ✓ Table 'ai_agent_pool' reachable — 10000 rows
  ✓ All 10,000 agents seeded correctly
  ✓ Table 'user_agent_assignments' reachable
  ✓ Table 'agent_chat_messages' reachable

6. Live test — OpenAI key
  ✓ OpenAI key is VALID — model 'gpt-4o-mini' responded
  ✓ My Agent chat will use real AI with function calling

═══ Summary ═══
All checks passed. You're ready to run the app.
```

**Step A4 — Restart the dev server**

Environment variables are read at **build time**, not runtime. After editing `.env` you must fully restart — hot reload will not pick up the changes:

```bash
# Stop the server (Ctrl+C), then:
npm start
```

If values still seem stale, clear the cache: `npx expo start --clear`

---

##### 🔐 Security rules (important)

0. **Never paste a real API key into chat, a ticket, email, or a screenshot.** Anything shared that way must be treated as compromised and rotated immediately. Use `bash scripts/setup-env.sh`, which reads secrets with hidden input so they never appear on screen or in your shell history. To rotate a leaked OpenAI key: go to https://platform.openai.com/api-keys, delete the exposed key, create a new one, and re-run the setup script.


1. **Never rename `OPENAI_API_KEY` to `EXPO_PUBLIC_OPENAI_API_KEY`.** Anything with the `EXPO_PUBLIC_` prefix is compiled into the client bundle and is readable by anyone who downloads your app. Your OpenAI key must stay server-side only. The checker script flags this as an error.

2. **Use the `anon` key, not the `service_role` key.** They look nearly identical (both start with `eyJ`), but `service_role` bypasses all Row Level Security. The checker decodes the JWT and will reject a `service_role` key.

3. **Never commit `.env`.** It's already covered by `.gitignore` (line 43). Commit `.env.example` instead — it has placeholders only.

##### 💡 About the OpenAI key being optional

Without `OPENAI_API_KEY`, the app runs in **demo mode**: chat returns helpful keyword-matched replies instead of real AI. Everything else still works fully — dispute letter generation uses local templates (not AI), the dispute tracker works, and agent assignment works. Since you've created a key, you'll get the full experience: real AI responses plus function calling, where the agent decides on its own when to call `get_disputes`, `generate_dispute_letter`, or `get_credit_tips`.

#### Option B — Expo EAS (Production Build)

If you're building with EAS, set environment variables at build time. Create or update `eas.json`:

```json
{
  "production": {
    "env": {
      "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key-here"
    }
  }
}
```

For the OpenAI key (server-side only), set it in your backend hosting environment (see Option C).

#### Option C — Backend Hosting (Vercel, Railway, Fly.io, etc.)

If your tRPC backend runs on a separate server (e.g., Vercel Functions, Railway, Fly.io), set these in your hosting provider's environment variables dashboard:

| Variable | Value | Required |
|----------|-------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Yes |
| `OPENAI_API_KEY` | Your OpenAI API key | No (demo mode fallback) |
| `OPENAI_MODEL` | `gpt-4o-mini` (or your model) | No (defaults to gpt-4o-mini) |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` (or your provider) | No (defaults to OpenAI) |

### Step 5.4 — Verify the Backend Can Connect

The backend code in `backend/trpc/routes/ai-agents.ts` reads the OpenAI key like this:

```typescript
const apiKey = process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
```

When `apiKey` is empty, the chat endpoint falls back to **demo mode** — keyword-matched responses that still demonstrate the agent's capabilities but don't use real AI. This means:

- **Without an API key:** Users can chat and get helpful canned responses, trigger dispute letter generation (which works fully — it uses built-in templates, not AI), and check their dispute status.
- **With an API key:** Users get full AI-powered responses with function calling — the agent can decide to call `get_disputes`, `generate_dispute_letter`, or `get_credit_tips` based on the conversation context.

---

## Phase 6 — Deploy the Application Code

The database is ready, environment variables are set. Now deploy the application.

### Step 6.1 — Ensure You're on the Feature Branch

The My Agent feature is on the `feature/travel-system` branch. If you're merging to main, create a pull request and merge it. If you're deploying directly from the feature branch, make sure your deployment pipeline uses that branch.

```bash
git checkout feature/travel-system
git pull origin feature/travel-system
```

### Step 6.2 — Install Dependencies

```bash
npm install --legacy-peer-deps
```

> The `--legacy-peer-deps` flag is needed because of a pre-existing peer dependency conflict between `lucide-react-native` and `react@19.1.0`. This is unrelated to the My Agent feature.

### Step 6.3 — Build and Deploy

Follow your normal deployment process. For Expo web:

```bash
npx expo export --platform web
```

This generates a static web build in the `dist/` directory. Deploy that to your hosting provider (Vercel, Netlify, S3, etc.).

For a managed Expo app (iOS/Android), use EAS:

```bash
eas build --platform all
```

### Step 6.4 — Verify TypeScript Compilation (Pre-Deploy Check)

Before deploying, verify there are no TypeScript errors in your code (ignoring the pre-existing expo-file-system errors):

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules/expo-file-system"
```

You should see no errors related to your project files. The only acceptable errors are the 4 pre-existing ones in `node_modules/expo-file-system/src/legacy/`.

---

## Phase 7 — Post-Deployment Verification

After deploying, verify the feature works end-to-end.

### Step 7.1 — Verify via the Admin Pool Stats Query

The backend has a `getPoolStats` tRPC query that returns agent pool statistics. You can also check directly in Supabase:

```sql
SELECT
  COUNT(*) AS total_agents,
  COUNT(*) FILTER (WHERE is_active = true) AS active_agents,
  COUNT(*) FILTER (WHERE current_user_count >= max_users) AS full_agents,
  (SELECT COUNT(*) FROM user_agent_assignments WHERE is_active = true) AS total_assignments
FROM public.ai_agent_pool;
```

Initially, you should see:
- `total_agents`: 10000
- `active_agents`: 10000
- `full_agents`: 0
- `total_assignments`: 0

### Step 7.2 — Test Agent Assignment (End-to-End)

1. **Create or log in as a test user** in your deployed app.
2. **Enroll in the ACE-1 course** — navigate to the courses page and enroll in the ACE-1 Credit Repair Certification course. This triggers `SubscriptionContext.enrollInCourse()`, which:
   - Sets the user's subscription tier to `ace1_student`
   - Auto-assigns an AI agent via `trpc.aiAgents.assign.mutate({ userId })`
3. **Check Supabase** to verify the assignment was created:

```sql
SELECT
  uaa.user_id,
  uaa.assigned_at,
  aap.agent_name,
  aap.specialty,
  aap.current_user_count
FROM user_agent_assignments uaa
JOIN ai_agent_pool aap ON uaa.agent_id = aap.id
ORDER BY uaa.assigned_at DESC
LIMIT 5;
```

You should see your test user's assignment with the agent's name and a `current_user_count` of 1 (the trigger auto-incremented it).

### Step 7.3 — Test the My Agent Page

1. In the app, navigate to **More** tab → **My Agent** (it should be visible and unlocked now that you're an ACE-1 student).
2. You should see your assigned agent's profile card with their name, avatar, specialty, and bio.
3. Click the **Chat** button (floating action button or the chat quick-action button).
4. Type a message like "What's my credit score situation?" or "Can you write a 609 letter for me?"
5. If you have an OpenAI API key configured, you should get a real AI response. If not, you'll get a demo-mode response (still functional).
6. Try the **Credit Repair Tool** button — select a letter type, enter a creditor name and account number, and generate a letter. Verify it saves to the disputes table:

```sql
SELECT id, user_id, creditor_name, account_number, dispute_type, status, date_sent
FROM disputes
ORDER BY created_at DESC
LIMIT 5;
```

7. Try the **Dispute Tracker** button — you should see the dispute you just created.

### Step 7.4 — Test the Interactive Workflow

1. Open the chat modal.
2. Type: "Write me a 609 letter for Capital One account 4321"
3. The AI agent should call the `generate_dispute_letter` tool (if OpenAI is configured) or provide guidance (demo mode).
4. The chat modal should detect the tool call and open the Credit Repair modal with the letter type, creditor name, and account number pre-filled.
5. Review the generated letter, click "Generate & Save."
6. Open the Dispute Tracker — the new dispute should appear.

### Step 7.5 — Verify Chat History Persistence

After chatting, verify messages are stored in Supabase:

```sql
SELECT id, user_id, agent_id, role, LEFT(content, 80) AS content_preview, tool_name, created_at
FROM agent_chat_messages
ORDER BY created_at DESC
LIMIT 10;
```

You should see your user messages (`role = 'user'`), assistant responses (`role = 'assistant'`), and any tool results (`role = 'tool'` with `tool_name` populated).

---

## Phase 8 — Monitoring and Maintenance

### Step 8.1 — Monitor Agent Capacity

As users enroll in ACE-1, agents fill up. Each agent can hold 25 users max. With 10,000 agents, the system supports 250,000 concurrent ACE-1 students before hitting capacity.

Check capacity distribution periodically:

```sql
SELECT
  CASE
    WHEN current_user_count = 0 THEN 'Empty (0 users)'
    WHEN current_user_count BETWEEN 1 AND 10 THEN 'Light (1-10 users)'
    WHEN current_user_count BETWEEN 11 AND 20 THEN 'Medium (11-20 users)'
    WHEN current_user_count BETWEEN 21 AND 24 THEN 'Near Full (21-24 users)'
    WHEN current_user_count = 25 THEN 'Full (25 users)'
  END AS capacity_bucket,
  COUNT(*) AS agent_count
FROM ai_agent_pool
GROUP BY capacity_bucket
ORDER BY MIN(current_user_count);
```

### Step 8.2 — Adding More Agents (If Needed)

If you're approaching 250,000 users, you can add more agents. Run a modified version of the seeder that starts from a higher ID. For example, to add 5,000 more agents (10,001–15,000):

```sql
DO $$
DECLARE
    -- ... same arrays as the seeder ...
    i INTEGER;
BEGIN
    FOR i IN 10001..15000 LOOP
        -- ... same INSERT logic, using i for name numbering ...
        INSERT INTO public.ai_agent_pool (agent_name, avatar_url, bio, specialty, max_users, current_user_count, is_active)
        VALUES (...);
    END LOOP;
END $$;
```

### Step 8.3 — Clean Up Old Chat History (Optional)

Chat messages accumulate over time. To keep the table manageable, you can periodically archive or delete messages older than 90 days:

```sql
DELETE FROM agent_chat_messages
WHERE created_at < NOW() - INTERVAL '90 days';
```

> **Caution:** This permanently deletes conversation history. Users will lose their chat context from messages older than 90 days. Consider exporting to cold storage first if you need to retain records.

### Step 8.4 — Re-activate or Deactivate Agents

To take an agent offline (stop new assignments to it):

```sql
UPDATE ai_agent_pool SET is_active = false WHERE id = [agent_id];
```

To bring it back online:

```sql
UPDATE ai_agent_pool SET is_active = true WHERE id = [agent_id];
```

The assignment logic only picks agents where `is_active = true`, so deactivating an agent prevents new users from being assigned to it without disrupting existing users.

---

## Troubleshooting

### Problem: `ERROR: 42601: syntax error at or near "USING"` when running Step 1.2

**Full error text:**
```
Failed to run sql query: ERROR:  42601: syntax error at or near "USING"
LINE 1: USING (user_id = auth.uid())
```

**Cause:** Your paste was **truncated**. The full `supabase-schema.sql` is ~130,000 characters, and the Supabase web SQL Editor silently cuts off very large pastes. When the cut lands in the middle of a `CREATE POLICY ... USING (...)` statement, Postgres sees a bare `USING (...)` line with no preceding command and reports a syntax error at line 1.

Two clues confirm this diagnosis:
- The error says **`LINE 1`** — a genuine error deep in a 2,767-line file would report a much higher line number.
- The string `USING (user_id = auth.uid())` **does not exist anywhere** in `supabase-schema.sql` (verified). It's a fragment left over from a partial paste.

**Fix:** Run `migrations/019_minimal_base_schema.sql` instead (4.8 KB, 106 lines). It creates the `users` and `disputes` tables — everything the My Agent feature needs — and is small enough to paste safely. See Phase 1, Step 1.2, Option A.

**Verify the fix worked:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'disputes')
ORDER BY table_name;
```
You should get exactly two rows: `disputes` and `users`.

> **Note on `NOTICE` messages:** When running the minimal script you'll see lines like `NOTICE: policy "..." does not exist, skipping`. These are **not errors** — they come from the `DROP POLICY IF EXISTS` statements that make the script safely re-runnable. As long as the final `SELECT` returns your two tables, it worked.

### Problem: `Rork did not set EXPO_PUBLIC_RORK_API_BASE_URL, please use support`

**Cause:** `lib/trpc.ts` throws this on startup when `EXPO_PUBLIC_RORK_API_BASE_URL` is missing. This variable is injected automatically by Rork at build time for projects using Rork's hosted Hono/tRPC backend, so it should not need to be set manually inside Rork.

**If you're building inside Rork (Option R):** You should not set this variable yourself — Rork injects it. If you see this error in Rork, it usually means the preview needs a clean rebuild (press Restart / Rebuild, or clear cache). If it persists, use Rork support, as the message suggests — it indicates Rork's own injection did not run. (To *read* the injected value rather than fix a missing one, see the **"Need to see the injected value?"** note in Step 5.3 — Option R: Secrets eye button, or the `[tRPC] API base URL:` line in **More → Code → Logs** after a rebuild.)

**If you're running a local clone (Option A):** Add it to `.env`:

```bash
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:8081
```

Use your LAN IP instead of `localhost` when testing on a phone or simulator. No trailing slash, and do not append `/api/trpc`. Then fully restart the dev server — env vars are read at build time.

### Problem: Env changes to `.env` seem to have no effect

Environment variables are baked in at **build time**. Editing `.env` while the server is running does nothing, and hot reload will not pick it up.

**Fix:** Stop the server (Ctrl+C) and restart with `npm start`. If it still looks stale, clear the bundler cache with `npx expo start --clear`.

### Problem: Network request failed / tRPC calls time out

Almost always a wrong `EXPO_PUBLIC_RORK_API_BASE_URL`. Check for these:

- Using `http://localhost:8081` while testing on a **physical device** — the phone resolves `localhost` to itself, not your computer. Use your LAN IP.
- A **trailing slash** (`http://localhost:8081/`) — produces a malformed `//api/trpc` path.
- Already including `/api/trpc` — the client appends it, giving `/api/trpc/api/trpc`.
- Computer and phone on **different Wi-Fi networks**.

Run `node scripts/check-env.js` — it detects the slash and path mistakes automatically.

### Problem: "ALL_AGENTS_AT_CAPACITY" error

This means all 10,000 agents have 25 users each (250,000 total). This is extremely unlikely unless you have a massive user base. Verify with:

```sql
SELECT COUNT(*) FILTER (WHERE current_user_count < max_users AND is_active = true) AS available_agents
FROM ai_agent_pool;
```

If `available_agents` is 0, you need to add more agents (see Step 8.2) or increase `max_users`:

```sql
UPDATE ai_agent_pool SET max_users = 50 WHERE is_active = true;
```

### Problem: User can't see the My Agent page

Check the user's subscription tier:

```sql
SELECT id, email, subscription_tier FROM users WHERE id = '[user-id]';
```

The My Agent page requires `subscription_tier` to be `ace1_student` or `cso_affiliate`. If it's `free`, the user needs to enroll in the ACE-1 course first.

### Problem: Chat returns demo responses instead of AI responses

This means the OpenAI API key is not being read by the backend. Verify:
1. The environment variable `OPENAI_API_KEY` is set in your backend hosting environment.
2. The variable is NOT prefixed with `EXPO_PUBLIC_` (it should be server-side only).
3. The key is valid and has credits — test it with a direct curl call:

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}'
```

### Problem: Agent assignment fails with "duplicate key value violates unique constraint"

This is actually expected behavior under concurrent requests — the `UNIQUE(user_id)` constraint prevents duplicate assignments. The backend handles this by catching the error and returning the existing assignment. If you see this in server logs, it's not a bug — it's the atomic assignment logic working as designed.

### Problem: Trigger not incrementing current_user_count

Verify the triggers exist and are enabled:

```sql
SELECT tgname, tgenabled, tgrelid::regclass
FROM pg_trigger
WHERE tgname LIKE 'trg_sync_agent_count%';
```

`tgenabled` should be `O` (origin — trigger fires normally). If it's `D` (disabled), re-enable it:

```sql
ALTER TABLE user_agent_assignments ENABLE TRIGGER trg_sync_agent_count_insert;
ALTER TABLE user_agent_assignments ENABLE TRIGGER trg_sync_agent_count_delete;
```

### Problem: "relation disputes does not exist"

The AI agent route depends on the `disputes` table. If you skipped Phase 1, the `disputes` table doesn't exist. Go back and run `supabase-schema.sql` (Phase 1, Step 1.2).

---

## Quick Reference — Migration File Summary

| File | Purpose | Size | Approximate Runtime |
|------|---------|------|-------------------|
| **`migrations/019_minimal_base_schema.sql`** ⭐ | **RECOMMENDED.** Just `users` + `disputes` + `uuid-ossp`. Paste-safe. | **4.8 KB / 106 lines** | < 1 second |
| `supabase-schema.sql` | Full base schema (all project tables). **Too large to paste into the web SQL Editor** — use `psql` or the Supabase CLI. | 130 KB / 2,767 lines | < 5 seconds |
| `migrations/020_ai_agent_pool_and_assignments.sql` | Creates `ai_agent_pool`, `user_agent_assignments`, `agent_chat_messages` tables + indexes + RLS + trigger | 6.7 KB / 145 lines | < 5 seconds |
| `migrations/021_seed_ai_agents.sql` | Seeds 10,000 agent profiles into `ai_agent_pool` | 3.9 KB / 69 lines | < 1 second |
| `migrations/022_agent_chat_realtime.sql` | Adds `agent_chat_messages` to the Supabase realtime publication so chat messages stream live instead of polling | 1.2 KB / 37 lines | < 1 second |
| `migrations/023_credit_report_analysis.sql` | Creates `credit_report_analyses` (stores parsed credit reports so the agent can reference them in chat) | 2.3 KB / 60 lines | < 1 second |
| `migrations/024_fix_agent_rls_policies.sql` | **Required.** Adds the missing INSERT/UPDATE/DELETE RLS policies. Without it agent assignment, chat history, and report analysis all fail silently | 6.3 KB / 124 lines | < 1 second |
| `migrations/025_lock_down_agent_rls.sql` | **Production hardening.** Drops the permissive write policies from 024. Run ONLY after `SUPABASE_SERVICE_ROLE_KEY` is configured and verified (Phase 4) | 3.6 KB / 96 lines | < 1 second |

## Quick Reference — Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | — | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | — | Supabase anon public key (must be `anon`, NOT `service_role`) |
| `EXPO_PUBLIC_RORK_API_BASE_URL` | **Yes** | — | **App throws on startup if missing.** Origin only — no trailing slash, no `/api/trpc` |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | (empty → anon fallback) | **Server-side only.** Bypasses RLS so the backend can write. Required before migration 025. Never prefix with `EXPO_PUBLIC_` |
| `OPENAI_API_KEY` | No | (empty → demo mode) | OpenAI-compatible API key for AI chat |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | AI model name |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | API base URL (for OpenAI-compatible providers) |

## Quick Reference — Verification Query (Run After All Phases)

Run this single query to verify the entire deployment is correct:

```sql
SELECT
  'tables' AS check_name,
  COUNT(*) AS expected,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t.tbl
  )) AS actual
FROM (VALUES
  ('ai_agent_pool'), ('user_agent_assignments'), ('agent_chat_messages'),
  ('disputes'), ('users')
) AS t(tbl)
UNION ALL
SELECT 'agent_count', 10000, COUNT(*) FROM ai_agent_pool
UNION ALL
SELECT 'trigger_count', 2, COUNT(*) FROM pg_trigger WHERE tgname LIKE 'trg_sync_agent_count%'
UNION ALL
SELECT 'active_agents', 10000, COUNT(*) FROM ai_agent_pool WHERE is_active = true;
```

If `actual` matches `expected` on every row, your Supabase deployment is complete and ready.
