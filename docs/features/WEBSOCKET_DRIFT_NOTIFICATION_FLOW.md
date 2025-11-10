# WebSocket Drift Notification Flow

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          User Updates Document                           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  Backend: PUT /api/documents/:id                         │
│                                                                           │
│  1. Save document to database                                            │
│  2. Run drift detection against approved baseline                        │
│  3. If drift detected:                                                   │
│     - Create drift record in baseline_drift_detection table              │
│     - Emit WebSocket event to project room                               │
│                                                                           │
│     io.to(`project:${projectId}`).emit('drift:detected', {              │
│       documentId,                                                        │
│       documentTitle,                                                     │
│       driftRecordId,                                                     │
│       severity: 'critical' | 'high' | 'medium' | 'low',                 │
│       driftCount                                                         │
│     })                                                                   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Frontend: WebSocket Listeners                        │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  WebSocketContext (Global)                                       │    │
│  │  - Shows toast notification with severity emoji                 │    │
│  │  - Displays drift count                                          │    │
│  │  - 10 second duration                                            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ExecutiveDriftAlertsWidget                                      │    │
│  │  - Refreshes dashboard data                                      │    │
│  │  - Updates drift alerts, budget alerts, opportunities            │    │
│  │  - Updates summary statistics                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Project Page (app/projects/[id]/page.tsx)                       │    │
│  │  - Refreshes document list                                       │    │
│  │  - Refreshes project data                                        │    │
│  │  - Updates UI to show latest state                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Custom Components (using useDriftDetection hook)                │    │
│  │  - Receive drift alerts array                                    │    │
│  │  - Can display custom UI for drift notifications                 │    │
│  │  - Keeps last 10 alerts in state                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Event Data Structure

```typescript
{
  documentId: "uuid-of-document",
  documentTitle: "Risk Management Plan",
  driftRecordId: "uuid-of-drift-record",
  severity: "critical",  // or "high", "medium", "low"
  driftCount: 5          // number of drift points detected
}
```

## Toast Notification Examples

### Critical Drift
```
┌────────────────────────────────────────┐
│ 🔴 Critical Drift Detected             │
│ Risk Management Plan has 5 baseline    │
│ drifts                                 │
└────────────────────────────────────────┘
```

### High Drift
```
┌────────────────────────────────────────┐
│ 🟠 High Drift Detected                 │
│ Project Charter has 3 baseline drifts  │
└────────────────────────────────────────┘
```

### Medium Drift
```
┌────────────────────────────────────────┐
│ 🟡 Medium Drift Detected               │
│ Stakeholder Analysis has 2 baseline    │
│ drifts                                 │
└────────────────────────────────────────┘
```

### Low Drift
```
┌────────────────────────────────────────┐
│ 🔵 Low Drift Detected                  │
│ Communication Plan has 1 baseline drift│
└────────────────────────────────────────┘
```

## User Experience Flow

1. **User edits document** in the document editor
2. **User saves document** → Document update request sent to backend
3. **Backend detects drift** → Compares document with approved baseline
4. **WebSocket notification sent** → All users in project room receive event
5. **Toast appears** → User sees severity and drift count
6. **Dashboard updates** → Executive dashboard refreshes automatically
7. **Project page updates** → Document list shows latest state
8. **User can act** → Click on document to view drift details or resolve

## Technical Benefits

- ✅ **Real-time updates**: No need to refresh the page
- ✅ **Multi-user support**: All team members notified simultaneously
- ✅ **Low latency**: WebSocket connection provides instant notifications
- ✅ **Severity awareness**: Color-coded emoji indicators
- ✅ **Automatic refresh**: Affected components update without user action
- ✅ **Scalable**: Room-based broadcasting reduces server load
- ✅ **Extensible**: Easy to add more listeners in new components
