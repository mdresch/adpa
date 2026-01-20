# Digital Twin PoC Design & Data Schema

**Status**: 🟡 In Design  
**Target**: Q1 2026  
**Purpose**: Foundation for Bentley iTwin & Azure Digital Twins integration  
**Last Updated**: January 2025

---

## 📋 Executive Summary

This document defines the **detailed technical design and data schema** for the Digital Twin PoC, enabling real-time synchronization between physical assets and ADPA's document generation system.

**Key Design Principles:**
- **Entity-Centric**: Track physical assets as entities with state snapshots
- **Time-Series Hybrid**: Support both real-time state queries and historical snapshots
- **Tenant Isolation**: Multi-tenant support via `project_id` and `company_id`
- **Event-Driven**: WebSocket/Socket.io for real-time updates
- **Scalable**: Partitioned by time and tenant for performance

---

## 🎯 PoC Goals & Scope

### **Primary Goals:**
1. **Demonstrate Real-Time Sync**: Asset state changes trigger document generation
2. **Unified Data Model**: Single schema supporting both Bentley iTwin and Azure DT
3. **Observability**: Full audit trail of asset changes and document triggers
4. **Scalability**: Handle 100+ concurrent assets with <100ms latency

### **Success Metrics:**
- ✅ <100ms latency for real-time state updates
- ✅ 99.9% ingestion reliability (with retry logic)
- ✅ Support 100+ active assets simultaneously
- ✅ Zero data loss during state transitions
- ✅ <5min document generation trigger time

### **Out of Scope (Phase 1):**
- Complex multi-asset relationships (Phase 2)
- Historical rollback/versioning (Phase 3)
- Advanced analytics/AI insights (Phase 4)

---

## 🏗️ Architecture Overview

### **High-Level Flow:**
```
Physical Asset Change
    ↓
Digital Twin Platform (iTwin/Azure DT)
    ↓
ADPA Ingestion Adapter (Real-time API/Webhook)
    ↓
Digital Twin State Store (PostgreSQL)
    ↓
Event Bus (Socket.io + Redis Pub/Sub)
    ↓
Document Generator Trigger
    ↓
Generated Documentation (Markdown → PDF/DOCX)
```

### **Component Breakdown:**

#### **1. Ingestion Layer**
- **Real-time Adapters**: Poll or subscribe to Digital Twin platforms
- **Batch Import**: Historical data migration
- **Transform Pipeline**: Normalize platform-specific data to unified schema
- **Validation**: Schema validation, data quality checks

#### **2. Storage Layer**
- **Primary Store**: PostgreSQL (OLTP) for current state
- **Time-Series Store**: PostgreSQL (partitioned tables) for historical snapshots
- **Search Index**: Full-text search on asset metadata
- **Cold Storage**: Archive old snapshots (>90 days) to S3/Supabase Storage

#### **3. Realtime Sync Layer**
- **Event API**: REST endpoints for state queries
- **Socket.io**: WebSocket server for live updates
- **Redis Pub/Sub**: Backend event broadcasting
- **Client Subscriptions**: Filtered updates per project/asset

#### **4. Integration Layer**
- **Document Generator**: Trigger on state changes
- **Notification System**: Alerts for critical state transitions
- **Audit Log**: Full change history

---

## 📊 Data Model Design

### **Entity-Relationship Diagram:**
```
┌─────────────────┐
│   projects      │ (existing)
└────────┬────────┘
         │ 1:N
         │
┌────────▼─────────────────────────────────┐
│      digital_twin_assets                 │ (new)
│  • id (UUID)                             │
│  • project_id (FK)                       │
│  • external_id (platform-specific)       │
│  • platform_type (iTwin | AzureDT)      │
│  • name, description, type               │
│  • current_state_id (FK)                 │
│  • metadata (JSONB)                      │
│  • created_at, updated_at                │
└────────┬─────────────────────────────────┘
         │ 1:N
         │
┌────────▼─────────────────────────────────┐
│   digital_twin_asset_states              │ (new)
│  • id (UUID)                             │
│  • asset_id (FK)                         │
│  • state_snapshot (JSONB)                │
│  • state_version (INTEGER)               │
│  • changed_fields (JSONB[])              │
│  • source_event_id (FK)                  │
│  • timestamp (TIMESTAMPTZ)               │
│  • is_current (BOOLEAN)                  │
└────────┬─────────────────────────────────┘
         │ 1:N
         │
┌────────▼─────────────────────────────────┐
│   digital_twin_events                    │ (new)
│  • id (UUID)                             │
│  • asset_id (FK)                         │
│  • event_type (state_change | ...)       │
│  • event_payload (JSONB)                 │
│  • platform_event_id (external)          │
│  • processed_at (TIMESTAMPTZ)            │
└──────────────────────────────────────────┘
         │ 1:N
         │
┌────────▼─────────────────────────────────┐
│   digital_twin_document_triggers         │ (new)
│  • id (UUID)                             │
│  • asset_id (FK)                         │
│  • event_id (FK)                         │
│  • document_id (FK → documents)          │
│  • trigger_rule (JSONB)                  │
│  • status (pending | processing | done)  │
└──────────────────────────────────────────┘
```

