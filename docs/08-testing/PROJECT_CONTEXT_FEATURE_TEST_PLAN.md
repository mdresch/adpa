# Project Context Feature - UI Test Plan

## Overview
This document provides a comprehensive test plan for the new Project Context feature, which allows users to add reference materials (documents, URLs, custom text, and integration pages) that inform AI document generation.

## Prerequisites
1. Database migration 666 has been run successfully
2. Backend server is running (`npm run dev` in `server/` directory)
3. Frontend is running (`npm run dev` in root directory)
4. User is authenticated and has access to at least one project
5. (Optional) Jira and/or Confluence integrations are configured if testing integration pages

## Test Environment Setup
- **Frontend URL**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Test Project**: Use an existing project or create a new one

---

## Test Suite 1: Access and Navigation

### Test 1.1: Verify Project Context Tab Exists
**Steps:**
1. Navigate to a project overview page: `http://localhost:3000/projects/{project-id}`
2. Look for the "Project Context" tab in the tab list
3. Click on the "Project Context" tab

**Expected Results:**
- ✅ Tab is visible with a FileText icon
- ✅ Tab is positioned after "Documents" tab
- ✅ Clicking the tab loads the Project Context interface
- ✅ Info banner is displayed explaining the separation from Documents tab

**Screenshot Areas:**
- Tab navigation bar
- Info banner content

---

## Test Suite 2: Reference Document Upload

### Test 2.1: Upload PDF Reference Document
**Steps:**
1. Click "Add Context" button
2. Ensure "Reference Doc" tab is selected (default)
3. (Optional) Enter a title: "Test PDF Reference"
4. Click "Choose File" and select a PDF file (max 10MB)
5. Click "Upload Reference Document"
6. Wait for upload to complete

**Expected Results:**
- ✅ File input accepts PDF files
- ✅ Upload progress indicator shows
- ✅ Success toast message appears
- ✅ Dialog closes automatically
- ✅ New context item appears in the list view
- ✅ Item shows type badge "Reference Doc"
- ✅ Item shows the uploaded filename or custom title

**Test Files Needed:**
- Sample PDF file (test with various sizes: <1MB, ~5MB, ~10MB)

### Test 2.2: Upload DOCX Reference Document
**Steps:**
1. Repeat Test 2.1 but use a DOCX file instead
2. Verify content is converted to Markdown

**Expected Results:**
- ✅ DOCX file is accepted
- ✅ Content is converted to Markdown
- ✅ Preview shows readable Markdown content

### Test 2.3: Upload Markdown Reference Document
**Steps:**
1. Repeat Test 2.1 but use a `.md` or `.markdown` file
2. Click preview on the uploaded item

**Expected Results:**
- ✅ Markdown file is accepted
- ✅ Content is preserved as-is
- ✅ Preview shows formatted Markdown

### Test 2.4: File Validation Errors
**Steps:**
1. Try uploading a file > 10MB
2. Try uploading an unsupported file type (e.g., `.exe`, `.zip`)

**Expected Results:**
- ✅ Error message for oversized file
- ✅ Error message for unsupported file type
- ✅ Upload is prevented

---

## Test Suite 3: URL Content Fetching

### Test 3.1: Fetch and Add URL Content
**Steps:**
1. Click "Add Context" button
2. Click "URL" tab
3. Enter a valid public URL (e.g., `https://example.com` or a documentation site)
4. Click "Fetch" button
5. Wait for content to be fetched
6. Review the preview
7. Click "Add URL as Context"

**Expected Results:**
- ✅ URL input accepts valid URLs
- ✅ Fetch button shows loading state
- ✅ Preview card appears with:
  - Page title
  - Word count badge
  - Content preview (first 200 chars)
- ✅ Success toast on add
- ✅ New context item appears with type "URL"
- ✅ Source URL is stored and displayed

**Test URLs:**
- Simple HTML page: `https://example.com`
- Documentation site: `https://docs.github.com` (or similar)
- Article/blog post

