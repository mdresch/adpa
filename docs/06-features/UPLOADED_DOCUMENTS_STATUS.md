# 📤 Uploaded Documents - Status & Workflow Exception

## 🎯 **Key Principle**

> **Uploaded documents are already reviewed by the uploader and bypass the AI review workflow entirely.**

---

## 📊 **Status Comparison**

```
┌─────────────────────────────────────────────────────────────┐
│           AI-GENERATED vs UPLOADED DOCUMENTS                │
└─────────────────────────────────────────────────────────────┘

AI-GENERATED                     UPLOADED
─────────────────────────────────────────────────────────────
🤖 Created by AI                 📤 Created by user
⚠️  Requires review               ✅ Pre-reviewed
📋 Appears in review queue       🚫 NOT in review queue
⏱️  48-hour SLA                   ✅ No SLA needed
👤 Needs approval                ✅ Already approved
📝 May need edits                ✅ Ready to use

Status: "generated"              Status: "uploaded"
Next: Review → Approve           Next: Use or Publish
```

---

## 🔄 **Workflow Comparison**

### **AI-Generated Documents:**
```
1. AI generates content
2. Status = "generated" ⚠️
3. Appears in review queue 📋
4. User MUST review
5. User approves → "reviewed"
6. Optionally publish → "published"
```

### **Uploaded Documents:**
```
1. User uploads file 📤
2. Status = "uploaded" ✅
3. Marked as reviewed automatically
4. reviewed_at = NOW()
5. reviewed_by = uploader
6. Available immediately
7. NOT in review queue
8. Optionally move to "published"
```

---

## 📍 **Upload Sources Tracked**

The `upload_source` column tracks where documents came from:

```
┌─────────────────────────────────────────────────────────────┐
│              UPLOAD SOURCE TYPES                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📁 manual_upload                                           │
│     User directly uploads via UI                            │
│                                                             │
│  🗂️  sharepoint_sync                                        │
│     Imported from SharePoint                                │
│                                                             │
│  🐙 github_import                                           │
│     Pulled from GitHub repository                           │
│                                                             │
│  📚 confluence_sync                                         │
│     Synced from Confluence                                  │
│                                                             │
│  💼 onedrive_sync                                           │
│     Synced from OneDrive                                    │
│                                                             │
│  📧 email_import                                            │
│     Imported from email attachments                         │
│                                                             │
│  🔗 url_import                                              │
│     Fetched from URL                                        │
│                                                             │
│  📦 bulk_import                                             │
│     Batch uploaded via API                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ **Document Library View**

### **Clear Visual Distinction:**

```
┌─────────────────────────────────────────────────────────────┐
│           📁 PROJECT DOCUMENT LIBRARY                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🤖 AI-GENERATED (Needs Review) - 2 documents              │
│  ┌───────────────────────────────────────────────┐         │
│  │ ⚠️  Stakeholder Plan - 10/17/2025              │         │
│  │     Status: GENERATED │ Quality: 70.9%         │         │
│  │     [⏰ Review Required]                        │         │
│  │                                                │         │
│  │ ⚠️  Risk Management Plan - 10/17/2025          │         │
│  │     Status: GENERATED │ Quality: 82.3%         │         │
│  │     [⏰ Review Required]                        │         │
│  └───────────────────────────────────────────────┘         │
│                                                             │
│  📤 UPLOADED (Pre-Reviewed) - 5 documents                   │
│  ┌───────────────────────────────────────────────┐         │
│  │ ✅ Project Charter v2.0                        │         │
│  │     Status: UPLOADED │ Source: manual_upload   │         │
│  │     Uploaded by: John Smith │ 2 days ago       │         │
│  │     [✅ Ready to Use]                           │         │
│  │                                                │         │
│  │ ✅ Requirements Specification                  │         │
│  │     Status: UPLOADED │ Source: sharepoint_sync │         │
│  │     Uploaded by: Jane Doe │ 5 days ago         │         │
│  │     [✅ Ready to Use]                           │         │
│  │                                                │         │
│  │ ✅ Technical Design Document                   │         │
│  │     Status: UPLOADED │ Source: github_import   │         │
│  │     Uploaded by: Bob Wilson │ 1 week ago       │         │
│  │     [✅ Ready to Use]                           │         │
│  └───────────────────────────────────────────────┘         │
│                                                             │
│  📢 PUBLISHED (Finalized) - 8 documents                     │
│  ┌───────────────────────────────────────────────┐         │
│  │ Project Charter - 10/10/2025                   │         │
│  │ Quality Assurance Plan - 10/08/2025            │         │
│  │ Communication Strategy - 10/05/2025            │         │
│  └───────────────────────────────────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ **Auto-Tracking for Uploaded Documents**

### **Automatic Fields Set:**

When a document is uploaded, the system automatically:

```typescript
// Trigger fires on INSERT/UPDATE when status = 'uploaded'
{
  status: 'uploaded',
  reviewed_at: NOW(),              // ✅ Auto-set
  reviewed_by: uploader_id,        // ✅ Auto-set to uploader
  upload_source: 'manual_upload',  // Set by upload handler
  created_at: NOW(),
  created_by: uploader_id
}
```

