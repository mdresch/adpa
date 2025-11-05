# Drift Resolution Preview Feature - Implementation Guide

**Task ID**: TASK-719  
**Feature**: Click "Resolve Drift" → Preview Changes  
**Status**: ✅ **FULLY IMPLEMENTED**  
**Date**: December 2025

---

## Overview

The Drift Resolution Preview feature enables users to automatically detect and resolve baseline drift in documents with a single click, powered by AI. When drift is detected, users can preview the proposed changes before applying them.

## Feature Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. User Edits Document → Saves Changes                     │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Automatic Drift Detection Runs                          │
│     - Compares document with approved baseline              │
│     - Analyzes all 14 entity types                          │
│     - Calculates drift severity                             │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Drift Alert Banner Appears (if drift detected)          │
│     ⚠️ "Baseline drift detected: 5 changes"                 │
│     [Resolve Drift with AI] [View Details] [Dismiss]        │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  4. User Clicks "Resolve Drift"                             │
│     - Dialog opens with loading state                       │
│     - AI analyzes drift and baseline                        │
│     - Generates resolution preview (3-10 seconds)           │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Resolution Preview Shows (3 Tabs)                       │
│     ┌──────────────────────────────────────────────────┐   │
│     │ Summary | Preview Changes | Resolved Content     │   │
│     ├──────────────────────────────────────────────────┤   │
│     │ • Summary: List of all drift points              │   │
│     │   - Added entities (+)                            │   │
│     │   - Removed entities (-)                          │   │
│     │   - Modified entities (~)                         │   │
│     │   - Major changes requiring approval              │   │
│     │                                                    │   │
│     │ • Preview Changes: Side-by-side diff              │   │
│     │   - Original content vs. Resolved content         │   │
│     │   - Syntax highlighting                           │   │
│     │   - Line-by-line comparison                       │   │
│     │   - Switch between Side-by-Side and Unified       │   │
│     │                                                    │   │
│     │ • Resolved Content: Full markdown preview         │   │
│     │   - Rendered preview of updated document          │   │
│     │   - Shows final result after applying             │   │
│     └──────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  6. User Reviews and Applies                                 │
│     [Cancel] [Apply Resolution]                              │
│     - Click Apply → Document updated                         │
│     - Drift marked as resolved                               │
│     - Change request created for major changes               │
│     - Success notification shown                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Backend Services

#### `server/src/services/driftResolutionService.ts`
- **Purpose**: AI-powered drift resolution and preview generation
- **Key Methods**:
  - `resolveDrift()` - Main resolution method
  - `buildResolutionPrompt()` - Creates AI prompt with baseline and drift context
  - `generateDiffPreview()` - Generates unified diff for preview
  - `applyResolution()` - Applies resolved content to document
  - `createChangeRequestForMajorChanges()` - Auto-creates change requests

#### `server/src/routes/drift.ts`
- **Endpoints**:
  - `POST /api/drift/resolve` - Generate resolution preview
  - `POST /api/drift/apply` - Apply resolution to document
  - `GET /api/drift/:driftRecordId` - Get drift details
  - `GET /api/drift/project/:projectId` - List project drift records

### 2. Frontend Components

#### `app/documents/[id]/view/page.tsx`
- **Integration**:
  ```typescript
  const {
    driftAlert,
    resolutionPreview,
    isResolving,
    isApplying,
    handleResolveDrift,
    handleApplyResolution,
    dismissDriftAlert
  } = useDriftDetection(documentId, document?.project_id)
  ```
- **Features**:
  - Drift alert banner integration
  - Resolution dialog integration
  - Auto-refresh after applying resolution

#### `components/drift/DriftAlertBanner.tsx`
- **Purpose**: Shows drift detection notification
- **Props**:
  ```typescript
  interface DriftAlertBannerProps {
    driftRecordId: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    driftCount: number
    summary?: string
    onResolve: () => void
    onDismiss: () => void
    onViewDetails: () => void
    isResolving: boolean
  }
  ```

#### `components/drift/DriftResolutionDialog.tsx`
- **Purpose**: Main resolution preview modal
- **Features**:
  - Three-tab interface (Summary, Preview, Resolved Content)
  - Loading state while AI generates resolution
  - Strategy selection (Conservative/Balanced/Permissive)
  - Diff view toggle (Side-by-Side / Unified)
  - Apply/Cancel actions
- **Props**:
  ```typescript
  interface DriftResolutionDialogProps {
    open: boolean
    onClose: () => void
    resolutionPreview: ResolutionPreview | null
    onApply: () => void
    isApplying?: boolean
    isLoading?: boolean
    onStrategyChange?: (strategy: 'conservative' | 'balanced' | 'permissive') => void
    selectedStrategy?: 'conservative' | 'balanced' | 'permissive'
  }
  ```

