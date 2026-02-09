-- Create document_entities table and trigger for automatic entity extraction
-- This integrates with the entity-extractor Edge Function

-- 1) Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2) Create document_entities table to store extracted entities
CREATE TABLE IF NOT EXISTS public.document_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  type TEXT,
  score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_document_entities_document_id 
ON public.document_entities(document_id);

CREATE INDEX IF NOT EXISTS idx_document_entities_entity 
ON public.document_entities(entity);

CREATE INDEX IF NOT EXISTS idx_document_entities_type 
ON public.document_entities(type) WHERE type IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE public.document_entities IS 'Stores entities extracted from documents by the entity-extractor Edge Function';
COMMENT ON COLUMN public.document_entities.document_id IS 'Reference to the source document';
COMMENT ON COLUMN public.document_entities.entity IS 'Extracted entity text (e.g., person name, organization, location)';
COMMENT ON COLUMN public.document_entities.type IS 'Entity type classification (e.g., PERSON, ORG, LOC)';
COMMENT ON COLUMN public.document_entities.score IS 'Confidence score (0-1) for the entity extraction';

-- 3) Create trigger function that calls the Edge Function via HTTP
CREATE OR REPLACE FUNCTION public.notify_entity_extractor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_url TEXT := current_setting('app.settings.entity_extractor_url', true);
  svc_key TEXT := current_setting('app.settings.service_role_key', true);
  http_response extensions.http_response;
BEGIN
  -- Skip if URL not configured
  IF fn_url IS NULL OR fn_url = '' THEN
    RAISE NOTICE 'entity_extractor_url not set in app.settings';
    RETURN NEW;
  END IF;

  -- Skip if service role key not configured
  IF svc_key IS NULL OR svc_key = '' THEN
    RAISE NOTICE 'service_role_key not set in app.settings';
    RETURN NEW;
  END IF;

  -- Fire-and-forget HTTP POST to Edge Function
  BEGIN
    SELECT * INTO http_response FROM extensions.http_post(
      url := fn_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || svc_key
      ),
      body := jsonb_build_object('document_id', NEW.id::text)
    );
    
    -- Log response for debugging (optional)
    IF http_response.status >= 400 THEN
      RAISE WARNING 'Entity extraction failed for document %: HTTP %', NEW.id, http_response.status;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Don't fail the insert if HTTP call fails
    RAISE WARNING 'Entity extraction HTTP call failed for document %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 4) Create trigger on documents table
DROP TRIGGER IF EXISTS trg_documents_entity_extract ON public.documents;
CREATE TRIGGER trg_documents_entity_extract
  AFTER INSERT ON public.documents
  FOR EACH ROW 
  EXECUTE FUNCTION public.notify_entity_extractor();

-- 5) Provide instructions for setting configuration
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Entity Extraction Setup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Set the Edge Function URL:';
  RAISE NOTICE '   SELECT set_config(''app.settings.entity_extractor_url'', ''https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor'', false);';
  RAISE NOTICE '';
  RAISE NOTICE '2. Set the Service Role Key:';
  RAISE NOTICE '   SELECT set_config(''app.settings.service_role_key'', ''YOUR_SERVICE_ROLE_KEY'', false);';
  RAISE NOTICE '';
  RAISE NOTICE '3. Test by inserting a document:';
  RAISE NOTICE '   INSERT INTO public.documents (content) VALUES (''Acme Corp met with John Doe in Paris.'');';
  RAISE NOTICE '';
  RAISE NOTICE '4. Check extracted entities:';
  RAISE NOTICE '   SELECT * FROM public.document_entities ORDER BY created_at DESC LIMIT 10;';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

SELECT 'document_entities table and trigger created successfully' AS status;
