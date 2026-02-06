DO $$
BEGIN
    -- Drop the constraint if it exists to avoid errors when re-creating
    ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_status_check;
    
    -- Add the constraint back with 'materialized' included
    ALTER TABLE risks ADD CONSTRAINT risks_status_check 
    CHECK (status IN ('identified', 'assessed', 'mitigated', 'closed', 'active', 'monitoring', 'materialized'));
END $$;
