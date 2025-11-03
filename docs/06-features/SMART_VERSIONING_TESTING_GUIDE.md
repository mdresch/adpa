# Smart Document Versioning - Testing Guide

**Date**: October 31, 2025  
**Status**: ✅ **READY FOR TESTING**  
**Integration**: ✅ Complete  

---

## 🎯 What to Test

The Smart Document Versioning feature prevents duplicate documents by detecting when a template is reused and offering intelligent resolution options.

---

## 🧪 Test Scenarios

### Test 1: First-Time Document Generation (No Conflict)

**Steps**:
1. Navigate to a project page
2. Click "Generate Document"
3. Select a template that hasn't been used yet (e.g., "Risk Management Plan")
4. Fill in document name: "Risk Management Plan"
5. Click "Generate" or submit form

**Expected Result**:
- ✅ Document generates successfully
- ✅ Shows v1.0.0 in document metadata
- ✅ No conflict dialog appears
- ✅ Document appears in library
- ✅ Success toast: "Document created successfully!"

---

### Test 2: Template Reuse (Conflict Detection)

**Steps**:
1. Navigate to same project
2. Click "Generate Document" again
3. Select the SAME template you used in Test 1
4. Fill in document name (can be different)
5. Click "Generate"

**Expected Result**:
- ✅ Conflict dialog appears
- ✅ Dialog shows existing document info:
  - Document name
  - Current version (v1.0.0)
  - Last updated date
- ✅ Three options displayed:
  - 🟦 Create New Version (v1.1.0) - Recommended
  - ➕ Create Separate Document
  - 👁️ View Existing Document
- ✅ "Create New Version" is pre-selected
- ✅ Each option has clear description

---

### Test 3: Create New Version (Recommended Path)

**Starting from Test 2 conflict dialog**:

**Steps**:
1. Ensure "Create New Version" is selected
2. Click "Continue"
3. Wait for generation to complete

**Expected Result**:
- ✅ Dialog closes
- ✅ Document updates to new version
- ✅ Success toast: "Document updated to v1.1.0"
- ✅ Toast description: "Version history preserved"
- ✅ Navigates to document viewer
- ✅ Document shows v1.1.0
- ✅ New AI-generated content visible
- ✅ No duplicate document created

**Verification**:
- Go back to project documents list
- Only ONE document from that template exists
- Document shows latest version (v1.1.0)

---

### Test 4: Baseline Drift Detection

**Setup**:
1. Create and baseline a document (v1.0.0)
2. Try to regenerate from same template

**Steps**:
1. Generate document → v1.0.0
2. Go to Baseline tab
3. Create baseline for the document
4. Approve baseline
5. Return to Documents tab
6. Click "Generate Document"
7. Select same template
8. Conflict dialog appears

**Expected Result in Dialog**:
- ✅ Shows "Last Baselined: v1.0.0 (date)"
- ✅ ⚠️ Warning text: "Will trigger drift detection (document is baselined)"

**Steps (continued)**:
9. Select "Create New Version"
10. Click "Continue"

**Expected Result**:
- ✅ Document updates to v1.1.0
- ✅ Success toast: "Document updated to v1.1.0"
- ✅ Toast description: "⚠️ Baseline drift detected - review changes"
- ✅ Drift detection system activated (check baseline page)

---

### Test 5: Create Separate Document

**Starting from conflict dialog**:

**Steps**:
1. Trigger conflict (regenerate same template)
2. Select "Create Separate Document" option
3. Click "Continue"

**Expected Result**:
- ✅ New document created
- ✅ Name: "[Original Name] (Alternative)"
- ✅ Version: v1.0.0 (independent version)
- ✅ Success toast: "Separate document created successfully!"
- ✅ Both documents now exist in library:
  - Original document (v1.0.0 or v1.1.0)
  - New alternative document (v1.0.0)
- ✅ No baseline linkage for new document

**Use Case**: Creating alternative scenarios or "what-if" analysis

---

### Test 6: View Existing Document

**Starting from conflict dialog**:

**Steps**:
1. Trigger conflict (regenerate same template)
2. Select "View Existing Document" option
3. Click "Continue"

**Expected Result**:
- ✅ Dialog closes
- ✅ Navigates to document viewer
- ✅ Shows existing document (not creating new one)
- ✅ User can review document before deciding to regenerate
- ✅ No new document created
- ✅ No version change

**Use Case**: User wants to review existing document before regenerating

---

### Test 7: Multiple Regenerations (Version Increment)

**Steps**:
1. Generate document → v1.0.0
2. Regenerate as new version → v1.1.0
3. Regenerate as new version again → v1.2.0
4. Regenerate as new version again → v1.3.0

**Expected Result**:
- ✅ Each regeneration increments minor version
- ✅ Pattern: 1.0.0 → 1.1.0 → 1.2.0 → 1.3.0
- ✅ Version history preserved in database
- ✅ Only ONE document exists (not 4 documents)
- ✅ Each update logged in audit trail

---

### Test 8: Cancel Conflict Dialog

**Steps**:
1. Trigger conflict (regenerate same template)
2. Conflict dialog appears
3. Click "Cancel" button

**Expected Result**:
- ✅ Dialog closes
- ✅ No document created or updated
- ✅ No error messages
- ✅ User returned to project page
- ✅ Generate Document dialog still open (or can reopen)

---

### Test 9: Keyboard Navigation

**Steps**:
1. Trigger conflict dialog
2. Use Tab key to navigate between options
3. Use Space or Enter to select option
4. Use Esc to close dialog

**Expected Result**:
- ✅ Tab moves focus between radio buttons and Continue/Cancel
- ✅ Space/Enter selects focused option
- ✅ Esc closes dialog
- ✅ Visual focus indicators visible
- ✅ Accessible for keyboard-only users

