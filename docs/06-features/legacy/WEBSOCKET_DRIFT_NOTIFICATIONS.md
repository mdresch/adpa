# WebSocket Drift Notifications

## Overview

The ADPA Framework includes real-time WebSocket notifications for baseline drift detection. When a document is updated and drift is detected against the approved baseline, users receive immediate notifications through the WebSocket connection.

## Implementation

### Backend

The backend emits `drift:detected` events when drift is detected during document updates:

```typescript
// server/src/routes/documents.ts (line ~1251)
io.to(`project:${result.rows[0].project_id}`).emit('drift:detected', {
  documentId: id,
  documentTitle: result.rows[0].name,
  driftRecordId: driftRecord.id,
  severity: driftResult.severity,
  driftCount: driftResult.driftPoints.length
})
```

### Frontend

#### Global Toast Notifications

The `WebSocketContext` includes a global listener that shows toast notifications for all drift detection events:

```typescript
// contexts/WebSocketContext.tsx
socketInstance.on("drift:detected", (data) => {
  const severityLabels = {
    critical: "🔴 Critical",
    high: "🟠 High",
    medium: "🟡 Medium",
    low: "🔵 Low",
  }
  const severityLabel = severityLabels[data.severity] || data.severity
  
  toast.warning(`${severityLabel} Drift Detected`, {
    description: `${data.documentTitle || "Document"} has ${data.driftCount} baseline drift${data.driftCount !== 1 ? "s" : ""}`,
    duration: 10000,
  })
})
```

#### Component-Level Integration

Components can subscribe to drift events using the `useDriftDetection` hook:

```typescript
import { useDriftDetection } from '@/contexts/WebSocketContext'

function MyComponent({ projectId }: { projectId: string }) {
  const driftAlerts = useDriftDetection(projectId)
  
  return (
    <div>
      {driftAlerts.map(alert => (
        <div key={alert.driftRecordId}>
          Drift detected: {alert.documentTitle}
        </div>
      ))}
    </div>
  )
}
```

### Integration Points

#### Executive Dashboard

The `ExecutiveDriftAlertsWidget` automatically refreshes when drift is detected:

```typescript
// app/(dashboard)/components/ExecutiveDriftAlertsWidget.tsx
useEffect(() => {
  const handleDriftDetected = (data: any) => {
    fetchExecutiveDashboardData()
  }

  on("drift:detected", handleDriftDetected)
  return () => off("drift:detected", handleDriftDetected)
}, [on, off])
```

#### Project Page

The project page refreshes documents and project data when drift is detected:

```typescript
// app/projects/[id]/page.tsx
const handleDriftDetected = (data: any) => {
  fetchDocuments()
  fetchProjectData()
}

on("drift:detected", handleDriftDetected)
```

## Event Data Structure

The `drift:detected` event includes the following data:

```typescript
{
  documentId: string        // UUID of the affected document
  documentTitle: string     // Title of the document
  driftRecordId: string     // UUID of the drift detection record
  severity: 'low' | 'medium' | 'high' | 'critical'
  driftCount: number        // Number of drift points detected
}
```

## Testing

To test drift detection notifications:

1. Create a project with an approved baseline
2. Update a document in that project to cause drift
3. Observe the toast notification appearing
4. Check that the Executive Dashboard and Project page update automatically

### Automated Tests

Run the WebSocket drift detection tests:

```bash
npm test -- __tests__/contexts/WebSocketContext-drift.test.tsx
```

## Troubleshooting

### Notifications Not Appearing

1. **Check WebSocket connection**: Verify that the WebSocket is connected by checking the browser console
2. **Check project room**: Ensure the user has joined the project room (`project:{projectId}`)
3. **Check backend emission**: Verify the backend is emitting the event (check server logs)
4. **Check authentication**: Ensure the user is authenticated with a valid JWT token

### Missing Event Data

If the event data is incomplete:

1. Check the document update endpoint in `server/src/routes/documents.ts`
2. Verify the drift detection service is populating all required fields
3. Check the drift record is being created correctly in the database

## Related Documentation

- [Drift Auto Resolution Feature](../roadmap/DRIFT_AUTO_RESOLUTION_FEATURE.md)
- [WebSocket Context](../contexts/WebSocketContext.tsx)
- [Baseline Drift Detection](../roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md)
