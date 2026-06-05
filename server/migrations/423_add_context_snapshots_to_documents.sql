/* tsql-lint disable */
-- Migration: Add context_snapshots column to documents table for Multi-Scale Context Compactor
-- Stores 80%, 60%, 40%, and 20% summaries for adaptive context injection.

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS context_snapshots JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN documents.context_snapshots IS 'Stores recursive summaries (p80, p60, p40, p20) for token-efficient context injection.';
