-- Migration: Add correlation_id to extracted entity tables
-- This migration adds a correlation_id column to various tables that store
-- entities extracted from documents. This enhances traceability, linking the
-- created entity back to the specific API request that triggered its extraction.

BEGIN;

ALTER TABLE "requirements" ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(100);
ALTER TABLE "risks" ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(100);
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(100);
ALTER TABLE "scope_items" ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(100);
ALTER TABLE "project_goals" ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(100);
ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(100);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_requirements_correlation_id ON "requirements" ("correlation_id");
CREATE INDEX IF NOT EXISTS idx_risks_correlation_id ON "risks" ("correlation_id");
CREATE INDEX IF NOT EXISTS idx_resources_correlation_id ON "resources" ("correlation_id");
CREATE INDEX IF NOT EXISTS idx_scope_items_correlation_id ON "scope_items" ("correlation_id");
CREATE INDEX IF NOT EXISTS idx_project_goals_correlation_id ON "project_goals" ("correlation_id");
CREATE INDEX IF NOT EXISTS idx_project_tasks_correlation_id ON "project_tasks" ("correlation_id");

COMMIT;
