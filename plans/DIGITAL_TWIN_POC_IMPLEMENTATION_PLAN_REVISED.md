# Digital Twin POC Implementation Plan - REVISED (Aligned with Design Document)

**Status**: 📋 Revised - Aligned with Design Document  
**Created**: 2026-01-23  
**Revised**: 2026-01-23  
**Priority**: High  
**Target**: Q1 2026 (6-8 weeks)  
**Focus**: Proof of Concept for Digital Twin Integration with Building Projects

---

## 🎯 Executive Summary

This **REVISED** plan aligns with the approved design document (`DIGITAL_TWIN_POC_DESIGN.md`) and addresses all critical misalignments identified in the risk assessment. The plan implements an event-driven architecture with trigger-based document generation, matching the design document's specifications.

**Key Changes from Original Plan**:
- ✅ Schema aligned with design document (assets, asset_states, events, triggers, etc.)
- ✅ Event-driven architecture implemented from Phase 1
- ✅ Trigger system included from foundation
- ✅ Ingestion source management included
- ✅ Hash-based state comparison
- ✅ Multi-tenancy support (RLS policies)

**Cursor skills**: Use [skills/digital-twin-implementation.SKILL.md](../skills/digital-twin-implementation.SKILL.md) for correct React/module/API usage, and [skills/digital-twin-safe-implementation.SKILL.md](../skills/digital-twin-safe-implementation.SKILL.md) for risk-aware implementation (migrations, events, triggers, RLS).

**Readiness**: See [DIGITAL_TWIN_IMPLEMENTATION_READINESS_ASSESSMENT.md](./DIGITAL_TWIN_IMPLEMENTATION_READINESS_ASSESSMENT.md) for current implementation status and what to do first.

---

## 🏗️ Current ADPA Architecture (Relevant Components)

### Existing Infrastructure:
- ✅ **Projects System**: Full project management with tasks, deliverables, milestones
- ✅ **Document Generation**: AI-powered document creation from templates
- ✅ **Baseline Management**: Track approved states, detect drift (can be extended for assets)
- ✅ **Change Management**: Approval workflows, impact analysis
- ✅ **Real-time Updates**: WebSocket support for live updates (Socket.io)
- ✅ **Multi-document Context**: Process multiple source documents
- ✅ **Entity Extraction**: Extract requirements, risks, stakeholders, **dt_assets** (→ `extracted_dt_assets`), etc.
- ✅ **Job Queue**: Bull queue for async processing
- ✅ **Redis**: Pub/Sub for real-time event broadcasting

### Database Schema:
- `projects` table with full project metadata
- `project_tasks` table for WBS and task management
- `documents` table for project documentation
- `baselines` table for approved states (project-level)
- `change_requests` table for change management
- `entities` table for extracted project data; `extracted_dt_assets` for DT assets (import → `digital_twin_assets` with source traceability)
- `companies` table for multi-tenancy

---

## 📋 Phase 1: Foundation Setup (Week 1-2) - REVISED

### 1.1 Database Schema (Aligned with Design Document)

**Migration File**: `server/migrations/663_create_digital_twin_tables.sql`

#### **Core Tables (From Design Document):**

##### `digital_twin_assets` - Physical Assets Registry
```sql
CREATE TABLE digital_twin_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- Platform identification
  external_id VARCHAR(255) NOT NULL,
  platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('iTwin', 'AzureDT', 'Generic')),
  platform_instance_url TEXT,
  
  -- Asset metadata
  name VARCHAR(500) NOT NULL,
  description TEXT,
  asset_type VARCHAR(100),
  location JSONB,
  
  -- Current state reference
  current_state_id UUID REFERENCES digital_twin_asset_states(id) ON DELETE SET NULL,
  current_state_version INTEGER DEFAULT 0,
  
  -- Flexible metadata
  metadata JSONB DEFAULT '{}',
  
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
```

##### `digital_twin_asset_states` - Time-Series State Snapshots
```sql
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
```

##### `digital_twin_events` - Event Log (Ingestion Source)
```sql
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
  platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('iTwin', 'AzureDT', 'Generic')),
  
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
```

##### `digital_twin_document_triggers` - Document Generation Triggers
```sql
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
```

