# Baseline Update Upon Approval

**Task ID:** TASK-746  
**Status:** ✅ Implemented  
**Phase:** Phase 3 - Workflow Automation  
**Source:** [DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md](../roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md)

---

## Overview

This feature automatically updates project baselines when drift resolution change requests are approved. It implements the final step in the drift detection → change request → approval → baseline update workflow.

## How It Works

### 1. Automatic Trigger Flow

```
Drift Detection → Change Request Generated → Approval Process → **Baseline Updated**
                                                                        ↑
                                                               (This Feature)
```

When a change request is approved:
1. Approval workflow updates document status to `'approved'`
2. Database trigger `trigger_update_baseline_on_cr_approval()` fires
3. Function `update_baseline_from_cr()` executes
4. Baseline is updated with changes from the CR
5. Update is recorded in `baseline_cr_updates` table

### 2. Baseline Update Process

The system extracts baseline changes from the change request's `major_changes` metadata and applies them to the appropriate baseline components:

| Entity Type | Maps To Baseline Component |
|------------|---------------------------|
| `scope_items`, `deliverables`, `requirements`, `constraints` | `scope_baseline` |
| `technologies`, `best_practices` | `technical_baseline` |
| `milestones`, `phases`, `activities` | `timeline_baseline` |
| `budget`, `resources` | `cost_baseline`, `resource_baseline` |
| `success_criteria`, `quality_standards` | `success_criteria` |

### 3. Version Control

Each baseline update increments the minor version number:
- Before: `1.0`
- After: `1.1`
- Next update: `1.2`

Version history is tracked in:
- `baseline_versions` table (full version history)
- `baseline_cr_updates` table (CR-triggered updates only)

---

## API Endpoints

### Get Baseline Update History
```
GET /api/baseline-updates/project/:projectId/history?limit=50
```

Returns history of all baseline updates for a project.

