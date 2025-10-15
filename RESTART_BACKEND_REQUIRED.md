# 🔄 Backend Restart Required

**Date:** October 14, 2025  
**Reason:** Template content field added to database query  
**Status:** ⚠️ Action Required

---

## ⚠️ Important

The backend needs to be **restarted** for the template token fix to take effect.

---

## 🔧 What Changed in Backend

**File:** `server/src/services/processFlowService.ts`

**Change:** Added `content` field to template query
```sql
-- This query was modified:
SELECT content, LENGTH(content::text) as content_length FROM templates
```

**Impact:**
- Backend code has changed
- TypeScript needs to be recompiled
- Server needs to reload the new code

---

## 🚀 How to Restart Backend

### Option 1: Restart Script (Recommended)

```powershell
.\restart-services.ps1
```

### Option 2: Manual Restart

```powershell
# Stop backend (Ctrl+C in backend terminal)
cd server
npm run dev
```

### Option 3: Restart All

```powershell
# Stop all services
# Then run:
.\start-local-dev.ps1
```

---

## ✅ After Restart

1. **Refresh your browser** (Ctrl+Shift+R)
2. Navigate to `/process-flow`
3. Select a template
4. Check Context Window Analysis
5. Verify "Template Base" shows **tokens** (not 0)

---

## 🎯 What Will Work After Restart

✅ **Template Token Count**
- Template Base will show correct token count (e.g., 45,000 instead of 0)

✅ **Document Summarization Progress**
- Already works (frontend-only change)

✅ **Document Viewer**
- Already works (frontend-only change)

---

## 📊 Full Testing Checklist

After restarting the backend:

### Template Tokens
- [ ] Navigate to `/process-flow`
- [ ] Select any template from dropdown
- [ ] Context Window Analysis shows "Template Base: [NON-ZERO] tokens"

### Document Progress
- [ ] Start workflow processing
- [ ] Document Compression step shows expandable document list
- [ ] Each document shows compression metrics

### Document Viewer
- [ ] Workflow completes successfully
- [ ] Click "View Generated Document"
- [ ] Document loads and displays content
- [ ] Can download document as Markdown

---

## 🎉 Summary

**Backend Restart Needed For:**
- ✅ Template token count fix

**No Restart Needed For:**
- ✅ Document summarization progress (frontend-only)
- ✅ Document viewer loading (frontend-only)

**Just restart the backend and refresh your browser!** 🚀