##### `digital_twin_ingestion_sources` - Ingestion Adapter Configuration
```sql
CREATE TABLE digital_twin_ingestion_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Source configuration
  name VARCHAR(255) NOT NULL,
  platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('iTwin', 'AzureDT', 'Generic')),
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
```

##### `digital_twin_trigger_rules` - Reusable Trigger Rule Templates
```sql
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
```

#### **Database Functions & Triggers:**

```sql
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
```

#### **Row-Level Security (RLS) Policies:**

```sql
-- Enable RLS on all tables
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
      WHERE owner_id = current_setting('app.current_user_id')::UUID
        OR id IN (
          SELECT project_id FROM project_members 
          WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    )
  );

-- Similar policies for other tables...
```

---

### 1.1.1 DT Assets: Extract-as-Entities and Import Flow (Same Pattern as Tasks)

DT assets follow the **same flow as tasks**:

1. **Extract as entities**  
   Documents (e.g. L0 Layout & Asset Register) are scanned for `dt_assets` YAML blocks. Assets are extracted and stored in **`extracted_dt_assets`** (the entity store), with **`source_document_id`** for each asset.

2. **Entities → Register**  
   When entities exist in `extracted_dt_assets`, users run **Import** (by document or by project) to create rows in **`digital_twin_assets`** (the Digital Twin Assets Register). This mirrors **WBS import**: activities/deliverables/etc. → `project_tasks`.

3. **Traceability**  
   Each `digital_twin_assets` row stores:
   - **`source_document_id`**: document the asset was extracted from (trace back to source).
   - **`source_entity_id`**: `extracted_dt_assets.id` of the entity used to create the asset.

**Comparison with tasks:**

| | Tasks | DT assets |
|---|---|---|
| Entity store | activities, deliverables, phases, milestones, work_items, … | `extracted_dt_assets` |
| Target register | `project_tasks` | `digital_twin_assets` |
| Import | WBS import (document or project) | `POST /api/digital-twin/assets/import` (document or project) |
| Traceability | `source_document_id`, `source_entity_id` on `project_tasks` | `source_document_id`, `source_entity_id` on `digital_twin_assets` |

**Migration:** `665_extracted_dt_assets_and_source_traceability.sql` creates `extracted_dt_assets` and adds `source_document_id` / `source_entity_id` to `digital_twin_assets`. Extraction runs via the scope/entity pipeline (`dt_assets`); import is an **explicit step** (no auto-import after extraction).

---

### 1.2 Backend Service Architecture (Event-Driven)

**New Service Files:**

#### `server/src/services/digitalTwinAssetService.ts`
Core service for Digital Twin asset operations:
- Asset registration and management
- Asset state queries
- Integration with existing project system

**Key Methods:**
```typescript
interface DigitalTwinAssetService {
  // Asset Management
  registerAsset(projectId: string, assetData: DigitalTwinAssetInput): Promise<DigitalTwinAsset>
  getAssetsByProject(projectId: string): Promise<DigitalTwinAsset[]>
  getAssetById(assetId: string): Promise<DigitalTwinAsset | null>
  updateAsset(assetId: string, updates: Partial<DigitalTwinAsset>): Promise<DigitalTwinAsset>
  
  // State Queries
  getCurrentState(assetId: string): Promise<DigitalTwinAssetState | null>
  getStateHistory(assetId: string, limit?: number): Promise<DigitalTwinAssetState[]>
}
```

#### `server/src/services/dtAssetImportService.ts`
Imports **entities** from `extracted_dt_assets` into `digital_twin_assets` (Digital Twin Assets Register). Mirrors WBS import (entities → `project_tasks`). Supports import by **document** or by **project**; sets `source_document_id` and `source_entity_id` on each created/updated asset for traceability. Used by `POST /api/digital-twin/assets/import`.

#### `server/src/services/digitalTwinEventService.ts` ⭐ NEW
Event processing service (event-driven architecture):
- Event ingestion from platforms
- Event processing queue
- Event deduplication
- Retry logic for failed events
- State snapshot creation from events

**Key Methods:**
```typescript
interface DigitalTwinEventService {
  // Event Ingestion
  ingestEvent(eventData: PlatformEvent): Promise<DigitalTwinEvent>
  processEvent(eventId: string): Promise<void>
  retryFailedEvent(eventId: string): Promise<void>
  
  // Event Queries
  getPendingEvents(limit?: number): Promise<DigitalTwinEvent[]>
  getEventHistory(assetId: string, limit?: number): Promise<DigitalTwinEvent[]>
  
  // State Creation
  createStateFromEvent(eventId: string): Promise<DigitalTwinAssetState>
}
```

