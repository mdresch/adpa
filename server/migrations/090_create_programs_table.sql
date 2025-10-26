/*
UP: create programs table, add indexes and program_id on projects
DOWN: revert changes
*/

-- UP
BEGIN;

-- ensure gen_random_uuid() is available (matches project pattern in 050_create_projects_table.sql)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- create programs table
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  budget DECIMAL(15,2) CHECK (budget >= 0),
  currency VARCHAR(3) DEFAULT 'USD',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),
  status VARCHAR(10) DEFAULT 'green' CHECK (status IN ('green','amber','red')),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_programs_owner_id ON programs(owner_id);
CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);
CREATE INDEX IF NOT EXISTS idx_programs_start_date ON programs(start_date);
CREATE INDEX IF NOT EXISTS idx_programs_end_date ON programs(end_date);

-- full-text search index on name + description
CREATE INDEX IF NOT EXISTS idx_programs_search ON programs USING GIN (
  (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')))
);

-- add program_id to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE SET NULL;

-- index for project -> program lookups
CREATE INDEX IF NOT EXISTS idx_projects_program_id ON projects(program_id);

-- comments (table and columns)
COMMENT ON TABLE programs IS 'Groups related projects into programs';
COMMENT ON COLUMN programs.id IS 'Primary key (UUID)';
COMMENT ON COLUMN programs.name IS 'Program name';
COMMENT ON COLUMN programs.description IS 'Detailed description of the program';
COMMENT ON COLUMN programs.budget IS 'Monetary budget for the program (non-negative)';
COMMENT ON COLUMN programs.currency IS 'Three-letter ISO currency code';
COMMENT ON COLUMN programs.start_date IS 'Program start date';
COMMENT ON COLUMN programs.end_date IS 'Program end date (must be >= start_date)';
COMMENT ON COLUMN programs.status IS 'Program health/status: green, amber, or red';
COMMENT ON COLUMN programs.owner_id IS 'User who owns this program (references users.id)';
COMMENT ON COLUMN programs.created_by IS 'User who created the program (references users.id)';
COMMENT ON COLUMN programs.created_at IS 'Creation timestamp';
COMMENT ON COLUMN programs.updated_at IS 'Last update timestamp';
COMMENT ON COLUMN projects.program_id IS 'References programs.id; grouping for related projects';

COMMIT;

-- DOWN
BEGIN;

-- remove project -> program relationship and index
DROP INDEX IF EXISTS idx_projects_program_id;
ALTER TABLE projects DROP COLUMN IF EXISTS program_id;

-- drop program indexes
DROP INDEX IF EXISTS idx_programs_search;
DROP INDEX IF EXISTS idx_programs_owner_id;
DROP INDEX IF EXISTS idx_programs_status;
DROP INDEX IF EXISTS idx_programs_start_date;
DROP INDEX IF EXISTS idx_programs_end_date;

-- drop table
DROP TABLE IF EXISTS programs;

COMMIT;