### Test 3.2: URL Validation
**Steps:**
1. Try entering invalid URLs:
   - `not-a-url`
   - `ftp://example.com`
   - `http://localhost:3000`
   - `http://192.168.1.1`

**Expected Results:**
- ✅ Error messages for invalid URLs
- ✅ Private/localhost URLs are rejected
- ✅ Only HTTP/HTTPS URLs are accepted

### Test 3.3: URL Fetch Errors
**Steps:**
1. Try fetching a non-existent URL: `https://this-does-not-exist-12345.com`
2. Try fetching a URL that requires authentication
3. Try fetching a URL that times out

**Expected Results:**
- ✅ Appropriate error messages displayed
- ✅ User can retry or cancel
- ✅ No crash or infinite loading

---

## Test Suite 4: Custom Text Context

### Test 4.1: Add Custom Text Context
**Steps:**
1. Click "Add Context" button
2. Click "Custom Text" tab
3. Enter title: "Project Requirements Notes"
4. Enter content in Markdown format:
   ```markdown
   # Key Requirements
   - Requirement 1
   - Requirement 2
   
   ## Notes
   Important information here.
   ```
5. Click "Add Custom Context"

**Expected Results:**
- ✅ Title and content fields are required
- ✅ Markdown formatting is preserved
- ✅ Success toast appears
- ✅ New context item appears with type "Custom"
- ✅ Preview shows formatted Markdown

### Test 4.2: Custom Text Validation
**Steps:**
1. Try submitting with empty title
2. Try submitting with empty content
3. Try submitting with very long content (>10,000 words)

**Expected Results:**
- ✅ Validation errors for empty fields
- ✅ Submit button is disabled until valid
- ✅ Large content is accepted (no arbitrary limits)

---

## Test Suite 5: Integration Pages (Jira/Confluence)

### Test 5.1: Search and Add Confluence Pages
**Prerequisites:** Confluence integration must be configured

**Steps:**
1. Click "Add Context" button
2. Click "Integration" tab
3. Select "Confluence" from dropdown
4. Enter search query (e.g., "project requirements")
5. Click search icon
6. Wait for results
7. Select one or more pages using checkboxes
8. Click "Add X Selected Page(s)"

**Expected Results:**
- ✅ Integration dropdown shows available integrations
- ✅ Search input is enabled when integration selected
- ✅ Search results appear in scrollable list
- ✅ Each result shows:
  - Checkbox
  - Page title
  - URL
- ✅ Multiple pages can be selected
- ✅ Success toast shows count of added pages
- ✅ New context items appear with type "Confluence"

### Test 5.2: Search and Add Jira Pages
**Prerequisites:** Jira integration must be configured

**Steps:**
1. Repeat Test 5.1 but select "Jira" instead
2. Search for Jira issues (e.g., "bug fix" or issue key)

**Expected Results:**
- ✅ Jira issues appear in search results
- ✅ Issues show title and URL
- ✅ Multiple issues can be selected
- ✅ New context items appear with type "Jira"

### Test 5.3: Integration Not Available
**Steps:**
1. If no integrations are configured, try to use Integration tab

**Expected Results:**
- ✅ Appropriate message if integration not available
- ✅ UI handles gracefully (no errors)

---

## Test Suite 6: Context Item Management

### Test 6.1: View Context Items List
**Steps:**
1. Navigate to Project Context tab
2. Ensure "List View" is selected (default)

**Expected Results:**
- ✅ Table shows all context items
- ✅ Columns: Checkbox, Type, Title, Priority, Status, Created, Actions
- ✅ Type badges are color-coded
- ✅ Empty state shows if no items exist

### Test 6.2: Toggle Context Item Active/Inactive
**Steps:**
1. Find a context item in the list
2. Toggle the switch in the "Status" column
3. Refresh the page

