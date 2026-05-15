-- Add idempotency_key to major entity tables for deduplication
-- Phase 1.5 of Extraction Service Refactoring

DO $$
BEGIN
    -- 1. risks
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risks') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'idempotency_key') THEN
            ALTER TABLE risks ADD COLUMN idempotency_key VARCHAR(64);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_risks_idempotency ON risks(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
        END IF;
    END IF;

    -- 2. stakeholders
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stakeholders') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stakeholders' AND column_name = 'idempotency_key') THEN
            ALTER TABLE stakeholders ADD COLUMN idempotency_key VARCHAR(64);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_stakeholders_idempotency ON stakeholders(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
        END IF;
    END IF;

    -- 3. requirements
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requirements') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requirements' AND column_name = 'idempotency_key') THEN
            ALTER TABLE requirements ADD COLUMN idempotency_key VARCHAR(64);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_requirements_idempotency ON requirements(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
        END IF;
    END IF;

    -- 4. milestones
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'milestones') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestones' AND column_name = 'idempotency_key') THEN
            ALTER TABLE milestones ADD COLUMN idempotency_key VARCHAR(64);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_milestones_idempotency ON milestones(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
        END IF;
    END IF;

    -- 5. budget_baseline
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budget_baseline') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_baseline' AND column_name = 'idempotency_key') THEN
            ALTER TABLE budget_baseline ADD COLUMN idempotency_key VARCHAR(64);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_baseline_idempotency ON budget_baseline(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
        END IF;
    END IF;

    -- 6. cost_estimates
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cost_estimates') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cost_estimates' AND column_name = 'idempotency_key') THEN
            ALTER TABLE cost_estimates ADD COLUMN idempotency_key VARCHAR(64);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_estimates_idempotency ON cost_estimates(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
        END IF;
    END IF;

    -- 7. action_items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'action_items') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_items' AND column_name = 'idempotency_key') THEN
            ALTER TABLE action_items ADD COLUMN idempotency_key VARCHAR(64);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_action_items_idempotency ON action_items(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
        END IF;
    END IF;

    -- 8. wbs_nodes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wbs_nodes') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wbs_nodes' AND column_name = 'idempotency_key') THEN
            ALTER TABLE wbs_nodes ADD COLUMN idempotency_key VARCHAR(64);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_wbs_nodes_idempotency ON wbs_nodes(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
        END IF;
    END IF;

END $$;
