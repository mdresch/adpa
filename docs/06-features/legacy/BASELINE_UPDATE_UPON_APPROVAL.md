# Baseline Update Upon Approval

**Task ID**: TASK-746  
**Status**: ✅ Implemented  
**Phase**: 3 - Workflow Automation (from DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md)

---

## Overview

The Baseline Update Upon Approval feature automatically updates project baselines when drift-resolution change requests are approved. This closes the loop from drift detection → change request → approval → baseline synchronization.

**Key Principle**: When stakeholders approve changes, the baseline must automatically reflect those changes to maintain alignment between approved plans and current state.

---

## How It Works

### Automatic Workflow

```
1. Drift Detection
   ↓
2. Change Request Created (with drift data in metadata)
   ↓
3. Stakeholder Reviews & Approves CR
   ↓
4. 🔄 DATABASE TRIGGER FIRES (automatic)
   ↓
5. Baseline Updated Automatically
   - Version incremented (e.g., 1.0 → 1.1)
   - Changed fields merged into baseline
   - Update history recorded
   - Audit trail created
   ↓
6. ✅ System synchronized
```

### Components

#### 1. Database Trigger
**File**: `server/migrations/020_baseline_update_on_cr_approval.sql`

**Trigger**: `trigger_update_baseline_on_cr_approval`
- Fires when a change request document status changes to 'approved'
- Only processes drift resolution change requests
- Calls `update_baseline_from_cr()` function automatically

**Key Functions**:
- `extract_baseline_changes_from_cr()`: Extracts changes from CR metadata
- `update_baseline_from_cr()`: Updates baseline fields and version
- Maps entity types to baseline components (scope, technical, timeline, cost, etc.)

#### 2. Service Layer
**File**: `server/src/services/baselineUpdateService.ts`

**Key Functions**:
- `updateBaselineFromChangeRequest()`: Manual baseline update (also called by trigger)
- `previewBaselineChanges()`: Preview what will change before approval
- `getBaselineUpdateHistory()`: View history of baseline updates
- `hasBaselineBeenUpdated()`: Check if CR has already updated baseline
- `manuallyUpdateBaseline()`: Manual trigger if automatic failed

#### 3. API Endpoints
**File**: `server/src/routes/baselineUpdates.ts`

```
GET  /api/baseline-updates/project/:projectId/history
     → Get all baseline updates for a project

GET  /api/baseline-updates/:updateId
     → Get details of a specific update

POST /api/baseline-updates/preview/:changeRequestId
     → Preview baseline changes before approval

POST /api/baseline-updates/manual/:changeRequestId
     → Manually trigger baseline update (if automatic failed)

GET  /api/baseline-updates/check/:changeRequestId
     → Check if baseline has been updated for a CR
```

#### 4. Integration with Drift Resolution
**File**: `server/src/services/driftResolutionService.ts`

When drift is detected and resolved:
1. Creates change request with `major_changes` in metadata
2. Each change includes:
   - `entityType`: What was changed (deliverables, budget, milestones, etc.)
   - `driftType`: added, removed, modified
   - `baselineValue`: Original baseline value
   - `currentValue`: New value from document
   - `requiresApproval`: Whether approval needed

3. When CR is approved, trigger extracts these changes and updates baseline

---

## Entity Type Mapping

The system tracks 14 entity types and maps them to baseline components:

| Entity Types | Baseline Component | Examples |
|--------------|-------------------|----------|
| `scope_items`, `deliverables`, `requirements`, `constraints` | `scope_baseline` | Features, deliverables, requirements |
| `technologies`, `best_practices` | `technical_baseline` | Tech stack, architecture, standards |
| `milestones`, `phases`, `activities` | `timeline_baseline` | Project schedule, milestones |
| `budget`, `resources` | `cost_baseline`, `resource_baseline` | Budget, team allocation |
| `success_criteria`, `quality_standards` | `success_criteria` | KPIs, quality metrics |
| `stakeholders` | `resource_baseline` | Team members, stakeholders |
| `risks` | *(tracked separately)* | Risk register |

---

## Database Schema

### Tables

#### `baseline_cr_updates`
Tracks every baseline update triggered by a change request.

```sql
CREATE TABLE baseline_cr_updates (
  id UUID PRIMARY KEY,
  baseline_id UUID REFERENCES project_baselines(id),
  change_request_id UUID REFERENCES documents(id),
  
  update_type VARCHAR(50),  -- scope_update, budget_update, etc.
  updated_fields JSONB,      -- Which fields changed
  previous_values JSONB,     -- Values before update
  new_values JSONB,          -- Values after update
  
  update_summary TEXT,       -- Human-readable summary
  approved_by UUID,          -- Who approved the CR
  approved_at TIMESTAMP,     -- When approved
  
  baseline_version_before VARCHAR(20),
  baseline_version_after VARCHAR(20),
  
  created_at TIMESTAMP
);
```