#### `components/drift/SideBySideDiff.tsx`
- **Purpose**: Visual diff comparison
- **Library**: Uses `react-diff-view` for professional diff rendering
- **Features**:
  - Side-by-side view
  - Syntax highlighting
  - Line numbers
  - Change indicators (+/-)
  - Context lines

#### `hooks/use-drift-detection.ts`
- **Purpose**: React hook for drift detection workflow
- **Features**:
  - WebSocket integration for real-time drift events
  - State management for drift alerts and previews
  - API calls for resolution and application
  - Toast notifications
- **Returns**:
  ```typescript
  {
    driftAlert: DriftAlert | null
    resolutionPreview: ResolutionPreview | null
    isResolving: boolean
    isApplying: boolean
    handleResolveDrift: (strategy) => Promise<void>
    handleApplyResolution: () => Promise<boolean>
    dismissDriftAlert: () => void
  }
  ```

---

## Resolution Strategies

### 1. Conservative (Strict Baseline Adherence)
**Use When**: Regulated industries, formal governance

**Behavior**:
- ✅ Revert ALL changes to baseline
- ✅ Remove ALL added entities
- ✅ Restore ALL removed entities
- ✅ Flag EVERY change for approval

**Example**:
```
Baseline: 12 stakeholders
Current: 15 stakeholders (3 added)
Resolution: Remove all 3 new stakeholders, restore exact baseline
```

### 2. Balanced ⭐ RECOMMENDED (Intelligent Adaptation)
**Use When**: Most projects, reasonable governance

**Behavior**:
- ✅ Keep minor, valid updates
- ✅ Revert unauthorized major changes
- ✅ Flag significant changes for approval
- ✅ Apply common-sense logic

**Example**:
```
Baseline: 12 stakeholders
Current: 15 stakeholders (3 added)
Resolution:
- Keep 2 new stakeholders (low influence, valid additions)
- Flag 1 new stakeholder (high influence - needs approval)
- Keep updated contact emails (minor changes)
```

### 3. Permissive (Flexible Adaptation)
**Use When**: Agile projects, high trust, minimal governance

**Behavior**:
- ✅ Keep most changes
- ✅ Only revert critical baseline violations
- ✅ Flag only budget/scope >20% changes
- ✅ Trust team judgment

**Example**:
```
Baseline: 12 stakeholders
Current: 15 stakeholders (3 added)
Resolution: Keep all 15, note additions in change log
```

---

## User Interface

### Drift Alert Banner
```
┌────────────────────────────────────────────────────────────┐
│  ⚠️ BASELINE DRIFT DETECTED                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ This document has 5 changes that deviate from the    │  │
│  │ approved baseline.                                    │  │
│  │                                                        │  │
│  │ [Resolve Drift with AI ⭐] [View Details] [Dismiss]   │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Resolution Dialog - Summary Tab
```
┌────────────────────────────────────────────────────────────┐
│  ⭐ Resolve Baseline Drift with AI                  [X]    │
├────────────────────────────────────────────────────────────┤
│  Review the AI-generated resolution and apply changes...   │
│                                                              │
│  [Summary] [Preview Changes] [Resolved Content]            │
│  ────────────────────────────────────────────────          │
│                                                              │
│  Drift Points Identified: 5                                 │
│                                                              │
│  + stakeholder                                              │
│    New stakeholder "Marketing Manager" added               │
│                                                              │
│  - risk                                                     │
│    Risk "Budget overrun" removed from document             │
│    [Requires Approval]                                     │
│                                                              │
│  ~ milestone                                                │
│    Milestone "Launch Date" changed from Mar 15 to Apr 2    │
│                                                              │
│  ⚠️ Major Changes Requiring Approval:                       │
│  • Risk "Budget overrun" removed (High impact)             │
│  • Budget increase: $500K → $650K (30%)                    │
│                                                              │
│  [Cancel] [Apply Resolution]                               │
└────────────────────────────────────────────────────────────┘
```

### Resolution Dialog - Preview Tab
```
┌────────────────────────────────────────────────────────────┐
│  ⭐ Resolve Baseline Drift with AI                  [X]    │
├────────────────────────────────────────────────────────────┤
│  [Summary] [Preview Changes] [Resolved Content]            │
│  ────────────────────────────────────────────────          │
│                                                              │
│  Changes Preview     [Side-by-Side ✓] [Unified]           │
│  ┌──────────────────────┬──────────────────────┐          │
│  │ Original             │ Resolved             │          │
│  ├──────────────────────┼──────────────────────┤          │
│  │ ## Risks             │ ## Risks             │          │
│  │                      │                      │          │
│  │ - Risk A             │ - Risk A             │          │
│  │ - Risk B             │ - Risk B             │          │
│  │                      │ + Budget overrun ⭐  │          │
│  │                      │ + Vendor delay ⭐    │          │
│  │                      │                      │          │
│  │ ## Milestones        │ ## Milestones        │          │
│  │                      │                      │          │
│  │ - Launch: Apr 2      │ - Launch: Mar 15 ⭐  │          │
│  └──────────────────────┴──────────────────────┘          │
│                                                              │
│  ✓ No approval required    [Cancel] [Apply Resolution]    │
└────────────────────────────────────────────────────────────┘
```

---

## API Usage

### Generate Resolution Preview
```typescript
// POST /api/drift/resolve
const response = await fetch('/api/drift/resolve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    documentId: 'doc-uuid',
    driftRecordId: 'drift-uuid',
    strategy: 'balanced' // or 'conservative' | 'permissive'
  })
})

