-- Prevents duplicate empty placeholder documents for the same project+template
-- combination. documentGenerationService.generateDocument() pre-inserts a
-- minimal status='draft', empty-content document row before drafting starts
-- (to satisfy foreign-key-dependent child inserts during parallel section
-- drafting). That insert used to be guarded only by an application-level
-- SELECT-then-INSERT check, which raced under concurrent/broker-redelivered
-- processing of the same generation (nodemon restart mid-flight, RabbitMQ
-- redelivery, the 15-minute ai-generate timeout racing an in-flight attempt):
-- multiple attempts each saw "no existing draft" before any of them had
-- committed, and each minted its own duplicate placeholder. Observed live: up
-- to 9 duplicate document rows for a single logical generation request.
--
-- This partial unique index enforces the same invariant atomically at the
-- database level: at most one empty draft may exist per (project_id,
-- template_id) at a time. Once real content is written, content is no longer
-- empty, the row falls outside the index predicate, and the constraint no
-- longer applies to it — a project can have many completed documents from the
-- same template, only ever one pending empty draft at a time.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_one_empty_draft_per_template
ON public.documents (project_id, template_id)
WHERE status = 'draft' AND (content IS NULL OR content = '');

COMMIT;