---

## 💾 Detailed Schema Definition

### **1. Core Tables**

#### **`digital_twin_assets`** - Physical Assets Registry
```sql
CREATE TABLE digital_twin_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL, -- Tenant isolation
  
  -- Platform identification
  external_id VARCHAR(255) NOT NULL, -- Platform-specific ID (iTwin element ID, Azure DT twin ID)
  platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('iTwin', 'AzureDT', 'Generic')),
  platform_instance_url TEXT, -- Which iTwin project or Azure DT instance
  
  -- Asset metadata
  name VARCHAR(500) NOT NULL,
  description TEXT,
  asset_type VARCHAR(100), -- Bridge, Building, Vehicle, Equipment, etc.
  location JSONB, -- Geo coordinates, building/floor, etc.
  
  -- Current state reference
  current_state_id UUID REFERENCES digital_twin_asset_states(id) ON DELETE SET NULL,
  current_state_version INTEGER DEFAULT 0,
  
  -- Flexible metadata (platform-specific fields)
  metadata JSONB DEFAULT '{}', -- Store platform-specific attributes
  
  -- Sync metadata
  last_synced_at TIMESTAMPTZ,
  sync_status VARCHAR(20) DEFAULT 'active' CHECK (sync_status IN ('active', 'paused', 'error', 'disconnected')),
  sync_error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ, -- Soft delete
  
  -- Unique constraint: one asset per external_id per platform
  UNIQUE (external_id, platform_type, platform_instance_url)
);

-- Indexes
CREATE INDEX idx_dt_assets_project_id ON digital_twin_assets(project_id);
CREATE INDEX idx_dt_assets_company_id ON digital_twin_assets(company_id);
CREATE INDEX idx_dt_assets_platform ON digital_twin_assets(platform_type, external_id);
CREATE INDEX idx_dt_assets_sync_status ON digital_twin_assets(sync_status) WHERE sync_status = 'active';
CREATE INDEX idx_dt_assets_asset_type ON digital_twin_assets(asset_type);
CREATE INDEX idx_dt_assets_metadata_gin ON digital_twin_assets USING GIN(metadata);

-- Full-text search index
CREATE INDEX idx_dt_assets_search ON digital_twin_assets USING GIN(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);
```

#### **`digital_twin_asset_states`** - Time-Series State Snapshots
```sql
CREATE TABLE digital_twin_asset_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES digital_twin_assets(id) ON DELETE CASCADE,
  
  -- State data
  state_snapshot JSONB NOT NULL, -- Full state at this point in time
  state_version INTEGER NOT NULL, -- Incremental version number
  changed_fields JSONB DEFAULT '[]', -- Array of field names that changed
  previous_state_id UUID REFERENCES digital_twin_asset_states(id) ON DELETE SET NULL,
  
  -- Event reference
  source_event_id UUID REFERENCES digital_twin_events(id) ON DELETE SET NULL,
  
  -- State metadata
  is_current BOOLEAN DEFAULT false, -- Only one current state per asset
  state_hash VARCHAR(64), -- SHA-256 hash for change detection
  change_summary TEXT, -- Human-readable summary of changes
  
  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint: one state per version
  UNIQUE (asset_id, state_version)
);

-- Indexes (critical for time-series queries)
CREATE INDEX idx_dt_states_asset_id ON digital_twin_asset_states(asset_id);
CREATE INDEX idx_dt_states_asset_current ON digital_twin_asset_states(asset_id, is_current) WHERE is_current = true;
CREATE INDEX idx_dt_states_timestamp ON digital_twin_asset_states(timestamp DESC);
CREATE INDEX idx_dt_states_event_id ON digital_twin_asset_states(source_event_id);
CREATE INDEX idx_dt_states_snapshot_gin ON digital_twin_asset_states USING GIN(state_snapshot);

-- Partitioning by timestamp (monthly partitions for scalability)
-- Note: Enable partitioning in production for large-scale deployments
```