### **Database Trigger:**
```sql
-- Automatically sets reviewed_at for uploaded documents
IF NEW.status = 'uploaded' THEN
  NEW.reviewed_at = NOW();
  NEW.reviewed_by = NEW.created_by; -- Uploader is reviewer
END IF;
```

---

## 🔍 **Querying Documents**

### **Review Queue (Excludes Uploaded):**
```sql
-- Only shows AI-generated docs needing review
SELECT * FROM documents_review_queue;

Result:
- Includes: generated, under_review
- Excludes: uploaded (pre-reviewed)
- Excludes: reviewed, published (already approved)
```

### **Uploaded Documents View:**
```sql
-- Shows all uploaded documents
SELECT * FROM documents_uploaded;

Result:
- All documents with status = 'uploaded'
- Includes upload_source, uploader info
- Shows reviewed_at timestamp
- Ordered by upload date (newest first)
```

### **All Documents by Category:**
```sql
-- Get documents grouped by source
SELECT 
  CASE 
    WHEN status = 'uploaded' THEN 'Uploaded (Pre-Reviewed)'
    WHEN status = 'generated' THEN 'AI-Generated (Needs Review)'
    WHEN status = 'reviewed' THEN 'Reviewed (Ready to Publish)'
    WHEN status = 'published' THEN 'Published (Finalized)'
    ELSE status
  END as category,
  COUNT(*) as count
FROM documents
GROUP BY status
ORDER BY count DESC;
```

---

## 📊 **Metadata for Uploaded Documents**

### **Example Metadata:**
```json
{
  "document": {
    "name": "Project Charter v2.0",
    "status": "uploaded",
    "upload_source": "manual_upload",
    "uploaded_at": "2025-10-15T10:30:00.000Z",
    "uploaded_by": "John Smith",
    "uploaded_by_email": "john.smith@company.com",
    "file_type": "docx",
    "original_filename": "Project_Charter_v2.docx",
    "conversion": "docx_to_markdown"
  },
  "review": {
    "status": "pre-reviewed",
    "reviewed_at": "2025-10-15T10:30:00.000Z",
    "reviewed_by": "550e8400-e29b-41d4-a716-446655440000",
    "reviewer_name": "John Smith",
    "bypasses_workflow": true,
    "requires_no_action": true
  },
  "file_metrics": {
    "word_count": 3456,
    "character_count": 18942,
    "file_size_bytes": 18942,
    "file_size_kb": "18.50"
  }
}
```

---

## 🚀 **User Experience**

### **When Uploading:**
```
┌──────────────────────────────────────────────────────┐
│  📤 Upload Document                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Select file: [Choose File]                         │
│                                                      │
│  Project: [ADPA Implementation ▾]                    │
│                                                      │
│  Upload source:                                      │
│  ⚪ Manual upload                                    │
│  ⚪ SharePoint document                              │
│  ⚪ GitHub repository                                │
│  ⚪ Confluence page                                  │
│                                                      │
│  ℹ️  Note: Uploaded documents are marked as         │
│     pre-reviewed and immediately available.          │
│     They will NOT appear in the review queue.        │
│                                                      │
│  [Upload] [Cancel]                                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### **After Upload:**
```
┌──────────────────────────────────────────────────────┐
│  ✅ Upload Successful!                               │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Document: "Project Charter v2.0"                    │
│                                                      │
│  Status: 📤 UPLOADED (Pre-Reviewed)                  │
│                                                      │
│  ✅ Marked as reviewed automatically                 │
│  ✅ Immediately available in project library         │
│  ✅ NOT added to review queue                        │
│                                                      │
│  Word Count: 3,456                                   │
│  Upload Source: manual_upload                        │
│  Uploaded by: John Smith                             │
│                                                      │
│  [View Document] [Upload Another]                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 📋 **Status Badge Display**

### **Visual Indicators:**

```
AI-Generated:
┌─────────────────────┐
│ 🤖 GENERATED        │  ← Yellow/Orange (Warning)
│ ⚠️  Needs Review     │
└─────────────────────┘

Uploaded:
┌─────────────────────┐
│ 📤 UPLOADED         │  ← Green (Success)
│ ✅ Pre-Reviewed     │
└─────────────────────┘

Published:
┌─────────────────────┐
│ 📢 PUBLISHED        │  ← Blue (Info)
│ ✅ Finalized        │
└─────────────────────┘
```

---

## ✅ **Summary**

### **Uploaded Documents:**
1. ✅ **Status**: `uploaded`
2. ✅ **Auto-reviewed**: `reviewed_at` set automatically
3. ✅ **Reviewer**: Set to uploader
4. ✅ **No review needed**: Bypasses workflow
5. ✅ **Not in review queue**: Excluded from `documents_review_queue`
6. ✅ **Immediately available**: Ready to use
7. ✅ **Source tracked**: Via `upload_source` field
8. ✅ **Separate view**: `documents_uploaded` view

### **Clear Distinction:**
- 🤖 **AI-Generated** = Requires review
- 📤 **Uploaded** = Pre-reviewed (exception to workflow)
- 📝 **Draft** = Manual work in progress
- 📢 **Published** = Finalized and shared

**The system now clearly distinguishes uploaded documents from AI-generated ones, with uploaded docs bypassing the review workflow entirely!** 🎉

