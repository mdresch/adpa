# Project Context Feature - Quick Test Script

## 🚀 Quick Start Testing (15 minutes)

### Prerequisites Check
- [ ] Backend running: `cd server && npm run dev`
- [ ] Frontend running: `npm run dev`
- [ ] Database migration 666 applied: `cd server && npm run migrate:666`
- [ ] Authenticated user with project access

---

## ⚡ Quick Test Flow

### 1. Access the Feature (1 min)
```
1. Navigate to: http://localhost:3000/projects/{your-project-id}
2. Click "Project Context" tab
3. ✅ Verify: Tab appears, info banner shows
```

### 2. Upload Reference Document (2 min)
```
1. Click "Add Context" → "Reference Doc" tab
2. Upload a PDF file (any size < 10MB)
3. ✅ Verify: Success message, item appears in list
4. Click item title to preview
5. ✅ Verify: Preview dialog shows content
```

### 3. Add URL Context (2 min)
```
1. Click "Add Context" → "URL" tab
2. Enter: https://example.com
3. Click "Fetch"
4. ✅ Verify: Preview appears with title and content
5. Click "Add URL as Context"
6. ✅ Verify: Item appears with type "URL"
```

### 4. Add Custom Text (2 min)
```
1. Click "Add Context" → "Custom Text" tab
2. Title: "Test Custom Context"
3. Content: "# Test\n\nThis is a test."
4. Click "Add Custom Context"
5. ✅ Verify: Item appears with type "Custom"
```

### 5. Test Dashboard View (2 min)
```
1. Click "Dashboard" button
2. ✅ Verify: Cards show:
   - Total Items: 3
   - Reference Docs: 1
   - URLs: 1
   - Content Size: [number] KB
3. Check "Most Frequently Used" section
4. Check "Recommendations" section
```

### 6. Test Active/Inactive Toggle (1 min)
```
1. Switch back to "List View"
2. Toggle a context item's switch
3. ✅ Verify: Icon changes, state persists
```

### 7. Test Document Generation Integration (3 min)
```
1. Navigate to "Documents" tab
2. Create or regenerate a document
3. In the prompt/context, verify your context items are included
4. Generate document
5. ✅ Verify: Document uses context information
6. Go back to "Project Context" → Dashboard
7. ✅ Verify: Usage counts updated in "Most Used"
```

### 8. Test Delete (1 min)
```
1. Use Actions menu → Delete on a test item
2. Confirm deletion
3. ✅ Verify: Item removed, success message
```

---

## ✅ Success Indicators

If all quick tests pass:
- ✅ Feature is accessible and functional
- ✅ All context types work
- ✅ Dashboard shows data
- ✅ Integration with document generation works
- ✅ Basic CRUD operations work

---

## 🐛 Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Tab not appearing | Check migration 666 ran successfully |
| Upload fails | Check file size < 10MB, file type supported |
| URL fetch fails | Check URL is public, not localhost |
| Integration pages empty | Verify Jira/Confluence integrations configured |
| Dashboard shows 0 | Add some context items first |
| Document generation doesn't use context | Check items are marked as active |

---

## 📝 Test Data Suggestions

**Reference Documents:**
- Sample PDF: Any project document or specification
- Sample DOCX: Word document with formatting
- Sample MD: README.md or any markdown file

**URLs to Test:**
- `https://example.com` - Simple HTML
- `https://docs.github.com` - Documentation site
- Any public documentation or article

**Custom Text Examples:**
```markdown
# Project Requirements

## Key Points
- Requirement 1
- Requirement 2

## Notes
Additional context here.
```

---

## 🎯 Extended Testing (Optional)

If quick tests pass, try:
- [ ] Upload multiple files of different types
- [ ] Add 10+ context items and test performance
- [ ] Test with Jira/Confluence integrations (if configured)
- [ ] Test error scenarios (invalid URLs, large files, etc.)
- [ ] Test across multiple projects

---

**Time Estimate**: 15 minutes for quick test, 30-45 minutes for extended testing
