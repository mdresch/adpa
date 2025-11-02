-- Migration 207: Add Cost Breakdown Columns to Projects Table
-- Purpose: Add detailed cost tracking columns for the Financials tab
-- Date: November 2, 2025
-- Related: Migration 206 (Cost Management System)

-- Add cost breakdown columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS internal_labor_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS external_labor_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cloud_infrastructure_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_services_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS software_tools_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS equipment_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS materials_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS overhead_cost DECIMAL(15,2) DEFAULT 0;

-- Add comments
COMMENT ON COLUMN projects.internal_labor_cost IS 'Cost of internal employees (hours × rate)';
COMMENT ON COLUMN projects.external_labor_cost IS 'Cost of contractors and consultants';
COMMENT ON COLUMN projects.cloud_infrastructure_cost IS 'AWS, Azure, hosting costs';
COMMENT ON COLUMN projects.ai_services_cost IS 'OpenAI, Google AI, Anthropic API costs';
COMMENT ON COLUMN projects.software_tools_cost IS 'Licenses, subscriptions, tools';
COMMENT ON COLUMN projects.equipment_cost IS 'Hardware, servers, laptops';
COMMENT ON COLUMN projects.materials_cost IS 'Supplies and consumables';
COMMENT ON COLUMN projects.overhead_cost IS 'Facilities, admin support, shared services';

-- Create index for cost queries
CREATE INDEX IF NOT EXISTS idx_projects_costs ON projects(
  internal_labor_cost, 
  external_labor_cost, 
  actual_cost
);

SELECT 'Migration 207: Cost breakdown columns added to projects table' AS status;

