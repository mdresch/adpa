-- Migration 324: PMBOK 8 Performance Domain Entity Tables
-- Purpose: Extend extraction storage to cover PMBOK 8 domains (Team, Development Approach,
--          Project Work, Measurement, Uncertainty) with dedicated entity tables and metrics.
-- Notes:
--   * All descriptive text fields intended to store generated content must remain Markdown.
--   * New tables follow existing conventions (uuid PK, project_id FK, created/updated timestamps).
--   * Where appropriate, textual identifiers are stored to avoid hard dependencies on user records.

BEGIN;

-- Ensure required extensions and helper trigger exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. Team Agreements (Team Performance Domain)
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (
    category IN (
      'working_hours',
      'communication',
      'decision_making',
      'conflict_resolution',
      'quality_standards',
      'meeting_norms',
      'code_of_conduct',
      'collaboration_tools',
      'response_times',
      'knowledge_sharing',
      'other'
    )
  ),
  agreed_by TEXT[] NOT NULL DEFAULT '{}',
  facilitated_by TEXT,
  effective_date DATE,
  review_frequency TEXT,
  next_review_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('draft', 'active', 'under_review', 'revised', 'deprecated')
  ),
  adherence_score NUMERIC(4,1),
  violations_count INTEGER DEFAULT 0,
  last_violation_date DATE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  notes TEXT,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, title)
);

CREATE INDEX IF NOT EXISTS idx_team_agreements_project_id ON team_agreements(project_id);
CREATE INDEX IF NOT EXISTS idx_team_agreements_category ON team_agreements(category);
CREATE TRIGGER trg_team_agreements_updated_at
  BEFORE UPDATE ON team_agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. Enhance existing resources table for Team Performance Domain coverage
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'competency_level'
  ) THEN
    ALTER TABLE resources ADD COLUMN competency_level TEXT CHECK (
      competency_level IN ('junior', 'intermediate', 'senior', 'expert')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'certifications'
  ) THEN
    ALTER TABLE resources ADD COLUMN certifications TEXT[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'training_needs'
  ) THEN
    ALTER TABLE resources ADD COLUMN training_needs TEXT[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'team_assignment'
  ) THEN
    ALTER TABLE resources ADD COLUMN team_assignment TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'performance_rating'
  ) THEN
    ALTER TABLE resources ADD COLUMN performance_rating NUMERIC(4,1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'development_plan'
  ) THEN
    ALTER TABLE resources ADD COLUMN development_plan TEXT;
  END IF;
END
$$;

-- ============================================================================
-- 3. Development Approach & Life Cycle tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS development_approaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  approach TEXT NOT NULL CHECK (
    approach IN ('agile', 'waterfall', 'hybrid', 'iterative', 'custom')
  ),
  framework TEXT,
  lifecycle_model TEXT,
  iteration_length_weeks INTEGER CHECK (iteration_length_weeks >= 0),
  ceremonies TEXT[] NOT NULL DEFAULT '{}',
  artifacts TEXT[] NOT NULL DEFAULT '{}',
  tailoring_decisions TEXT,
  governance_notes TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_development_approaches_project_id ON development_approaches(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_development_approaches_unique
  ON development_approaches (project_id, approach, COALESCE(framework, ''));
CREATE TRIGGER trg_development_approaches_updated_at
  BEFORE UPDATE ON development_approaches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS project_iterations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  iteration_type TEXT NOT NULL DEFAULT 'sprint' CHECK (
    iteration_type IN ('sprint', 'iteration', 'program_increment', 'release', 'phase')
  ),
  sequence_number INTEGER,
  start_date DATE,
  end_date DATE,
  goals TEXT[] NOT NULL DEFAULT '{}',
  planned_story_points INTEGER,
  completed_story_points INTEGER,
  velocity INTEGER,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (
    status IN ('planned', 'active', 'completed', 'cancelled')
  ),
  retrospective_summary TEXT,
  impediments TEXT[] NOT NULL DEFAULT '{}',
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_project_iterations_project_id ON project_iterations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_iterations_status ON project_iterations(status);
CREATE TRIGGER trg_project_iterations_updated_at
  BEFORE UPDATE ON project_iterations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Project Work Performance Domain tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  activity_name TEXT,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  assigned_to TEXT,
  estimated_hours NUMERIC(10,2),
  actual_hours NUMERIC(10,2),
  progress_percentage NUMERIC(5,2) CHECK (progress_percentage BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (
    status IN ('todo', 'in_progress', 'review', 'done', 'blocked')
  ),
  blockers TEXT[] NOT NULL DEFAULT '{}',
  completed_date DATE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_work_items_project_id ON work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
CREATE TRIGGER trg_work_items_updated_at
  BEFORE UPDATE ON work_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS capacity_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  team_member TEXT NOT NULL,
  role TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  available_hours NUMERIC(10,2),
  allocated_hours NUMERIC(10,2),
  utilization_percentage NUMERIC(5,2) CHECK (utilization_percentage BETWEEN 0 AND 200),
  notes TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, team_member, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_capacity_plans_project_id ON capacity_plans(project_id);
CREATE TRIGGER trg_capacity_plans_updated_at
  BEFORE UPDATE ON capacity_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Measurement Performance Domain tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS performance_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  success_criterion_id UUID REFERENCES success_criteria(id) ON DELETE SET NULL,
  success_criterion_name TEXT NOT NULL,
  measurement_date DATE NOT NULL,
  actual_value NUMERIC(18,4),
  target_value NUMERIC(18,4),
  units TEXT,
  variance NUMERIC(18,4),
  variance_percentage NUMERIC(8,4),
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
  status TEXT NOT NULL DEFAULT 'on_track' CHECK (
    status IN ('on_track', 'at_risk', 'off_track')
  ),
  notes TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, success_criterion_name, measurement_date)
);

