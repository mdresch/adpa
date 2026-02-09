-- Create a function to notify the Edge Function
CREATE OR REPLACE FUNCTION public.notify_ingest_embeddings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_url TEXT := current_setting('app.settings.ingest_embeddings_url', true);
  svc_key TEXT := current_setting('app.settings.service_role_key', true);
  http_response extensions.http_response;
BEGIN
  -- 1. Check if URL is configured
  IF fn_url IS NULL OR fn_url = '' THEN
    -- Fallback to hardcoded URL for now, or log warning
    -- For development, we might not have app.settings populated yet.
    -- RAISE WARNING 'ingest_embeddings_url not set in app.settings';
    -- RETURN NEW;
     fn_url := 'https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/ingest-embeddings';
  END IF;

  -- 2. Check Service Role Key
  IF svc_key IS NULL OR svc_key = '' THEN
    RAISE WARNING 'service_role_key not set in app.settings. Cannot trigger ingestion.';
    RETURN NEW;
  END IF;

  -- 3. Call Edge Function
  BEGIN
    SELECT * INTO http_response FROM extensions.http((
      'POST',
      fn_url, 
      ARRAY[extensions.http_header('Content-Type', 'application/json'), extensions.http_header('Authorization', 'Bearer ' || svc_key)],
      'application/json',
      jsonb_build_object(
          'record', row_to_json(NEW),
          'type', TG_OP,
          'table', TG_TABLE_NAME,
          'schema', TG_TABLE_SCHEMA
      )::text
    )::extensions.http_request);
    
    -- Log success/failure (optional)
    IF http_response.status >= 400 THEN
      RAISE WARNING 'Ingest Embeddings failed for document %: HTTP %', NEW.id, http_response.status;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Ingest Embeddings HTTP call failed for document %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_documents_embed ON public.documents;

CREATE TRIGGER trg_documents_embed
AFTER INSERT ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.notify_ingest_embeddings();

-- Grant permissions if needed
GRANT EXECUTE ON FUNCTION public.notify_ingest_embeddings() TO postgres, anon, authenticated, service_role;
