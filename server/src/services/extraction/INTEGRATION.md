# Extraction Module Integration Guide

## Overview

The extraction module provides a modular, registry-driven system for extracting entities from project documents. This guide explains how to integrate and use the new system.

## Quick Start

### 1. Enable Feature Flag

Add to `server/.env`:
```bash
EXTRACTION_USE_NEW_WORK_ITEMS=true
```

### 2. Restart Server

The registry initializes automatically at server startup via `initializeQueues()`.

### 3. Monitor Logs

Watch for these log messages:
```
[EXTRACTION-REGISTRY] Registry initialized
[EXTRACTION-CHILD] Using new orchestrator for work_items
```

## Architecture

```
Queue Job (extract-entity-work_items)
    ↓
Queue Processor (queueService.ts)
    ↓
Check Registry (hasEntity + isEnabled)
    ↓
┌─────────────────┬─────────────────┐
│ Feature Enabled │ Feature Disabled │
│ (New Path)      │ (Legacy Path)    │
├─────────────────┼─────────────────┤
│ Orchestrator    │ Legacy Service  │
│   ↓             │   ↓             │
│ Registry        │ extractSingle   │
│   ↓             │ EntityType()    │
│ extractWorkItems│   ↓             │
│   ↓             │ saveSingle      │
│ saveWorkItems   │ EntityType()    │
└─────────────────┴─────────────────┘
```

## Feature Flags

### Environment Variables

Format: `EXTRACTION_USE_NEW_<ENTITY_TYPE>`

Examples:
- `EXTRACTION_USE_NEW_WORK_ITEMS=true`
- `EXTRACTION_USE_NEW_CAPACITY_PLANS=true`

### Programmatic Control

```typescript
import { extractionRegistry } from './extraction/ExtractionRegistry'

// Enable
extractionRegistry.enableFeature('work_items')

// Disable
extractionRegistry.disableFeature('work_items')

// Check status
const isEnabled = extractionRegistry.isEnabled('work_items')
```

## Adding New Entities

### Step 1: Create Entity Module

```typescript
// entities/capacity_plans/extractCapacityPlans.ts
export async function extractCapacityPlans(
  context: ExtractionContext,
  options?: { temperature?: number; maxTokens?: number }
): Promise<ExtractionResult<CapacityPlan>> {
  // Extraction logic using base utilities
}

// entities/capacity_plans/saveCapacityPlans.ts
export async function saveCapacityPlans(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: CapacityPlan[]
): Promise<PersistenceResult> {
  // Persistence logic
}
```

### Step 2: Register in Registry

Update `ExtractionRegistry.ts`:
```typescript
export async function initializeRegistry(): Promise<void> {
  // ... existing registrations ...
  
  // Register new entity
  const { extractCapacityPlans, saveCapacityPlans } = await import('./entities/capacity_plans')
  extractionRegistry.register('capacity_plans', {
    extract: extractCapacityPlans,
    save: saveCapacityPlans
  })
  
  // Load feature flag
  extractionRegistry.setFeatureFlagFromEnv('capacity_plans')
}
```

### Step 3: Enable Feature Flag

```bash
EXTRACTION_USE_NEW_CAPACITY_PLANS=true
```

### Step 4: Test

Run parity tests and validate output matches legacy.

## Monitoring

### Log Messages

**Registry Initialization**:
```
[EXTRACTION-REGISTRY] Registry initialized
  registeredEntities: ['work_items', 'capacity_plans']
  featureFlags: { work_items: true, capacity_plans: false }
```

**Extraction Path**:
```
[EXTRACTION-CHILD] Using new orchestrator for work_items
[EXTRACTION-WORK-ITEMS] Starting extraction
[EXTRACTION-WORK-ITEMS] Extracted 15 work items
[EXTRACTION-CHILD] Saved 15 work_items (new orchestrator)
```

**Legacy Path**:
```
[EXTRACTION-CHILD] Using legacy service for work_items (not registered or feature flag disabled)
[EXTRACTION-CHILD] Extracted 15 work_items (legacy)
```

**Fallback**:
```
[EXTRACTION-CHILD] Orchestrator failed for work_items, falling back to legacy: {error}
```

## Troubleshooting

### Registry Not Initialized

**Symptom**: All entities use legacy path

**Check**:
1. Check server logs for registry initialization
2. Verify `initializeQueues()` is called
3. Check for import errors

**Fix**:
```typescript
// Ensure initializeQueues() calls initializeRegistry()
await initializeRegistry()
```

### Feature Flag Not Working

**Symptom**: Entity uses legacy path even with feature flag enabled

**Check**:
1. Verify environment variable name: `EXTRACTION_USE_NEW_<ENTITY>`
2. Check registry logs for feature flag status
3. Verify entity is registered

**Fix**:
```bash
# Check env var
echo $EXTRACTION_USE_NEW_WORK_ITEMS

# Restart server to reload env vars
```

### Orchestrator Fails

**Symptom**: Logs show fallback to legacy

**Check**:
1. Check error logs for specific failure
2. Verify entity module is correctly registered
3. Check base utilities are working

**Fix**:
- System automatically falls back to legacy
- Fix orchestrator issue
- Re-enable feature flag

## Rollback Procedure

### Instant Rollback

```bash
# Disable feature flag
EXTRACTION_USE_NEW_WORK_ITEMS=false

# Restart server (or just restart queue workers)
```

### Programmatic Rollback

```typescript
extractionRegistry.disableFeature('work_items')
```

## Performance Considerations

- **Cache**: New extractor uses same cache as legacy (no performance impact)
- **Parallel Processing**: Queue processes 5 entities concurrently (unchanged)
- **Transaction Boundaries**: Per-entity transactions (unchanged)
- **Error Isolation**: Entity failures don't affect others (unchanged)

## Testing

### Parity Tests

```bash
cd server
npm test -- workItems.parity.test.ts
```

### Manual Testing

1. Create test project
2. Upload sample documents
3. Run extraction job
4. Compare entity counts with legacy
5. Verify source document IDs are resolved

## Migration Checklist

For each entity migration:

- [ ] Create entity module (extract + save)
- [ ] Register in registry
- [ ] Add feature flag
- [ ] Create parity tests
- [ ] Test in staging
- [ ] Enable in production
- [ ] Monitor for 1 week
- [ ] Remove legacy code (after all entities migrated)

## Support

For issues or questions:
1. Check logs for error messages
2. Review this integration guide
3. Check phase completion docs in `server/docs/`
4. Review entity module code in `server/src/services/extraction/entities/`

