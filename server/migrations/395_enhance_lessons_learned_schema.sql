BEGIN;

-- Add new columns to lessons_learned table
ALTER TABLE lessons_learned
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'identified',
ADD COLUMN IF NOT EXISTS phase VARCHAR(100),
ADD COLUMN IF NOT EXISTS date_identified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS severity VARCHAR(50) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
ADD COLUMN IF NOT EXISTS ai_confidence FLOAT,
ADD COLUMN IF NOT EXISTS applicable_to JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS shared_with_org BOOLEAN DEFAULT FALSE;

-- Add check constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_lessons_learned_status') THEN
        ALTER TABLE lessons_learned
        ADD CONSTRAINT check_lessons_learned_status
        CHECK (status IN ('identified', 'documented', 'shared', 'applied', 'archived'));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_lessons_learned_severity') THEN
        ALTER TABLE lessons_learned
        ADD CONSTRAINT check_lessons_learned_severity
        CHECK (severity IN ('low', 'medium', 'high', 'critical'));
    END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_lessons_learned_status ON lessons_learned(status);
CREATE INDEX IF NOT EXISTS idx_lessons_learned_severity ON lessons_learned(severity);
CREATE INDEX IF NOT EXISTS idx_lessons_learned_shared ON lessons_learned(shared_with_org);

COMMIT;
