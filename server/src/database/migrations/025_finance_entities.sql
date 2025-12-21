-- Finance Domain Entities

-- Budget Baseline
DROP TABLE IF EXISTS budget_baseline CASCADE;
CREATE TABLE budget_baseline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  total_budget NUMERIC,
  currency VARCHAR(10) DEFAULT 'USD',
  categories JSONB, -- { "labor": 1000, "material": 500 }
  approval_date TIMESTAMP WITH TIME ZONE,
  version VARCHAR(50),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_budget_baseline_project_id ON budget_baseline(project_id);

-- Cost Estimates
DROP TABLE IF EXISTS cost_estimates CASCADE;
CREATE TABLE cost_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  wbs_code VARCHAR(50),
  estimated_cost NUMERIC,
  basis_of_estimate TEXT, -- How was it calculated?
  contingency_buffer NUMERIC DEFAULT 0,
  confidence_level VARCHAR(50),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cost_estimates_project_id ON cost_estimates(project_id);

-- Funding Tranches (Funding Requirements)
DROP TABLE IF EXISTS funding_tranches CASCADE;
CREATE TABLE funding_tranches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tranche_name VARCHAR(100),
  amount NUMERIC,
  required_date TIMESTAMP WITH TIME ZONE,
  received_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50), -- 'Planned', 'Requested', 'Received'
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_funding_tranches_project_id ON funding_tranches(project_id);

-- Financial Variances (Cost Control)
DROP TABLE IF EXISTS financial_variances CASCADE;
CREATE TABLE financial_variances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_date TIMESTAMP WITH TIME ZONE,
  cv_value NUMERIC, -- Cost Variance
  cpi_value NUMERIC, -- Cost Performance Index
  eac_value NUMERIC, -- Estimate at Completion
  etc_value NUMERIC, -- Estimate to Complete
  variance_explanation TEXT,
  corrective_actions TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_financial_variances_project_id ON financial_variances(project_id);

-- Procurement Costs
DROP TABLE IF EXISTS procurement_costs CASCADE;
CREATE TABLE procurement_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vendor_name VARCHAR(255),
  contract_value NUMERIC,
  invoiced_amount NUMERIC,
  paid_amount NUMERIC,
  remaining_value NUMERIC,
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(50), -- 'Active', 'Closed', 'Disputed'
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_procurement_costs_project_id ON procurement_costs(project_id);