const result = await response.json()
// Returns:
{
  success: true,
  resolvedContent: "# Updated Document...",
  originalContent: "# Original Document...",
  driftPoints: [...],
  majorChanges: [...],
  requiresApproval: false,
  strategy: 'balanced',
  previewHtml: "unified diff preview"
}
```

### Apply Resolution
```typescript
// POST /api/drift/apply
const response = await fetch('/api/drift/apply', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    documentId: 'doc-uuid',
    driftRecordId: 'drift-uuid',
    resolvedContent: result.resolvedContent,
    majorChanges: result.majorChanges
  })
})

const applyResult = await response.json()
// Returns:
{
  success: true,
  message: "Drift resolution applied successfully",
  changeRequestCreated: true, // if major changes exist
  changeRequestId: "cr-uuid"
}
```

---

## Testing

### Manual Testing Steps

1. **Create Test Baseline**:
   ```bash
   cd server
   npm run create-test-baseline <PROJECT_ID>
   ```

2. **Edit Document**:
   - Navigate to document viewer
   - Click "Edit" button
   - Add a new stakeholder or modify a milestone
   - Save changes

3. **Verify Drift Detection**:
   - Drift alert should appear within 2-3 seconds
   - Alert shows drift count and severity

4. **Test Resolution Preview**:
   - Click "Resolve Drift with AI"
   - Verify loading state appears
   - Wait for resolution preview (3-10 seconds)
   - Check all three tabs:
     - Summary: Shows drift points
     - Preview: Shows side-by-side diff
     - Resolved Content: Shows rendered markdown

5. **Apply Resolution**:
   - Click "Apply Resolution"
   - Verify success notification
   - Verify document is updated
   - If major changes exist, verify change request was created

6. **Test Different Strategies**:
   - Repeat with Conservative strategy
   - Repeat with Permissive strategy
   - Compare the differences in resolution behavior

### Automated Tests

```bash
# Frontend tests
npm test components/drift

# Backend tests
cd server
npm test drift-resolution
```

---

## Performance

### Expected Timings
- **Drift Detection**: < 1 second (automatic on save)
- **Resolution Generation**: 3-10 seconds (AI processing)
- **Preview Rendering**: < 1 second (diff generation)
- **Apply Resolution**: 1-2 seconds (database update)

### Optimization Tips
- Use `balanced` strategy for best performance/quality balance
- Large documents (>5000 lines) may take longer to diff
- Consider caching baseline data for frequently accessed projects

---

## Troubleshooting

### "Resolution preview not available"
- **Cause**: AI service unavailable or timeout
- **Solution**: Check API keys, retry with different AI provider

### "Diff preview failed to render"
- **Cause**: Content too similar or malformed
- **Solution**: Use "Resolved Content" tab instead

### "No baseline found"
- **Cause**: Project doesn't have an approved baseline
- **Solution**: Create and approve a baseline first

### "Change request creation failed"
- **Cause**: Missing permissions or database error
- **Solution**: Check user permissions, verify database connection

---

## Dependencies

### NPM Packages
```json
{
  "react-diff-view": "^3.3.2",   // Diff visualization
  "unidiff": "^1.0.4",            // Diff generation
  "diff": "^8.0.2"                // Core diff algorithm
}
```

### Backend Services
- AI Service (OpenAI GPT-4 Turbo recommended)
- PostgreSQL database with baseline tables
- Redis for job queue (optional, for async processing)

---

## Related Documentation

- [DRIFT_AUTO_RESOLUTION_FEATURE.md](../../docs/roadmap/DRIFT_AUTO_RESOLUTION_FEATURE.md) - Original feature specification
- [Baseline Integration](../../docs/roadmap/entity-baseline-integration.md) - Baseline system documentation
- [Drift Detection](../../docs/roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md) - Drift detection specification

---

## Changelog

### v2.0.0 (December 2025)
- ✅ Full implementation of drift resolution preview
- ✅ Three-tab interface with Summary, Preview, and Resolved Content
- ✅ Side-by-side and unified diff views
- ✅ Strategy selection (Conservative/Balanced/Permissive)
- ✅ Automatic change request creation for major changes
- ✅ Real-time WebSocket integration
- ✅ Comprehensive test coverage

---

**Status**: ✅ Production Ready  
**Last Updated**: December 2025  
**Maintained By**: ADPA Development Team
