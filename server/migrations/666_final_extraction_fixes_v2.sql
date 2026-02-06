-- Migration 666 v2: Final extraction fixes (with duplicate cleanup)

-- 1. onboarding_offboarding: add start_date
ALTER TABLE onboarding_offboarding 
ADD COLUMN IF NOT EXISTS start_date DATE;

-- 2. contingency_reserves: add category
ALTER TABLE contingency_reserves 
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- 3. stakeholder_issues: make issue_title nullable
ALTER TABLE stakeholder_issues 
ALTER COLUMN issue_title DROP NOT NULL;

-- 4. resources table: add description
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 5. resource_conflicts: add conflict_description
ALTER TABLE resource_conflicts 
ADD COLUMN IF NOT EXISTS conflict_description TEXT;

-- 6. performance_actuals: Remove duplicates FIRST, then add constraint
-- Delete duplicate rows, keeping only the most recent one
DELETE FROM performance_actuals a
USING performance_actuals b
WHERE a.id < b.id
AND a.project_id = b.project_id
AND a.measurement_date = b.measurement_date;

-- Now add the unique constraint
ALTER TABLE performance_actuals 
ADD CONSTRAINT performance_actuals_project_measurement_unique 
UNIQUE (project_id, measurement_date);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_offboarding_start_date ON onboarding_offboarding(start_date);
CREATE INDEX IF NOT EXISTS idx_contingency_reserves_category ON contingency_reserves(category);
CREATE INDEX IF NOT EXISTS idx_resources_description ON resources USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_resource_conflicts_description ON resource_conflicts USING gin(to_tsvector('english', conflict_description));

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 666 v2 completed - Final extraction fixes applied';
    RAISE NOTICE '  • Removed duplicate performance_actuals rows';
    RAISE NOTICE '  • onboarding_offboarding.start_date added';
    RAISE NOTICE '  • contingency_reserves.category added';
    RAISE NOTICE '  • stakeholder_issues.issue_title made nullable';
    RAISE NOTICE '  • resources.description added';
    RAISE NOTICE '  • resource_conflicts.conflict_description added';
    RAISE NOTICE '  • performance_actuals unique constraint added';
END $$;
