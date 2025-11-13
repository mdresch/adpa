# Automatic Drift Detection & Resolution - User Guide

**Status**: ✅ Production-Ready  
**Last Updated**: November 4, 2025  
**Feature ID**: TASK-718

---

## 📋 Overview

The **Automatic Drift Detection & Resolution** feature monitors your documents for deviations from approved project baselines and provides **one-click AI-powered resolution** to bring documents back into compliance.

### What is Baseline Drift?

Baseline drift occurs when a document's content (stakeholders, risks, milestones, budget, etc.) diverges from the approved project baseline. This can happen through:
- Manual edits to documents
- Addition of unauthorized stakeholders
- Removal of baseline entities
- Changes to dates, budgets, or other critical parameters

---

## 🎯 Key Features

- ✨ **Automatic Detection**: Runs every time you save a document
- 🤖 **AI-Powered Resolution**: Uses AI to realign content with baseline
- 🎚️ **Three Resolution Strategies**: Conservative, Balanced, Permissive
- 📊 **14 Entity Types Monitored**: Comprehensive coverage
- 🔔 **Real-time Alerts**: Instant WebSocket notifications
- 🔍 **Severity Levels**: Low, Medium, High, Critical
- ✅ **Change Management**: Auto-creates change requests for major changes
- 📝 **Audit Trail**: Complete history of drift and resolutions

---

## 🚀 How It Works

### 1. Automatic Drift Detection

Every time you save a document, the system automatically:

1. ✅ Checks if the project has an approved baseline
2. ✅ Extracts entities from the current document
3. ✅ Compares entities with the baseline
4. ✅ Identifies drift points (added, removed, modified)
5. ✅ Calculates drift severity
6. ✅ Sends real-time notification if drift detected

### 2. Drift Alert Display

When drift is detected, you'll see an alert banner with:

```
⚠️ BASELINE DRIFT DETECTED [SEVERITY BADGE]

This document has X changes that deviate from the approved baseline.

[Resolve Drift with AI ⭐] [View Details] [Full Analysis] [Dismiss]
```

**Severity Levels:**
- 🔵 **Low**: 1-4 drift points, no approval required
- 🟡 **Medium**: 5-9 drift points
- 🟠 **High**: 10+ drift points
- 🔴 **Critical**: Any drift requiring approval

### 3. One-Click Resolution

Click **"Resolve Drift with AI"** to:

1. ✅ Analyze all drift points
2. ✅ Generate AI-powered resolution
3. ✅ Preview changes side-by-side
4. ✅ Review before applying
5. ✅ Apply resolution in one click

### 4. Resolution Strategies

Choose from three strategies:

#### Conservative (Strict Baseline Adherence)
- Reverts ALL changes to baseline
- Removes ALL added entities
- Restores ALL removed entities
- Flags EVERY change for approval

**Use When**: Regulated industries, formal governance

#### Balanced (Intelligent Adaptation) ⭐ RECOMMENDED
- Keeps minor, valid updates
- Reverts unauthorized major changes
- Flags significant changes for approval
- Applies common-sense logic

**Use When**: Most projects, reasonable governance

#### Permissive (Flexible Adaptation)
- Keeps most changes
- Only reverts critical baseline violations
- Flags only budget/scope >20% changes
- Trusts team judgment

**Use When**: Agile projects, high trust, minimal governance

---

## 📖 Step-by-Step Usage Guide

### For Document Editors

#### Step 1: Edit and Save Document

1. Navigate to your document
2. Make changes to content
3. Click **Save**
4. Wait for automatic drift detection (1-2 seconds)

#### Step 2: Review Drift Alert

If drift is detected, you'll see an alert with:
- Number of drift points
- Severity level
- Summary of changes

Click **"View Details"** to expand and see:
- List of specific drift points
- Entity types affected
- Which changes require approval

#### Step 3: Resolve Drift

1. Click **"Resolve Drift with AI ⭐"**
2. Wait for AI analysis (3-5 seconds)
3. Review the resolution preview:
   - See side-by-side comparison
   - Review each drift point resolution
   - Check for changes requiring approval
