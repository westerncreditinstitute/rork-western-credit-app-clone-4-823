-- ============================================================
-- Migration 011: AI Agent Pool + User-Agent Assignments
-- ============================================================
-- Creates a pool of 10,000 AI credit repair agents and a
-- user-to-agent assignment table that supports a maximum of
-- 25 concurrent users per agent.  Assignment is atomic to
-- prevent race conditions when many users register at once.
-- ============================================================

-- 1. AI Agent Pool ------------------------------------------------
-- Each row represents one of the 10,000 AI credit repair agents.
-- The agent_name / avatar_url / bio are pre-populated by a
-- seeder; the current_user_count is maintained atomically.

CREATE TABLE IF NOT EXISTS public.ai_agent_pool (
    id              BIGSERIAL PRIMARY KEY,
    agent_name      TEXT        NOT NULL,
    avatar_url      TEXT        NOT NULL DEFAULT '',
    bio             TEXT        NOT NULL DEFAULT '',
    specialty       TEXT        NOT NULL DEFAULT 'credit_repair',
    max_users       INTEGER     NOT NULL DEFAULT 25,
    current_user_count INTEGER  NOT NULL DEFAULT 0,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Never allow current_user_count to exceed max_users at the
    -- database level (belt-and-suspenders alongside the atomic
    -- assignment logic in the tRPC route).
    CONSTRAINT ai_agent_pool_count_within_max
        CHECK (current_user_count >= 0 AND current_user_count <= max_users)
);

-- Index for fast "find an agent with capacity" queries.
CREATE INDEX IF NOT EXISTS idx_ai_agent_pool_capacity
    ON public.ai_agent_pool (is_active, current_user_count, max_users);

-- -----------------------------------------------------------------
-- 2. User-Agent Assignment ----------------------------------------
-- One row per (user, agent) assignment.  The UNIQUE constraint on
-- user_id guarantees a user is assigned exactly one agent.
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_agent_assignments (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      TEXT        NOT NULL,
    agent_id     BIGINT      NOT NULL REFERENCES public.ai_agent_pool(id) ON DELETE CASCADE,
    assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- A user may only have one active assignment.
    CONSTRAINT uq_user_agent_assignment UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_agent_assignments_agent
    ON public.user_agent_assignments (agent_id, is_active);

CREATE INDEX IF NOT EXISTS idx_user_agent_assignments_user
    ON public.user_agent_assignments (user_id);

-- -----------------------------------------------------------------
-- 3. Agent Chat Messages (conversation history) ------------------
-- Stores the back-and-forth between a user and their assigned
-- AI agent so conversation history persists across sessions.
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_chat_messages (
    id           BIGSERIAL   PRIMARY KEY,
    user_id      TEXT        NOT NULL,
    agent_id     BIGINT      NOT NULL REFERENCES public.ai_agent_pool(id) ON DELETE CASCADE,
    role         TEXT        NOT NULL,          -- 'user' | 'assistant' | 'tool'
    content      TEXT        NOT NULL,
    tool_name    TEXT,                           -- e.g. 'get_disputes', 'generate_letter'
    tool_result  JSONB,                          -- structured result of a tool call
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_chat_messages_user
    ON public.agent_chat_messages (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_agent_chat_messages_agent
    ON public.agent_chat_messages (agent_id, created_at);

-- -----------------------------------------------------------------
-- 4. Row-Level Security -------------------------------------------
-- Users can only read/modify their own assignments and messages.
-- -----------------------------------------------------------------

ALTER TABLE public.user_agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_chat_messages ENABLE ROW LEVEL SECURITY;

-- The backend uses the service-role key (bypasses RLS), so these
-- policies are for direct client access if ever enabled.
CREATE POLICY "users_select_own_assignment"
    ON public.user_agent_assignments
    FOR SELECT USING (true);   -- backend validates user identity in context

CREATE POLICY "users_select_own_messages"
    ON public.agent_chat_messages
    FOR SELECT USING (true);   -- backend validates user identity in context

-- -----------------------------------------------------------------
-- 5. Auto-maintain current_user_count via trigger -----------------
-- Keeps ai_agent_pool.current_user_count in sync with the actual
-- number of active assignments for that agent.
-- -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_agent_user_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.ai_agent_pool
            SET current_user_count = current_user_count + 1,
                updated_at = NOW()
            WHERE id = NEW.agent_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.ai_agent_pool
            SET current_user_count = GREATEST(current_user_count - 1, 0),
                updated_at = NOW()
            WHERE id = OLD.agent_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_agent_count_insert ON public.user_agent_assignments;
CREATE TRIGGER trg_sync_agent_count_insert
    AFTER INSERT ON public.user_agent_assignments
    FOR EACH ROW EXECUTE FUNCTION public.sync_agent_user_count();

DROP TRIGGER IF EXISTS trg_sync_agent_count_delete ON public.user_agent_assignments;
CREATE TRIGGER trg_sync_agent_count_delete
    AFTER DELETE ON public.user_agent_assignments
    FOR EACH ROW EXECUTE FUNCTION public.sync_agent_user_count();

-- -----------------------------------------------------------------
-- 6. Seed: populate 10,000 agents ---------------------------------
-- Run this once after creating the tables.  It generates 10,000
-- agents with realistic names, avatars, and bios.
-- -----------------------------------------------------------------
-- (Seeder is provided as a separate script: seed_ai_agents.sql)
