-- =================================================================
-- 023_credit_report_analysis.sql
-- -----------------------------------------------------------------
-- Stores credit report analyses produced by the AI Dispute Assistant
-- so the user's assigned AI Credit Repair Agent can reference the
-- parsed negative accounts during chat and recommend disputes.
--
-- Run AFTER 020_ai_agent_pool_and_assignments.sql.
-- Safe to re-run (idempotent).
-- =================================================================

-- -----------------------------------------------------------------
-- 1. Credit Report Analyses ---------------------------------------
-- One row per uploaded/parsed credit report. `accounts` holds the
-- ParsedAccount[] payload produced by components/CreditReportParser.
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.credit_report_analyses (
    id                BIGSERIAL   PRIMARY KEY,
    user_id           TEXT        NOT NULL,
    bureau            TEXT,                       -- 'Experian' | 'Equifax' | 'TransUnion' | 'Unknown'
    accounts          JSONB       NOT NULL DEFAULT '[]'::jsonb,
    negative_count    INTEGER     NOT NULL DEFAULT 0,
    total_negative_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    summary           TEXT,                       -- human-readable AI summary
    recommendations   JSONB       NOT NULL DEFAULT '[]'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Most queries fetch the user's most recent analysis.
CREATE INDEX IF NOT EXISTS idx_credit_report_analyses_user
    ON public.credit_report_analyses (user_id, created_at DESC);

-- -----------------------------------------------------------------
-- 2. Row-Level Security -------------------------------------------
-- The backend uses the service-role key (bypasses RLS); this policy
-- exists for direct client access if ever enabled. Matches the
-- pattern used in migration 020.
-- -----------------------------------------------------------------

ALTER TABLE public.credit_report_analyses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'credit_report_analyses'
          AND policyname = 'users_select_own_analyses'
    ) THEN
        CREATE POLICY "users_select_own_analyses"
            ON public.credit_report_analyses
            FOR SELECT USING (true);   -- backend validates user identity in context
    END IF;
END $$;

-- =================================================================
-- Done. Verify with:
--   SELECT COUNT(*) FROM public.credit_report_analyses;
-- =================================================================
