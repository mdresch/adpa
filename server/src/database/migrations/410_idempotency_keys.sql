-- Add idempotency_key columns to entity tables for safe re-runs and deduplication
-- Phase 1.5: Idempotency Key (SHA-256)

-- Add to risks table
ALTER TABLE risks 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_risks_idempotency_key ON risks(idempotency_key);

-- Add to stakeholders table
ALTER TABLE stakeholders 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_stakeholders_idempotency_key ON stakeholders(idempotency_key);

-- Add to requirements table
ALTER TABLE requirements 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_requirements_idempotency_key ON requirements(idempotency_key);

-- Add to milestones table
ALTER TABLE milestones 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_milestones_idempotency_key ON milestones(idempotency_key);

-- Add to deliverables table
ALTER TABLE deliverables 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_deliverables_idempotency_key ON deliverables(idempotency_key);

-- Add to budget tables
ALTER TABLE budget_baselines 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_budget_baselines_idempotency_key ON budget_baselines(idempotency_key);

ALTER TABLE cost_estimates 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_cost_estimates_idempotency_key ON cost_estimates(idempotency_key);

-- Add to other core entity tables
ALTER TABLE activities 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_activities_idempotency_key ON activities(idempotency_key);

ALTER TABLE constraints 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_constraints_idempotency_key ON constraints(idempotency_key);

ALTER TABLE success_criteria 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_success_criteria_idempotency_key ON success_criteria(idempotency_key);

-- Add to domain_entities table (for dynamic/generic entities)
ALTER TABLE domain_entities 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_domain_entities_idempotency_key ON domain_entities(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_domain_entities_project_entity_key 
  ON domain_entities(project_id, entity_type, idempotency_key);