#### `project_baselines` (extended)
New columns for tracking CR updates:

```sql
ALTER TABLE project_baselines
ADD COLUMN last_cr_update_id UUID,      -- Last CR that updated baseline
ADD COLUMN last_cr_update_date TIMESTAMP,
ADD COLUMN cr_update_count INTEGER;     -- Number of CR updates
```

---

## Usage Examples

### Example 1: Automatic Update (Happy Path)

**Scenario**: Drift detected, CR created and approved

```typescript
// 1. Drift is detected (via driftDetectionService)
const drift = await driftDetectionService.detectDrift(projectId, documentId)

// 2. Resolution creates CR with major changes
const resolution = await driftResolutionService.resolveDrift(
  documentId,
  drift.id,
  userId,
  'balanced'
)

// 3. Stakeholder approves CR (via UI or API)
await pool.query(
  `UPDATE documents SET status = 'approved' WHERE id = $1`,
  [changeRequestId]
)

// 4. Trigger automatically fires and updates baseline
//    ✓ No manual intervention needed!

// 5. Verify baseline was updated
const baseline = await pool.query(
  `SELECT version, last_cr_update_id FROM project_baselines WHERE project_id = $1`,
  [projectId]
)
// baseline.version: "1.1" (was "1.0")
// baseline.last_cr_update_id: changeRequestId
```

### Example 2: Preview Changes Before Approval

```typescript
// Before approving, preview what will change
const preview = await baselineUpdateService.previewBaselineChanges(changeRequestId)

console.log(preview)
// {
//   hasChanges: true,
//   totalChanges: 3,
//   changesSummary: {
//     scope_baseline: 1,     // 1 scope change
//     cost_baseline: 1,      // 1 budget change
//     technical_baseline: 1  // 1 tech change
//   },
//   baselineChanges: {
//     scope_baseline: [...],
//     cost_baseline: [...],
//     technical_baseline: [...]
//   }
// }
```

### Example 3: View Update History

```typescript
// Get all baseline updates for a project
const history = await baselineUpdateService.getBaselineUpdateHistory(projectId)

history.forEach(update => {
  console.log(`Version ${update.baseline_version_after}:`)
  console.log(`  - CR: ${update.change_request_title}`)
  console.log(`  - Date: ${update.approved_at}`)
  console.log(`  - Summary: ${update.update_summary}`)
  console.log(`  - Fields: ${update.updated_fields.fields.join(', ')}`)
})
```

### Example 4: Manual Update (If Automatic Failed)

```typescript
// If trigger didn't fire or failed, manually update
try {
  const result = await baselineUpdateService.manuallyUpdateBaseline(
    changeRequestId,
    userId
  )
  
  if (result.success) {
    console.log(`✓ Baseline updated to version ${result.baselineVersion}`)
    console.log(`  Updated fields: ${result.updatedFields.join(', ')}`)
  }
} catch (error) {
  console.error('Manual update failed:', error.message)
}
```

---

## Testing

### Unit Tests
**File**: `server/src/__tests__/services/baseline-update.test.ts`

Tests cover:
- ✅ Automatic baseline update when CR approved
- ✅ No update when CR has no changes
- ✅ Handling missing metadata gracefully
- ✅ Preview baseline changes
- ✅ Get update history
- ✅ Manual baseline update
- ✅ Check if baseline has been updated

### Integration Test
**File**: `server/scripts/test-baseline-update-workflow.ts`

End-to-end test that:
1. Creates project and baseline
2. Creates change request with drift
3. Approves change request
4. Verifies baseline automatically updated
5. Checks version incremented
6. Validates update record created

**Run**: `tsx server/scripts/test-baseline-update-workflow.ts`

---

## Version Increment Strategy

**Format**: `major.minor`

**Rules**:
- Minor version increments on each CR approval: `1.0 → 1.1 → 1.2`
- Major version increments on major baseline resets: `1.x → 2.0`
- Version calculated in SQL: `SPLIT_PART(version, '.', 1) || '.' || (CAST(SPLIT_PART(version, '.', 2) AS INTEGER) + 1)::TEXT`

**Examples**:
- Initial baseline: `1.0`
- After CR-001 approved: `1.1`
- After CR-002 approved: `1.2`
- After baseline reset: `2.0`

---

## Error Handling

### Trigger Never Fails CR Approval
The trigger is wrapped in a `BEGIN...EXCEPTION...END` block:
- If baseline update fails, CR approval still succeeds
- Error logged but doesn't block approval
- Can manually retry with `manuallyUpdateBaseline()`

