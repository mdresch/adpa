# Test Baseline Creation Script

## Overview

This script (`create-test-baseline.ts`) creates comprehensive test baselines for testing the Automatic Drift Detection & Resolution feature (TASK-716).

## Purpose

The Automatic Drift Detection & Resolution feature requires an approved baseline to detect when documents deviate from the baseline. This script simplifies the process of creating test baselines with realistic, comprehensive data.

## Usage

```bash
# Basic usage - creates and auto-approves baseline
npm run create-test-baseline <PROJECT_ID>

# Create baseline without auto-approval (requires manual approval in UI)
npm run create-test-baseline <PROJECT_ID> --no-auto-approve

# Create baseline with test entities (advanced)
npm run create-test-baseline <PROJECT_ID> --with-entities

# Show help
npm run create-test-baseline --help
```

## What It Creates

The script creates a comprehensive baseline with all 13 entity types:

### Scope Baseline
- **5 Stakeholders**: From high-influence sponsors to low-influence designers
- **4 Risks**: Covering external, resource, technical, and financial categories
- **5 Requirements**: Mix of approved and draft requirements
- **4 Deliverables**: Architecture docs, API docs, training, deployment
- **3 Constraints**: Technical, regulatory, and business
- **3 Assumptions**: Validated and unvalidated

### Timeline Baseline
- **6 Milestones**: From requirements to production deployment
- **Critical Path**: Identified dependencies
- **Duration**: 6 months (Jan 2026 - Jul 2026)

### Cost Baseline
- **Total Budget**: $500,000 USD
- **Breakdown**: Development, infrastructure, services, training, contingency

### Resource Baseline
- **Team Size**: 8 people
- **5 Roles**: PM, Backend Dev (3), Frontend Dev (2), DevOps (0.5), QA
- **Skills**: TypeScript, React, Node.js, PostgreSQL, AWS/GCP, AI/ML APIs

### Technical Baseline
- **Tech Stack**: Node.js 18+, React 18, PostgreSQL 15, Redis 7, TypeScript 5
- **Architecture**: Microservices with event-driven architecture
- **Performance Targets**: < 200ms p95, 10K+ concurrent users, 99.9% uptime

### Success Criteria
- **5 KPIs**: User adoption, uptime, response time, satisfaction, cost per transaction
- **4 Acceptance Criteria**: Functional requirements, security audit, performance, training

## Quality Scores

The created baseline includes realistic quality scores:
- **Extraction Confidence**: 95%
- **Completeness Score**: 90%
- **Consistency Score**: 88%
- **Clarity Score**: 92%

## Database Changes

The script performs the following database operations:

1. Creates a `project_baselines` record with status 'draft'
2. Creates baseline components in `baseline_components` table
3. Logs version creation in `baseline_versions` table
4. If auto-approved:
   - Sets status to 'approved'
   - Deactivates any existing active baselines
   - Logs approval in `baseline_versions`

## Example Output

```
================================================================================
TEST BASELINE CREATED SUCCESSFULLY
================================================================================

Baseline ID: 123e4567-e89b-12d3-a456-426614174000
Project ID: abc12345-6789-def0-1234-56789abcdef0
Project Name: My Test Project
Version: 1.0
Status: approved

Baseline Components:
  - Stakeholders: 5
  - Risks: 4
  - Milestones: 6
  - Requirements: 5
  - Deliverables: 4
  - Constraints: 3
  - Assumptions: 3
  - Success Criteria: 5 KPIs

Budget: $500,000
Duration: 6 months

Quality Scores:
  - Extraction Confidence: 95%
  - Completeness: 90%
  - Consistency: 88%
  - Clarity: 92%

================================================================================
Next Steps for Testing Drift Resolution:
1. Edit a project document to modify entities (add/remove/change)
2. Save the document - drift should be detected automatically
3. Use the "Resolve Drift" feature to test AI-powered resolution
4. Verify drift is resolved correctly
================================================================================
```

## Testing Workflow

After creating a baseline:

1. **Edit a document** in the project
   - Add a new stakeholder
   - Remove a risk
   - Change a milestone date

2. **Save the document**
   - Drift should be detected automatically
   - Alert should appear showing drift count

3. **Click "Resolve Drift with AI"**
   - AI analyzes the drift
   - Preview shows proposed changes

4. **Apply resolution**
   - Document updated to align with baseline
   - Drift marked as resolved

## Related Scripts

- `seed-baseline-data.ts` - Seeds minimal baselines for all projects
- `recompute-drift.ts` - Recomputes drift for existing baselines

## Related Documentation

- [Drift Resolution Testing Guide](../../docs/testing/DRIFT_RESOLUTION_TESTING_GUIDE.md)
- [DRIFT_AUTO_RESOLUTION_FEATURE.md](../../docs/roadmap/DRIFT_AUTO_RESOLUTION_FEATURE.md)
- [CR-2026-001_Baseline_Drift_Detection.md](../../docs/roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md)

## Troubleshooting

### Error: "Project not found"
**Solution**: Verify the project ID is correct and exists in the database

### Error: "No admin user found"
**Solution**: Create an admin user first using `npm run create-admin`

### Error: "Database connection failed"
**Solution**: Verify DATABASE_URL is configured in `server/.env`

## Implementation Details

- **Language**: TypeScript
- **Database**: PostgreSQL via pg pool
- **Dependencies**: uuid, winston (logger)
- **Execution**: tsx (TypeScript execution)
- **Entry Point**: Can be imported as module or run directly

## Code Quality

- ✅ TypeScript strict mode
- ✅ Comprehensive error handling
- ✅ Detailed logging
- ✅ Idempotent (safe to run multiple times)
- ✅ Transaction support
- ✅ Parameterized queries (SQL injection safe)

---

*Part of TASK-716: Create baseline for drift resolution testing*
