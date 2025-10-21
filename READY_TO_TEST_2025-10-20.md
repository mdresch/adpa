# Ready to Test - October 20, 2025

## Summary of Completed Features

We've implemented 3 major features today that are ready for testing:

1. ✅ **AI Page: Save to Existing Project** - Generate documents and save to existing projects
2. ✅ **Baseline Extraction for ADPA** - Complete baseline with quality audit
3. ✅ **Feedback System Database** - Schema ready for feedback collection

---

## Test Priority Order

### 🔥 PRIORITY 1: AI Page - Save to Existing Project

**Why Test First**: This is brand new functionality that changes how documents are created.

**Testing Steps**:

1. **Navigate to AI Page**
   - Go to: `http://localhost:3000/ai`
   - Verify page loads without errors

2. **Verify Project Dropdown Exists**
   - Scroll to "Save Generated Document To" section
   - Should see 2 radio buttons:
     - ⚪ Create New Project (default)
     - ⚪ Save to Existing Project
   - Click "Save to Existing Project"
   - **Expected**: Dropdown appears with your projects

3. **Check Project List**
   - Open the project dropdown
   - **Expected**: Shows all your projects
   - **Expected**: Each project shows: Name + "X documents"
   - Example: "ADPA Platform (10 documents)"

4. **Select a Project**
   - Choose "ADPA Platform" from dropdown
   - **Expected**: Blue confirmation box appears
   - **Expected**: Says "Document will be saved to: ADPA Platform"
   - **Expected**: Says "AI will include project context for better results"

5. **Generate Content with Context**
   - Select AI Provider: Google
   - Select Template: "Change Request"
   - Enter Prompt: "Add email notification feature to document feedback system"
   - Verify project is still selected (ADPA Platform)
   - Click "Generate Content"
   - **Expected**: Content generates successfully
   - **Expected**: Content should reference existing ADPA documents
   - Look for mentions of: "Requirements Analysis", "Scope Management Plan", etc.

6. **Save to Project**
   - After generation completes
   - Button should say "Save to Project" (not "Create Project")
   - Click "Save to Project"
   - **Expected**: Success toast: "Document saved to project: ADPA Platform"
   - **Expected**: Redirect to ADPA project page
   - **Expected**: Documents tab is active
   - **Expected**: New document appears: "Change Request - 10/20/2025"

7. **Verify Document Saved**
   - Check document library
   - Find the new Change Request
   - Click to open it
   - **Expected**: Content matches what was generated
   - **Expected**: Metadata shows AI generation info

**Test Results**:
- [ ] Project dropdown appears ✓/✗
- [ ] Projects list loads ✓/✗
- [ ] Project selection works ✓/✗
- [ ] Context enhancement works ✓/✗
- [ ] Document generation works ✓/✗
- [ ] Save to project works ✓/✗
- [ ] Redirect works ✓/✗
- [ ] Document appears in library ✓/✗

---

### 🔥 PRIORITY 2: Baseline Review for ADPA Project

**Why Test**: Baseline was just extracted, needs review and approval.

**Testing Steps**:

1. **Navigate to ADPA Project**
   - Go to: `http://localhost:3000/projects/45083436-7e90-4ecf-aa42-e4a73c4b64b7`
   - Or find ADPA in your project list

2. **Open Baseline Tab**
   - Click "Baseline" tab
   - **Expected**: Baseline card appears
   - **Expected**: Shows Version 1.0, Status: Draft

3. **Click "View Details"**
   - **Expected**: Dialog opens with full baseline data
   - **Expected**: 6 Completeness Cards at top:
     - Scope (blue) - Should show % and checkmark
     - Technical (green) - Should show % and checkmark
     - Schedule (yellow) - Should show % and checkmark
     - Cost (orange) - May be incomplete
     - Resource (purple) - May be incomplete
     - Success Criteria (emerald) - Should show % and checkmark

4. **Review Quality Audit**
   - Scroll to "Quality Audit" section
   - **Expected**: Shows Overall Quality Score: 32
   - **Expected**: Shows Feasibility Score: 72.5%
   - **Expected**: Red Flags section with 2 critical issues:
     - Each issue should have:
       - Title
       - Severity badge
       - Description
       - Evidence (bullet points)
       - Required Action
       - Blocking status
   - Read the red flags carefully