### Common Issues

**Issue**: Baseline not updated after approval
**Solution**: 
1. Check CR has `change_request_type: 'drift_resolution'` in metadata
2. Check CR has `major_changes` array in metadata
3. Check active baseline exists for project
4. Try manual update via API

**Issue**: "No active baseline found"
**Solution**: Create baseline for project first

**Issue**: "No baseline changes found in change request"
**Solution**: Ensure CR metadata includes `major_changes` array with entity changes

---

## Monitoring & Observability

### Key Metrics to Track

1. **Baseline Update Success Rate**
   ```sql
   SELECT 
     COUNT(*) as total_updates,
     COUNT(*) FILTER (WHERE approved_at IS NOT NULL) as successful
   FROM baseline_cr_updates;
   ```

2. **Average Time from CR Approval to Baseline Update**
   ```sql
   SELECT AVG(bcu.created_at - d.updated_at) as avg_update_time
   FROM baseline_cr_updates bcu
   JOIN documents d ON bcu.change_request_id = d.id;
   ```

3. **Most Updated Baselines**
   ```sql
   SELECT 
     p.name,
     pb.version,
     pb.cr_update_count
   FROM project_baselines pb
   JOIN projects p ON pb.project_id = p.id
   ORDER BY pb.cr_update_count DESC
   LIMIT 10;
   ```

### Logs to Watch

- `[BASELINE-UPDATE] Updating baseline from approved CR`
- `[BASELINE-UPDATE] Baseline updated successfully`
- `[BASELINE-UPDATE] Error updating baseline from CR`
- `Baseline X updated to version Y from CR Z`

---

## API Response Examples

### Preview Changes

**Request**: `POST /api/baseline-updates/preview/:changeRequestId`

**Response**:
```json
{
  "success": true,
  "changeRequestId": "uuid",
  "hasChanges": true,
  "totalChanges": 3,
  "changesSummary": {
    "scope_baseline": 1,
    "cost_baseline": 1,
    "technical_baseline": 1,
    "timeline_baseline": 0,
    "resource_baseline": 0,
    "success_criteria": 0
  },
  "baselineChanges": {
    "scope_baseline": [{
      "entityType": "deliverables",
      "driftType": "added",
      "description": "Added Feature C",
      "currentValue": { "name": "Feature C" }
    }],
    "cost_baseline": [{
      "entityType": "budget",
      "driftType": "modified",
      "description": "Budget increased",
      "baselineValue": { "amount": 100000 },
      "currentValue": { "amount": 115000 },
      "variance": 15
    }]
  }
}
```

### Update History

**Request**: `GET /api/baseline-updates/project/:projectId/history`

**Response**:
```json
{
  "success": true,
  "projectId": "uuid",
  "count": 5,
  "updates": [
    {
      "id": "uuid",
      "baseline_id": "uuid",
      "change_request_id": "uuid",
      "change_request_title": "CR: Scope Update",
      "update_type": "scope_update",
      "update_summary": "Baseline updated with 1 component(s): scope_baseline",
      "baseline_version_before": "1.0",
      "baseline_version_after": "1.1",
      "approved_by": "uuid",
      "approved_by_email": "user@example.com",
      "approved_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Roadmap Integration

This feature implements **Phase 3: Workflow Automation** from `DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md`:

✅ **Completed**:
- [x] Auto-generate CR from positive drift
- [x] Auto-generate CR from budget overrun
- [x] Approval workflow integration
- [x] **Baseline update upon approval** ← THIS FEATURE
- [x] Knowledge base integration (via drift resolution)

**Future Enhancements** (Phase 4):
- [ ] Replication to similar projects
- [ ] Baseline analytics dashboard
- [ ] Predictive drift detection

---

## Related Documentation

- **Roadmap**: `docs/roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md`
- **Drift Detection**: `docs/features/BASELINE_DRIFT_DETECTION.md`
- **Change Request Workflow**: `docs/features/CHANGE_REQUEST_WORKFLOW.md`
- **Migration**: `server/migrations/020_baseline_update_on_cr_approval.sql`

---

## Summary

**What it does**: Automatically updates project baselines when change requests are approved

**Why it matters**: Keeps baselines synchronized with approved changes, enabling accurate drift detection

**How it works**: Database trigger fires on CR approval → extracts changes → updates baseline → increments version

**Key benefit**: Zero manual effort - stakeholder approval triggers baseline update automatically

**Status**: ✅ Fully implemented and tested

---

*Last updated: 2024-11-08*  
*Implementation: TASK-746*
