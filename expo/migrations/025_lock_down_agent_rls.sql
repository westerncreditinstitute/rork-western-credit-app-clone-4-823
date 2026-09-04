-- =================================================================
-- 025_lock_down_agent_rls.sql
-- -----------------------------------------------------------------
-- Removes the permissive write policies added by migration 024.
--
-- ⚠️  DO NOT RUN THIS UNTIL SUPABASE_SERVICE_ROLE_KEY IS CONFIGURED
--     AND THE BACKEND HAS BEEN REDEPLOYED AND VERIFIED.
--
-- Running this too early will re-break agent assignment, chat
-- persistence, and credit report analysis. Migration 024 exists
-- precisely because those writes were being rejected.
--
-- -----------------------------------------------------------------
-- What this does
-- -----------------------------------------------------------------
-- Migration 024 added permissive policies (USING true / WITH CHECK true)
-- so the anon key could write. That was the correct emergency fix, but it
-- means anyone holding the anon key — which ships inside the app and is
-- readable by any user — could write to these tables directly.
--
-- Once the backend authenticates with the service-role key it BYPASSES
-- RLS entirely, so it no longer needs any policy at all. Dropping the
-- write policies therefore costs the backend nothing while removing
-- direct write access from every client.
--
-- SELECT policies are intentionally KEPT. Supabase Realtime delivers chat
-- messages to the client using the anon key, and that subscription reads
-- through RLS — dropping the SELECT policy on agent_chat_messages would
-- silently kill live chat delivery (migration 022).
--
-- -----------------------------------------------------------------
-- Before running, confirm the backend is on the service-role key
-- -----------------------------------------------------------------
-- 1. Set SUPABASE_SERVICE_ROLE_KEY in Rork Secrets (server-side only).
-- 2. Redeploy/restart so the backend picks it up.
-- 3. Open the My Agent tab. It must load an agent and send a chat
--    message successfully.
-- 4. Confirm the server log does NOT contain:
--      "[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is not set"
--    If that warning is present, the backend is still on the anon key.
--    STOP — running this migration now would break the app.
--
-- Safe to re-run. Reversible: re-run 024 to restore write access.
-- =================================================================

-- -----------------------------------------------------------------
-- 1. user_agent_assignments — drop writes, keep reads
-- -----------------------------------------------------------------

DROP POLICY IF EXISTS "agent_assignments_insert" ON public.user_agent_assignments;
DROP POLICY IF EXISTS "agent_assignments_update" ON public.user_agent_assignments;
DROP POLICY IF EXISTS "agent_assignments_delete" ON public.user_agent_assignments;

-- -----------------------------------------------------------------
-- 2. agent_chat_messages — drop writes, keep reads
-- The SELECT policy must stay for Realtime chat delivery.
-- -----------------------------------------------------------------

DROP POLICY IF EXISTS "agent_messages_insert" ON public.agent_chat_messages;
DROP POLICY IF EXISTS "agent_messages_update" ON public.agent_chat_messages;
DROP POLICY IF EXISTS "agent_messages_delete" ON public.agent_chat_messages;

-- -----------------------------------------------------------------
-- 3. credit_report_analyses — drop writes, keep reads
-- Guarded: this table only exists if migration 023 has been run.
-- -----------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'credit_report_analyses'
    ) THEN
        DROP POLICY IF EXISTS "credit_analyses_insert" ON public.credit_report_analyses;
        DROP POLICY IF EXISTS "credit_analyses_update" ON public.credit_report_analyses;
        DROP POLICY IF EXISTS "credit_analyses_delete" ON public.credit_report_analyses;
    END IF;
END $$;

-- =================================================================
-- Verification — each table should now list ONLY a SELECT policy
-- =================================================================

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
      'user_agent_assignments',
      'agent_chat_messages',
      'credit_report_analyses'
  )
ORDER BY tablename, cmd;

-- Expected: one row per table, all with cmd = 'SELECT'.
-- If you see INSERT/UPDATE/DELETE rows still listed, the DROPs above
-- did not match your policy names — check the names in pg_policies.