#### `server/src/services/digitalTwinTriggerService.ts` ⭐ NEW
Trigger rule evaluation and document generation:
- Trigger rule evaluation engine
- Document trigger creation
- Job queue integration
- Rule matching logic

**Key Methods:**
```typescript
interface DigitalTwinTriggerService {
  // Trigger Rules
  createTriggerRule(projectId: string, ruleData: TriggerRuleInput): Promise<TriggerRule>
  evaluateTriggerRules(assetId: string, stateId: string, eventId: string): Promise<DocumentTrigger[]>
  getActiveRules(projectId: string): Promise<TriggerRule[]>
  
  // Document Triggers
  createDocumentTrigger(triggerData: DocumentTriggerInput): Promise<DocumentTrigger>
  processDocumentTrigger(triggerId: string): Promise<Document>
  getPendingTriggers(limit?: number): Promise<DocumentTrigger[]>
}
```

#### `server/src/services/digitalTwinIngestionService.ts` ⭐ NEW
Ingestion source management:
- Connection configuration management
- Sync scheduling and management
- Status tracking
- Error handling

**Key Methods:**
```typescript
interface DigitalTwinIngestionService {
  // Ingestion Sources
  createIngestionSource(projectId: string, sourceData: IngestionSourceInput): Promise<IngestionSource>
  getIngestionSources(projectId: string): Promise<IngestionSource[]>
  updateIngestionSource(sourceId: string, updates: Partial<IngestionSource>): Promise<IngestionSource>
  
  // Sync Management
  startSync(sourceId: string): Promise<void>
  pauseSync(sourceId: string): Promise<void>
  getSyncStatus(sourceId: string): Promise<SyncStatus>
}
```

#### `server/src/services/digitalTwinConnectorService.ts`
Platform-specific connectors (updated to use event system):
- Bentley iTwin connector
- Azure Digital Twins connector
- Generic REST API connector

**Key Methods:**
```typescript
interface DigitalTwinConnector {
  connect(config: ConnectorConfig): Promise<void>
  fetchAssetState(assetId: string): Promise<JSONB>
  subscribeToChanges(assetId: string, callback: (event: PlatformEvent) => void): Promise<Subscription>
  disconnect(): Promise<void>
  
  // Event Emission
  emitEvent(event: PlatformEvent): Promise<void> // Emits to digital_twin_events
}
```

#### `server/src/utils/digitalTwinStateUtils.ts` ⭐ NEW
State comparison utilities (hash-based):
- State hash calculation
- Changed fields detection
- State diff generation
- Efficient comparison logic

**Key Functions:**
```typescript
function calculateStateHash(state: JSONB): string
function detectChangedFields(previousState: JSONB, currentState: JSONB): string[]
function generateStateDiff(previousState: JSONB, currentState: JSONB): StateDiff
function compareStates(previousStateId: string, currentStateId: string): Promise<StateComparison>
```

---

### 1.3 API Routes (Aligned with Design Document)

**New Route Files:**

#### `server/src/routes/digital-twin-assets.ts`
```typescript
GET    /api/digital-twin/assets                    // List assets (paginated)
GET    /api/digital-twin/assets/:id                // Get asset details
POST   /api/digital-twin/assets                    // Create asset (manual)
PUT    /api/digital-twin/assets/:id                // Update asset
DELETE /api/digital-twin/assets/:id                // Delete asset (soft)
GET    /api/digital-twin/assets/:id/current-state  // Get current state
GET    /api/digital-twin/assets/:id/history        // Get state history
```

#### `server/src/routes/digital-twin-events.ts` ⭐ NEW
```typescript
GET    /api/digital-twin/events                    // List events (paginated, filtered)
GET    /api/digital-twin/events/:id                // Get event details
POST   /api/digital-twin/events                    // Create event (for ingestion)
GET    /api/digital-twin/events/pending            // Get pending events (processing queue)
POST   /api/digital-twin/events/:id/retry          // Retry failed event
```

