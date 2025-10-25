-- Fix numeric field overflow in stage_executions table
-- Change quality_score from NUMERIC(3,2) to NUMERIC(5,2) to support 0-100 range
-- Change execution_time from INTEGER to BIGINT for large execution times

ALTER TABLE stage_executions 
ALTER COLUMN quality_score TYPE NUMERIC(5,2);

ALTER TABLE stage_executions 
ALTER COLUMN execution_time TYPE BIGINT;

-- Add comment explaining the ranges
COMMENT ON COLUMN stage_executions.quality_score IS 'Quality score as percentage (0.00-100.00) or decimal (0.00-1.00)';
COMMENT ON COLUMN stage_executions.execution_time IS 'Execution time in milliseconds (BIGINT for large values)';