**Response:**
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
      "update_type": "scope_update",
      "update_summary": "Baseline updated with 2 component(s): scope_baseline, cost_baseline",
      "baseline_version_before": "1.0",
      "baseline_version_after": "1.1",
      "approved_by": "uuid",
      "approved_at": "2024-11-08T12:00:00Z",
      "change_request_title": "CR: Scope and Budget Update"
    }
  ]
}
```

### Get Update Details
```
GET /api/baseline-updates/:updateId
```

Returns detailed information about a specific baseline update.

**Response:**
```json
{
  "success": true,
  "update": {
    "id": "uuid",
    "baseline_id": "uuid",
    "change_request_id": "uuid",
    "update_type": "comprehensive_update",
    "updated_fields": {
      "fields": ["scope_baseline", "technical_baseline"]
    },
    "previous_values": { ... },
    "new_values": { ... },
    "update_summary": "Baseline updated with 2 component(s)...",
    "project_name": "Project Name",
    "baseline_status": "active"
  }
}
```

### Preview Baseline Changes
```
POST /api/baseline-updates/preview/:changeRequestId
```

Preview what baseline changes would be made if the CR is approved (before actual approval).

**Response:**
```json
{
  "success": true,
  "changeRequestId": "uuid",
  "hasChanges": true,
  "totalChanges": 3,
  "changesSummary": {
    "scope_baseline": 1,
    "technical_baseline": 1,
    "timeline_baseline": 1,
    "cost_baseline": 0,
    "resource_baseline": 0,
    "success_criteria": 0
  },
  "baselineChanges": {
    "scope_baseline": [ ... ],
    "technical_baseline": [ ... ],
    "timeline_baseline": [ ... ]
  }
}
```

### Manual Baseline Update
```
POST /api/baseline-updates/manual/:changeRequestId
{
  "userId": "uuid"
}
```

Manually trigger a baseline update for an approved change request (useful if automatic trigger didn't fire or was disabled).

**Response:**
```json
{
  "success": true,
  "updateId": "uuid",
  "baselineId": "uuid",
  "baselineVersion": "1.2",
  "updatedFields": ["scope_baseline", "cost_baseline"],
  "updateSummary": "Baseline updated with 2 component(s): scope_baseline, cost_baseline",
  "message": "Baseline updated to version 1.2"
}
```

### Check if Baseline Updated
```
GET /api/baseline-updates/check/:changeRequestId
```

Check if a baseline update has already been applied for a change request.

**Response:**
```json
{
  "success": true,
  "changeRequestId": "uuid",
  "hasBeenUpdated": true
}
```

---

## Database Schema

### Table: `baseline_cr_updates`

Tracks all baseline updates triggered by change request approvals.

```sql
CREATE TABLE baseline_cr_updates (
    id UUID PRIMARY KEY,
    baseline_id UUID NOT NULL REFERENCES project_baselines(id),
    change_request_id UUID NOT NULL REFERENCES documents(id),
    
    update_type VARCHAR(50) CHECK (update_type IN (
        'scope_update', 'technical_update', 'timeline_update', 
        'cost_update', 'resource_update', 'success_criteria_update',
        'comprehensive_update'
    )),
    
    updated_fields JSONB NOT NULL,
    previous_values JSONB NOT NULL,
    new_values JSONB NOT NULL,
    
    update_summary TEXT NOT NULL,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP DEFAULT NOW(),
    
    baseline_version_before VARCHAR(20),
    baseline_version_after VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_baseline_cr_update UNIQUE (baseline_id, change_request_id)
);
```

### Additional Columns on `project_baselines`

```sql
ALTER TABLE project_baselines
ADD COLUMN last_cr_update_id UUID REFERENCES documents(id),
ADD COLUMN last_cr_update_date TIMESTAMP,
ADD COLUMN cr_update_count INTEGER DEFAULT 0;
```

---

## Functions

### `extract_baseline_changes_from_cr(change_request_id UUID)`

Extracts baseline changes from a change request's `major_changes` metadata and categorizes them by baseline component.

**Input:** Change request UUID  
**Output:** JSONB object with changes grouped by baseline component

```json
{
  "scope_baseline": [ ... ],
  "technical_baseline": [ ... ],
  "timeline_baseline": [ ... ],
  "cost_baseline": [ ... ],
  "resource_baseline": [ ... ],
  "success_criteria": [ ... ]
}
```

### `update_baseline_from_cr(change_request_id UUID, approved_by UUID)`

Updates the project baseline with changes from an approved change request.

**Process:**
1. Validates change request exists and is approved
2. Finds active baseline for the project
3. Extracts baseline changes from CR metadata
4. Updates each affected baseline component
5. Increments version number
6. Creates baseline version record
7. Creates baseline CR update tracking record

**Returns:** UUID of the baseline update record, or NULL if no changes found

---

## Database Trigger

### `trigger_update_baseline_on_cr_approval()`

Automatically fires when a document's status is updated and the document is a change request.

**Trigger Conditions:**
- Status changes to `'approved'`
- Document type is `'change_request'`
- Metadata indicates it's a drift resolution CR:
  - `change_request_type = 'drift_resolution'`, OR
  - `created_from = 'automatic_drift_resolution'`

**Actions:**
1. Calls `update_baseline_from_cr()`
2. Logs success or warning
3. Does not fail the CR approval if baseline update fails

---

## Service: `baselineUpdateService`

Located in `server/src/services/baselineUpdateService.ts`

### Methods

#### `updateBaselineFromChangeRequest(changeRequestId, approvedBy)`
Primary method for updating baseline from an approved CR.

#### `getBaselineUpdateHistory(projectId, limit)`
Retrieves baseline update history for a project.

#### `getBaselineUpdateDetails(updateId)`
Gets detailed information about a specific update.

#### `previewBaselineChanges(changeRequestId)`
Previews what changes would be made (before approval).

#### `manuallyUpdateBaseline(changeRequestId, userId)`
Manually triggers baseline update for approved CR.

#### `hasBaselineBeenUpdated(changeRequestId)`
Checks if baseline has already been updated for a CR.

---

## Testing

Test suite located in `server/src/__tests__/services/baseline-update.test.ts`

### Test Coverage

✅ Automatic baseline update with major changes  
✅ No update when no major changes exist  
✅ Graceful handling of missing metadata  
✅ Preview baseline changes before approval  
✅ Manual baseline update trigger  
✅ Rejection of manual update for non-approved CRs  
✅ Baseline update history retrieval  
✅ Check if baseline has been updated  

### Running Tests

```bash
cd server
npm test -- baseline-update.test.ts
```

---

## Integration Points

### 1. Approval Workflow Service
Location: `server/src/services/approvalWorkflowService.ts`

When final approval is granted:
```typescript
await client.query(
  `UPDATE documents
   SET status = 'approved',
       updated_by = $1,
       updated_at = NOW()
   WHERE id = $2`,
  [approver_user_id, change_request_id]
)
```

This UPDATE triggers the database trigger that updates the baseline.

### 2. Drift Detection Service
Location: `server/src/services/driftDetectionService.ts`

Creates change requests with `major_changes` metadata that the baseline update service uses:
```typescript
metadata: {
  change_request_type: 'drift_resolution',
  major_changes: [
    {
      entityType: 'deliverables',
      driftType: 'added',
      description: 'Added Feature C',
      baselineValue: null,
      currentValue: { ... },
      requiresApproval: true
    }
  ]
}
```

### 3. Frontend Integration
The frontend can:
- Display baseline update history on project pages
- Show preview of baseline changes before approval
- Manually trigger baseline updates if needed
- Check if baseline has been updated for a CR

---

## Configuration

### Environment Variables
No specific environment variables required. Uses existing database connection.

### Feature Flags
Currently always enabled for drift resolution change requests.

---

## Troubleshooting

### Baseline not updating automatically

**Check:**
1. Is the CR marked as `change_request_type: 'drift_resolution'`?
2. Is there an active baseline for the project?
3. Does the CR have `major_changes` in metadata?
4. Check server logs for trigger warnings

**Solution:**
Use manual update endpoint:
```bash
POST /api/baseline-updates/manual/:changeRequestId
{
  "userId": "uuid"
}
```

### Multiple updates for same CR

**Prevention:**
Unique constraint prevents duplicate updates:
```sql
CONSTRAINT unique_baseline_cr_update UNIQUE (baseline_id, change_request_id)
```

### Baseline update fails but CR is approved

**Design:**
This is intentional. CR approval should not fail if baseline update fails. The update can be triggered manually later.

---

## Future Enhancements

1. **Rollback Support**: Ability to roll back a baseline update
2. **Approval Requirements**: Require separate approval for baseline changes
3. **Conflict Resolution**: Handle conflicts when multiple CRs update same baseline
4. **Notification System**: Notify stakeholders when baseline is updated
5. **Audit Trail**: Enhanced audit logging for compliance
6. **Version Comparison**: Visual diff between baseline versions

---

## Related Documentation

- [DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md](../roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md) - Overall workflow
- [Migration 020](../../server/migrations/020_baseline_update_on_cr_approval.sql) - Database schema
- [Baseline Service](../../server/src/services/baselineService.ts) - General baseline management

---

## Success Metrics

**From DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md:**

- ✅ Baseline updates apply automatically on CR approval
- ✅ 90% of drift-driven CRs update baseline within 1 minute
- ✅ Zero baseline update failures that block CR approval
- ✅ Version history maintained for all baseline changes

---

**Implementation Status:** ✅ Complete  
**Migration:** `020_baseline_update_on_cr_approval.sql`  
**Last Updated:** November 2025