**Expected Results:**
- ✅ Switch toggles immediately
- ✅ Icon updates (CheckCircle2 / XCircle)
- ✅ State persists after refresh
- ✅ Inactive items are still visible but marked

### Test 6.3: Preview Context Item
**Steps:**
1. Click on a context item title or use Actions menu → Preview
2. Review the preview dialog

**Expected Results:**
- ✅ Dialog opens with full content
- ✅ Title and type badge displayed
- ✅ Source URL link works (if applicable)
- ✅ Content is formatted/readable
- ✅ Dialog can be closed

### Test 6.4: Delete Context Item
**Steps:**
1. Use Actions menu → Delete
2. Confirm deletion in browser prompt

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Item is removed from list after confirmation
- ✅ Success toast appears
- ✅ Analytics update (if dashboard view)

### Test 6.5: Bulk Selection
**Steps:**
1. Select individual checkboxes
2. Select "Select All" checkbox in header

**Expected Results:**
- ✅ Individual items can be selected
- ✅ Select All selects all items
- ✅ Deselecting Select All deselects all
- ✅ Selection state is maintained

---

## Test Suite 7: Dashboard View

### Test 7.1: Switch to Dashboard View
**Steps:**
1. Click "Dashboard" button in header
2. Review dashboard cards

**Expected Results:**
- ✅ View switches to dashboard
- ✅ Overview cards show:
  - Total Items
  - Reference Docs count
  - URLs count
  - Content Size
- ✅ Cards have icons and proper formatting

### Test 7.2: Most Frequently Used Section
**Steps:**
1. Ensure some context items have been used (via document generation)
2. View "Most Frequently Used" card

**Expected Results:**
- ✅ Shows top 5 most used items
- ✅ Each item shows:
  - Type icon
  - Title
  - Usage count badge
- ✅ Items are sorted by usage count

### Test 7.3: Recommendations Section
**Steps:**
1. View "Recommendations" card
2. Review recommendation items

**Expected Results:**
- ✅ Recommendations appear if patterns detected
- ✅ Each recommendation shows:
  - Title
  - Message/description
  - Priority badge (high/medium/low)
- ✅ Recommendations are actionable

---

## Test Suite 8: Context Usage in Document Generation

### Test 8.1: Generate Document with Context
**Steps:**
1. Add at least one context item (any type)
2. Navigate to Documents tab
3. Create a new document or regenerate existing
4. During generation, verify context is included
5. Review generated document

**Expected Results:**
- ✅ Document generation includes context items
- ✅ Generated content references or uses context information
- ✅ Context usage is logged (check analytics)
- ✅ No errors during generation

### Test 8.2: Verify Context Usage Logging
**Steps:**
1. Generate a document that uses context
2. Navigate back to Project Context tab
3. Switch to Dashboard view
4. Check "Most Frequently Used" section

**Expected Results:**
- ✅ Context items used in generation appear in "Most Used"
- ✅ Usage counts increment
- ✅ Analytics reflect recent usage

### Test 8.3: Inactive Context Items Not Used
**Steps:**
1. Add a context item
2. Toggle it to inactive
3. Generate a document
4. Verify inactive item is NOT included

**Expected Results:**
- ✅ Inactive context items are excluded from generation
- ✅ Only active items are used
- ✅ No errors occur

---

## Test Suite 9: Analytics and Recommendations

### Test 9.1: View Analytics
**Steps:**
1. Add multiple context items of different types
2. Use some items in document generation
3. View Dashboard → Analytics section

**Expected Results:**
- ✅ Total items count is accurate
- ✅ Items by type breakdown is correct
- ✅ Active items count matches
- ✅ Content size is calculated
- ✅ Usage statistics are accurate

### Test 9.2: Recommendations Appear
**Steps:**
1. Add the same context item to multiple projects (if possible)
2. Use items across projects
3. View Recommendations section

