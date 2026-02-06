-- Add issue_id column to mitigation_plans table
ALTER TABLE mitigation_plans ADD COLUMN IF NOT EXISTS issue_id UUID REFERENCES issues(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mitigation_plans_issue_id ON mitigation_plans(issue_id);
