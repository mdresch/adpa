-- Migration: 409_create_openui_chat_tables
-- Purpose: Persist project-bound OpenUI chat threads and structured message payloads

BEGIN;

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.openui_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New thread',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.openui_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.openui_chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_openui_chat_threads_user_project_updated
  ON public.openui_chat_threads(user_id, project_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_openui_chat_messages_thread_created
  ON public.openui_chat_messages(thread_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.set_openui_chat_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS openui_chat_threads_set_updated_at ON public.openui_chat_threads;

CREATE TRIGGER openui_chat_threads_set_updated_at
  BEFORE UPDATE ON public.openui_chat_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_openui_chat_threads_updated_at();

COMMIT;