# Baseline Update on Change Request Approval

**Task ID**: TASK-746  
**Status**: Implemented  
**Phase**: 3 - Workflow Automation

---

## Overview

This feature implements automatic baseline updates when change requests are approved. When a drift resolution change request is approved, the system automatically updates the project baseline with the approved changes, maintaining version history and audit trails.

This closes the loop from drift detection → change request → approval → baseline update, as described in the DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md roadmap document.

---

## Architecture

### Database Layer

**Migration**: `020_baseline_update_on_cr_approval.sql`

**New Tables**:
- `baseline_cr_updates`: Tracks all baseline updates from change requests
  - Links baseline_id, change_request_id
  - Stores before/after values and version numbers
  - Records which baseline components were updated

**New Columns on `project_baselines`**:
- `last_cr_update_id`: Reference to last CR that updated this baseline
- `last_cr_update_date`: Timestamp of last update
- `cr_update_count`: Counter of CR-driven updates

**Database Functions**:
1. `extract_baseline_changes_from_cr(change_request_id)`: Extracts baseline changes from CR metadata
2. `update_baseline_from_cr(change_request_id, approved_by)`: Updates baseline with approved changes
3. `trigger_baseline_update_on_cr_approval()`: Trigger function for automatic updates

**Trigger**:
- `trigger_update_baseline_on_cr_approval` on `documents` table
- Fires when a change_request document status changes to 'approved'
- Automatically calls `update_baseline_from_cr()` function

### Service Layer

**Service**: `baselineUpdateService.ts`

**Key Functions**:
- `updateBaselineFromChangeRequest(changeRequestId, approvedBy)`: Main update function
- `previewBaselineChanges(changeRequestId)`: Preview changes before approval
- `getBaselineUpdateHistory(projectId)`: Get update history for a project
- `getBaselineUpdateDetails(updateId)`: Get details of a specific update
- `manuallyUpdateBaseline(changeRequestId, userId)`: Manually trigger update
- `hasBaselineBeenUpdated(changeRequestId)`: Check if CR has updated baseline

### API Layer

**Routes**: `/api/baseline-updates/*`

Endpoints:
- `GET /api/baseline-updates/project/:projectId/history` - Get update history
- `GET /api/baseline-updates/:updateId` - Get update details
- `POST /api/baseline-updates/preview/:changeRequestId` - Preview changes
- `POST /api/baseline-updates/manual/:changeRequestId` - Manually trigger update
- `GET /api/baseline-updates/check/:changeRequestId` - Check if updated

---

## How It Works

### Automatic Flow

1. **Drift Detection**: System detects drift from baseline
2. **CR Creation**: Change request is auto-created with major changes
3. **CR Approval**: Sponsor/stakeholder approves the change request
4. **Baseline Update Trigger**: Database trigger fires when CR status → 'approved'
5. **Extract Changes**: System extracts baseline changes from CR metadata
6. **Update Baseline**: Baseline components are updated based on entity types
7. **Version Increment**: Baseline version is incremented (e.g., 1.0 → 1.1)
8. **Audit Trail**: Update record created in `baseline_cr_updates` table
9. **Version History**: Entry added to `baseline_versions` table

### Entity Type Mapping

Change request major changes are mapped to baseline components:

| Entity Types | Baseline Component |
|--------------|-------------------|
| scope_items, deliverables, requirements, constraints | `scope_baseline` |
| technologies, best_practices | `technical_baseline` |
| milestones, phases, activities | `timeline_baseline` |
| budget, resources | `cost_baseline`, `resource_baseline` |
| success_criteria, quality_standards | `success_criteria` |

### Version Management

- **Before Update**: Baseline version (e.g., "1.0")
- **After Update**: Incremented minor version (e.g., "1.1")
- **Previous Values**: Stored in `baseline_cr_updates.previous_values`
- **New Values**: Stored in `baseline_cr_updates.new_values`

---

## Usage Examples

### Automatic Update (Default)

```typescript
// User approves change request via UI
await pool.query(
  `UPDATE documents SET status = 'approved' WHERE id = $1`,
  [changeRequestId]
)
// Trigger automatically updates baseline
// No additional code needed!
```

### Manual Update

```typescript
import { baselineUpdateService } from './services/baselineUpdateService'

// Manually trigger baseline update
const result = await baselineUpdateService.manuallyUpdateBaseline(
  changeRequestId,
  userId
)

console.log(result)
// {
//   success: true,
//   updateId: 'uuid',
//   baselineId: 'uuid',
//   baselineVersion: '1.1',
//   updatedFields: ['scope_baseline', 'cost_baseline'],
//   updateSummary: 'Baseline updated with 2 component(s): scope_baseline, cost_baseline'
// }
```

### Preview Changes Before Approval

```typescript
// Preview what changes will be made to baseline
const preview = await baselineUpdateService.previewBaselineChanges(
  changeRequestId
)

console.log(preview)
// {
//   baselineChanges: { scope_baseline: [...], cost_baseline: [...] },
//   changesSummary: { scope_baseline: 2, cost_baseline: 1, ... },
//   totalChanges: 3,
//   hasChanges: true
// }
```

### Get Update History

```typescript
// Get all baseline updates for a project
const history = await baselineUpdateService.getBaselineUpdateHistory(
  projectId,
  limit: 20
)

history.forEach(update => {
  console.log(`${update.baseline_version_after}: ${update.update_summary}`)
})
```

---

## API Examples

### Preview Baseline Changes

```bash
POST /api/baseline-updates/preview/:changeRequestId

Response:
{
  "success": true,
  "changeRequestId": "uuid",
  "baselineChanges": {
    "scope_baseline": [...],
    "cost_baseline": [...]
  },
  "changesSummary": {
    "scope_baseline": 2,
    "cost_baseline": 1,
    "technical_baseline": 0,
    "timeline_baseline": 0,
    "resource_baseline": 0,
    "success_criteria": 0
  },
  "totalChanges": 3,
  "hasChanges": true
}
```

