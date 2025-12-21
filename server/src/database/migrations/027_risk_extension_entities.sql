-- Risk Extensions and Issue Domain Entities

-- Risk Appetite
DROP TABLE IF EXISTS risk_appetite CASCADE;
CREATE TABLE risk_appetite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category VARCHAR(100), -- 'Financial', 'Schedule', 'Quality', 'Safety'
  threshold_description TEXT,
  level VARCHAR(50), -- 'Low', 'Medium', 'High'
  approval_body VARCHAR(255),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_risk_appetite_project_id ON risk_appetite(project_id);

-- Risk Checklists
DROP TABLE IF EXISTS risk_checklists CASCADE;
CREATE TABLE risk_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category VARCHAR(100),
  item_description TEXT,
  risk_factors TEXT[],
  last_checked TIMESTAMP WITH TIME ZONE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_risk_checklists_project_id ON risk_checklists(project_id);

-- Probability Impact Matrix
DROP TABLE IF EXISTS probability_impact_matrix CASCADE;
CREATE TABLE probability_impact_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  probability_level VARCHAR(50),
  impact_level VARCHAR(50),
  risk_score NUMERIC,
  action_level VARCHAR(50), -- 'Immediate', 'Monitor', 'Accept'
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prob_impact_matrix_project_id ON probability_impact_matrix(project_id);

-- Issue Log
DROP TABLE IF EXISTS issue_log CASCADE;
CREATE TABLE issue_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  issue_id VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20), -- 'High', 'Medium', 'Low'
  status VARCHAR(20), -- 'Open', 'In Progress', 'Resolved', 'Closed'
  owner VARCHAR(255),
  opened_date TIMESTAMP WITH TIME ZONE,
  target_resolution_date TIMESTAMP WITH TIME ZONE,
  actual_resolution_date TIMESTAMP WITH TIME ZONE,
  resolution_description TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_issue_log_project_id ON issue_log(project_id);

-- Lessons Learned
DROP TABLE IF EXISTS lessons_learned CASCADE;
CREATE TABLE lessons_learned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category VARCHAR(100),
  description TEXT,
  situation TEXT,
  outcome TEXT,
  recommendations TEXT,
  positive_or_negative VARCHAR(20), -- 'Positive', 'Negative'
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lessons_learned_project_id ON lessons_learned(project_id);
