-- Migration 419: Fix template_usage quality_score type
-- Aligning quality_score with template.quality_threshold (numeric(3, 2))
-- Converts existing integer percentages (e.g., 90) to decimals (0.90)

BEGIN;

-- Alter column type with explicit conversion
ALTER TABLE template_usage 
ALTER COLUMN quality_score TYPE numeric(3, 2) 
USING (CASE 
    WHEN quality_score IS NULL THEN NULL 
    WHEN quality_score > 1 THEN quality_score::numeric / 100.0 
    ELSE quality_score::numeric 
END);

COMMIT;
