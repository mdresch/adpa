-- Migration 026: Create Issues Log Table
-- Purpose: Add issues tracking for current problems, blockers, and impediments
-- Domain: Project Work Performance Domain, Uncertainty Domain
-- Date: February 4, 2026

BEGIN;

-- Create issues table
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Issue details
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(30) NOT NULL CHECK (category IN (
    'technical', 'resource', 'schedule', 'communication', 
    'quality', 'external', 'scope', 'budget', 'other'
  )),
  
  -- Severity & Impact
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  impact TEXT,
  affected_areas JSONB DEFAULT '[]'::jsonb,
  
  -- People
  raised_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  escalated_to UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'acknowledged', 'in_progress', 'blocked', 'resolved', 'closed'
  )),
  
  -- Resolution
  resolution TEXT,
  workaround TEXT,
  root_cause TEXT,
  
  -- Dates
  date_raised TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  target_resolution_date TIMESTAMP WITH TIME ZONE,
  date_resolved TIMESTAMP WITH TIME ZONE,
  date_closed TIMESTAMP WITH TIME ZONE,
  
  -- Related entities
  related_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,
  related_milestone_id UUID,
  related_deliverable_id UUID,
  
  -- Metadata
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create issue status history table
CREATE TABLE issue_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  comment TEXT,
  
  -- Indexes
  INDEX idx_issue_history_issue (issue_id),
  INDEX idx_issue_history_date (changed_at DESC)
);

-- Create trigger to log status changes and set resolution dates
CREATE OR REPLACE FUNCTION log_issue_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO issue_status_history (issue_id, old_status, new_status, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, NOW());
  END IF;
  
  -- Auto-set resolution date
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.date_resolved := NOW();
  END IF;
  
  -- Auto-set closed date
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.date_closed := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_issue_status_change
  AFTER UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION log_issue_status_change();

-- Create indexes for performance
CREATE INDEX idx_issues_project ON issues(project_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_priority ON issues(priority);
CREATE INDEX idx_issues_assigned_to ON issues(assigned_to);
CREATE INDEX idx_issues_date_raised ON issues(date_raised DESC);
CREATE INDEX idx_issues_related_risk ON issues(related_risk_id);

-- Add issues_count to projects table for quick access
ALTER TABLE projects ADD COLUMN IF NOT EXISTS issues_count INTEGER DEFAULT 0;

-- Create function to update issues count
CREATE OR REPLACE FUNCTION update_project_issues_count()
RETURNS TRIGGER AS $$
DECLARE
  count INTEGER;
BEGIN
  -- Get current count of open issues for this project
  SELECT COUNT(*) INTO count
  FROM issues
  WHERE project_id = NEW.project_id
    AND status IN ('open', 'acknowledged', 'in_progress', 'blocked');
  
  -- Update project
  UPDATE projects
  SET issues_count = count,
      updated_at = NOW()
  WHERE id = NEW.project_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update issues count
CREATE TRIGGER trigger_update_issues_count_insert
  AFTER INSERT ON issues
  FOR EACH ROW
  EXECUTE FUNCTION update_project_issues_count();

CREATE TRIGGER trigger_update_issues_count_update
  AFTER UPDATE ON issues
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_project_issues_count();

CREATE TRIGGER trigger_update_issues_count_delete
  AFTER DELETE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION update_project_issues_count();

COMMIT;

-- Migration complete: Issues log table created for PMBOK 8 compliance