#### `server/src/routes/digital-twin-ingestion.ts` ⭐ NEW
```typescript
POST   /api/digital-twin/ingestion/webhook/:sourceId  // Webhook endpoint for platforms
POST   /api/digital-twin/ingestion/sync/:sourceId     // Manual sync trigger
GET    /api/digital-twin/ingestion/sources            // List ingestion sources
POST   /api/digital-twin/ingestion/sources            // Create ingestion source
PUT    /api/digital-twin/ingestion/sources/:id        // Update ingestion source
POST   /api/digital-twin/ingestion/sources/:id/start   // Start sync
POST   /api/digital-twin/ingestion/sources/:id/pause  // Pause sync
```

#### `server/src/routes/digital-twin-triggers.ts` ⭐ NEW
```typescript
GET    /api/digital-twin/triggers                   // List document triggers
GET    /api/digital-twin/triggers/:id               // Get trigger details
POST   /api/digital-twin/triggers/rules              // Create trigger rule
GET    /api/digital-twin/triggers/rules              // List trigger rules
PUT    /api/digital-twin/triggers/rules/:id          // Update trigger rule
DELETE /api/digital-twin/triggers/rules/:id         // Delete trigger rule
POST   /api/digital-twin/triggers/:id/process        // Process trigger manually
```

---

## 🎨 Phase 2: Frontend Integration (Week 3)

### 2.1 UI Components (Updated for Event-Driven Architecture)

**New Component Files:**

#### `components/digital-twin/DigitalTwinAssetsList.tsx` (renamed from ModelsList)
- List all Digital Twin assets for a project
- Show asset status, last sync, event count
- Quick actions: view state, view events, configure sync

#### `components/digital-twin/DigitalTwinAssetCard.tsx` (renamed from ModelCard)
- Display asset details
- Show current state summary
- Show sync status and errors
- Link to state history and events

#### `components/digital-twin/DigitalTwinStateViewer.tsx`
- Display current state (JSON viewer with formatting)
- Show state history timeline
- Display changed fields
- State hash display

#### `components/digital-twin/DigitalTwinEventsList.tsx` ⭐ NEW
- List all events for an asset
- Filter by event type, status, date range
- Show processing status
- Retry failed events

#### `components/digital-twin/DigitalTwinEventDetails.tsx` ⭐ NEW
- Detailed event view
- Show event payload
- Show processing status and errors
- Link to created state snapshot

#### `components/digital-twin/DigitalTwinTriggerRulesManager.tsx` ⭐ NEW
- Create/edit trigger rules
- Test rule evaluation
- View rule trigger count
- Enable/disable rules

#### `components/digital-twin/DigitalTwinDocumentTriggersList.tsx` ⭐ NEW
- List all document triggers
- Filter by status, asset, template
- Show trigger rule that fired
- Link to generated documents

#### `components/digital-twin/DigitalTwinIngestionSourceSetup.tsx` ⭐ NEW
- Configure ingestion source
- Test connection
- Manage sync settings
- View sync status and errors

### 2.2 Project Integration

**Update Existing Components:**

#### `app/projects/[id]/page.tsx`
- Add "Digital Twins" tab to project view
- Show summary of assets, events, triggers
- Quick access to asset management

#### `app/projects/[id]/digital-twins/page.tsx`
- Full Digital Twin management interface
- Asset registration, event monitoring, trigger rules
- Ingestion source management
- Real-time updates dashboard

---

## 🔌 Phase 3: Platform Connectors (Week 4)

### 3.1 Bentley iTwin Connector (Event-Driven)

**Implementation:**
- Use iTwin.js Platform API
- Authenticate via OAuth2
- Fetch asset/project metadata
- Subscribe to asset state changes
- **Emit events to `digital_twin_events` table**
- Map iTwin assets to ADPA Digital Twin assets

**Key Features:**
- Connect to iTwin project
- Extract asset hierarchy
- Monitor asset property changes
- **Emit events when changes detected**
- Store connection config in `digital_twin_ingestion_sources`

**Files:**
- `server/src/services/connectors/iTwinConnector.ts`
- `server/src/config/itwin.config.ts`

### 3.2 Azure Digital Twins Connector (Event-Driven)

**Implementation:**
- Use Azure Digital Twins REST API
- Authenticate via Azure AD
- Query twin graph
- Subscribe to twin updates via Event Grid
- **Emit events to `digital_twin_events` table**
- Map Azure DT twins to ADPA assets

