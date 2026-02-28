# Entity Extraction, Baseline, and Drift Detection - Implementation Summary

## Overview

This document summarizes the implementation of the Entity Extraction, Baseline Management, and Drift Detection system for ADPA.

## ✅ Completed Components

### 1. Core Services

#### EntityExtractionService (`server/src/services/entityExtractionService.ts`)
- **Purpose**: Extract and manage entities from project documents
- **Features**:
  - Extracts 10 entity types: stakeholder, deliverable, milestone, risk, requirement, activity, assumption, constraint, dependency, resource
  - AI-powered extraction with confidence scoring
  - Caching for performance
  - Entity verification workflow
  - Relationship tracking

#### BaselineService (`server/src/services/baselineService.ts`)
- **Purpose**: Create and manage project entity baselines
- **Features**:
  - Create baselines from current project state
  - Compare current state vs baseline
  - Baseline-to-baseline comparison
  - Approval workflow
  - Archive functionality

#### DriftDetectionService (`server/src/services/driftDetectionService.ts`)
- **Purpose**: Detect and manage drift from baselines
- **Features**:
  - Automated drift detection
  - Multiple drift types: scope, timeline, resource, risk, compliance, quality
  - Configurable rules and thresholds
  - Severity levels: critical, warning, info
  - Auto-create Jira issues for critical drift
  - Resolution workflow

### 2. API Endpoints

#### Entity Extraction Routes (`/api/entities`)
- `POST /api/entities/extract/document/:documentId` - Extract entities from a document
- `POST /api/entities/extract/project/:projectId` - Extract entities from all project documents
- `GET /api/entities/project/:projectId` - Get all entities for a project
- `GET /api/entities/:entityId` - Get entity by ID
- `POST /api/entities/:entityId/verify` - Verify an entity
- `DELETE /api/entities/:entityId` - Delete an entity

#### Baseline Routes (`/api/entities/baselines`)
- `POST /api/entities/baselines/project/:projectId` - Create a baseline
- `GET /api/entities/baselines/project/:projectId` - Get all baselines for a project
- `GET /api/entities/baselines/:baselineId` - Get baseline by ID
- `POST /api/entities/baselines/:baselineId/compare` - Compare current state to baseline
- `POST /api/entities/baselines/:baselineId1/compare/:baselineId2` - Compare two baselines
- `POST /api/entities/baselines/:baselineId/approve` - Approve a baseline
- `POST /api/entities/baselines/:baselineId/archive` - Archive a baseline

#### Drift Detection Routes (`/api/entities/drift`)
- `POST /api/entities/drift/detect/project/:projectId` - Detect drift for a project
- `GET /api/entities/drift/project/:projectId` - Get drift detections for a project
- `POST /api/entities/drift/:driftId/resolve` - Resolve a drift detection

### 3. UI Dashboards

#### Entity Extraction Viewer (`app/entities/page.tsx`)
- View all extracted entities
- Filter by type, status, confidence
- Search functionality
- Entity verification
- Statistics dashboard
- Extract entities from documents/projects

#### Baseline Management (`app/baselines/page.tsx`)
- Create new baselines
- View all baselines
- Baseline comparison
- Approval workflow
- Archive functionality
- Statistics dashboard

#### Drift Detection Dashboard (`app/drift/page.tsx`)
- View all drift detections
- Filter by severity, status, type
- Run drift detection
- Resolve drift detections
- Statistics dashboard
- Jira integration links

## Database Schema

All tables were created in migration `058_entity_extraction_baseline_system.sql`:

1. **entity_extractions** - Stores extracted entities
2. **project_entity_baselines** - Stores baseline snapshots
3. **baseline_comparisons** - Stores comparison results
4. **drift_detections** - Stores drift detection records
5. **drift_detection_rules** - Stores configurable drift rules
6. **lessons_learned** - Enhanced with new columns
7. **improvement_suggestions** - Enhanced with new columns
8. **maturity_assessments** - Stores maturity assessments
9. **entity_relationships** - Stores entity relationships

## Integration Points

### Jira Integration
- Critical drift detections automatically create Jira issues
- Jira issue keys and URLs stored in drift_detections table
- Links back to ADPA documents

### Confluence Integration
- (Future enhancement) Auto-publish drift summaries to Confluence

## Usage Examples

### Extract Entities from a Project
```typescript
POST /api/entities/extract/project/{projectId}
{
  "aiProvider": "openai",
  "aiModel": "gpt-4",
  "minConfidence": 70
}
```

### Create a Baseline
```typescript
POST /api/entities/baselines/project/{projectId}
{
  "baselineName": "Project Kickoff Baseline",
  "baselineType": "project",
  "includeMetadata": true
}
```

### Detect Drift
```typescript
POST /api/entities/drift/detect/project/{projectId}
{
  "autoCreateJiraIssue": true,
  "minSeverity": "warning"
}
```

### Resolve Drift
```typescript
POST /api/entities/drift/{driftId}/resolve
{
  "resolutionAction": "accept",
  "resolutionNotes": "Drift is acceptable per project change request"
}
```

## Testing Checklist

- [ ] Extract entities from a document
- [ ] Extract entities from all project documents
- [ ] View entities with filters
- [ ] Verify/unverify entities
- [ ] Create a baseline
- [ ] Compare current state to baseline
- [ ] Compare two baselines
- [ ] Approve a baseline
- [ ] Archive a baseline
- [ ] Run drift detection
- [ ] View drift detections with filters
- [ ] Resolve a drift detection
- [ ] Verify Jira issue creation for critical drift

## Next Steps

1. **Enhanced Entity Relationships**: Implement relationship extraction and visualization
2. **Lessons Learned Integration**: Connect drift detections to lessons learned
3. **Maturity Assessment**: Implement maturity assessment based on entity extraction quality
4. **Advanced Analytics**: Add charts and graphs for entity trends over time
5. **Bulk Operations**: Add bulk entity verification and deletion
6. **Export Functionality**: Export entities, baselines, and drift reports

## Notes

- All services use the new `entity_extractions` table (not the existing `stakeholders`, `risks`, etc. tables)
- Entity extraction is separate from the existing `ProjectDataExtractionService` which populates project tables
- Baselines are stored as JSON snapshots for easy comparison
- Drift detection rules can be configured per project or globally
- All API endpoints require authentication