#### **`digital_twin_events`** - Event Log (Ingestion Source)
```sql
CREATE TABLE digital_twin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES digital_twin_assets(id) ON DELETE CASCADE,
  
  -- Event classification
  event_type VARCHAR(50) NOT NULL CHECK (
    event_type IN (
      'state_change',      -- Asset state updated
      'attribute_change',  -- Single attribute changed
      'relationship_change', -- Asset relationships changed
      'creation',          -- Asset created
      'deletion',          -- Asset deleted
      'alert',             -- Platform alert/notification
      'sync_error'         -- Ingestion error
    )
  ),
  
  -- Event data
  event_payload JSONB NOT NULL DEFAULT '{}', -- Raw event data from platform
  event_summary TEXT, -- Human-readable summary
  
  -- Platform reference
  platform_event_id VARCHAR(255), -- External event ID from platform
  platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('iTwin', 'AzureDT', 'Generic')),
  
  -- Processing metadata
  processed_at TIMESTAMPTZ,
  processing_status VARCHAR(20) DEFAULT 'pending' CHECK (
    processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')
  ),
  processing_error TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps (event timestamp vs ingestion timestamp)
  event_timestamp TIMESTAMPTZ NOT NULL, -- When the event occurred (from platform)
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- When we received it
  
  -- Unique constraint: prevent duplicate event processing
  UNIQUE (platform_event_id, platform_type, asset_id)
);

-- Indexes
CREATE INDEX idx_dt_events_asset_id ON digital_twin_events(asset_id);
CREATE INDEX idx_dt_events_type ON digital_twin_events(event_type);
CREATE INDEX idx_dt_events_status ON digital_twin_events(processing_status) WHERE processing_status IN ('pending', 'processing');
CREATE INDEX idx_dt_events_timestamp ON digital_twin_events(event_timestamp DESC);
CREATE INDEX idx_dt_events_ingested ON digital_twin_events(ingested_at DESC);
CREATE INDEX idx_dt_events_payload_gin ON digital_twin_events USING GIN(event_payload);
```

#### **`digital_twin_document_triggers`** - Document Generation Triggers
```sql
CREATE TABLE digital_twin_document_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES digital_twin_assets(id) ON DELETE CASCADE,
  event_id UUID REFERENCES digital_twin_events(id) ON DELETE SET NULL,
  
  -- Trigger configuration
  trigger_rule JSONB NOT NULL, -- Rule that caused trigger (e.g., {"field": "status", "operator": "equals", "value": "maintenance"})
  trigger_type VARCHAR(50) NOT NULL CHECK (
    trigger_type IN (
      'state_change',       -- Any state change
      'attribute_change',   -- Specific attribute changed
      'threshold_breach',   -- Value crossed threshold
      'scheduled',          -- Time-based trigger
      'manual'              -- User-initiated
    )
  ),
  
  -- Document generation
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL, -- Generated document
  generation_params JSONB DEFAULT '{}', -- Parameters passed to document generator
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  status_message TEXT,
  
  -- Job tracking
  job_id UUID, -- Reference to Bull queue job
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timestamps
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_dt_triggers_asset_id ON digital_twin_document_triggers(asset_id);
CREATE INDEX idx_dt_triggers_event_id ON digital_twin_document_triggers(event_id);
CREATE INDEX idx_dt_triggers_status ON digital_twin_document_triggers(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_dt_triggers_template_id ON digital_twin_document_triggers(template_id);
CREATE INDEX idx_dt_triggers_triggered_at ON digital_twin_document_triggers(triggered_at DESC);
```

---

### **2. Supporting Tables**

#### **`digital_twin_ingestion_sources`** - Ingestion Adapter Configuration
```sql
CREATE TABLE digital_twin_ingestion_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Source configuration
  name VARCHAR(255) NOT NULL,
  platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('iTwin', 'AzureDT', 'Generic')),
  connection_config JSONB NOT NULL, -- Encrypted connection details (API keys, URLs)
  
  -- Sync configuration
  sync_mode VARCHAR(20) DEFAULT 'realtime' CHECK (sync_mode IN ('realtime', 'polling', 'batch', 'manual')),
  poll_interval_seconds INTEGER DEFAULT 60, -- For polling mode
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

#### **`digital_twin_trigger_rules`** - Reusable Trigger Rule Templates
```sql
CREATE TABLE digital_twin_trigger_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Rule definition
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_config JSONB NOT NULL, -- Condition logic (e.g., {"field": "status", "operator": "equals", "value": "maintenance"})
  trigger_type VARCHAR(50) NOT NULL,
  
  -- Document generation
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  generation_params JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  trigger_count INTEGER DEFAULT 0, -- How many times this rule fired
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dt_rules_project_id ON digital_twin_trigger_rules(project_id);
CREATE INDEX idx_dt_rules_active ON digital_twin_trigger_rules(is_active) WHERE is_active = true;
```

---

### **3. Helper Functions & Triggers**

#### **Auto-update `updated_at` timestamp:**
```sql
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
```

#### **Maintain `is_current` flag (only one current state per asset):**
```sql
CREATE OR REPLACE FUNCTION maintain_current_state_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- If this state is marked as current, unmark all others for this asset
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
```

#### **Update asset's current_state_id when new current state is created:**
```sql
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