**Key Features:**
- Connect to Azure DT instance
- Query twin properties and relationships
- Subscribe to property updates
- **Emit events when changes detected**
- Store connection config in `digital_twin_ingestion_sources`

**Files:**
- `server/src/services/connectors/azureDigitalTwinsConnector.ts`
- `server/src/config/azure-dt.config.ts`

### 3.3 Generic REST API Connector (Event-Driven)

**Implementation:**
- Configurable endpoint and authentication
- Poll for state updates
- Webhook support
- **Emit events to `digital_twin_events` table**
- Custom mapping configuration

**Key Features:**
- Support any REST API-based Digital Twin platform
- Flexible authentication (API key, OAuth, Basic)
- Configurable polling intervals
- Webhook endpoint for real-time updates
- **Event-driven ingestion**

**Files:**
- `server/src/services/connectors/genericRestConnector.ts`
- `server/src/config/generic-connector.config.ts`

---

## 🧪 Phase 4: POC Scenarios (Week 5-6)

### 4.1 Scenario 1: Building System State Change (Event-Driven)

**Setup:**
1. Create building project in ADPA
2. Register HVAC system as Digital Twin asset
3. Configure ingestion source (iTwin or mock)
4. Create trigger rule: "When status = 'maintenance', generate report"

**Flow:**
1. **Platform event received** → Stored in `digital_twin_events`
2. **Event processed** → State snapshot created in `digital_twin_asset_states`
3. **Trigger rules evaluated** → Rule matches, document trigger created
4. **Document generation queued** → "HVAC System Maintenance Report" generated
5. **Real-time notification** → WebSocket event emitted to frontend

**Deliverables:**
- Event ingestion working
- State snapshot creation working
- Trigger rule evaluation working
- Document generation triggered
- Real-time updates working

### 4.2 Scenario 2: Construction Progress Tracking (Event-Driven)

**Setup:**
1. Create construction project
2. Register building components as Digital Twin assets
3. Configure ingestion source
4. Create trigger rule: "When completion_status > 90%, generate progress report"

**Flow:**
1. **Progress events received** → Multiple events for different components
2. **Events processed** → State snapshots created
3. **Trigger rules evaluated** → Rule matches for completed components
4. **Document generation queued** → "Construction Progress Report" generated
5. **Project tasks updated** → Integration with existing task system

**Deliverables:**
- Multi-asset event processing
- Trigger rule with threshold logic
- Automatic report generation
- Task/milestone integration

### 4.3 Scenario 3: Compliance & Safety Monitoring (Event-Driven)

**Setup:**
1. Create building operations project
2. Register safety systems as Digital Twin assets
3. Configure ingestion source
4. Create trigger rule: "When compliance_status != 'compliant', generate compliance report"

**Flow:**
1. **Inspection events received** → Safety inspection results
2. **Events processed** → State snapshots created
3. **Trigger rules evaluated** → Non-compliance detected
4. **Document generation queued** → "Safety Compliance Report" generated
5. **Risk/issue records created** → Integration with existing risk system

**Deliverables:**
- Compliance monitoring
- Risk/issue integration
- Automated reporting
- Notification system

---

## 📊 Phase 5: Testing & Validation (Week 7-8)

### 5.1 Unit Tests

**Test Files:**
- `__tests__/services/digitalTwinAssetService.test.ts`
- `__tests__/services/digitalTwinEventService.test.ts` ⭐ NEW
- `__tests__/services/digitalTwinTriggerService.test.ts` ⭐ NEW
- `__tests__/services/digitalTwinIngestionService.test.ts` ⭐ NEW
- `__tests__/utils/digitalTwinStateUtils.test.ts` ⭐ NEW

**Coverage:**
- Asset registration and management
- Event ingestion and processing
- State snapshot creation (hash-based)
- Trigger rule evaluation
- Document trigger creation
- Ingestion source management

### 5.2 Integration Tests

**Test Scenarios:**
- End-to-end event processing workflow
- Trigger rule evaluation and document generation
- Connector event emission
- Webhook handling
- Real-time event broadcasting
- Multi-tenant isolation

### 5.3 Manual Testing Checklist

