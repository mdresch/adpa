-- Strategic Governance and Analysis Domain Entities

-- Project Charter Details
DROP TABLE IF EXISTS project_charter_details CASCADE;
CREATE TABLE project_charter_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vision_statement TEXT,
  strategic_alignment TEXT,
  high_level_objectives TEXT[],
  success_measures TEXT[],
  executive_sponsor VARCHAR(255),
  approval_date TIMESTAMP WITH TIME ZONE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_charter_details_project_id ON project_charter_details(project_id);

-- Business Case Details
DROP TABLE IF EXISTS business_case_details CASCADE;
CREATE TABLE business_case_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  problem_statement TEXT,
  proposed_solution TEXT,
  estimated_roi NUMERIC,
  payback_period_months INTEGER,
  npv_value NUMERIC,
  strategic_category VARCHAR(100),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_case_details_project_id ON business_case_details(project_id);

-- Benefit Realization Plan
DROP TABLE IF EXISTS benefit_realization_plan CASCADE;
CREATE TABLE benefit_realization_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  benefit_description TEXT NOT NULL,
  target_value NUMERIC,
  measurement_frequency VARCHAR(50),
  realization_date TIMESTAMP WITH TIME ZONE,
  owner VARCHAR(255),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_benefit_realization_project_id ON benefit_realization_plan(project_id);

-- General Change Requests (Beyond Scope)
DROP TABLE IF EXISTS general_change_requests CASCADE;
CREATE TABLE general_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  request_id VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  change_type VARCHAR(100), -- 'Budget', 'Schedule', 'Quality', 'Resources'
  impact_summary TEXT,
  justification TEXT,
  status VARCHAR(50), -- 'Key', 'Pending', 'Approved', 'Rejected'
  decision_date TIMESTAMP WITH TIME ZONE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gen_change_requests_project_id ON general_change_requests(project_id);

-- Project Team Evaluations
DROP TABLE IF EXISTS project_team_evaluations CASCADE;
CREATE TABLE project_team_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  person_name VARCHAR(255),
  evaluation_date TIMESTAMP WITH TIME ZONE,
  performance_score INTEGER,
  strengths TEXT,
  development_areas TEXT,
  evaluator VARCHAR(255),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_evaluations_project_id ON project_team_evaluations(project_id);