CREATE INDEX IF NOT EXISTS idx_performance_measurements_project_id ON performance_measurements(project_id);
CREATE INDEX IF NOT EXISTS idx_performance_measurements_status ON performance_measurements(status);
CREATE TRIGGER trg_performance_measurements_updated_at
  BEFORE UPDATE ON performance_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS earned_value_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  measurement_date DATE NOT NULL,
  planned_value NUMERIC(18,4),
  earned_value NUMERIC(18,4),
  actual_cost NUMERIC(18,4),
  schedule_variance NUMERIC(18,4),
  cost_variance NUMERIC(18,4),
  schedule_performance_index NUMERIC(10,4),
  cost_performance_index NUMERIC(10,4),
  estimate_at_completion NUMERIC(18,4),
  estimate_to_complete NUMERIC(18,4),
  notes TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, measurement_date)
);

CREATE INDEX IF NOT EXISTS idx_earned_value_metrics_project_id ON earned_value_metrics(project_id);
CREATE TRIGGER trg_earned_value_metrics_updated_at
  BEFORE UPDATE ON earned_value_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. Uncertainty Performance Domain enhancements
-- ============================================================================
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  probability TEXT CHECK (probability IN ('very_high', 'high', 'medium', 'low', 'very_low')),
  benefit_level TEXT CHECK (benefit_level IN ('very_high', 'high', 'medium', 'low', 'very_low')),
  exploitation_strategy TEXT,
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'identified' CHECK (
    status IN ('identified', 'planned', 'exploiting', 'realized', 'missed')
  ),
  expected_benefit NUMERIC(18,4),
  trigger_conditions TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, title)
);

CREATE INDEX IF NOT EXISTS idx_opportunities_project_id ON opportunities(project_id);
CREATE TRIGGER trg_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS risk_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,
  risk_title TEXT,
  response_date DATE,
  action_taken TEXT,
  effectiveness TEXT CHECK (
    effectiveness IN ('effective', 'partially_effective', 'ineffective')
  ),
  cost_of_response NUMERIC(18,4),
  residual_risk_level TEXT CHECK (
    residual_risk_level IN ('very_high', 'high', 'medium', 'low', 'very_low')
  ),
  owner TEXT,
  notes TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, risk_title, response_date)
);

CREATE INDEX IF NOT EXISTS idx_risk_responses_project_id ON risk_responses(project_id);
CREATE INDEX IF NOT EXISTS idx_risk_responses_risk_id ON risk_responses(risk_id);
CREATE TRIGGER trg_risk_responses_updated_at
  BEFORE UPDATE ON risk_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