- [ ] Register Digital Twin asset for building project
- [ ] Configure ingestion source
- [ ] Receive platform event
- [ ] Verify event stored in `digital_twin_events`
- [ ] Verify state snapshot created
- [ ] Verify state hash calculated
- [ ] Verify changed fields detected
- [ ] Create trigger rule
- [ ] Verify trigger rule evaluation
- [ ] Verify document trigger created
- [ ] Verify document generation triggered
- [ ] Verify real-time updates in UI
- [ ] Test connector (iTwin or Azure DT)
- [ ] Test webhook reception
- [ ] Test event retry logic
- [ ] Test multi-tenant isolation (RLS)

---

## 🎯 Success Criteria (Revised)

### Technical Success:
- ✅ Schema matches design document exactly
- ✅ Event system working (ingestion, processing, retry)
- ✅ Trigger system working (rules, evaluation, document generation)
- ✅ Hash-based state comparison working
- ✅ Ingestion source management working
- ✅ At least one platform connector working (iTwin or Azure DT)
- ✅ Real-time updates working (WebSocket)
- ✅ Multi-tenancy working (RLS policies)

### Business Success:
- ✅ POC demonstrates value to Bentley iTwin team
- ✅ POC demonstrates value to Microsoft Azure DT team
- ✅ Clear path to production implementation
- ✅ Partnership discussions initiated
- ✅ Pilot client identified

---

## 📅 Implementation Timeline (Revised)

### Week 1-2: Foundation (REVISED)
- ✅ Database schema matching design document
- ✅ Event processing service
- ✅ Trigger rule evaluation service
- ✅ Ingestion source management service
- ✅ State comparison utilities (hash-based)
- ✅ RLS policies for multi-tenancy
- ✅ Basic API routes

### Week 3: Frontend & Integration
- Complete UI components (updated for event-driven)
- Integrate with project management
- Event viewer and trigger rule manager
- Ingestion source configuration UI

### Week 4: Platform Connectors
- Implement at least one connector (iTwin or Azure DT)
- Generic REST connector
- Event emission from connectors
- Webhook handling
- Connection config storage

### Week 5-6: POC Scenarios
- Implement 2-3 demo scenarios
- Trigger rule configuration
- Document generation integration
- Real-time updates
- End-to-end testing

### Week 7-8: Polish & Demo Prep
- Bug fixes and polish
- Comprehensive testing
- Demo video recording
- Documentation
- Partnership presentation materials

---

## 🛠️ Technical Stack

### Backend:
- **Language**: TypeScript/Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (existing)
- **Authentication**: JWT (existing)
- **Real-time**: Socket.io (existing)
- **Job Queue**: Bull (existing)
- **Pub/Sub**: Redis (existing)

### Frontend:
- **Framework**: Next.js/React
- **UI Library**: Radix UI (existing)
- **State Management**: React hooks (existing)
- **Styling**: Tailwind CSS (existing)

### External Integrations:
- **Bentley iTwin**: iTwin.js Platform API
- **Azure Digital Twins**: Azure Digital Twins REST API + SDK
- **Authentication**: OAuth2 for both platforms

---

## 📝 Documentation Requirements

### Technical Documentation:
- API documentation (OpenAPI/Swagger)
- Database schema documentation
- Event processing flow diagrams
- Trigger rule configuration guide
- Connector setup instructions
- Webhook setup instructions

### User Documentation:
- Digital Twin asset registration guide
- Ingestion source configuration
- Trigger rule creation guide
- Event monitoring and troubleshooting
- Document generation workflow

### Partnership Materials:
- POC demo video
- Architecture diagrams (event-driven flow)
- Use case scenarios
- Integration roadmap

---

## 🖼️ Visualization (iTwin Viewer) – Not in Current Plan

**Status**: The **iTwin Viewer** (configurable iTwin.js viewer for viewing and interacting with **iModels** in the browser) is **not** implemented or specified in the current Digital Twin POC plan.

### What We Have vs. iTwin Viewer / Visualization

| Aspect | Current plan | iTwin Viewer (Bentley docs) |
|--------|--------------|----------------------------|
| **Frontend "viewer"** | `DigitalTwinStateViewer` – JSON viewer for `state_snapshot` (state history, changed fields, hash) | **iTwin Viewer** – 3D/iModel viewer: selection, measurement, clipping, navigation, tree view, property grid |
| **iTwin integration** | **Backend only**: iTwin.js **Platform API** → connector fetches metadata, subscribes to changes, **emits events** to `digital_twin_events` | **Frontend**: Create React App + `@itwin/web-viewer` template, Bentley auth (`IMJS_AUTH_CLIENT_*`), `IMJS_ITWIN_ID` / `IMJS_IMODEL_ID` to **view a specific iModel** |
| **Purpose** | Display ADPA state snapshots (our stored data) | Display and interact with **iModels** (Bentley 3D/BIM) |

