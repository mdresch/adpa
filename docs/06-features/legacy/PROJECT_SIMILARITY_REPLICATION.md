# Project Similarity and Replication System

**TASK-748**: Replication to similar projects  
**Feature**: Phase 3 - Workflow Automation  
**Status**: ✅ Implemented

## Overview

This feature implements the "Replication to similar projects" functionality from the Drift to Change Request Workflow (CR-2026-001, Phase 3). When positive drift (efficiency improvements) is detected in one project, the system can identify similar projects and replicate those improvements to capture additional value.

## Key Components

### 1. Database Schema (`313_project_similarity_replication.sql`)

Three new tables support the replication workflow:

#### `project_similarity`
- Tracks relationships between similar projects
- Stores similarity scores (0-1) based on multiple factors:
  - Framework match
  - Domain match
  - Tech stack match
  - Budget range match
  - Team size match
- Supports AI-detected, manual, and user-defined similarity relationships

#### `efficiency_improvement_replications`
- Manages the replication of improvements from source to target projects
- Tracks replication status through the workflow:
  - `identified` → `pending_approval` → `approved` → `in_progress` → `completed` → `verified`
- Links to drift detection and innovation opportunities
- Stores estimated and actual value metrics
- Integrates with change request system

#### `replication_value_tracking`
- Aggregates cumulative value from replications
- Tracks ROI across multiple replications
- Provides metrics for portfolio-level reporting:
  - Total replications
  - Success/failure rates
  - Cost savings (estimated vs actual)
  - Time savings

### 2. Service Layer (`projectSimilarityService.ts`)

The `ProjectSimilarityService` provides core functionality:

#### Similarity Detection
- `calculateSimilarity(projectId1, projectId2)`: Computes similarity score based on:
  - Framework alignment (30% weight)
  - Budget proximity (20% weight)
  - Status match (10% weight)
  - Description keyword overlap (20% weight - Jaccard similarity)
  - Metadata similarity (20% weight)
- `detectAndStoreSimilarProjects(projectId, minScore)`: Batch detection and storage
- `findSimilarProjects(projectId, minScore)`: Retrieve stored similarities

#### Replication Management
- `createReplication(params)`: Create a replication record
- `updateReplicationStatus(id, status, userId, notes)`: Track workflow progress
- `getReplicationsForSource(projectId)`: Get outgoing replications
- `getReplicationsForTarget(projectId)`: Get incoming replications

#### Value Tracking
- `getValueTracking(projectId)`: Get cumulative value metrics
- Auto-updates tracking when replications complete

### 3. API Endpoints (`projectSimilarity.ts`)

RESTful API for managing similarities and replications:

```
GET    /api/projects/:projectId/similar
       Find similar projects (min score filter)

POST   /api/projects/:projectId/detect-similar
       Detect and store similar projects

GET    /api/projects/:projectId/similarity/:otherProjectId
       Calculate similarity between two specific projects

GET    /api/projects/:projectId/replications/source
       Get replications from this project to others

GET    /api/projects/:projectId/replications/target
       Get replications to this project from others

POST   /api/projects/:projectId/replications
       Create a replication (apply improvement to similar project)

PATCH  /api/replications/:replicationId/status
       Update replication status

GET    /api/projects/:projectId/value-tracking
       Get aggregated value metrics
```

## Usage Examples

### 1. Detect Similar Projects

When positive drift is detected:

```typescript
// Automatically detect similar projects
const response = await fetch('/api/projects/project-123/detect-similar', {
  method: 'POST',
  body: JSON.stringify({ minScore: 0.5 })
})

// Returns: { detected: 5, similarities: [...] }
```

### 2. Create Replication

Apply an efficiency improvement to a similar project:

```typescript
const replication = await fetch('/api/projects/project-123/replications', {
  method: 'POST',
  body: JSON.stringify({
    targetProjectId: 'project-456',
    improvementType: 'efficiency_improvement',
    improvementTitle: 'AI Cost Optimization',
    improvementDescription: 'Switched from GPT-4 to Claude Sonnet',
    estimatedValue: {
      cost_savings: 2500,
      time_savings_days: 0,
      quality_improvement_pct: 0
    },
    sourceDriftId: 'drift-789'
  })
})
```

