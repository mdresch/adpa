-- Up Migration: Create Digital Twin tables for iTwin, AzureDT, and Visio Bridge

-- 1. digital_twin_assets
CREATE TABLE digital_twin_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- Platform identification
  external_id VARCHAR(255) NOT NULL,
  platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('iTwin', 'AzureDT', 'Generic', 'Visio')),
  platform_instance_url TEXT,
  
  -- Asset metadata
  name VARCHAR(500) NOT NULL,
  description TEXT,
  asset_type VARCHAR(100),
  location JSONB,
  
  -- Current state reference (deferred FK constraint to avoid cycles, or nullable)
  current_state_id UUID, 
  current_state_version INTEGER DEFAULT 0,
  
  -- Flexible metadata
  metadata JSONB DEFAULT '{}',
  
  -- Source Traceability (Visio/Extraction)
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  source_entity_id UUID, 
  
  -- Sync metadata
  last_synced_at TIMESTAMPTZ,
  sync_status VARCHAR(20) DEFAULT 'active' CHECK (sync_status IN ('active', 'paused', 'error', 'disconnected')),
  sync_error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  
  UNIQUE (external_id, platform_type, platform_instance_url)
);

CREATE INDEX idx_dt_assets_project_id ON digital_twin_assets(project_id);
CREATE INDEX idx_dt_assets_company_id ON digital_twin_assets(company_id);
CREATE INDEX idx_dt_assets_platform ON digital_twin_assets(platform_type, external_id);
CREATE INDEX idx_dt_assets_sync_status ON digital_twin_assets(sync_status) WHERE sync_status = 'active';
CREATE INDEX idx_dt_assets_asset_type ON digital_twin_assets(asset_type);
CREATE INDEX idx_dt_assets_metadata_gin ON digital_twin_assets USING GIN(metadata);


-- 2. digital_twin_events (Source of Truth for changes)
CREATE TABLE digital_twin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES digital_twin_assets(id) ON DELETE CASCADE,
  
  -- Event classification
  event_type VARCHAR(50) NOT NULL CHECK (
    event_type IN (
      'state_change', 'attribute_change', 'relationship_change',
      'creation', 'deletion', 'alert', 'sync_error'
    )
  ),
  
  -- Event data
  event_payload JSONB NOT NULL DEFAULT '{}',
  event_summary TEXT,
  
  -- Platform reference
  platform_event_id VARCHAR(255),
  platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('iTwin', 'AzureDT', 'Generic', 'Visio')),
  
  -- Processing metadata
  processed_at TIMESTAMPTZ,
  processing_status VARCHAR(20) DEFAULT 'pending' CHECK (
    processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')
  ),
  processing_error TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  event_timestamp TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (platform_event_id, platform_type, asset_id)
);

CREATE INDEX idx_dt_events_asset_id ON digital_twin_events(asset_id);
CREATE INDEX idx_dt_events_type ON digital_twin_events(event_type);
CREATE INDEX idx_dt_events_status ON digital_twin_events(processing_status) WHERE processing_status IN ('pending', 'processing');
CREATE INDEX idx_dt_events_timestamp ON digital_twin_events(event_timestamp DESC);
CREATE INDEX idx_dt_events_ingested ON digital_twin_events(ingested_at DESC);
CREATE INDEX idx_dt_events_payload_gin ON digital_twin_events USING GIN(event_payload);


-- 3. digital_twin_asset_states (Time-series snapshots)
CREATE TABLE digital_twin_asset_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES digital_twin_assets(id) ON DELETE CASCADE,
  
  -- State data
  state_snapshot JSONB NOT NULL,
  state_version INTEGER NOT NULL,
  changed_fields JSONB DEFAULT '[]',
  previous_state_id UUID REFERENCES digital_twin_asset_states(id) ON DELETE SET NULL,
  
  -- Event reference
  source_event_id UUID REFERENCES digital_twin_events(id) ON DELETE SET NULL,
  
  -- State metadata
  is_current BOOLEAN DEFAULT false,
  state_hash VARCHAR(64),
  change_summary TEXT,
  
  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (asset_id, state_version)
);

CREATE INDEX idx_dt_states_asset_id ON digital_twin_asset_states(asset_id);
CREATE INDEX idx_dt_states_asset_current ON digital_twin_asset_states(asset_id, is_current) WHERE is_current = true;
CREATE INDEX idx_dt_states_timestamp ON digital_twin_asset_states(timestamp DESC);
CREATE INDEX idx_dt_states_event_id ON digital_twin_asset_states(source_event_id);
CREATE INDEX idx_dt_states_snapshot_gin ON digital_twin_asset_states USING GIN(state_snapshot);

-- Add circular FK for assets.current_state_id
ALTER TABLE digital_twin_assets 
ADD CONSTRAINT fk_dt_assets_current_state 
FOREIGN KEY (current_state_id) REFERENCES digital_twin_asset_states(id) ON DELETE SET NULL;


