# Quick Start: Testing Drift Resolution (TASK-716)

This guide gets you started testing the Automatic Drift Detection & Resolution feature in under 5 minutes.

## Prerequisites

1. ✅ Server running: `cd server && npm run dev`
2. ✅ Frontend running: `pnpm dev` (in root directory)
3. ✅ You have a project in the system (create one via UI if needed)

## Step 1: Get Your Project ID

### Option A: From the Web UI
1. Navigate to http://localhost:3000/projects
2. Click on your project
3. Copy the UUID from the URL bar
   - Example: `http://localhost:3000/projects/123e4567-e89b-12d3-a456-426614174000`
   - Project ID: `123e4567-e89b-12d3-a456-426614174000`

### Option B: From Database
```bash
# Connect to your database and run:
SELECT id, name FROM projects WHERE deleted_at IS NULL LIMIT 5;
```

## Step 2: Create Test Baseline

```bash
# Navigate to server directory
cd server

# Replace <PROJECT_ID> with your actual project ID
npm run create-test-baseline <PROJECT_ID>

# Example:
npm run create-test-baseline 123e4567-e89b-12d3-a456-426614174000
```

**Expected Output:**
```
================================================================================
TEST BASELINE CREATED SUCCESSFULLY
================================================================================

Baseline ID: abc12345-6789-def0-1234-56789abcdef0
Project ID: 123e4567-e89b-12d3-a456-426614174000
Project Name: My Test Project
Version: 1.0
Status: approved

Baseline Components:
  - Stakeholders: 5
  - Risks: 4
  - Milestones: 6
  - Requirements: 5
  ...

Next Steps for Testing Drift Resolution:
1. Edit a project document to modify entities (add/remove/change)
2. Save the document - drift should be detected automatically
3. Use the "Resolve Drift" feature to test AI-powered resolution
4. Verify drift is resolved correctly
================================================================================
```

✅ **Success!** You now have a comprehensive test baseline.

## Step 3: Trigger Drift Detection

### Via Document Editing (Recommended for Manual Testing)

1. **Navigate to a project document**
   - Go to http://localhost:3000/projects/<PROJECT_ID>/documents
   - Open or create a document

2. **Modify the document** to create drift:
   ```markdown
   # Example Changes to Trigger Drift
   
   ## Stakeholders (Add this section if not present)
   - John Smith - Project Sponsor
   - Sarah Chen - Project Manager
   - Mike Johnson - Technical Lead
   - **NEW: Tom Wilson - Senior Developer** ← Added (drift!)
   
   ## Risks (Modify this section)
   - Vendor delivery delay - High probability, High impact
   - Skills gap in AI/ML - Medium probability, High impact
   ~~- Budget constraints~~ ← Removed (drift!)
   
   ## Milestones (Change dates)
   - Requirements Finalized - Feb 1, 2026
   - Architecture Approved - Feb 15, 2026
   - Development Complete - ~~Mar 15~~ **Apr 2, 2026** ← Changed (drift!)
   ```

3. **Save the document**
   - Click "Save" or use Ctrl+S / Cmd+S
   - Wait for save confirmation

4. **Check for drift alert**
   - Should see: ⚠️ "Baseline drift detected: 3 changes"
   - If not visible, refresh the page or check the Drift Detection tab

### Via API (For Automated Testing)

