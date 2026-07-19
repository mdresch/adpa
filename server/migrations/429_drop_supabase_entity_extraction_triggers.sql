-- Azure Postgres migration: these two AFTER INSERT triggers on public.documents call out
-- to a Supabase Edge Function (entity-extractor) via the `http`/`extensions.http` extension,
-- which is not available on Azure Database for PostgreSQL. One trigger was already
-- permanently inert (trigger_entity_extraction: hardcoded placeholder service key that was
-- never filled in). The other (notify_entity_extractor) depends on a Supabase-only
-- database-level GUC (app.settings.service_role_key) configured outside of migrations.
-- The Express-side stand-in (POST /api/rag/extract-entities/batch) is currently a stub, so
-- this feature (auto-tagging documents with PROJECT_NAME/MILESTONE/RISK/etc. entities on
-- creation) is deliberately deferred rather than ported as part of this migration -- dropping
-- these avoids a runtime error/no-op on every document insert once the `http` extension is
-- gone.

BEGIN;

DROP TRIGGER IF EXISTS on_document_created_extract_entities ON public.documents;
DROP TRIGGER IF EXISTS trg_documents_entity_extract ON public.documents;
DROP FUNCTION IF EXISTS public.trigger_entity_extraction();
DROP FUNCTION IF EXISTS public.notify_entity_extractor();

COMMIT;
