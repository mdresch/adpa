BEGIN;

-- UP: Create OpenUI Chat tables

CREATE TABLE IF NOT EXISTS openui_chat_threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  project_id  TEXT,
  title       TEXT NOT NULL DEFAULT 'New conversation',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_openui_chat_threads_user_id     ON openui_chat_threads (user_id);
CREATE INDEX IF NOT EXISTS idx_openui_chat_threads_project_id  ON openui_chat_threads (project_id);

CREATE TABLE IF NOT EXISTS openui_chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES openui_chat_threads (id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_openui_chat_messages_thread_id ON openui_chat_messages (thread_id);
CREATE INDEX IF NOT EXISTS idx_openui_chat_messages_user_id   ON openui_chat_messages (user_id);

COMMIT;

-- DOWN: Drop OpenUI Chat tables
-- BEGIN;
-- DROP TABLE IF EXISTS openui_chat_messages;
-- DROP TABLE IF EXISTS openui_chat_threads;
-- COMMIT;