**Expected Results:**
- ✅ Recommendations appear for frequently used items
- ✅ Template suggestions appear for patterns
- ✅ Priority levels are appropriate
- ✅ Recommendations are relevant

---

## Test Suite 10: Edge Cases and Error Handling

### Test 10.1: Network Errors
**Steps:**
1. Disconnect network
2. Try to fetch URL
3. Try to search integration pages

**Expected Results:**
- ✅ Appropriate error messages
- ✅ No crashes
- ✅ User can retry

### Test 10.2: Large Content
**Steps:**
1. Upload a large document (close to 10MB)
2. Add a URL with very long content
3. Add custom text with 10,000+ words

**Expected Results:**
- ✅ Large files are handled
- ✅ Content is truncated appropriately in previews
- ✅ Full content is stored and available

### Test 10.3: Special Characters
**Steps:**
1. Add custom text with special characters: `!@#$%^&*()`
2. Add URL with query parameters
3. Add context with emojis and unicode

**Expected Results:**
- ✅ Special characters are preserved
- ✅ No encoding issues
- ✅ Content displays correctly

### Test 10.4: Concurrent Operations
**Steps:**
1. Open Project Context tab in multiple browser tabs
2. Add context in one tab
3. Verify updates in other tabs

**Expected Results:**
- ✅ Changes are reflected (may require refresh)
- ✅ No conflicts or errors

---

## Test Suite 11: Performance

### Test 11.1: Load Time with Many Items
**Steps:**
1. Add 50+ context items
2. Navigate to Project Context tab
3. Measure load time

**Expected Results:**
- ✅ Page loads within 2-3 seconds
- ✅ List renders efficiently
- ✅ No UI freezing

### Test 11.2: Search Performance
**Steps:**
1. With many items, use browser search (Ctrl+F)
2. Filter by type (if implemented)

**Expected Results:**
- ✅ Search is responsive
- ✅ Filtering works quickly

---

## Test Suite 12: Integration with Other Features

### Test 12.1: Project Deletion
**Steps:**
1. Add context items to a project
2. Delete the project
3. Verify context items are deleted (CASCADE)

**Expected Results:**
- ✅ Context items are deleted with project
- ✅ No orphaned records
- ✅ Usage logs are cleaned up

### Test 12.2: User Permissions
**Steps:**
1. Test with different user roles
2. Verify access controls

**Expected Results:**
- ✅ Permissions are enforced
- ✅ Users can only see/modify their own project contexts

---

## Test Checklist Summary

- [ ] Tab appears and is accessible
- [ ] Reference document upload (PDF, DOCX, MD)
- [ ] URL fetching and conversion
- [ ] Custom text input
- [ ] Integration pages (Jira/Confluence)
- [ ] List view displays correctly
- [ ] Dashboard view shows analytics
- [ ] Toggle active/inactive
- [ ] Preview functionality
- [ ] Delete functionality
- [ ] Context used in document generation
- [ ] Usage logging works
- [ ] Recommendations appear
- [ ] Error handling works
- [ ] Performance is acceptable

---

## Known Issues / Limitations

1. **Integration Pages**: Requires active Jira/Confluence integrations
2. **URL Fetching**: Some sites may block automated requests
3. **Large Files**: 10MB limit for reference documents
4. **Concurrent Updates**: May require page refresh to see changes from other sessions

---

## Reporting Issues

When reporting issues, please include:
- Test case number
- Steps to reproduce
- Expected vs. actual behavior
- Browser and version
- Screenshots if applicable
- Console errors (F12 → Console)

---

## Success Criteria

The feature is considered working if:
- ✅ All core functionality tests pass (Suites 1-6)
- ✅ Document generation integration works (Suite 8)
- ✅ No critical errors or crashes
- ✅ Performance is acceptable (<3s load time)
- ✅ Error handling is graceful

---

**Last Updated**: 2026-01-26
**Feature Version**: 1.0.0
**Tested By**: [Your Name]
**Date Tested**: [Date]