### Get Update History

```bash
GET /api/baseline-updates/project/:projectId/history?limit=10

Response:
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
      "update_summary": "Baseline updated with 1 component(s): scope_baseline",
      "baseline_version_before": "1.0",
      "baseline_version_after": "1.1",
      "approved_at": "2024-01-15T10:30:00Z",
      "change_request_title": "CR: Scope Addition",
      "approved_by_email": "sponsor@example.com"
    },
    ...
  ]
}
```

### Manually Trigger Update

```bash
POST /api/baseline-updates/manual/:changeRequestId
Body: { "userId": "uuid" }

Response:
{
  "success": true,
  "updateId": "uuid",
  "baselineId": "uuid",
  "baselineVersion": "1.2",
  "updatedFields": ["scope_baseline", "timeline_baseline"],
  "updateSummary": "Baseline updated with 2 component(s): scope_baseline, timeline_baseline",
  "message": "Baseline updated to version 1.2"
}
```

---

## Testing

### Unit Tests

Test file: `server/src/__tests__/services/baseline-update.test.ts`

**Test Coverage**:
- ✅ Update baseline when CR with major changes is approved
- ✅ Don't update baseline when CR has no major changes
- ✅ Handle missing metadata gracefully
- ✅ Preview baseline changes before approval
- ✅ Get baseline update history
- ✅ Manually trigger baseline update
- ✅ Reject manual update for non-approved CR
- ✅ Check if baseline has been updated

### Running Tests

```bash
cd server
npm test -- baseline-update.test.ts
```

---

## Integration Points

### 1. Drift Resolution Service

The drift resolution service creates change requests with `major_changes` in metadata:

```typescript
metadata: {
  change_request_type: 'drift_resolution',
  major_changes: [
    { entityType: 'budget', driftType: 'modified', ... },
    { entityType: 'deliverables', driftType: 'added', ... }
  ],
  created_from: 'automatic_drift_resolution'
}
```

### 2. Change Request Approval Workflow

When a user or system approves a CR:

```sql
UPDATE documents 
SET status = 'approved', updated_by = :userId
WHERE id = :changeRequestId AND type = 'change_request'
```

The trigger automatically fires and updates the baseline.

### 3. Baseline Version Control

Each update creates entries in:
- `baseline_versions`: Version history
- `baseline_cr_updates`: CR-specific update tracking

---

## Error Handling

### Graceful Degradation

If baseline update fails:
- CR approval still succeeds
- Error is logged as WARNING
- Update can be triggered manually later
- No data loss or corruption

### Common Scenarios

1. **No Active Baseline**: Update skipped, notice logged
2. **No Major Changes**: Update skipped, returns success=false
3. **Invalid CR Metadata**: Update skipped gracefully
4. **Database Error**: Transaction rolled back, CR approval not affected

---

## Monitoring & Observability

### Logs

```typescript
logger.info('[BASELINE-UPDATE] Updating baseline from approved CR', {
  changeRequestId,
  approvedBy
})

logger.notice('Baseline updated to version 1.1 from CR abc-123')
```

### Metrics to Track

- Number of baseline updates per project
- Average time between CR approval and baseline update
- Percentage of CRs that trigger baseline updates
- Most frequently updated baseline components

### Database Queries

```sql
-- Get baseline update count per project
SELECT 
  p.name,
  pb.cr_update_count,
  pb.last_cr_update_date
FROM project_baselines pb
JOIN projects p ON pb.project_id = p.id
WHERE pb.status = 'active'
ORDER BY pb.cr_update_count DESC;

-- Get recent baseline updates
SELECT 
  bcu.*,
  d.title as cr_title,
  pb.version as current_version
FROM baseline_cr_updates bcu
JOIN documents d ON bcu.change_request_id = d.id
JOIN project_baselines pb ON bcu.baseline_id = pb.id
ORDER BY bcu.approved_at DESC
LIMIT 10;
```

---

## Security Considerations

1. **Authorization**: Only users with CR approval rights should trigger updates
2. **Audit Trail**: All updates are logged with user ID and timestamp
3. **Version Control**: Previous values are preserved for rollback
4. **Validation**: Change requests must be approved before baseline update

---

## Future Enhancements

1. **Rollback Functionality**: Ability to revert baseline to previous version
2. **Notification System**: Notify stakeholders when baseline is updated
3. **UI Integration**: Show baseline update status in CR approval dialog
4. **Batch Updates**: Handle multiple CRs updating baseline simultaneously
5. **Conflict Detection**: Detect and resolve conflicts between concurrent updates

---

## References

- **Source Document**: `docs/roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md`
- **Phase**: Phase 3: Workflow Automation (lines 949-957)
- **Migration**: `server/migrations/020_baseline_update_on_cr_approval.sql`
- **Service**: `server/src/services/baselineUpdateService.ts`
- **Routes**: `server/src/routes/baselineUpdates.ts`
- **Tests**: `server/src/__tests__/services/baseline-update.test.ts`

---

## Summary

This feature completes the drift management workflow by automatically updating project baselines when change requests are approved. It provides:

✅ **Automatic Updates**: Trigger fires on CR approval  
✅ **Version Control**: Baseline versions tracked and incremented  
✅ **Audit Trail**: Complete history of all baseline updates  
✅ **API Integration**: RESTful endpoints for manual control  
✅ **Error Handling**: Graceful degradation with logging  
✅ **Comprehensive Tests**: Full test coverage for all scenarios  

The system now supports the complete workflow:
**Drift Detection → Change Request → Approval → Baseline Update** 🔄