### 3. Track Replication Progress

Update status as work progresses:

```typescript
// Approve the replication
await fetch('/api/replications/replication-id/status', {
  method: 'PATCH',
  body: JSON.stringify({
    status: 'approved',
    notes: 'Approved for implementation'
  })
})

// Mark as in progress
await updateStatus('in_progress', 'Started implementation')

// Complete
await updateStatus('completed', 'Successfully implemented')

// Verify results
await updateStatus('verified', 'Measured 50% cost reduction')
```

### 4. View Value Tracking

See cumulative value across all replications:

```typescript
const response = await fetch('/api/projects/project-123/value-tracking')

// Returns:
// {
//   improvements: [
//     {
//       improvement_title: 'AI Cost Optimization',
//       total_replications: 12,
//       successful_replications: 10,
//       total_estimated_value: 30000,
//       total_actual_value: 28000,
//       roi_percentage: 93.33,
//       cumulative_cost_savings: 28000
//     }
//   ]
// }
```

## Integration with Drift Detection

This feature integrates with the existing Drift Detection system:

1. **Positive Drift Detection** → Triggers similarity detection
2. **Efficiency Improvement Identified** → Creates replication candidates
3. **Change Request Generated** → Includes replication opportunities
4. **Approval Workflow** → Manages replication approvals
5. **Value Tracking** → Measures ROI across portfolio

## Workflow Example

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Positive Drift Detected in Project A                     │
│    - Team switched to Claude (cost savings: $2,500/month)  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. System Detects Similar Projects                          │
│    - Projects B, C, D also use GPT-4                        │
│    - Similarity scores: 0.85, 0.78, 0.72                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Replications Created                                      │
│    - 3 replication records in "pending_approval" status     │
│    - Estimated value: 3 × $2,500 = $7,500/month            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Sponsor Reviews & Approves                               │
│    - Approves replications for Projects B and C             │
│    - Rejects Project D (different use case)                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Implementation & Verification                             │
│    - Projects B & C implement change                        │
│    - Actual savings measured: $2,400 and $2,600/month      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Value Tracking Updated                                    │
│    - Total annual savings: $60K (Project A + B + C)        │
│    - ROI: 98% (actual vs estimated)                        │
│    - Success rate: 67% (2 of 3 approved)                   │
└─────────────────────────────────────────────────────────────┘
```

## Future Enhancements

### Phase 4 (Future)
- AI-powered similarity detection using embeddings
- Automated impact prediction
- Cross-program replication recommendations
- Knowledge base integration
- Replication templates and playbooks

### Advanced Features
- Batch replication operations
- Conditional approvals based on project attributes
- Integration with project portfolio management
- Replication heat maps and analytics
- Lessons learned capture and sharing

## Testing

Tests are located in `server/src/__tests__/services/projectSimilarity.test.ts`

Run tests with:
```bash
cd server
npm test -- projectSimilarity.test.ts
```

## Database Migration

To apply the database schema:

```bash
# Using Supabase CLI (recommended)
supabase migration up

# Or using psql
psql $DATABASE_URL -f server/migrations/313_project_similarity_replication.sql
```

## Related Documentation

- [DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md](../roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md) - Overall workflow design
- [CR-2026-001](../roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md) - Baseline drift detection feature
- [Migration 017](../../server/migrations/017_baseline_drift_detection.sql) - Drift detection schema

## Success Metrics

Track these KPIs to measure feature success:

1. **Discovery Rate**: % of efficiency improvements with similar projects identified
2. **Replication Rate**: % of identified opportunities that are approved and implemented
3. **Success Rate**: % of replications that achieve expected results
4. **ROI**: Actual value captured vs estimated value
5. **Time to Value**: Days from identification to value realization
6. **Portfolio Impact**: Total annual value captured through replications

## Support

For questions or issues:
- Review the workflow documentation
- Check API endpoint documentation
- Review test cases for usage examples
- Check server logs for debugging