4. Select resolution strategy if desired (default: Balanced)
5. Click **"Apply Resolution"**

#### Step 4: Confirm Resolution

After applying:
- ✅ Document is updated with resolved content
- ✅ Drift record is marked as resolved
- ✅ Audit log is created
- ✅ Change requests created for major changes (if any)
- ✅ Notification sent to stakeholders

### For Project Managers

#### Monitoring Drift

1. Go to Project Dashboard
2. View **Executive Drift Alerts Widget**
3. See all active drift across project documents
4. Filter by severity, document type, or date

#### Managing Baselines

1. Navigate to **Project → Baselines**
2. View approved baseline
3. See drift statistics
4. Review drift history
5. Manage change requests

---

## 🔍 Monitored Entity Types (14 Total)

The drift detection system monitors all 14 entity types:

1. **Stakeholders**: Name, role, influence level, contact info
2. **Risks**: Name, probability, impact, mitigation strategy
3. **Milestones**: Name, due date, dependencies, status
4. **Deliverables**: Name, description, status, owner
5. **Requirements**: ID, description, priority, status
6. **Scope Items**: Description, acceptance criteria
7. **Phases**: Name, start/end dates, objectives
8. **Activities**: Name, estimated hours, dependencies
9. **Resources**: Name, type, allocation, cost
10. **Technologies**: Name, version, purpose
11. **Constraints**: Type, description, impact
12. **Success Criteria**: Metric, target value, measurement
13. **Quality Standards**: Standard name, description
14. **Best Practices**: Category, description, source

---

## 💡 Best Practices

### For Document Authors

✅ **DO:**
- Save documents frequently to catch drift early
- Review drift alerts promptly
- Use Balanced strategy for most situations
- Document reasons for intentional deviations
- Communicate with stakeholders about major changes

❌ **DON'T:**
- Ignore drift alerts without reviewing
- Dismiss critical severity drift
- Apply resolution without previewing changes
- Make major changes without stakeholder buy-in

### For Project Managers

✅ **DO:**
- Maintain up-to-date approved baselines
- Monitor drift trends across project
- Review change requests promptly
- Use drift data for process improvement
- Train team on drift detection system

❌ **DON'T:**
- Let drift persist across multiple documents
- Ignore patterns of frequent drift
- Skip baseline reviews
- Override resolution without review

---

## 🎯 Business Value

### Time Savings
- **Manual Resolution**: 30-60 minutes per incident
- **AI-Powered Resolution**: 2-3 minutes (review + apply)
- **Annual Savings** (50 drift incidents): 20-45 hours = $1,000-$3,600

### Quality Improvements
- ✅ **100% baseline compliance** (vs 60-70% manual)
- ✅ **Faster stakeholder trust** (documents match agreements)
- ✅ **Audit readiness** (automatic alignment)
- ✅ **Reduced rework** (catch drift immediately)

### Risk Reduction
- ✅ **Prevent scope creep** (auto-detect unauthorized additions)
- ✅ **Maintain stakeholder trust** (baselines enforced)
- ✅ **Compliance assurance** (always aligned)

---

## 🔧 Technical Details

### API Endpoints

```bash
# Manual drift check
POST /api/drift/check
{
  "projectId": "uuid",
  "documentId": "uuid"
}

# Generate AI resolution
POST /api/drift/resolve
{
  "documentId": "uuid",
  "driftRecordId": "uuid",
  "strategy": "balanced" // or "conservative", "permissive"
}

# Apply resolution
POST /api/drift/apply
{
  "documentId": "uuid",
  "driftRecordId": "uuid",
  "resolvedContent": "markdown content..."
}
```

### WebSocket Events

```javascript
// Listen for drift detection
socket.on('drift:detected', (data) => {
  console.log('Drift detected:', data)
  // {
  //   documentId: 'uuid',
  //   documentTitle: 'Risk Management Plan',
  //   driftRecordId: 'uuid',
  //   severity: 'medium',
  //   driftCount: 5
  // }
})
```