---

### Test 10: Mobile Responsiveness

**Steps**:
1. Open project page on mobile device or resize browser
2. Trigger conflict dialog
3. Interact with options

**Expected Result**:
- ✅ Dialog fits mobile screen
- ✅ Text is readable
- ✅ Options are tappable
- ✅ No horizontal scrolling required
- ✅ Buttons accessible

---

## 🔍 Verification Checklist

After each test, verify:

- [ ] No console errors
- [ ] No duplicate documents created (unless "Separate" chosen)
- [ ] Version numbers increment correctly
- [ ] Audit logs created in database
- [ ] Version history saved in `document_versions` table
- [ ] UI updates correctly after actions
- [ ] Toast notifications are clear and helpful
- [ ] Navigation works as expected

---

## 🗄️ Database Verification

### Check Version History

```sql
-- View all versions of a document
SELECT 
  dv.version,
  dv.semantic_version,
  dv.created_at,
  u.name as created_by_name,
  LENGTH(dv.content::text) as content_length
FROM document_versions dv
LEFT JOIN users u ON dv.created_by = u.id
WHERE dv.document_id = 'DOCUMENT_ID_HERE'
ORDER BY dv.created_at DESC;
```

**Expected**: Each regeneration as "new version" creates a row

---

### Check Audit Logs

```sql
-- View version creation audit logs
SELECT 
  al.action,
  al.created_at,
  al.details->>'previous_version' as previous_version,
  al.details->>'new_version' as new_version,
  al.details->>'generated_by' as generated_by,
  u.name as user_name
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.resource_id = 'DOCUMENT_ID_HERE'
  AND al.action = 'document_version_created'
ORDER BY al.created_at DESC;
```

**Expected**: Log entry for each version creation

---

## 🐛 Known Issues & Edge Cases

### Edge Case 1: Concurrent Generation
**Scenario**: Two users try to regenerate same document simultaneously

**Current Behavior**: Last-write-wins  
**Expected Enhancement**: Optimistic locking (future)

---

### Edge Case 2: Template Deleted
**Scenario**: User tries to regenerate from a deleted template

**Current Behavior**: Should handle gracefully  
**Expected**: Error message "Template no longer available"

---

### Edge Case 3: No Template Selected
**Scenario**: User generates without a template

**Current Behavior**: Validation prevents this  
**Expected**: No conflict detection (template is optional)

---

## 📊 Success Criteria

The feature is working correctly if:

- ✅ Conflict detection triggers when template reused
- ✅ Dialog shows correct existing document info
- ✅ All 3 resolution options work
- ✅ Versions increment correctly (1.0 → 1.1 → 1.2)
- ✅ Baseline drift detection works
- ✅ No duplicate documents (unless user chooses "Separate")
- ✅ Version history preserved in database
- ✅ Audit trail complete
- ✅ UI is responsive and accessible
- ✅ Error handling is graceful

---

## 🚀 Performance Testing

### Response Times

Test and verify:
- Conflict detection check: < 200ms
- New version generation: 15-30s (AI generation time)
- Dialog open/close: < 100ms (instant feel)

### Load Testing

- [ ] Test with 10 documents from same template
- [ ] Test with 100 documents in project library
- [ ] Verify conflict detection doesn't slow down generation

---

## 📝 Manual Testing Checklist

### Functional Tests
- [ ] Test 1: First-time generation (no conflict)
- [ ] Test 2: Template reuse (conflict detected)
- [ ] Test 3: Create new version
- [ ] Test 4: Baseline drift detection
- [ ] Test 5: Create separate document
- [ ] Test 6: View existing document
- [ ] Test 7: Multiple regenerations (v1.0 → v1.3)
- [ ] Test 8: Cancel conflict dialog
- [ ] Test 9: Keyboard navigation
- [ ] Test 10: Mobile responsiveness

### Edge Cases
- [ ] Generate without template (no conflict)
- [ ] Deleted document from same template (should create new v1.0.0)
- [ ] Multiple users regenerating same document
- [ ] Network error during conflict resolution

### Database Verification
- [ ] Version history table populated
- [ ] Audit logs created
- [ ] Semantic versions increment correctly
- [ ] No duplicate documents in DB

---

## 🎯 User Acceptance Criteria

Ask users to verify:
- [ ] "Is it clear what each option does?"
- [ ] "Is the recommended option obvious?"
- [ ] "Does the baseline warning make sense?"
- [ ] "Is the dialog easy to use?"
- [ ] "Does this solve the duplicate document problem?"

---

## 📸 Screenshots to Capture

For documentation:
1. Conflict dialog with all 3 options
2. Baseline warning displayed
3. Success toast after new version
4. Drift detection toast
5. Document library showing single versioned document
6. Version history in document viewer (future)

---

## ✅ Testing Complete When...

- [ ] All 10 test scenarios pass
- [ ] Database verification shows correct data
- [ ] No console errors
- [ ] User feedback is positive
- [ ] Performance is acceptable
- [ ] Mobile works well
- [ ] Keyboard navigation works
- [ ] Screenshots captured

---

## 🐞 Bug Reporting Template

If you find issues:

```markdown
**Bug**: [Brief description]
**Test Case**: Test #[number]
**Steps to Reproduce**:
1. 
2. 
3. 

**Expected**: [What should happen]
**Actual**: [What actually happened]
**Console Errors**: [Any errors]
**Screenshots**: [If applicable]
```

---

## 🎉 Next Steps After Testing

1. ✅ All tests pass → Deploy to production
2. ❌ Issues found → Fix and retest
3. 📝 Document any gotchas or tips
4. 📣 Announce feature to users
5. 📊 Monitor usage and feedback

---

**Ready to test!** Start with Test 1 and work through all scenarios. Good luck! 🚀

