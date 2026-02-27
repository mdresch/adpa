-- Migration 400: Align Hierarchy and Formalize Checklist Items (REVISED)
-- Purpose: 
-- 1. Enhance existing checklist_items table
-- 2. Link programs to portfolio_governance (Strategic Portfolio -> Program)
-- 3. Remove inverted program_id from portfolio_governance

BEGIN;

-- 1. Enhance existing checklist_items table
-- If it doesn't exist, create it. If it does, add missing columns.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'checklist_items') THEN
        CREATE TABLE checklist_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID NOT NULL,
          item_name VARCHAR(255) NOT NULL,
          description TEXT,
          sequence_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
    END IF;
END $$;

-- Add new columns to checklist_items if they don't exist
ALTER TABLE checklist_items 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS completed_date DATE,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS actual_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS depends_on_items UUID[],
  ADD COLUMN IF NOT EXISTS blocks_items UUID[],
  ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT[],
  ADD COLUMN IF NOT EXISTS requires_validation BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS validation_notes TEXT,
  ADD COLUMN IF NOT EXISTS quality_gate_id UUID,
  ADD COLUMN IF NOT EXISTS must_pass_to_proceed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deliverable_id UUID,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Sync status with is_completed if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'checklist_items' AND column_name = 'is_completed') THEN
        UPDATE checklist_items SET status = CASE WHEN is_completed THEN 'completed' ELSE 'pending' END WHERE status = 'pending';
    END IF;
END $$;

-- 2. Align Portfolio -> Program hierarchy
-- Add portfolio_id to programs
ALTER TABLE programs 
  ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES portfolio_governance(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_programs_portfolio ON programs(portfolio_id);

-- Migration logic: If any portfolio has a program_id, flip the relationship
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'portfolio_governance' AND column_name = 'program_id') THEN
        UPDATE programs p
        SET portfolio_id = pg.id
        FROM portfolio_governance pg
        WHERE pg.program_id = p.id;
    END IF;
END $$;

-- 3. Remove inverted program_id from portfolio_governance
ALTER TABLE portfolio_governance DROP COLUMN IF EXISTS program_id;

-- 4. Comments
COMMENT ON TABLE checklist_items IS 'Checklist items (subtasks) belonging to tasks';
COMMENT ON COLUMN programs.portfolio_id IS 'References the parent portfolio in the hierarchy (Portfolio -> Program -> Project)';

COMMIT;