5. **Check Timeline Gantt Chart**
   - Scroll to "Timeline Baseline" section
   - **Expected**: Gantt chart renders
   - **Expected**: Shows project milestones
   - **Expected**: Can hover over bars for details

6. **Test Approval Actions**
   - **Option A: Approve Baseline**
     - Click "Approve Baseline"
     - Confirm approval
     - **Expected**: Status changes to "approved"
     - **Expected**: Success toast appears

   - **Option B: Decline & Archive**
     - Click "Decline & Archive"
     - Enter reason: "Red flags need resolution first"
     - **Expected**: Baseline archived
     - **Expected**: Success toast
     - **Expected**: Can view in history

   - **Option C: Rerun Extraction**
     - Click "Rerun with More Documents"
     - **Expected**: Extract dialog opens
     - **Expected**: Current documents pre-selected
     - **Expected**: Can add more documents
     - **Expected**: Info toast about adding docs

**Test Results**:
- [ ] Baseline tab loads ✓/✗
- [ ] View Details dialog works ✓/✗
- [ ] Completeness cards display ✓/✗
- [ ] Red flags are visible ✓/✗
- [ ] Gantt chart renders ✓/✗
- [ ] Approval workflow works ✓/✗
- [ ] Decline workflow works ✓/✗
- [ ] Rerun workflow works ✓/✗

---

### 📋 PRIORITY 3: Feedback System - Database Only

**Why Test**: Schema created, no UI yet.

**Testing Steps**:

1. **Run Migration**
   ```powershell
   cd D:\source\repos\adpa\server
   psql $env:DATABASE_URL -f migrations/058_create_feedback_system.sql
   ```

2. **Verify Tables Exist**
   ```sql
   psql $env:DATABASE_URL -c "\dt document_feedback feedback_issues feedback_actions feedback_analytics template_effectiveness feedback_notifications"
   ```

3. **Check Views**
   ```sql
   psql $env:DATABASE_URL -c "\dv v_document_feedback_summary v_active_feedback_issues v_project_feedback_health"
   ```

**Test Results**:
- [ ] Migration runs successfully ✓/✗
- [ ] Tables created ✓/✗
- [ ] Views created ✓/✗
- [ ] No SQL errors ✓/✗

**Note**: No UI to test yet - just verify database schema

---

## Common Issues & Solutions

### Issue: "No projects available" in dropdown
**Solution**: Create at least one project first via Projects page

### Issue: "Failed to fetch project context"
**Solution**: Check backend is running: `http://localhost:5000/health`

### Issue: "Failed to save document to project"
**Solutions**:
- Check backend logs: `Get-Content server/logs/combined.log -Tail 20`
- Verify project ID is correct
- Check authentication token is valid

### Issue: Baseline tab shows 404 error
**Solution**: This is expected if no baseline exists yet - create one first

### Issue: Gantt chart not rendering
**Solutions**:
- Check browser console for frappe-gantt errors
- Verify timeline data has valid dates
- Check if milestones array is populated

---

## After Testing

Once you've tested all features, please report:

1. **What worked**  
   - Which features functioned as expected

2. **What didn't work**  
   - Bugs, errors, unexpected behavior
   - Include console errors if any

3. **Usability feedback**  
   - Is the UI intuitive?
   - Any confusing elements?
   - Suggestions for improvement

---

## Files to Review (If Needed)

- `app/ai/page.tsx` - AI page with project selection
- `server/src/routes/projects.ts` - Context and document endpoints
- `server/migrations/058_create_feedback_system.sql` - Feedback database
- `AI_PAGE_SAVE_TO_PROJECT_IMPLEMENTED.md` - Detailed implementation doc
- `docs/06-features/AI_PAGE_SAVE_TO_PROJECT.md` - Feature specification

---

## Ready to Test! 🚀

**Recommended Order**:
1. Test AI Page Save to Project (new feature, most important)
2. Review ADPA Baseline (just completed extraction)
3. Run Feedback System migration (no UI to test yet)

**Estimated Testing Time**: 15-20 minutes

Let me know what you discover! 💪

