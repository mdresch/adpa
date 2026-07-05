-- Resource Domain Entities

-- Resource Plans
-- (DROP TABLE removed: resource_plans already exists from server/migrations/000_baseline.sql or a later
-- server/migrations/*.sql alter; dropping it here silently destroyed richer
-- production schema/data. CREATE TABLE IF NOT EXISTS below is a safe no-op.)
CREATE TABLE IF NOT EXISTS resource_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  resource_description TEXT,
  required_quantity INTEGER,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  skill_set TEXT[],
  location VARCHAR(255),
  status VARCHAR(50), -- 'Planned', 'Assigned', 'Onboarded'
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resource_plans_project_id ON resource_plans(project_id);

-- Roles and Responsibilities (RACI)
-- (DROP TABLE removed: roles_and_responsibilities already exists from server/migrations/000_baseline.sql or a later
-- server/migrations/*.sql alter; dropping it here silently destroyed richer
-- production schema/data. CREATE TABLE IF NOT EXISTS below is a safe no-op.)
CREATE TABLE IF NOT EXISTS roles_and_responsibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_name VARCHAR(255) NOT NULL,
  responsibilities TEXT,
  raci_category VARCHAR(10), -- 'R', 'A', 'C', 'I'
  assigned_to TEXT[],
  authority_level VARCHAR(255),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_responsibilities_project_id ON roles_and_responsibilities(project_id);

-- Team Availability
-- (DROP TABLE removed: team_availability already exists from server/migrations/000_baseline.sql or a later
-- server/migrations/*.sql alter; dropping it here silently destroyed richer
-- production schema/data. CREATE TABLE IF NOT EXISTS below is a safe no-op.)
CREATE TABLE IF NOT EXISTS team_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  person_name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  availability_percent INTEGER,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_availability_project_id ON team_availability(project_id);

-- Labor Rates
-- (DROP TABLE removed: labor_rates already exists from server/migrations/000_baseline.sql or a later
-- server/migrations/*.sql alter; dropping it here silently destroyed richer
-- production schema/data. CREATE TABLE IF NOT EXISTS below is a safe no-op.)
CREATE TABLE IF NOT EXISTS labor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  resource_category VARCHAR(255),
  hourly_rate NUMERIC,
  currency VARCHAR(10) DEFAULT 'USD',
  effective_date TIMESTAMP WITH TIME ZONE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_labor_rates_project_id ON labor_rates(project_id);

-- Project Org Chart (Nodes/Hierarchy)
-- (DROP TABLE removed: project_org_chart already exists from server/migrations/000_baseline.sql or a later
-- server/migrations/*.sql alter; dropping it here silently destroyed richer
-- production schema/data. CREATE TABLE IF NOT EXISTS below is a safe no-op.)
CREATE TABLE IF NOT EXISTS project_org_chart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  person_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  reports_to VARCHAR(255),
  department VARCHAR(255),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_org_chart_project_id ON project_org_chart(project_id);
