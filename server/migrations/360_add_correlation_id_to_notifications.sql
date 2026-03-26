-- Migration: Add correlation_id to notification logs
-- TASK: Enhance Admin Log Diagnostics

BEGIN;

-- Add correlation_id to email_notification_logs
ALTER TABLE "email_notification_logs" 
ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(100);

-- Add correlation_id to notification_logs
ALTER TABLE "notification_logs" 
ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(100);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_notification_logs_correlation_id ON "email_notification_logs" ("correlation_id");
CREATE INDEX IF NOT EXISTS idx_notification_logs_correlation_id ON "notification_logs" ("correlation_id");

COMMIT;
