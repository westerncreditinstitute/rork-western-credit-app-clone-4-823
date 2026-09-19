-- =================================================================
-- 030_ai_agent_pool_select_policy.sql
-- -----------------------------------------------------------------
-- FIXES: Direct-to-database fallback in app/my-agent.tsx returning a
-- generic "Agent #<id>" instead of the real agent name/photo whenever
-- the API is unreachable.
--
-- ROOT CAUSE
-- ----------------------------------------------------------------
-- `ai_agent_pool` has Row Level Security ENABLED (migration 020) but
-- had ZERO policies defined on it. Migration 024's comment assumed
-- "RLS is NOT enabled on it," which was incorrect — RLS was on, just
-- with no SELECT policy, so with RLS enabled and no matching policy,
-- Postgres denies every row to non-superuser roles by default.
--
-- The `anon` role already had a table-level `GRANT SELECT` (from the
-- initial schema setup), but a GRANT alone does not bypass RLS — the
-- request still needs a matching policy. Confirmed live:
--   * service_role (bypasses RLS): sees all 10,000 rows
--   * anon (grant present, no policy): sees 0 rows — `content-range: */0`
--
-- This is why `lib/direct-agent.ts` had already defensively coded
-- around a `42501` (permission denied) on this exact table, falling
-- back to `Agent #<id>` when the profile lookup failed.
--
-- FIX
-- ----------------------------------------------------------------
-- Add a permissive SELECT policy, matching the exact pattern already
-- used for every other agent-related table in this project (see
-- migrations 020, 024, 025): `USING (true)`. Authorization for this
-- app is enforced at the tRPC layer, not the database, so this is
-- consistent with the rest of the schema — not a new precedent.
--
-- Deliberately SELECT-only. No INSERT/UPDATE/DELETE grant or policy is
-- added: only the service-role-backed backend (`assignAgentToUser` in
-- backend/trpc/routes/ai-agents.ts`) may write to this table, because
-- it also owns the `current_user_count` capacity bookkeeping via the
-- `sync_agent_user_count` trigger. Confirmed live that anon INSERT/
-- UPDATE attempts still correctly return 401 `permission denied for
-- table ai_agent_pool` after this migration.
--
-- Safe to re-run (drops the policy before creating it).
-- =================================================================

DROP POLICY IF EXISTS "ai_agent_pool_select" ON public.ai_agent_pool;

CREATE POLICY "ai_agent_pool_select"
    ON public.ai_agent_pool FOR SELECT USING (true);

-- =================================================================
-- Verification
-- =================================================================

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'ai_agent_pool';

-- Expected: one row, cmd = 'SELECT'.