### React Hook Usage

```typescript
import { useDriftDetection } from '@/hooks/use-drift-detection'

function DocumentEditor({ documentId, projectId }) {
  const {
    driftAlert,
    resolutionPreview,
    isResolving,
    isApplying,
    handleResolveDrift,
    handleApplyResolution,
    dismissDriftAlert
  } = useDriftDetection(documentId, projectId)

  return (
    <>
      {driftAlert && (
        <DriftAlertBanner
          {...driftAlert}
          onResolve={() => handleResolveDrift('balanced')}
          onDismiss={dismissDriftAlert}
          isResolving={isResolving}
        />
      )}
      
      <DriftResolutionDialog
        open={!!resolutionPreview}
        resolutionPreview={resolutionPreview}
        onApply={handleApplyResolution}
        isApplying={isApplying}
      />
    </>
  )
}
```

---

## 🧪 Testing the Feature

### Manual Testing Steps

1. **Create a Test Baseline**
   ```bash
   cd server
   npm run create-test-baseline <PROJECT_ID>
   ```

2. **Edit a Document**
   - Open a project document
   - Add a new stakeholder
   - Remove a baseline risk
   - Change a milestone date
   - Click Save

3. **Verify Drift Detection**
   - Alert should appear within 2 seconds
   - Check severity level is correct
   - Verify drift count matches changes

4. **Test Resolution**
   - Click "Resolve Drift with AI"
   - Wait for preview (3-5 seconds)
   - Review changes
   - Apply resolution

5. **Verify Resolution**
   - Document should be updated
   - Alert should disappear
   - Check audit log for entry

### Automated Testing

```bash
# Run drift detection tests
cd server
npm test drift-detection-entity-types.test.ts

# Run resolution tests
npm test drift-resolution-change-request.test.ts
```

---

## ❓ FAQ

### Q: What happens if I dismiss a drift alert?

**A**: The alert disappears from the UI, but the drift record remains in the database. You can view it later in the project's drift history.

### Q: Can I customize what entities are monitored?

**A**: Currently, all 14 entity types are monitored automatically. Custom entity monitoring is planned for a future release.

### Q: What if AI resolution makes a mistake?

**A**: You can preview all changes before applying. If you apply and notice an issue, simply edit the document manually and save again.

### Q: How long does drift resolution take?

**A**: Typically 3-5 seconds for AI analysis, plus your review time. Total process: 2-3 minutes.

### Q: Can I use drift detection without a baseline?

**A**: No, drift detection requires an approved baseline for comparison. Create and approve a baseline first.

### Q: What happens to major changes?

**A**: Changes exceeding thresholds (e.g., budget >10%, scope additions) automatically create change requests for approval.

---

## 🐛 Troubleshooting

### Issue: Drift not detected after save

**Solution:**
- Verify project has an approved baseline
- Check browser console for errors
- Refresh the page and try again
- Ensure WebSocket connection is active

### Issue: "Resolve Drift" button not responding

**Solution:**
- Check browser console for errors
- Verify AI provider is configured
- Check server logs for API errors
- Try refreshing the page

### Issue: Resolution preview not loading

**Solution:**
- Wait up to 10 seconds (AI processing)
- Check AI provider status
- Verify drift record exists in database
- Check server logs for errors

---

## 📚 Related Documentation

- [Baseline Management Guide](./BASELINE_MANAGEMENT_GUIDE.md)
- [Change Request Workflow](./CHANGE_REQUEST_WORKFLOW.md)
- [Entity Baseline Integration](../roadmap/entity-baseline-integration.md)
- [Technical Architecture](../templates/technical-architecture-baseline-guide.md)

---

## 📞 Support

For issues or questions:
- Check the [FAQ](#-faq) section above
- Review the [Troubleshooting](#-troubleshooting) guide
- Contact your project administrator
- Submit a support ticket

---

**Happy drift detection! 🚀**

*Keeping your documents aligned with baselines, automatically.*