---

## 🔄 Data Flow Patterns

### **Pattern 1: Real-Time State Ingestion**

```typescript
// 1. Event received from platform
const event = await receivePlatformEvent(externalEventId);

// 2. Find or create asset
let asset = await findAssetByExternalId(event.externalId, event.platformType);
if (!asset) {
  asset = await createAsset({
    external_id: event.externalId,
    platform_type: event.platformType,
    project_id: projectId,
    name: event.name,
    // ...
  });
}

// 3. Create event record
const eventRecord = await createEvent({
  asset_id: asset.id,
  event_type: 'state_change',
  event_payload: event.data,
  platform_event_id: event.id,
  event_timestamp: event.timestamp,
});

// 4. Create state snapshot (if state changed)
const currentState = asset.current_state;
const newStateHash = hashState(event.data);
if (currentState?.state_hash !== newStateHash) {
  const newState = await createState({
    asset_id: asset.id,
    state_snapshot: event.data,
    state_version: (currentState?.state_version || 0) + 1,
    previous_state_id: currentState?.id,
    source_event_id: eventRecord.id,
    is_current: true,
    state_hash: newStateHash,
  });
  
  // 5. Check trigger rules
  await checkTriggerRules(asset.id, newState.id, eventRecord.id);
}

// 6. Emit real-time event via Socket.io
io.to(`project:${projectId}`).emit('digital-twin:state-change', {
  asset_id: asset.id,
  state_id: newState.id,
  changes: diffStates(currentState, newState),
});
```

### **Pattern 2: Document Generation Trigger**

```typescript
// Trigger rule evaluation
async function checkTriggerRules(assetId: string, stateId: string, eventId: string) {
  const asset = await getAsset(assetId);
  const state = await getState(stateId);
  
  // Get active rules for this project
  const rules = await getActiveTriggerRules(asset.project_id);
  
  for (const rule of rules) {
    if (evaluateRule(rule.rule_config, state.state_snapshot)) {
      // Rule matched - create trigger
      const trigger = await createDocumentTrigger({
        asset_id: assetId,
        event_id: eventId,
        trigger_rule: rule.rule_config,
        trigger_type: rule.trigger_type,
        template_id: rule.template_id,
        generation_params: rule.generation_params,
        status: 'pending',
      });
      
      // Queue document generation job
      const job = await queueDocumentGeneration({
        trigger_id: trigger.id,
        template_id: rule.template_id,
        context: {
          asset: asset,
          state: state,
          project_id: asset.project_id,
        },
      });
      
      await updateTrigger(trigger.id, { job_id: job.id });
    }
  }
}
```

---

## 📡 API Design

### **REST Endpoints**

#### **Assets API:**
```
GET    /api/digital-twin/assets                    # List assets (paginated)
GET    /api/digital-twin/assets/:id                # Get asset details
POST   /api/digital-twin/assets                    # Create asset (manual)
PUT    /api/digital-twin/assets/:id                # Update asset
DELETE /api/digital-twin/assets/:id                # Delete asset (soft)
GET    /api/digital-twin/assets/:id/current-state  # Get current state
GET    /api/digital-twin/assets/:id/history        # Get state history
```

#### **Events API:**
```
GET    /api/digital-twin/events                    # List events (paginated, filtered)
GET    /api/digital-twin/events/:id                # Get event details
POST   /api/digital-twin/events                    # Create event (for ingestion)
GET    /api/digital-twin/events/pending            # Get pending events (processing queue)
```

#### **Ingestion API:**
```
POST   /api/digital-twin/ingestion/webhook/:sourceId  # Webhook endpoint for platforms
POST   /api/digital-twin/ingestion/sync/:sourceId     # Manual sync trigger
GET    /api/digital-twin/ingestion/sources            # List ingestion sources
POST   /api/digital-twin/ingestion/sources            # Create ingestion source
```

