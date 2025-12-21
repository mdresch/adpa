-- Schedule Domain Entities

-- Schedule Baseline
DROP TABLE IF EXISTS schedule_baseline CASCADE;
CREATE TABLE schedule_baseline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  duration_days INTEGER,
  milestones_count INTEGER,
  critical_path_length INTEGER,
  approval_date TIMESTAMP WITH TIME ZONE,
  version VARCHAR(50),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedule_baseline_project_id ON schedule_baseline(project_id);

-- Schedule Activities
DROP TABLE IF EXISTS schedule_activities CASCADE;
CREATE TABLE schedule_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  activity_id VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  wbs_code VARCHAR(50),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  duration_days INTEGER,
  status VARCHAR(50), -- 'Not Started', 'In Progress', 'Completed'
  percent_complete INTEGER DEFAULT 0,
  assigned_to TEXT[],
  dependencies TEXT[], -- Array of activity IDs
  is_critical BOOLEAN DEFAULT FALSE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedule_activities_project_id ON schedule_activities(project_id);

-- Critical Path
DROP TABLE IF EXISTS critical_path CASCADE;
CREATE TABLE critical_path (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path_description TEXT,
  activities TEXT[], -- Ordered list of activity IDs
  total_duration_days INTEGER,
  slack_available INTEGER DEFAULT 0,
  risks TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_critical_path_project_id ON critical_path(project_id);

-- Schedule Variances
DROP TABLE IF EXISTS schedule_variances CASCADE;
CREATE TABLE schedule_variances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_date TIMESTAMP WITH TIME ZONE,
  sv_value NUMERIC, -- Earned Value - Planned Value (time based if mapped)
  spi_value NUMERIC, -- Schedule Performance Index
  variance_explanation TEXT,
  corrective_actions TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedule_variances_project_id ON schedule_variances(project_id);

-- Schedule Forecasts
DROP TABLE IF EXISTS schedule_forecasts CASCADE;
CREATE TABLE schedule_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  forecast_date TIMESTAMP WITH TIME ZONE,
  estimated_completion_date TIMESTAMP WITH TIME ZONE,
  variance_at_completion_days INTEGER,
  confidence_level VARCHAR(50), -- 'High', 'Medium', 'Low'
  assumptions TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedule_forecasts_project_id ON schedule_forecasts(project_id);
