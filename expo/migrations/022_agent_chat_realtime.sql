-- =================================================================
-- 022 — Live delivery for AI agent chat messages
--
-- Adds `agent_chat_messages` to the Supabase realtime publication so
-- every insert is pushed straight to subscribed clients over the
-- websocket. Without this the My Agent chat can only poll.
--
-- REPLICA IDENTITY FULL makes the whole row available in the change
-- payload (the default only ships the primary key), which is what lets
-- the client render an incoming message without a follow-up fetch.
-- =================================================================

ALTER TABLE public.agent_chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
    -- The publication exists on every hosted Supabase project, but guard
    -- anyway so this migration is safe to run on a bare Postgres too.
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'agent_chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_chat_messages;
    END IF;
END
$$;

-- Realtime enforces RLS on the subscriber's role. Migration 020 already
-- enables RLS with a permissive SELECT policy on this table (the backend
-- holds the service-role key and validates identity itself), so anon
-- subscribers can receive their own rows. The client always filters the
-- subscription by user_id.