#### **Triggers API:**
```
GET    /api/digital-twin/triggers                   # List document triggers
GET    /api/digital-twin/triggers/:id               # Get trigger details
POST   /api/digital-twin/triggers/rules             # Create trigger rule
GET    /api/digital-twin/triggers/rules             # List trigger rules
```

### **WebSocket Events (Socket.io)**

#### **Client → Server:**
```typescript
socket.emit('digital-twin:subscribe', {
  project_id: string,
  asset_ids?: string[], // Optional: specific assets
});

socket.emit('digital-twin:unsubscribe', {
  project_id: string,
});
```

#### **Server → Client:**
```typescript
// State change notification
socket.on('digital-twin:state-change', (data: {
  asset_id: string,
  state_id: string,
  changes: Record<string, { old: any; new: any }>,
  timestamp: string,
}));

// Document trigger notification
socket.on('digital-twin:document-triggered', (data: {
  trigger_id: string,
  asset_id: string,
  document_id: string,
  template_id: string,
  status: string,
}));

// Ingestion status
socket.on('digital-twin:sync-status', (data: {
  source_id: string,
  status: 'syncing' | 'completed' | 'error',
  last_sync_at: string,
}));
```

---

## 🔐 Security & Multi-Tenancy

### **Row-Level Security (RLS) Policies:**

```sql
-- Enable RLS on all tables
ALTER TABLE digital_twin_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_twin_asset_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_twin_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_twin_document_triggers ENABLE ROW LEVEL SECURITY;

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

### **Access Control:**
- **Project Members**: Can view assets and states in their projects
- **Project Owners**: Can manage ingestion sources and trigger rules
- **Admins**: Full access to all assets (cross-project visibility)

---

## 📈 Performance Considerations

### **Partitioning Strategy:**
- **Time-series tables** (`digital_twin_asset_states`, `digital_twin_events`) partitioned by `timestamp` (monthly)
- **Current state queries** use index on `(asset_id, is_current)` for O(1) lookups
- **Historical queries** use partitioned tables for efficient time-range scans

### **Caching Strategy:**
- **Redis Cache**: Current states cached for 5 minutes (`asset:{id}:current_state`)
- **Event Cache**: Last 100 events per asset cached for real-time UI
- **Cache Invalidation**: On state change, invalidate asset cache

### **Indexing:**
- All foreign keys indexed
- JSONB fields indexed with GIN indexes for flexible queries
- Composite indexes for common query patterns (asset + timestamp, project + status)

---

## 🧪 Testing Strategy

### **Unit Tests:**
- Schema validation
- Trigger rule evaluation
- State diff calculation
- Event processing logic

### **Integration Tests:**
- Ingestion adapter (mock platform responses)
- Document trigger workflow
- State snapshot creation
- Real-time event emission

### **E2E Tests (Playwright):**
- Asset creation → State change → Document generation
- Real-time updates in UI (WebSocket)
- Trigger rule configuration
- Multi-asset dashboard

---

## 📦 Migration Plan

### **Phase 1: Schema Creation**
```sql
-- Migration file: XXX_create_digital_twin_tables.sql
-- 1. Create all tables
-- 2. Create indexes
-- 3. Create triggers and functions
-- 4. Enable RLS policies
```

### **Phase 2: Seed Data**
- Create sample ingestion sources
- Create sample trigger rules
- Test with mock data

### **Phase 3: Integration**
- Connect ingestion adapters
- Test with real platforms (sandbox)
- Monitor performance

---

## 🚀 Next Steps

1. **Review & Approval**: Get stakeholder sign-off on schema design
2. **Create Migration**: Write SQL migration file following ADPA conventions
3. **Build Ingestion Adapters**: Implement iTwin and Azure DT connectors (Option B)
4. **Build UI Components**: Dashboard, asset detail, timeline views (Option C)
5. **Write E2E Tests**: Playwright scenarios for full workflows (Option C)

---

## 📚 References

- [ADPA Database Schema Overview](../07-architecture/DATABASE_SCHEMA_OVERVIEW.md)
- [Digital Twin Integration Roadmap](./DIGITAL_TWIN_INTEGRATION_ROADMAP.md)
- [Bentley iTwin.js Documentation](https://www.itwinjs.org/)
- [Azure Digital Twins REST API](https://docs.microsoft.com/azure/digital-twins/concepts-apis-sdks)

---

**Status**: ✅ Design Complete - Ready for Migration Creation  
**Next Action**: Create SQL migration file (`server/migrations/XXX_create_digital_twin_tables.sql`)
