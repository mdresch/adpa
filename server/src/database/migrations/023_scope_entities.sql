-- Scope Domain Entities

-- Scope Baseline
DROP TABLE IF EXISTS scope_baseline CASCADE;
CREATE TABLE scope_baseline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  statement TEXT,
  boundaries TEXT,
  inclusions TEXT[],
  exclusions TEXT[],
  assumptions TEXT[],
  constraints TEXT[],
  approval_date TIMESTAMP WITH TIME ZONE,
  version VARCHAR(50),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scope_baseline_project_id ON scope_baseline(project_id);

-- WBS Nodes
DROP TABLE IF EXISTS wbs_nodes CASCADE;
CREATE TABLE wbs_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  wbs_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  level INTEGER,
  parent_code VARCHAR(50),
  description TEXT,
  owner VARCHAR(255),
  status VARCHAR(50),
  estimated_effort NUMERIC,
  estimated_cost NUMERIC,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wbs_nodes_project_id ON wbs_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_nodes_code ON wbs_nodes(project_id, wbs_code);

-- Scope Change Requests
DROP TABLE IF EXISTS scope_change_requests CASCADE;
CREATE TABLE scope_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  request_id VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  requestor VARCHAR(255),
  impact_analysis TEXT,
  cost_impact NUMERIC,
  schedule_impact_days INTEGER,
  status VARCHAR(50), -- 'Key', 'Pending', 'Approved', 'Rejected'
  decision_date TIMESTAMP WITH TIME ZONE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scope_change_requests_project_id ON scope_change_requests(project_id);

-- Requirements Traceability
DROP TABLE IF EXISTS requirements_traceability CASCADE;
CREATE TABLE requirements_traceability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requirement_id VARCHAR(100),
  deliverable_id VARCHAR(100),
  wbs_code VARCHAR(50),
  test_case_id VARCHAR(100),
  status VARCHAR(50),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requirements_traceability_project_id ON requirements_traceability(project_id);

-- Scope Verification
DROP TABLE IF EXISTS scope_verification CASCADE;
CREATE TABLE scope_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  deliverable_name VARCHAR(255),
  verification_date TIMESTAMP WITH TIME ZONE,
  verifier VARCHAR(255),
  method VARCHAR(100), -- 'Inspection', 'Test', 'Review'
  outcome VARCHAR(50), -- 'Accepted', 'Rejected', 'Conditionally Accepted'
  comments TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scope_verification_project_id ON scope_verification(project_id);
