-- Governance Domain Entities

-- Governance Decisions
DROP TABLE IF EXISTS governance_decisions CASCADE;
CREATE TABLE governance_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  decision_id VARCHAR(100), -- ID extracted from doc
  decision_type VARCHAR(100),
  description TEXT,
  outcome VARCHAR(50), -- 'Approved', 'Rejected', 'Deferred'
  rationale TEXT,
  decision_makers TEXT[], -- Array of names or IDs
  decision_date TIMESTAMP WITH TIME ZONE,
  implementation_status VARCHAR(50),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_governance_decisions_project_id ON governance_decisions(project_id);

-- Approval Workflows
DROP TABLE IF EXISTS approval_workflows CASCADE;
CREATE TABLE approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_condition TEXT,
  approvers TEXT[], -- Array of roles or names
  sla_hours INTEGER,
  status VARCHAR(50),
  gates TEXT[],
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approval_workflows_project_id ON approval_workflows(project_id);

-- Steering Committees
DROP TABLE IF EXISTS steering_committees CASCADE;
CREATE TABLE steering_committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  mandate TEXT,
  members TEXT[], -- Array of names/roles
  meeting_cadence VARCHAR(100),
  last_meeting_date TIMESTAMP WITH TIME ZONE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_steering_committees_project_id ON steering_committees(project_id);

-- Change Control Boards
DROP TABLE IF EXISTS change_control_boards CASCADE;
CREATE TABLE change_control_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  authority_level VARCHAR(255),
  members TEXT[],
  decision_criteria TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_change_control_boards_project_id ON change_control_boards(project_id);

-- Policy Compliance
DROP TABLE IF EXISTS policy_compliance CASCADE;
CREATE TABLE policy_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  policy_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  compliance_status VARCHAR(50), -- 'Compliant', 'Non-Compliant', 'At Risk'
  findings TEXT,
  last_audit_date TIMESTAMP WITH TIME ZONE,
  next_audit_date TIMESTAMP WITH TIME ZONE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_policy_compliance_project_id ON policy_compliance(project_id);
