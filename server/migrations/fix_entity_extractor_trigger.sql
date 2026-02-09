CREATE OR REPLACE FUNCTION public.notify_entity_extractor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  fn_url text := current_setting('app.settings.entity_extractor_url', true);
  svc_key text := current_setting('app.settings.service_role_key', true);
  http_response extensions.http_response;
begin
  if fn_url is null or fn_url = '' then
    -- raise notice 'entity extractor URL not set';
    -- return new;
    fn_url := 'https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor';
  end if;

  if svc_key is null or svc_key = '' then
    raise notice 'service role key not set';
    return new;
  end if;

  -- Switched to extensions.http() for proper JSON support
  SELECT * INTO http_response FROM extensions.http((
      'POST',
      fn_url,
      ARRAY[extensions.http_header('Content-Type', 'application/json'), extensions.http_header('Authorization', 'Bearer ' || svc_key)],
      'application/json',
      jsonb_build_object('document_id', NEW.id::text)::text
  )::extensions.http_request);

  return new;
end;
$function$;