-- 4. digital_twin_document_triggers
CREATE TABLE digital_twin_document_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES digital_twin_assets(id) ON DELETE CASCADE,
  event_id UUID REFERENCES digital_twin_events(id) ON DELETE SET NULL,
  
  -- Trigger configuration
  trigger_rule JSONB NOT NULL,
  trigger_type VARCHAR(50) NOT NULL CHECK (
    trigger_type IN ('state_change', 'attribute_change', 'threshold_breach', 'scheduled', 'manual')
  ),
  
  -- Document generation
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  generation_params JSONB DEFAULT '{}',
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  status_message TEXT,
  
  -- Job tracking
  job_id UUID,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timestamps
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dt_triggers_asset_id ON digital_twin_document_triggers(asset_id);
CREATE INDEX idx_dt_triggers_event_id ON digital_twin_document_triggers(event_id);
CREATE INDEX idx_dt_triggers_status ON digital_twin_document_triggers(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_dt_triggers_template_id ON digital_twin_document_triggers(template_id);
CREATE INDEX idx_dt_triggers_triggered_at ON digital_twin_document_triggers(triggered_at DESC);


-- 5. digital_twin_ingestion_sources
CREATE TABLE digital_twin_ingestion_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Source configuration
  name VARCHAR(255) NOT NULL,
  platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('iTwin', 'AzureDT', 'Generic', 'Visio')),
  connection_config JSONB NOT NULL, -- Encrypted connection details
  
  -- Sync configuration
  sync_mode VARCHAR(20) DEFAULT 'realtime' CHECK (sync_mode IN ('realtime', 'polling', 'batch', 'manual')),
  poll_interval_seconds INTEGER DEFAULT 60,
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  sync_status VARCHAR(20) DEFAULT 'active',
  last_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dt_sources_project_id ON digital_twin_ingestion_sources(project_id);
CREATE INDEX idx_dt_sources_active ON digital_twin_ingestion_sources(is_active) WHERE is_active = true;


-- 6. digital_twin_trigger_rules
CREATE TABLE digital_twin_trigger_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Rule definition
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_config JSONB NOT NULL,
  trigger_type VARCHAR(50) NOT NULL,
  
  -- Document generation
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  generation_params JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  trigger_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dt_rules_project_id ON digital_twin_trigger_rules(project_id);
CREATE INDEX idx_dt_rules_active ON digital_twin_trigger_rules(is_active) WHERE is_active = true;


-- 7. Functions & Triggers

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_digital_twin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dt_assets_updated_at
  BEFORE UPDATE ON digital_twin_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_digital_twin_updated_at();

CREATE TRIGGER update_dt_triggers_updated_at
  BEFORE UPDATE ON digital_twin_document_triggers
  FOR EACH ROW
  EXECUTE FUNCTION update_digital_twin_updated_at();

CREATE TRIGGER update_dt_sources_updated_at
  BEFORE UPDATE ON digital_twin_ingestion_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_digital_twin_updated_at();

CREATE TRIGGER update_dt_rules_updated_at
  BEFORE UPDATE ON digital_twin_trigger_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_digital_twin_updated_at();

-- Maintain is_current flag (only one current state per asset)
CREATE OR REPLACE FUNCTION maintain_current_state_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE digital_twin_asset_states
    SET is_current = false
    WHERE asset_id = NEW.asset_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintain_current_state_trigger
  BEFORE INSERT OR UPDATE ON digital_twin_asset_states
  FOR EACH ROW
  EXECUTE FUNCTION maintain_current_state_flag();

-- Update asset's current_state_id when new current state is created
CREATE OR REPLACE FUNCTION update_asset_current_state()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE digital_twin_assets
    SET current_state_id = NEW.id,
        current_state_version = NEW.state_version,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_asset_current_state_trigger
  AFTER INSERT OR UPDATE ON digital_twin_asset_states
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_current_state();


-- 8. RLS Policies
ALTER TABLE digital_twin_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_twin_asset_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_twin_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_twin_document_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_twin_ingestion_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_twin_trigger_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see assets in their projects
CREATE POLICY digital_twin_assets_select_policy ON digital_twin_assets
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE owner_id = current_setting('app.current_user_id', true)::UUID
        OR id IN (
          SELECT project_id FROM project_members 
          WHERE user_id = current_setting('app.current_user_id', true)::UUID
        )
    )
  );
  
CREATE POLICY digital_twin_events_select_policy ON digital_twin_events
  FOR SELECT
  USING (
    asset_id IN (
        SELECT id FROM digital_twin_assets WHERE project_id IN (
            SELECT id FROM projects 
            WHERE owner_id = current_setting('app.current_user_id', true)::UUID
            OR id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = current_setting('app.current_user_id', true)::UUID
            )
        )
    )
  );

CREATE POLICY digital_twin_asset_states_select_policy ON digital_twin_asset_states
  FOR SELECT
  USING (
    asset_id IN (
        SELECT id FROM digital_twin_assets WHERE project_id IN (
            SELECT id FROM projects 
            WHERE owner_id = current_setting('app.current_user_id', true)::UUID
            OR id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = current_setting('app.current_user_id', true)::UUID
            )
        )
    )
  );
