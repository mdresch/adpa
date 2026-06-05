-- Migration: Add get_all_entity_counts_for_template function
-- Resolves "GKG unavailable" error by providing the aggregation function for template-specific entity counts.

CREATE OR REPLACE FUNCTION public.get_all_entity_counts_for_template(template_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  result JSONB := '{}'::JSONB;
BEGIN
  -- We aggregate entity_counts from all documents associated with this template.
  -- The documents.entity_counts field is a JSONB object created during extraction.
  
  SELECT 
    jsonb_object_agg(key, sum_value)
  FROM (
    SELECT 
      key, 
      SUM((value)::INTEGER) as sum_value
    FROM documents d,
         jsonb_each_text(d.entity_counts)
    WHERE d.template_id = template_id_param
      AND d.deleted_at IS NULL
      AND key <> 'total'
    GROUP BY key
  ) s INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$function$;