### Where It Could Fit

- **Phase 3 (Connectors)** or a **new "Visualization" phase**: Add an **iTwin Viewer** surface *in addition to* the existing Digital Twin UI.
- **Possible implementation**:
  - New page or tab: e.g. `app/projects/[id]/digital-twins/imodel-viewer/page.tsx`, or embed a viewer in `DigitalTwinAssetCard` when `platform_type === 'iTwin'`.
  - Use **iTwin Viewer** (e.g. [Create React App template](https://www.npmjs.com/package/@itwin/web-viewer) `npx create-react-app@latest your-app-name --template @itwin/web-viewer --scripts-version @bentley/react-scripts`).
  - Bentley auth: `IMJS_AUTH_CLIENT_CLIENT_ID`, `IMJS_AUTH_CLIENT_SCOPES`, `IMJS_AUTH_CLIENT_REDIRECT_URI`; **Visualization API**; SPA, redirect e.g. `https://localhost:3000/signin-callback`.
  - `IMJS_ITWIN_ID` / `IMJS_IMODEL_ID`: derive from our assets (e.g. `platform_instance_url` or new fields) when linking an ADPA asset to an iTwin/iModel.
- **References**: [iTwin Viewer](https://www.itwinjs.org/learning/tutorials/), [iTwin Viewer Create React App Template](https://www.npmjs.com/package/@itwin/web-viewer), [iTwin.js extensions](https://www.itwinjs.org/learning/extensions/) for custom tools. [iTwinUI](https://itwinui.bentley.com/docs) – Bentley React UI library (`@itwin/itwinui-react`) for Viewer and Bentley-aligned UI.

### Recommendation

- **POC scope**: Current plan stays **backend + JSON state viewer** only. iTwin Viewer is **out of scope** unless explicitly added.
- **If adding Visualization**: Introduce a **"Phase 3b: iTwin Viewer (optional)"** or **"Phase 4: Visualization"** with the above implementation outline, and align with `DIGITAL_TWIN_INTEGRATION_ROADMAP.md` (e.g. iTwin Partner Program, demo for Caroline Keane).

---

## 🚀 Next Steps After POC

### If POC Successful:
1. Formalize partnerships (Bentley iTwin, Azure DT)
2. Expand to production-ready implementation
3. Add more platform connectors
4. Enhance document templates for Digital Twin use cases
5. Scale to multiple pilot clients

### If POC Needs Refinement:
1. Gather feedback from partnership discussions
2. Refine architecture based on requirements
3. Iterate on POC features
4. Re-demo with improvements

---

## 📚 References

- **Design Document**: `docs/roadmap/DIGITAL_TWIN_POC_DESIGN.md` ⭐ PRIMARY REFERENCE
- **Bentley iTwin Integration Roadmap**: `docs/roadmap/DIGITAL_TWIN_INTEGRATION_ROADMAP.md`
- **Digital Twin Testing Strategy**: `docs/roadmap/DIGITAL_TWIN_AS_TEST_STRATEGY.md`
- **iTwin.js Documentation**: https://www.itwinjs.org/
- **iTwinUI** (Bentley React UI): https://itwinui.bentley.com/docs – `@itwin/itwinui-react`, ThemeProvider, components for Viewer and Bentley-aligned Digital Twin UI.
- **iTwin Viewer / Creating an app to view an iModel**: Create React App template `@itwin/web-viewer`, Bentley auth (Visualization API, SPA), `IMJS_ITWIN_ID` / `IMJS_IMODEL_ID`. See developer.bentley.com, iTwin Viewer React docs.
- **Azure Digital Twins Documentation**: https://learn.microsoft.com/en-us/azure/digital-twins/
- **ADPA Project Management**: Existing project/task management system
- **ADPA Baseline/Drift Detection**: Existing baseline management features (can be extended)

---

**Last Updated**: 2026-01-23  
**Status**: ✅ Aligned with Design Document  
**Estimated Total Effort**: 6-8 weeks for complete POC