```bash
# Create/update a document with drift
curl -X PUT http://localhost:5000/api/documents/<DOCUMENT_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "content": "# Document with drift\n\n## Stakeholders\n- New Person - Role\n",
    "title": "Test Document"
  }'

# Check for detected drift
curl -X GET http://localhost:5000/api/baselines/project/<PROJECT_ID>/drift \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

## Step 4: Test Drift Resolution

1. **Click "Resolve Drift with AI"** button
   - Should appear in the drift alert banner
   - Or navigate to Drift Detection page

2. **Wait for AI analysis** (3-10 seconds)
   - Loading indicator should appear
   - AI analyzes the drift and prepares resolution

3. **Review the resolution preview**
   - See all detected drift points
   - Review AI-recommended actions
   - Choose resolution strategy:
     - **Balanced** (Recommended): Keeps minor changes, reverts major ones
     - **Conservative**: Reverts all changes to baseline
     - **Permissive**: Keeps most changes

4. **Apply the resolution**
   - Click "Apply Resolution"
   - Document will be updated
   - Drift will be marked as resolved

5. **Verify the result**
   - Document should be updated
   - Drift alert should disappear
   - Check audit logs for resolution record

## Verification

### Check Drift Was Detected
```sql
-- Connect to your database
SELECT 
  detection_type, drift_severity, 
  drift_description, status, created_at
FROM baseline_drift_detection
WHERE project_id = '<PROJECT_ID>'
ORDER BY created_at DESC
LIMIT 5;
```

### Check Drift Was Resolved
```sql
SELECT 
  status, resolved_at, resolution_notes
FROM baseline_drift_detection
WHERE project_id = '<PROJECT_ID>'
  AND status = 'resolved'
ORDER BY created_at DESC
LIMIT 5;
```

### Check Audit Trail
```sql
SELECT 
  action, resource_type, details, created_at
FROM audit_logs
WHERE resource_id = '<DOCUMENT_ID>'
  AND action = 'drift_resolved'
ORDER BY created_at DESC;
```

## Troubleshooting

### ❌ "No active baseline found"
**Solution**: The baseline might not be approved. Check:
```sql
SELECT id, version, status FROM project_baselines WHERE project_id = '<PROJECT_ID>';
```
If status is 'draft', approve it or re-run with auto-approve (default).

### ❌ "Drift not detected after saving"
**Checks**:
1. Is the baseline approved/active? Check status in database
2. Did you actually change entity data (stakeholders, risks, milestones)?
3. Check server logs: `tail -f server/logs/combined.log`
4. Try manually triggering drift check via API

### ❌ "AI resolution fails"
**Checks**:
1. Is AI provider configured? Check `server/.env` for API keys
2. Does the AI provider have quota/credits?
3. Check server logs for AI API errors
4. Try a different AI provider in settings

### ❌ "Resolution doesn't apply"
**Checks**:
1. Do you have permission to edit the document?
2. Is the document locked by another user?
3. Check database transaction errors in logs

## Next Steps

Now that you've successfully tested the basic flow:

1. ✅ Test all 3 resolution strategies (Conservative, Balanced, Permissive)
2. ✅ Test different entity types (requirements, deliverables, constraints)
3. ✅ Test different drift severities (low, medium, high, critical)
4. ✅ Review the [Complete Testing Guide](../../docs/testing/DRIFT_RESOLUTION_TESTING_GUIDE.md)
5. ✅ Run automated tests (when available)
6. ✅ Report any issues or unexpected behavior

## Learn More

- **Detailed Testing Guide**: [docs/testing/DRIFT_RESOLUTION_TESTING_GUIDE.md](../../docs/testing/DRIFT_RESOLUTION_TESTING_GUIDE.md)
- **Feature Specification**: [docs/roadmap/DRIFT_AUTO_RESOLUTION_FEATURE.md](../../docs/roadmap/DRIFT_AUTO_RESOLUTION_FEATURE.md)
- **Change Request**: [docs/roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md](../../docs/roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md)
- **Script Documentation**: [server/scripts/README_CREATE_TEST_BASELINE.md](../../server/scripts/README_CREATE_TEST_BASELINE.md)

---

**Questions?**
- Check the [Drift Resolution Testing Guide](../../docs/testing/DRIFT_RESOLUTION_TESTING_GUIDE.md)
- Review server logs: `server/logs/combined.log`
- Check API documentation: http://localhost:5000/api-docs

---

*Part of TASK-716: Create baseline for drift resolution testing*
*Get testing in under 5 minutes! ⚡*
