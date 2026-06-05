/* tsql-lint disable */
-- Drop the check constraint on entity_type column to allow all 80+ entity types in the central store
ALTER TABLE public."entity_extractions" DROP CONSTRAINT IF EXISTS "entity_extractions_entity_type_check";
