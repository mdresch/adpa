# Drift Resolution UI/UX Guide

**Feature**: Click "Resolve Drift" → Preview Changes  
**Task**: TASK-719  
**Status**: ✅ Implemented and Production Ready

---

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [UI Components](#ui-components)
3. [User Flow](#user-flow)
4. [Component Screenshots](#component-screenshots)
5. [Interaction Guide](#interaction-guide)

---

## Feature Overview

The Drift Resolution Preview feature provides a seamless, AI-powered workflow for resolving baseline drift in documents. When a document drifts from its approved baseline, users receive an immediate alert with a one-click resolution option.

### Key Benefits
- ⚡ **Instant Detection**: Automatic drift detection on every save
- 🤖 **AI-Powered**: Intelligent resolution using GPT-4
- 👁️ **Full Preview**: See all changes before applying
- 🔄 **Side-by-Side Diff**: Professional diff viewer
- 📋 **Change Tracking**: Auto-creates change requests for major changes
- ⏱️ **Fast**: Resolution generated in 3-10 seconds

---

## UI Components

### 1. Drift Alert Banner

**Location**: Top of document viewer page  
**Trigger**: Automatically appears when drift is detected  
**Component**: `components/drift/DriftAlertBanner.tsx`

**Visual Design**:
```
┌────────────────────────────────────────────────────────────────┐
│  ⚠️ BASELINE DRIFT DETECTED                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🔍 Drift Analysis                                          │  │
│  │                                                             │  │
│  │ This document has drifted from the approved baseline:      │  │
│  │                                                             │  │
│  │ 📊 Drift Summary:                                           │  │
│  │ ├─ 3 stakeholders added (not in baseline)                 │  │
│  │ ├─ 2 risks removed (were in baseline)                     │  │
│  │ ├─ 1 milestone date changed (Mar 15 → Apr 2)              │  │
│  │ └─ 1 budget constraint modified ($500K → $650K)           │  │
│  │                                                             │  │
│  │ Drift Severity: Medium (34% entity variance)               │  │
│  │ Detected: Just now (on save)                               │  │
│  │                                                             │  │
│  │ ⚡ Quick Actions:                                            │  │
│  │ [Resolve Drift with AI ⭐] [View Details] [Dismiss]        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

**Features**:
- Color-coded by severity (Low: Blue, Medium: Yellow, High: Orange, Critical: Red)
- Expandable/collapsible details
- Three action buttons:
  - **Resolve Drift with AI**: Opens resolution dialog
  - **View Details**: Expands drift analysis
  - **Dismiss**: Hides banner (drift still recorded)

### 2. Drift Resolution Dialog

**Location**: Modal dialog overlay  
**Trigger**: Click "Resolve Drift with AI" button  
**Component**: `components/drift/DriftResolutionDialog.tsx`

**Visual Design**:

#### Loading State
```
┌────────────────────────────────────────────────────────────────┐
│  ⭐ Resolve Baseline Drift with AI                      [X]    │
├────────────────────────────────────────────────────────────────┤
│  Review the AI-generated resolution and apply changes to      │
│  realign with your approved baseline.                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │                   [Spinning loader icon]                  │ │
│  │                                                            │ │
│  │        Analyzing Drift and Preparing Resolution...        │ │
│  │                                                            │ │
│  │    AI is analyzing the document and baseline to           │ │
│  │    generate a resolution preview.                         │ │
│  │                                                            │ │
│  │            This usually takes 3-10 seconds.               │ │
│  │                                                            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                    [Cancel]                    │
└────────────────────────────────────────────────────────────────┘
```

#### Tab 1: Summary
```
┌────────────────────────────────────────────────────────────────┐
│  ⭐ Resolve Baseline Drift with AI                      [X]    │
├────────────────────────────────────────────────────────────────┤
│  Review the AI-generated resolution and apply changes...      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [Summary] │ Preview Changes │ Resolved Content          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Drift Points Identified: 7                                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ + stakeholder                                             │ │
│  │   New stakeholder "Alice Johnson - CMO" added             │ │
│  │   [Requires Approval]                                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ - risk                                                     │ │
│  │   Risk "Vendor delivery delay" removed from document      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ~ milestone                                                │ │
│  │   Milestone "Testing Complete" changed from Mar 15        │ │
│  │   to Apr 2                                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ⚠️ Major Changes Requiring Approval:                          │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ • Budget increase: $500K → $650K (30%)                    │ │
│  │ • High-influence stakeholder added: Alice Johnson         │ │
│  │                                                            │ │
│  │ These changes will be flagged for change request          │ │
│  │ approval after resolution is applied.                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  AI Resolution Strategy: ⭐                                     │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ○ Conservative - Revert ALL changes (strict compliance)  │ │
│  │ ● Balanced ⭐ - Keep valid, revert unauthorized (Rec.)   │ │
│  │ ○ Permissive - Keep most, flag critical only (flexible) │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ⚠️ Some changes require approval                              │
│                                    [Cancel] [Apply Resolution] │
└────────────────────────────────────────────────────────────────┘
```

#### Tab 2: Preview Changes
```
┌────────────────────────────────────────────────────────────────┐
│  ⭐ Resolve Baseline Drift with AI                      [X]    │
├────────────────────────────────────────────────────────────────┤
│  Review the AI-generated resolution and apply changes...      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Summary │ [Preview Changes] │ Resolved Content          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Changes Preview    [Side-by-Side ✓] [Unified]               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ┌──────────────────────┬──────────────────────┐          │ │
│  │ │ Original             │ Resolved             │          │ │
│  │ ├──────────────────────┼──────────────────────┤          │ │
│  │ │ 1  # Risk Management │ 1  # Risk Management │          │ │
│  │ │ 2                    │ 2                    │          │ │
│  │ │ 3  ## Identified...  │ 3  ## Identified...  │          │ │
│  │ │ 4                    │ 4                    │          │ │
│  │ │ 5  - Supply chain... │ 5  - Supply chain... │          │ │
│  │ │ 6  - Technical debt  │ 6  - Technical debt  │          │ │
│  │ │ 7                    │ 7  + Vendor delivery │ 🟢       │ │
│  │ │                      │ 8  + Skills gap risk │ 🟢       │ │
│  │ │ 8  ## Milestones     │ 9                    │          │ │
│  │ │ 9                    │ 10 ## Milestones     │          │ │
│  │ │ 10 - Testing: Apr 2  │ 11 - Testing: Mar 15 │ 🔴       │ │
│  │ │ 11 - Launch: May 10  │ 12 - Launch: May 10  │          │ │
│  │ │ 12                   │ 13                   │          │ │
│  │ │ 13 ## Budget         │ 14 ## Budget         │          │ │
│  │ │ 14 $650,000          │ 15 $500,000          │ 🔴       │ │
│  │ └──────────────────────┴──────────────────────┘          │ │
│  │                                                            │ │
│  │ Legend: 🟢 Added  🔴 Changed  ⚪ Unchanged                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ⚠️ Some changes require approval                              │
│                                    [Cancel] [Apply Resolution] │
└────────────────────────────────────────────────────────────────┘
```

#### Tab 3: Resolved Content
```
┌────────────────────────────────────────────────────────────────┐
│  ⭐ Resolve Baseline Drift with AI                      [X]    │
├────────────────────────────────────────────────────────────────┤
│  Review the AI-generated resolution and apply changes...      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Summary │ Preview Changes │ [Resolved Content]          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Resolved Document Content                                     │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ┌──────────────────────────────────────────────────────┐ │ │
│  │ │ # Risk Management Plan                               │ │ │
│  │ │                                                        │ │ │
│  │ │ ## Identified Risks                                   │ │ │
│  │ │                                                        │ │ │
│  │ │ - **Supply chain disruption** (Medium/High)          │ │ │
│  │ │   - Impact: 2-3 month delay                          │ │ │
│  │ │   - Mitigation: Multi-source strategy                │ │ │
│  │ │                                                        │ │ │
│  │ │ - **Technical debt accumulation** (Low/Medium)       │ │ │
│  │ │   - Impact: Slower development velocity              │ │ │
│  │ │   - Mitigation: Dedicated refactoring sprints        │ │ │
│  │ │                                                        │ │ │
│  │ │ - **Vendor delivery delay** (High/High) ✨           │ │ │
│  │ │   - Impact: Critical path blocked                    │ │ │
│  │ │   - Mitigation: Contract penalties, backup vendor    │ │ │
│  │ │                                                        │ │ │
│  │ │ - **Skills gap in React** (Medium/Medium) ✨         │ │ │
│  │ │   - Impact: Quality issues, slower delivery          │ │ │
│  │ │   - Mitigation: Training program, external hire      │ │ │
│  │ │                                                        │ │ │
│  │ │ ## Project Milestones                                 │ │ │
│  │ │                                                        │ │ │
│  │ │ - **Testing Complete**: March 15, 2025 ✨            │ │ │
│  │ │ - **Production Launch**: May 10, 2025                │ │ │
│  │ │                                                        │ │ │
│  │ │ ## Budget Allocation                                  │ │ │
│  │ │                                                        │ │ │
│  │ │ **Total Budget**: $500,000 ✨                         │ │ │
│  │ │ <!-- REQUIRES APPROVAL: Budget restored to baseline│ │ │
│  │ │      from $650K. Review if increase is needed. --> │ │ │
│  │ │                                                        │ │ │
│  │ └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │ Legend: ✨ Restored from baseline                         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ✓ No approval required    [Cancel] [Apply Resolution]        │
└────────────────────────────────────────────────────────────────┘
```

### 3. Success Notification

**Component**: Toast notification (Sonner)  
**Trigger**: After successfully applying resolution

```
┌────────────────────────────────────────────┐
│  ✅ Drift resolved!                        │
│  Document realigned with baseline.         │
│                                             │
│  ℹ️  Change request created for major      │
│      changes requiring approval.           │
└────────────────────────────────────────────┘
```

---

## User Flow

### Step-by-Step Interaction

#### 1. Document Editing
```
User Action: Edit document → Save
System Response: Automatic drift detection runs
```

#### 2. Drift Detection
```
System: Compares document with baseline
System: Identifies 7 drift points across 4 entity types
System: Calculates severity: Medium
System: Shows drift alert banner
```

#### 3. User Initiates Resolution
```
User: Clicks "Resolve Drift with AI"
System: Opens dialog in loading state
System: Calls backend API: POST /api/drift/resolve
```

#### 4. AI Processing
```
Backend: Fetches drift record
Backend: Fetches approved baseline
Backend: Fetches current document
Backend: Builds AI prompt with context
Backend: Calls OpenAI GPT-4 Turbo
Backend: Parses AI response
Backend: Generates diff preview
Backend: Returns resolution preview
Duration: 3-10 seconds
```

#### 5. Preview Review
```
User: Reviews Summary tab
User: Switches to Preview Changes tab
User: Examines side-by-side diff
User: Reviews Resolved Content tab
User: Optionally changes strategy (Balanced → Conservative)
```

#### 6. Apply Resolution
```
User: Clicks "Apply Resolution"
System: Shows loading state on button
System: Calls backend API: POST /api/drift/apply
Backend: Updates document content
Backend: Marks drift as resolved
Backend: Creates change request (if major changes)
Backend: Creates audit log entry
System: Shows success notification
System: Refreshes document view
```

---

## Interaction Guide

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close dialog / Dismiss alert |
| `Tab` | Navigate between tabs |
| `Enter` | Apply resolution (when focused on button) |
| `Ctrl/Cmd + Z` | Undo resolution (within document editor) |

### Mouse Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Drift Alert Banner | Click anywhere | Expands details |
| "Resolve Drift" Button | Click | Opens resolution dialog |
| "View Details" Button | Click | Expands drift analysis |
| "Dismiss" Button | Click | Hides alert (drift still recorded) |
| Strategy Radio Button | Click | Changes resolution strategy |
| Diff View Toggle | Click | Switches between side-by-side/unified |
| Tab Headers | Click | Switches active tab |
| "Apply Resolution" | Click | Applies changes and closes dialog |
| "Cancel" | Click | Closes dialog without applying |

### Touch/Mobile Interactions

- **Swipe left/right** on tabs to navigate
- **Pinch to zoom** on diff view
- **Long press** on drift point for more details

---

## Color Coding

### Severity Colors

| Severity | Color | Background | Border |
|----------|-------|------------|--------|
| Low | Blue | `bg-blue-50` | `border-blue-200` |
| Medium | Yellow | `bg-yellow-50` | `border-yellow-300` |
| High | Orange | `bg-orange-50` | `border-orange-400` |
| Critical | Red | `bg-red-50` | `border-red-500` |

### Drift Type Colors

| Type | Symbol | Color | Meaning |
|------|--------|-------|---------|
| Added | `+` | Green | Entity added (not in baseline) |
| Removed | `-` | Red | Entity removed (was in baseline) |
| Modified | `~` | Yellow | Entity changed from baseline |

### Diff View Colors

| Change | Color | Class |
|--------|-------|-------|
| Added Line | Light Green | `bg-green-100` |
| Removed Line | Light Red | `bg-red-100` |
| Modified Line | Light Yellow | `bg-yellow-100` |
| Context Line | White | `bg-white` |

---

## Accessibility

### ARIA Labels

```typescript
// Drift Alert Banner
aria-label="Baseline drift detected alert"
role="alert"

// Resolution Dialog
aria-labelledby="drift-resolution-title"
aria-describedby="drift-resolution-description"
role="dialog"
aria-modal="true"

// Tabs
role="tablist"
role="tab"
role="tabpanel"

// Diff View
aria-label="Side-by-side code comparison"
```

### Screen Reader Support

- All buttons have descriptive labels
- Drift points announced with type and description
- Tab navigation properly announced
- Status changes (loading, success) announced
- Error messages read aloud

### Keyboard Navigation

- Full keyboard navigation support
- Focus visible on all interactive elements
- Tab order follows visual order
- Escape key closes dialogs
- Enter/Space activates buttons

---

## Responsive Design

### Desktop (>1024px)
- Full-width dialog (max-width: 5xl = 64rem)
- Side-by-side diff default
- All three tabs visible
- Full metadata shown

### Tablet (768px - 1024px)
- Slightly narrower dialog (max-width: 4xl)
- Side-by-side diff with horizontal scroll
- Tabs stack on smaller screens
- Condensed metadata

### Mobile (<768px)
- Full-screen dialog
- Unified diff default (side-by-side too narrow)
- Tabs collapse to dropdown
- Minimal metadata shown
- Larger touch targets (min 44x44px)

---

## Performance Optimization

### Loading States

1. **Drift Detection** (< 1s)
   - No loading indicator needed
   - Happens in background on save

2. **Resolution Generation** (3-10s)
   - Full-screen loading overlay in dialog
   - Progress message
   - Prevents multiple submissions

3. **Diff Rendering** (< 1s)
   - Memoized computation
   - Virtualized scrolling for large diffs
   - Lazy loading of syntax highlighting

4. **Apply Resolution** (1-2s)
   - Button loading state
   - Prevents double-submission
   - Optimistic UI update (optional)

### Caching Strategy

- **Baseline Data**: Cache for 5 minutes
  - *Rationale*: Baselines rarely change; 5-minute cache balances freshness with reduced database load
- **Drift Analysis**: Cache for 1 minute
  - *Rationale*: Documents may be edited frequently; short cache ensures recent drift is detected
- **Resolution Preview**: No caching (always fresh)
  - *Rationale*: Each resolution is unique to current document state; must always be regenerated
- **Diff Calculation**: Memoized per content pair
  - *Rationale*: Same content pair always produces same diff; memoization avoids redundant computation

---

## Error States

### API Errors

```
┌────────────────────────────────────────────────────────────────┐
│  ⚠️ Resolution Failed                                          │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Unable to generate drift resolution.                      │ │
│  │                                                            │ │
│  │ Error: AI service timeout                                 │ │
│  │                                                            │ │
│  │ Please try again or contact support if the problem        │ │
│  │ persists.                                                  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                   [Retry] [Cancel]             │
└────────────────────────────────────────────────────────────────┘
```

### Network Errors

```
Toast Notification:
┌────────────────────────────────────────────┐
│  ❌ Network error                          │
│  Failed to connect to server.              │
│  Please check your connection.             │
└────────────────────────────────────────────┘
```

### Validation Errors

```
Toast Notification:
┌────────────────────────────────────────────┐
│  ⚠️ Invalid content                        │
│  Resolved content failed validation.       │
│  Please try a different strategy.          │
└────────────────────────────────────────────┘
```

---

## Future Enhancements

### Phase 2 Features (Planned)
- [ ] Real-time collaborative drift resolution
- [ ] Drift resolution history and rollback
- [ ] Custom AI prompts for specialized workflows
- [ ] Bulk drift resolution for multiple documents
- [ ] Drift prevention warnings during editing
- [ ] Scheduled drift checks
- [ ] Email notifications for critical drift

### Phase 3 Features (Under Consideration)
- [ ] Machine learning for drift prediction
- [ ] Automatic resolution for low-severity drift
- [ ] Integration with version control systems
- [ ] Drift analytics dashboard
- [ ] Custom resolution rules engine

---

## Support and Feedback

### Getting Help

**Documentation**: 
- Implementation Guide: [DRIFT_RESOLUTION_PREVIEW_FEATURE.md](./DRIFT_RESOLUTION_PREVIEW_FEATURE.md)
- UI/UX Guide: This document

**Troubleshooting**: Check logs in `server/logs/combined.log`

**Common Issues**:
1. "No baseline found" → Create and approve baseline first
2. "Resolution timeout" → Check AI service API key
3. "Diff preview failed" → Content may be too large or malformed

### Providing Feedback

**Bug Reports**: Include:
- Screenshot of error
- Browser console logs
- Steps to reproduce
- Document ID and drift record ID

**Feature Requests**: Include:
- Use case description
- Expected behavior
- Current workaround (if any)

---

**Last Updated**: November 2025  
**Version**: 2.0.0  
**Status**: Production Ready ✅
