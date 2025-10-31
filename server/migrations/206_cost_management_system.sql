-- Migration 206: Comprehensive Cost Management System
-- Purpose: Dynamic cost categories, roles, rates, and time tracking (Dynamics 365-style)
-- Date: October 31, 2025
-- Related: Phase 3A Enhancement - Labor Cost Tracking
-- Reference: FINANCIAL_DASHBOARD_USER_GUIDE.md

-- ================================================================
-- PART 1: DYNAMIC COST CATEGORIES
-- ================================================================

CREATE TABLE IF NOT EXISTS cost_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,  -- For multi-tenancy (future)
  
  -- Category Details
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category_code VARCHAR(20) UNIQUE,  -- e.g., 'INT_LABOR', 'AI_SERVICES'
  
  -- Classification
  category_type VARCHAR(50) NOT NULL CHECK (
    category_type IN ('labor', 'material', 'service', 'equipment', 'overhead', 'other')
  ),
  is_labor_category BOOLEAN DEFAULT FALSE,
  requires_time_tracking BOOLEAN DEFAULT FALSE,  -- If true, track hours × rate
  
  -- Budget Rules
  default_percentage DECIMAL(5,2),  -- Typical % of total budget
  is_mandatory BOOLEAN DEFAULT FALSE,  -- Must be in every project budget
  
  -- Display & Status
  display_order INTEGER DEFAULT 0,
  icon VARCHAR(50),  -- For UI display (e.g., 'users', 'cloud', 'cpu')
  color VARCHAR(20),  -- Hex color for charts
  is_active BOOLEAN DEFAULT TRUE,
  is_system_category BOOLEAN DEFAULT FALSE,  -- Cannot be deleted if true
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP,
  
  -- Ensure unique category names per organization
  UNIQUE(organization_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cost_categories_active ON cost_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_cost_categories_type ON cost_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_cost_categories_order ON cost_categories(display_order);

-- Comments
COMMENT ON TABLE cost_categories IS 'Configurable cost categories for project budgeting (Dynamics 365-style)';
COMMENT ON COLUMN cost_categories.category_type IS 'labor, material, service, equipment, overhead, other';
COMMENT ON COLUMN cost_categories.requires_time_tracking IS 'If true, costs calculated from hours × rate';
COMMENT ON COLUMN cost_categories.is_system_category IS 'System categories cannot be deleted';

-- Insert default categories for ADPA
INSERT INTO cost_categories (
  name, category_code, category_type, is_labor_category, requires_time_tracking,
  default_percentage, is_system_category, display_order, icon, color
) VALUES
  ('Internal Labor', 'INT_LABOR', 'labor', TRUE, TRUE, 40.0, TRUE, 1, 'users', '#3b82f6'),
  ('External Labor', 'EXT_LABOR', 'labor', TRUE, TRUE, 20.0, TRUE, 2, 'user-plus', '#8b5cf6'),
  ('Cloud Infrastructure', 'CLOUD_INFRA', 'service', FALSE, FALSE, 15.0, TRUE, 3, 'cloud', '#06b6d4'),
  ('AI Services', 'AI_SERVICES', 'service', FALSE, FALSE, 12.0, TRUE, 4, 'brain', '#ec4899'),
  ('Software & Tools', 'SOFTWARE', 'service', FALSE, FALSE, 8.0, TRUE, 5, 'package', '#10b981'),
  ('Equipment', 'EQUIPMENT', 'equipment', FALSE, FALSE, 3.0, TRUE, 6, 'monitor', '#f59e0b'),
  ('Materials & Supplies', 'MATERIALS', 'material', FALSE, FALSE, 1.0, TRUE, 7, 'box', '#6366f1'),
  ('Overhead', 'OVERHEAD', 'overhead', FALSE, FALSE, 1.0, TRUE, 8, 'building', '#64748b')
ON CONFLICT (category_code) DO NOTHING;

-- ================================================================
-- PART 2: ROLES AND RATES MANAGEMENT
-- ================================================================

CREATE TABLE IF NOT EXISTS project_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  
  -- Role Details
  role_name VARCHAR(100) NOT NULL,
  role_code VARCHAR(20) UNIQUE,  -- e.g., 'SR_DEV', 'PM', 'UX_DES'
  description TEXT,
  
  -- Classification
  role_type VARCHAR(50) NOT NULL CHECK (
    role_type IN ('internal', 'external', 'contractor', 'vendor')
  ),
  role_category VARCHAR(50),  -- technical, management, creative, support
  seniority_level VARCHAR(50),  -- junior, mid, senior, lead, principal
  
  -- Default Rates
  default_hourly_rate DECIMAL(10,2) NOT NULL CHECK (default_hourly_rate >= 0),
  currency VARCHAR(3) DEFAULT 'USD',
  rate_effective_date DATE DEFAULT CURRENT_DATE,
  
  -- Skills & Requirements
  required_skills TEXT[],
  certifications TEXT[],
  
  -- Display & Status
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_billable BOOLEAN DEFAULT TRUE,  -- Can be charged to projects
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, role_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_roles_type ON project_roles(role_type);
CREATE INDEX IF NOT EXISTS idx_project_roles_active ON project_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_project_roles_category ON project_roles(role_category);

-- Comments
COMMENT ON TABLE project_roles IS 'Configurable project roles with hourly rates';
COMMENT ON COLUMN project_roles.role_type IS 'internal, external, contractor, vendor';
COMMENT ON COLUMN project_roles.default_hourly_rate IS 'Standard rate for this role (can be overridden per assignment)';

-- Insert default roles for ADPA
INSERT INTO project_roles (
  role_name, role_code, role_type, role_category, seniority_level,
  default_hourly_rate, display_order
) VALUES
  -- Internal Technical Roles
  ('Senior Developer', 'SR_DEV', 'internal', 'technical', 'senior', 150.00, 1),
  ('Mid-Level Developer', 'MID_DEV', 'internal', 'technical', 'mid', 125.00, 2),
  ('Junior Developer', 'JR_DEV', 'internal', 'technical', 'junior', 85.00, 3),
  ('UX/UI Designer', 'UX_DES', 'internal', 'creative', 'mid', 110.00, 4),
  ('QA Engineer', 'QA_ENG', 'internal', 'technical', 'mid', 100.00, 5),
  
  -- Internal Management
  ('Project Manager', 'PM', 'internal', 'management', 'senior', 160.00, 6),
  ('Program Manager', 'PGM_MGR', 'internal', 'management', 'senior', 175.00, 7),
  ('Business Analyst', 'BA', 'internal', 'management', 'mid', 120.00, 8),
  
  -- External/Contractors
  ('Senior Consultant', 'SR_CONS', 'external', 'technical', 'senior', 250.00, 9),
  ('DevOps Contractor', 'DEVOPS_CON', 'contractor', 'technical', 'senior', 200.00, 10),
  ('UX Consultant', 'UX_CONS', 'external', 'creative', 'senior', 225.00, 11)
ON CONFLICT (role_code) DO NOTHING;

-- ================================================================
-- PART 3: RESOURCE ASSIGNMENTS (Person → Project → Role → Rate)
-- ================================================================

CREATE TABLE IF NOT EXISTS project_resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role_id UUID NOT NULL REFERENCES project_roles(id),
  
  -- Assignment Details
  assignment_type VARCHAR(50) CHECK (assignment_type IN ('full-time', 'part-time', 'contractor', 'consultant')),
  allocation_percentage DECIMAL(5,2) DEFAULT 100.00 CHECK (allocation_percentage BETWEEN 0 AND 100),
  
  -- Rate (Can override role default)
  hourly_rate DECIMAL(10,2) NOT NULL,
  daily_rate DECIMAL(10,2),  -- For contractors (hours per day × hourly)
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Timeline
  start_date DATE NOT NULL,
  end_date DATE,
  estimated_hours DECIMAL(10,2),  -- Planned hours for this assignment
  
  -- Budget
  estimated_cost DECIMAL(15,2),  -- estimated_hours × hourly_rate
  actual_hours DECIMAL(10,2) DEFAULT 0,  -- Sum from time entries
  actual_cost DECIMAL(15,2) DEFAULT 0,   -- Sum from time entries
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (
    status IN ('planned', 'active', 'completed', 'on-hold', 'cancelled')
  ),
  
  -- Approval (for contractors)
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  approval_date DATE,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique assignment per user per project (can have multiple roles)
  UNIQUE(project_id, user_id, role_id, start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resource_assignments_project ON project_resource_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_user ON project_resource_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_role ON project_resource_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_status ON project_resource_assignments(status);

-- Comments
COMMENT ON TABLE project_resource_assignments IS 'Assigns people to projects with roles and rates';
COMMENT ON COLUMN project_resource_assignments.hourly_rate IS 'Can override role default rate for specific assignment';
COMMENT ON COLUMN project_resource_assignments.actual_hours IS 'Auto-calculated from time_entries';
COMMENT ON COLUMN project_resource_assignments.actual_cost IS 'Auto-calculated from time_entries (hours × rate)';

-- ================================================================
-- PART 4: TIME TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES project_resource_assignments(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Time Details
  entry_date DATE NOT NULL,
  hours_worked DECIMAL(8,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
  overtime_hours DECIMAL(8,2) DEFAULT 0,
  
  -- Rate & Cost
  hourly_rate DECIMAL(10,2) NOT NULL,  -- Captured at time of entry
  overtime_rate DECIMAL(10,2),         -- Usually 1.5× or 2× regular rate
  regular_cost DECIMAL(15,2),          -- hours_worked × hourly_rate
  overtime_cost DECIMAL(15,2),         -- overtime_hours × overtime_rate
  total_cost DECIMAL(15,2),            -- regular_cost + overtime_cost
  
  -- Context
  task_id UUID,  -- Optional: link to specific task
  task_name VARCHAR(255),
  work_description TEXT,
  
  -- Approval Workflow
  status VARCHAR(50) DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'approved', 'rejected', 'invoiced', 'paid')
  ),
  submitted_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Invoice Tracking (for contractors)
  invoice_number VARCHAR(100),
  invoice_date DATE,
  payment_status VARCHAR(50),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure no duplicate time entries for same day
  UNIQUE(assignment_id, user_id, entry_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_assignment ON time_entries(assignment_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);

-- Comments
COMMENT ON TABLE time_entries IS 'Individual time entries for labor cost tracking';
COMMENT ON COLUMN time_entries.hours_worked IS 'Regular hours worked (max 24 per day)';
COMMENT ON COLUMN time_entries.status IS 'draft, submitted, approved, rejected, invoiced, paid';
COMMENT ON COLUMN time_entries.total_cost IS 'Calculated: regular_cost + overtime_cost';

-- ================================================================
-- PART 5: NON-LABOR COSTS (Expenses)
-- ================================================================

CREATE TABLE IF NOT EXISTS project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_category_id UUID REFERENCES cost_categories(id),
  
  -- Expense Details
  expense_name VARCHAR(255) NOT NULL,
  description TEXT,
  expense_type VARCHAR(50) CHECK (
    expense_type IN ('invoice', 'usage-based', 'subscription', 'one-time', 'recurring')
  ),
  
  -- Cost
  amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- For Usage-Based Costs
  usage_metric VARCHAR(50),  -- e.g., 'API calls', 'GB storage', 'hours'
  usage_quantity DECIMAL(15,2),
  unit_cost DECIMAL(10,4),  -- Cost per unit
  
  -- Timeline
  expense_date DATE NOT NULL,
  billing_period_start DATE,
  billing_period_end DATE,
  
  -- Invoice/Receipt
  invoice_number VARCHAR(100),
  vendor_name VARCHAR(255),
  receipt_url TEXT,
  
  -- Approval
  status VARCHAR(50) DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')
  ),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  -- Payment
  payment_status VARCHAR(50),
  payment_date DATE,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_expenses_project ON project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_category ON project_expenses(cost_category_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_date ON project_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_project_expenses_status ON project_expenses(status);

-- Comments
COMMENT ON TABLE project_expenses IS 'Non-labor expenses (cloud, AI, materials, etc.)';
COMMENT ON COLUMN project_expenses.expense_type IS 'invoice, usage-based, subscription, one-time, recurring';
COMMENT ON COLUMN project_expenses.usage_quantity IS 'For usage-based: API calls, GB, hours, etc.';

-- ================================================================
-- PART 6: PROJECT COST BREAKDOWN (Denormalized for Performance)
-- ================================================================

CREATE TABLE IF NOT EXISTS project_cost_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  
  -- Labor Costs (from time_entries)
  internal_labor_cost DECIMAL(15,2) DEFAULT 0,
  internal_labor_hours DECIMAL(10,2) DEFAULT 0,
  external_labor_cost DECIMAL(15,2) DEFAULT 0,
  external_labor_hours DECIMAL(10,2) DEFAULT 0,
  total_labor_cost DECIMAL(15,2) DEFAULT 0,
  
  -- Service Costs (from project_expenses)
  cloud_infrastructure_cost DECIMAL(15,2) DEFAULT 0,
  ai_services_cost DECIMAL(15,2) DEFAULT 0,
  software_tools_cost DECIMAL(15,2) DEFAULT 0,
  
  -- Other Costs (from project_expenses)
  equipment_cost DECIMAL(15,2) DEFAULT 0,
  materials_cost DECIMAL(15,2) DEFAULT 0,
  overhead_cost DECIMAL(15,2) DEFAULT 0,
  
  -- Totals (Calculated)
  total_actual_cost DECIMAL(15,2) DEFAULT 0,
  total_approved_cost DECIMAL(15,2) DEFAULT 0,
  total_pending_cost DECIMAL(15,2) DEFAULT 0,
  
  -- Metadata
  last_calculated_at TIMESTAMP DEFAULT NOW(),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_project_cost_breakdown_project ON project_cost_breakdown(project_id);

-- Comments
COMMENT ON TABLE project_cost_breakdown IS 'Aggregated cost breakdown per project (updated from time_entries and expenses)';
COMMENT ON COLUMN project_cost_breakdown.total_labor_cost IS 'Sum of internal + external labor costs';

-- ================================================================
-- PART 7: CALCULATION FUNCTIONS
-- ================================================================

-- Function to calculate labor cost from time entries
CREATE OR REPLACE FUNCTION calculate_labor_cost(
  p_project_id UUID,
  p_role_type VARCHAR DEFAULT NULL  -- 'internal', 'external', or NULL for all
) RETURNS DECIMAL AS $$
DECLARE
  v_total_cost DECIMAL;
BEGIN
  SELECT COALESCE(SUM(te.total_cost), 0)
  INTO v_total_cost
  FROM time_entries te
  JOIN project_resource_assignments pra ON te.assignment_id = pra.id
  JOIN project_roles pr ON pra.role_id = pr.id
  WHERE te.project_id = p_project_id
    AND te.status = 'approved'
    AND (p_role_type IS NULL OR pr.role_type = p_role_type);
  
  RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_labor_cost IS 'Calculate total labor cost for a project by role type';

-- Function to update project cost breakdown
CREATE OR REPLACE FUNCTION update_project_cost_breakdown(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
  v_internal_labor_cost DECIMAL;
  v_internal_labor_hours DECIMAL;
  v_external_labor_cost DECIMAL;
  v_external_labor_hours DECIMAL;
  v_cloud_cost DECIMAL;
  v_ai_cost DECIMAL;
  v_software_cost DECIMAL;
  v_equipment_cost DECIMAL;
  v_materials_cost DECIMAL;
  v_overhead_cost DECIMAL;
BEGIN
  -- Calculate internal labor
  SELECT 
    COALESCE(SUM(te.total_cost), 0),
    COALESCE(SUM(te.hours_worked), 0)
  INTO v_internal_labor_cost, v_internal_labor_hours
  FROM time_entries te
  JOIN project_resource_assignments pra ON te.assignment_id = pra.id
  JOIN project_roles pr ON pra.role_id = pr.id
  WHERE te.project_id = p_project_id
    AND te.status = 'approved'
    AND pr.role_type = 'internal';
  
  -- Calculate external labor (contractors, consultants)
  SELECT 
    COALESCE(SUM(te.total_cost), 0),
    COALESCE(SUM(te.hours_worked), 0)
  INTO v_external_labor_cost, v_external_labor_hours
  FROM time_entries te
  JOIN project_resource_assignments pra ON te.assignment_id = pra.id
  JOIN project_roles pr ON pra.role_id = pr.id
  WHERE te.project_id = p_project_id
    AND te.status = 'approved'
    AND pr.role_type IN ('external', 'contractor');
  
  -- Calculate non-labor costs from expenses
  SELECT COALESCE(SUM(amount), 0)
  INTO v_cloud_cost
  FROM project_expenses pe
  JOIN cost_categories cc ON pe.cost_category_id = cc.id
  WHERE pe.project_id = p_project_id
    AND pe.status = 'approved'
    AND cc.category_code = 'CLOUD_INFRA';
  
  SELECT COALESCE(SUM(amount), 0)
  INTO v_ai_cost
  FROM project_expenses pe
  JOIN cost_categories cc ON pe.cost_category_id = cc.id
  WHERE pe.project_id = p_project_id
    AND pe.status = 'approved'
    AND cc.category_code = 'AI_SERVICES';
  
  SELECT COALESCE(SUM(amount), 0)
  INTO v_software_cost
  FROM project_expenses pe
  JOIN cost_categories cc ON pe.cost_category_id = cc.id
  WHERE pe.project_id = p_project_id
    AND pe.status = 'approved'
    AND cc.category_code = 'SOFTWARE';
  
  SELECT COALESCE(SUM(amount), 0)
  INTO v_equipment_cost
  FROM project_expenses pe
  JOIN cost_categories cc ON pe.cost_category_id = cc.id
  WHERE pe.project_id = p_project_id
    AND pe.status = 'approved'
    AND cc.category_code = 'EQUIPMENT';
  
  SELECT COALESCE(SUM(amount), 0)
  INTO v_materials_cost
  FROM project_expenses pe
  JOIN cost_categories cc ON pe.cost_category_id = cc.id
  WHERE pe.project_id = p_project_id
    AND pe.status = 'approved'
    AND cc.category_code = 'MATERIALS';
  
  SELECT COALESCE(SUM(amount), 0)
  INTO v_overhead_cost
  FROM project_expenses pe
  JOIN cost_categories cc ON pe.cost_category_id = cc.id
  WHERE pe.project_id = p_project_id
    AND pe.status = 'approved'
    AND cc.category_code = 'OVERHEAD';
  
  -- Insert or update breakdown
  INSERT INTO project_cost_breakdown (
    project_id,
    internal_labor_cost,
    internal_labor_hours,
    external_labor_cost,
    external_labor_hours,
    total_labor_cost,
    cloud_infrastructure_cost,
    ai_services_cost,
    software_tools_cost,
    equipment_cost,
    materials_cost,
    overhead_cost,
    total_actual_cost,
    last_calculated_at
  ) VALUES (
    p_project_id,
    v_internal_labor_cost,
    v_internal_labor_hours,
    v_external_labor_cost,
    v_external_labor_hours,
    v_internal_labor_cost + v_external_labor_cost,
    v_cloud_cost,
    v_ai_cost,
    v_software_cost,
    v_equipment_cost,
    v_materials_cost,
    v_overhead_cost,
    v_internal_labor_cost + v_external_labor_cost + v_cloud_cost + v_ai_cost + 
    v_software_cost + v_equipment_cost + v_materials_cost + v_overhead_cost,
    NOW()
  )
  ON CONFLICT (project_id) DO UPDATE SET
    internal_labor_cost = EXCLUDED.internal_labor_cost,
    internal_labor_hours = EXCLUDED.internal_labor_hours,
    external_labor_cost = EXCLUDED.external_labor_cost,
    external_labor_hours = EXCLUDED.external_labor_hours,
    total_labor_cost = EXCLUDED.total_labor_cost,
    cloud_infrastructure_cost = EXCLUDED.cloud_infrastructure_cost,
    ai_services_cost = EXCLUDED.ai_services_cost,
    software_tools_cost = EXCLUDED.software_tools_cost,
    equipment_cost = EXCLUDED.equipment_cost,
    materials_cost = EXCLUDED.materials_cost,
    overhead_cost = EXCLUDED.overhead_cost,
    total_actual_cost = EXCLUDED.total_actual_cost,
    last_calculated_at = NOW(),
    updated_at = NOW();
  
  -- Also update projects.actual_cost for rollup
  UPDATE projects
  SET actual_cost = (
    SELECT total_actual_cost FROM project_cost_breakdown WHERE project_id = p_project_id
  ),
  updated_at = NOW()
  WHERE id = p_project_id;
  
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_project_cost_breakdown IS 'Recalculate project cost breakdown from time entries and expenses';

-- Trigger to auto-update cost breakdown when time entries are approved
CREATE OR REPLACE FUNCTION trigger_update_cost_breakdown()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate cost breakdown for the project
  PERFORM update_project_cost_breakdown(NEW.project_id);
  
  -- Update resource assignment actual hours and cost
  UPDATE project_resource_assignments
  SET 
    actual_hours = (
      SELECT COALESCE(SUM(hours_worked), 0)
      FROM time_entries
      WHERE assignment_id = NEW.assignment_id AND status = 'approved'
    ),
    actual_cost = (
      SELECT COALESCE(SUM(total_cost), 0)
      FROM time_entries
      WHERE assignment_id = NEW.assignment_id AND status = 'approved'
    ),
    updated_at = NOW()
  WHERE id = NEW.assignment_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entry_approved_trigger
AFTER INSERT OR UPDATE OF status ON time_entries
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION trigger_update_cost_breakdown();

COMMENT ON TRIGGER time_entry_approved_trigger ON time_entries IS 'Auto-update project costs when time entry is approved';

-- ================================================================
-- PART 8: VIEWS FOR DASHBOARD
-- ================================================================

-- View: Project cost summary with all categories
CREATE OR REPLACE VIEW project_cost_summary AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.budget,
  pcb.internal_labor_cost,
  pcb.internal_labor_hours,
  pcb.external_labor_cost,
  pcb.external_labor_hours,
  pcb.total_labor_cost,
  pcb.cloud_infrastructure_cost,
  pcb.ai_services_cost,
  pcb.software_tools_cost,
  pcb.equipment_cost,
  pcb.materials_cost,
  pcb.overhead_cost,
  pcb.total_actual_cost,
  p.budget - pcb.total_actual_cost as remaining_budget,
  CASE 
    WHEN p.budget > 0 THEN ROUND((pcb.total_actual_cost / p.budget * 100)::numeric, 2)
    ELSE 0
  END as cost_utilization_percent
FROM projects p
LEFT JOIN project_cost_breakdown pcb ON p.id = pcb.project_id
WHERE p.archived = false;

COMMENT ON VIEW project_cost_summary IS 'Complete cost breakdown for all projects';

-- View: Time tracking summary by role
CREATE OR REPLACE VIEW time_tracking_by_role AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  pr.role_name,
  pr.role_type,
  COUNT(DISTINCT te.user_id) as resource_count,
  COALESCE(SUM(te.hours_worked), 0) as total_hours,
  COALESCE(AVG(te.hourly_rate), 0) as avg_hourly_rate,
  COALESCE(SUM(te.total_cost), 0) as total_cost
FROM projects p
LEFT JOIN time_entries te ON p.id = te.project_id
LEFT JOIN project_resource_assignments pra ON te.assignment_id = pra.id
LEFT JOIN project_roles pr ON pra.role_id = pr.id
WHERE te.status = 'approved'
GROUP BY p.id, p.name, pr.role_name, pr.role_type;

COMMENT ON VIEW time_tracking_by_role IS 'Time and cost summary grouped by role';

SELECT 'Migration 206: Cost Management System created successfully' AS status;

