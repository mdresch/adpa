-- Migration: Add correlation_id to notification logs
-- TASK: Enhance Admin Log Diagnostics

BEGIN;

-- Add correlation_id to email_notification_logs
-- Guarded: this table has never existed in production (see
-- server/migrations/000_baseline.sql, which has notification_logs but no
-- email_notification_logs) -- no-op if absent rather than failing outright.
DO $$
BEGIN
  IF to_regclass('public.email_notification_logs') IS NOT NULL THEN
    ALTER TABLE "email_notification_logs" ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(100);
    CREATE INDEX IF NOT EXISTS idx_email_notification_logs_correlation_id ON "email_notification_logs" ("correlation_id");
  END IF;
END $$;

-- Add correlation_id to notification_logs
ALTER TABLE "notification_logs"
ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(100);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_logs_correlation_id ON "notification_logs" ("correlation_id");

COMMIT;
