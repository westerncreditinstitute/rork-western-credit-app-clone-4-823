-- =================================================================
-- 024_fix_agent_rls_policies.sql
-- -----------------------------------------------------------------
-- FIXES: "We couldn't find an agent for your account"
--
-- Migrations 020 and 023 enabled Row Level Security on the agent
-- tables but only created SELECT policies. Their comments assumed
-- "the backend uses the service-role key (bypasses RLS)" — that is
-- NOT true for this project. `lib/supabase.ts` builds a single client
-- from EXPO_PUBLIC_SUPABASE_ANON_KEY, and the tRPC backend imports
-- that same client. There is no service-role key anywhere in the repo.
--
-- Consequence: with RLS on and no INSERT policy, every attempt to
-- write a row was silently rejected:
--   * user_agent_assignments  -> agent assignment failed  (the bug)
--   * agent_chat_messages     -> chat messages not saved
--   * credit_report_analyses  -> report analysis not saved
--
-- This migration adds the missing INSERT/UPDATE/DELETE policies so the
-- anon key can write, matching the permissive pattern migration 019
-- already uses for `users` and `disputes`.
--
-- Safe to re-run (drops each policy before creating it).
--
-- -----------------------------------------------------------------
-- SECURITY NOTE — PLEASE READ
-- -----------------------------------------------------------------
-- These policies are permissive (USING true / WITH CHECK true), which
-- matches how the rest of this project already works. Authorization is
-- enforced in the tRPC layer, not the database.
--
-- That is acceptable for testing, but it means anyone holding the anon
-- key could read or write these tables directly. Before launch you
-- should either:
--   (a) add a SUPABASE_SERVICE_ROLE_KEY, use it for a server-only
--       Supabase client in backend/, and then REVOKE these permissive
--       policies; or
--   (b) move to Supabase Auth and scope policies with auth.uid().
-- Option (a) is the smaller change and is recommended.
-- =================================================================

-- -----------------------------------------------------------------
-- 1. user_agent_assignments  (this is what fixes the reported bug)
-- -----------------------------------------------------------------

DROP POLICY IF EXISTS "users_select_own_assignment"  ON public.user_agent_assignments;
DROP POLICY IF EXISTS "agent_assignments_select"     ON public.user_agent_assignments;
DROP POLICY IF EXISTS "agent_assignments_insert"     ON public.user_agent_assignments;
DROP POLICY IF EXISTS "agent_assignments_update"     ON public.user_agent_assignments;
DROP POLICY IF EXISTS "agent_assignments_delete"     ON public.user_agent_assignments;

CREATE POLICY "agent_assignments_select"
    ON public.user_agent_assignments FOR SELECT USING (true);
CREATE POLICY "agent_assignments_insert"
    ON public.user_agent_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "agent_assignments_update"
    ON public.user_agent_assignments FOR UPDATE USING (true);
CREATE POLICY "agent_assignments_delete"
    ON public.user_agent_assignments FOR DELETE USING (true);

-- -----------------------------------------------------------------
-- 2. agent_chat_messages  (chat history persistence)
-- -----------------------------------------------------------------

DROP POLICY IF EXISTS "users_select_own_messages" ON public.agent_chat_messages;
DROP POLICY IF EXISTS "agent_messages_select"     ON public.agent_chat_messages;
DROP POLICY IF EXISTS "agent_messages_insert"     ON public.agent_chat_messages;
DROP POLICY IF EXISTS "agent_messages_update"     ON public.agent_chat_messages;
DROP POLICY IF EXISTS "agent_messages_delete"     ON public.agent_chat_messages;

CREATE POLICY "agent_messages_select"
    ON public.agent_chat_messages FOR SELECT USING (true);
CREATE POLICY "agent_messages_insert"
    ON public.agent_chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "agent_messages_update"
    ON public.agent_chat_messages FOR UPDATE USING (true);
CREATE POLICY "agent_messages_delete"
    ON public.agent_chat_messages FOR DELETE USING (true);

-- -----------------------------------------------------------------
-- 3. credit_report_analyses  (AI Dispute Assistant storage)
-- Guarded: this table only exists if migration 023 has been run.
-- -----------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'credit_report_analyses'
    ) THEN
        DROP POLICY IF EXISTS "users_select_own_analyses" ON public.credit_report_analyses;
        DROP POLICY IF EXISTS "credit_analyses_select"    ON public.credit_report_analyses;
        DROP POLICY IF EXISTS "credit_analyses_insert"    ON public.credit_report_analyses;
        DROP POLICY IF EXISTS "credit_analyses_update"    ON public.credit_report_analyses;
        DROP POLICY IF EXISTS "credit_analyses_delete"    ON public.credit_report_analyses;

        CREATE POLICY "credit_analyses_select"
            ON public.credit_report_analyses FOR SELECT USING (true);
        CREATE POLICY "credit_analyses_insert"
            ON public.credit_report_analyses FOR INSERT WITH CHECK (true);
        CREATE POLICY "credit_analyses_update"
            ON public.credit_report_analyses FOR UPDATE USING (true);
        CREATE POLICY "credit_analyses_delete"
            ON public.credit_report_analyses FOR DELETE USING (true);
    END IF;
END $$;

-- -----------------------------------------------------------------
-- 4. ai_agent_pool
-- The assignment trigger updates current_user_count on this table.
-- RLS is NOT enabled on it by migration 020, so no policy is needed.
-- Enabling RLS here without an UPDATE policy would break the trigger,
-- so we deliberately leave it alone.
-- -----------------------------------------------------------------

-- =================================================================
-- Verification — every table below should list 4 policies
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
