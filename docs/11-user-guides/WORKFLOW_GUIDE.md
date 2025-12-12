# 📋 Client Onboarding Assessment - Complete Workflow Guide

## Overview

This guide explains the complete end-to-end workflow for the Client Onboarding Assessment system, from initial upload to final report delivery.

---

## 🔄 **Complete User Workflow**

### **Step 1: Start New Assessment**

**URL:** `http://localhost:3000/onboarding/upload`

**What You Do:**
1. Navigate to the Upload page
2. Select or create a project
3. Enter client information
4. Upload documents
5. Start the assessment

**Visual Workflow:**
```
┌─────────────────────────────────────────┐
│ Client Onboarding Assessment            │
├─────────────────────────────────────────┤
│ Assessment Details                       │
│                                          │
│ Project: [Select Project ▼] [+]        │
│          ABC Corp Implementation         │
│                                          │
│ Client Name: John Smith                 │
│ Organization: ABC Corporation            │
│ Purpose: [Initial Onboarding ▼]        │
│                                          │
│ ──────────────────────────────────────  │
│                                          │
│ Upload Documents                         │
│ ┌────────────────────────────────────┐  │
│ │      📤                             │  │
│ │   Drag and drop files here         │  │
│ │   or click to browse               │  │
│ │   [Select Files]                   │  │
│ └────────────────────────────────────┘  │
│                                          │
│ Files: 15    [Clear All] [Start Assessment]│
└─────────────────────────────────────────┘
```

---

### **Step 2: Real-Time Processing**

**What Happens Automatically:**

1. **Upload** (30 seconds)
   - Files uploaded to server
   - Batch ID created
   - Progress bar shows upload status

2. **Conversion** (1-2 minutes per doc)
   - PDF → Markdown (Adobe + fallback)
   - DOCX → Markdown (mammoth.js)
   - Real-time progress updates via WebSocket
   - You see each file converting

3. **Classification** (10 seconds per doc)
   - AI detects document type
   - 13 PMBOK types: Charter, Scope, Schedule, Risk Register, etc.
   - Confidence scores calculated

4. **Quality Audit** (20 seconds per doc)
   - Automatic quality assessment
   - PMBOK/BABOK compliance check
   - Scores calculated (0-100)

5. **Portfolio Aggregation** (30 seconds)
   - All documents analyzed
   - Maturity level calculated (1-5)
   - Gap analysis generated
   - Benchmarks compared

**Visual:**
```
Processing Documents (15 of 45 complete)
────────────────────────────── 33%

✅ project-charter.pdf (Level 4, Score: 92)
✅ scope-statement.docx (Level 3, Score: 78)
⏳ risk-register.pdf (Converting...)
⏳ schedule-baseline.xlsx (Queued)
```

---

### **Step 3: View Assessment Results**

**Auto-Redirect:** After processing completes, you're redirected to:
`/onboarding/assessment/[batchId]`

**What You See:**

#### **Executive Summary:**
```
Portfolio Maturity Assessment
ABC Corporation

┌──────────┬──────────┬──────────┬──────────┐
│ Level: 3 │ Score: 82│ Docs: 45 │ Gaps: 12 │
└──────────┴──────────┴──────────┴──────────┘

Maturity Level
Level 3 - Defined
Processes are well characterized and understood
████████████░░░░░░ 60%
```

#### **5 Interactive Tabs:**

**1. Overview Tab:**
- Maturity level progression (1 → 5)
- Current level highlighted
- Description of what each level means

**2. Documents Tab:**
- Table of all 45 documents
- Type, count, average score per type
- Click to view individual document quality reports

**3. Gaps Tab:**
- Prioritized list (Critical → Low)
- Missing document types
- Quality improvements needed
- Effort estimates for each gap
- Recommendations

**4. Benchmarks Tab:**
- Your Score vs Industry Average
- Top Performers comparison
- Percentile ranking
- Industry vertical comparison

**5. ROI Tab:**
- Current cost (based on document quality issues)
- Improved cost (after addressing gaps)
- Potential savings
- ROI percentage
- Payback period

---

### **Step 4: Export Report**

**What You Can Do:**

1. **Export PDF** (most common)
   - Click "Export PDF" button
   - Professional PDF report downloads
   - Includes all charts, graphs, tables
   - Ready to share with client/stakeholders

2. **Export CSV**
   - Raw data for further analysis
   - Import into Excel/BI tools

3. **Export JSON**
   - Structured data for integrations
   - API consumption

**PDF Report Contents:**
```
Portfolio Maturity Assessment Report
=====================================
Client: ABC Corporation
Date: November 4, 2025

Executive Summary
- Maturity Level: 3 (Defined)
- Quality Score: 82.5
- Documents: 45
- Gaps: 12

Document Breakdown
┌────────────────────┬───────┬──────┐
│ Type               │ Count │ Score│
├────────────────────┼───────┼──────┤
│ Project Charter    │   3   │ 92.0 │
│ Scope Statement    │   2   │ 78.5 │
│ Risk Register      │   5   │ 85.2 │
└────────────────────┴───────┴──────┘

Gap Analysis (Priority: Critical → Low)
[Table of 12 gaps with recommendations]

Benchmarks
[Comparison charts]

ROI Analysis
[Cost savings calculations]
```

---

### **Step 5: Access Past Assessments**

**URL:** `http://localhost:3000/onboarding/assessments`

**What You See:**
- List of all past assessments
- Search by client name, project, organization
- Filter by project or status
- Quick view and export buttons
- Statistics dashboard

**Finding Your Assessment:**
```
Filters:
  Search: [ABC Corp___________] 🔍
  Project: [All Projects ▼]
  Status: [All Statuses ▼]

┌─────────────────────────────────────────────────────────────┐
│ Client/Org        Project      Maturity  Score  Docs  Date  │
├─────────────────────────────────────────────────────────────┤
│ ABC Corporation   ABC Impl     Level 3   82.5   45   Nov 4 │
│ XYZ Company       XYZ PMO      Level 4   89.2   38   Nov 3 │
│ Acme Inc          Acme Project Level 2   65.8   22   Nov 1 │
└─────────────────────────────────────────────────────────────┘
             [View] [Export PDF]
```

---

## 🗺️ **Complete Navigation Map**

```
┌─────────────────────────────────────────────────┐
│ ADPA Main Dashboard                             │
│   └─ Onboarding                                 │
│      ├─ [New Assessment]                        │
│      │   → /onboarding/upload                   │
│      │      1. Select/Create Project            │
│      │      2. Enter Client Details             │
│      │      3. Upload Documents                 │
│      │      4. Click "Start Assessment"         │
│      │      5. Auto-redirect to results         │
│      │                                           │
│      ├─ [View Assessments]                      │
│      │   → /onboarding/assessments              │
│      │      - List all past assessments         │
│      │      - Search/filter by client/project   │
│      │      - Click to view details             │
│      │      - Export reports                    │
│      │                                           │
│      └─ [Assessment Results]                    │
│          → /onboarding/assessment/[batchId]     │
│             - View maturity level               │
│             - Browse gaps                       │
│             - Compare benchmarks                │
│             - Calculate ROI                     │
│             - Export PDF/CSV/JSON               │
└─────────────────────────────────────────────────┘
```

---

## 📊 **Data Flow & Storage**

### **How Information is Tracked:**

```
┌──────────────────┐
│ 1. Upload Page   │
│   - ProjectID    │ ──┐
│   - Client Name  │   │
│   - Organization │   │
│   - Purpose      │   │
│   - Files (100)  │   │
└──────────────────┘   │
                       ├─→ ┌──────────────────┐
                       │   │ upload_batches   │
                       │   │ - id (batch_id)  │
                       │   │ - project_id     │
                       │   │ - uploaded_by    │
                       │   │ - batch_metadata │──┐
                       │   │   {clientName,   │  │
                       │   │    organization, │  │
                       │   │    purpose}      │  │
                       │   └──────────────────┘  │
                       │                          │
                       └─→ ┌──────────────────┐  │
                           │ documents        │  │
                           │ - id             │  │
                           │ - project_id     │  │
                           │ - upload_batch_id│◄─┘
                           │ - title          │
                           │ - content (MD)   │
                           │ - detected_type  │
                           │ - created_by     │
                           └──────────────────┘
                                    │
                                    │
                                    ▼
                           ┌──────────────────┐
                           │ assessments      │
                           │ - id             │
                           │ - project_id     │
                           │ - batch_id       │──┐
                           │ - maturity_level │  │
                           │ - avg_score      │  │
                           │ - total_docs     │  │
                           │ - gaps_count     │  │
                           │ - created_at     │  │
                           └──────────────────┘  │
                                                  │
                                                  │
┌─────────────────────────────────────────────────┘
│
│ ┌──────────────────────┐
│ │ 2. Assessments List  │
│ │    Query by:         │
│ │    - Project ID      │
│ │    - Client Name     │
│ │    - Date Range      │
│ │                      │
│ │    Returns:          │
│ │    - All assessments │
│ │    - With metadata   │
│ │    - Sortable        │
│ │    - Filterable      │
│ └──────────────────────┘
│
│ ┌──────────────────────┐
│ │ 3. Assessment View   │
│ │    Access via:       │
│ │    - Batch ID        │
│ │    - Assessment ID   │
│ │    - Project ID      │
│ └──────────────────────┘
```

---

## 🎯 **Key Database Relationships**

### **Finding Your Assessment:**

```sql
-- By Client Name (stored in batch_metadata)
SELECT a.*, ub.batch_metadata->>'clientName' as client_name
FROM assessments a
JOIN upload_batches ub ON a.batch_id = ub.id
WHERE ub.batch_metadata->>'clientName' ILIKE '%ABC%';

-- By Project
SELECT a.*, p.name as project_name
FROM assessments a
JOIN projects p ON a.project_id = p.id
WHERE p.id = 'project-uuid';

-- By Date Range
SELECT * FROM assessments
WHERE created_at BETWEEN '2025-11-01' AND '2025-11-30'
ORDER BY created_at DESC;
```

---

## 🧭 **Typical User Journeys**

### **Journey 1: New Client Assessment**

1. **Prepare:**
   - Gather client's documents (PDF, DOCX)
   - Collect 10-50 project management documents

2. **Navigate:**
   - Login to ADPA
   - Go to "Onboarding" → "New Assessment"

3. **Setup:**
   - Create new project: "ABC Corp Implementation"
   - Enter client name: "John Smith"
   - Enter organization: "ABC Corporation"
   - Select purpose: "Initial Client Onboarding"

4. **Upload:**
   - Drag 25 PDF/DOCX files
   - Click "Start Assessment"
   - Watch real-time progress (2-3 minutes)

5. **Review:**
   - Auto-redirected to assessment dashboard
   - See maturity level: Level 3
   - Review 8 gaps identified
   - Check ROI: $500K savings potential

6. **Export:**
   - Click "Export PDF"
   - Download professional report
   - Share with client/stakeholders

7. **Follow-up:**
   - Assessment saved to project
   - Accessible anytime from "View Assessments"
   - Can re-run assessment after improvements

---

### **Journey 2: Find Past Assessment**

1. **Navigate:**
   - Login to ADPA
   - Go to "Onboarding" → "View Assessments"

2. **Search:**
   - Enter "ABC Corp" in search box
   - Or filter by project: "ABC Corp Implementation"

3. **Access:**
   - Click "View" button on the assessment
   - Opens assessment dashboard
   - All data preserved

4. **Export:**
   - Click "Export PDF" to download report
   - Or export CSV/JSON for data analysis

---

### **Journey 3: Annual Review**

1. **Previous Assessment Exists:**
   - Find last year's assessment in list
   - Note maturity was Level 2, score 65

2. **New Assessment:**
   - Click "New Assessment"
   - Select SAME project: "ABC Corp Implementation"
   - Update client name if changed
   - Set purpose: "Annual Review"

3. **Upload Updated Documents:**
   - Upload current year's documents
   - Same document types, updated content

4. **Compare:**
   - New assessment: Level 3, score 82
   - Improvement: +1 level, +17 points
   - Track progress over time

---

## 🔍 **How to Find Documents**

### **Method 1: By Project**
```
Navigate: Projects → ABC Corp Implementation → Documents

Filter: 
  - Source: "uploaded"
  - Batch ID: [specific batch]
  - Date range: [last 30 days]
  
Result: All 45 documents from that assessment
```

### **Method 2: By Batch ID**
```
Navigate: Onboarding → View Assessments → [specific assessment]

Click: "View Documents" button

Result: List of all documents in that batch with:
  - Original filename
  - Detected type
  - Quality score
  - Download link (original & Markdown)
```

### **Method 3: By Document Type**
```
Navigate: Documents → Advanced Search

Filter:
  - Project: ABC Corp Implementation
  - Detected Type: "Risk Register"
  - Date: >= 2025-11-01
  
Result: All Risk Register documents from recent assessments
```

---

## 💾 **Data Retention & Organization**

### **What Gets Saved:**

**Upload Batches Table:**
```sql
id               | uuid (batch identifier)
project_id       | Link to project
uploaded_by      | User ID
total_files      | 45
status           | 'complete'
batch_metadata   | JSONB {
                     "clientName": "John Smith",
                     "organizationName": "ABC Corp",
                     "assessmentPurpose": "Initial Onboarding",
                     "uploadDate": "2025-11-04"
                   }
created_at       | Timestamp
```

**Documents Table:**
```sql
id                | uuid
project_id        | ABC Corp Implementation
upload_batch_id   | Links to batch above
title             | "Project Charter"
content           | "# Project Charter\n\n..." (Markdown)
detected_type     | "Project Charter"
detection_confidence | 0.95
original_filename | "ABC-Charter-v2.pdf"
original_format   | "pdf"
created_by        | User ID
created_at        | Timestamp
```

**Assessments Table:**
```sql
id                  | uuid
batch_id            | Links to upload_batches
project_id          | ABC Corp Implementation
overall_maturity_level | 3
maturity_label      | "Defined"
avg_quality_score   | 82.5
total_documents     | 45
gaps_count          | 12
benchmarks          | JSONB {...}
roi_metrics         | JSONB {...}
created_at          | Timestamp
```

---

## 🔗 **Key Connections**

### **How Everything Links Together:**

```
PROJECT (ABC Corp Implementation)
  │
  ├─► UPLOAD_BATCH (Nov 4, 2025 upload)
  │     │
  │     ├─► DOCUMENT (project-charter.pdf)
  │     ├─► DOCUMENT (scope-statement.docx)
  │     ├─► DOCUMENT (risk-register.pdf)
  │     └─► ... (42 more documents)
  │
  ├─► ASSESSMENT (Generated from batch)
  │     ├─ Maturity Level: 3
  │     ├─ Score: 82.5
  │     ├─ Gaps: 12
  │     └─ ROI Metrics
  │
  └─► FUTURE UPLOADS (next assessment)
        └─► Can compare over time
```

---

## 📱 **Improved UI Workflow (What You Built)**

### **Before (Original):**
```
❌ Upload Page: No context, just file upload
❌ No way to tag/organize
❌ Can't find documents later
❌ No client information captured
```

### **After (Fixed):**
```
✅ Upload Page:
   1. Select/Create Project
   2. Enter Client Information
   3. Set Assessment Purpose
   4. Upload Files
   5. All metadata saved to batch_metadata

✅ Assessments List Page:
   - Search by client name
   - Filter by project
   - Sort by date
   - Quick view/export

✅ Assessment Detail Page:
   - Full dashboard
   - All documents linked
   - Export functionality
```

---

## 🎯 **Example: Complete Workflow**

**Scenario:** Assess ABC Corporation's PMO maturity

### **Step-by-Step:**

1. **Go to:** http://localhost:3000/onboarding/upload

2. **Create Project:**
   - Click [+] next to project dropdown
   - Name: "ABC Corp PMO Implementation"
   - Description: "Enterprise PMO setup project"
   - Click "Create Project"

3. **Enter Client Info:**
   - Client Name: "Jane Doe (ABC PMO Director)"
   - Organization: "ABC Corporation"
   - Purpose: "Initial Client Onboarding"

4. **Upload Documents:**
   - Drag-drop 30 PDF files (charters, plans, registers)
   - See file list populate
   - Verify all files valid

5. **Start:**
   - Click "Start Assessment" button
   - Watch real-time progress
   - Each file: Upload → Convert → Classify → Audit

6. **Results (auto-redirect):**
   - URL: /onboarding/assessment/[batch-uuid]
   - See: Level 3, Score 78.5, 30 docs, 8 gaps

7. **Review Tabs:**
   - Overview: Maturity progression
   - Documents: Breakdown by type
   - Gaps: Missing Risk Register, weak Schedule
   - Benchmarks: 65th percentile
   - ROI: $350K potential savings

8. **Export:**
   - Click "Export PDF"
   - Share report with ABC Corp stakeholders

9. **Later Access:**
   - Go to: /onboarding/assessments
   - Search: "ABC"
   - Find assessment, click "View"
   - Or export again

---

## ✅ **What Was Fixed**

### **Problems Identified:**
1. ❌ No project selection
2. ❌ No client information capture
3. ❌ No way to find assessments later
4. ❌ No metadata tagging
5. ❌ No assessment list page

### **Solutions Implemented:**
1. ✅ Project dropdown + create new project
2. ✅ Client name, organization, purpose fields
3. ✅ Assessments list page with search/filter
4. ✅ Metadata saved in batch_metadata JSONB field
5. ✅ GET /api/assessment/list endpoint
6. ✅ Navigation between upload → results → list

---

## 📋 **Quick Reference**

### **URLs:**
- **New Assessment:** `/onboarding/upload`
- **View All Assessments:** `/onboarding/assessments`
- **Assessment Details:** `/onboarding/assessment/[batchId]`

### **Required Fields:**
- ✅ Project (select existing or create new)
- ✅ Client Name
- ⚪ Organization (optional, defaults to client name)
- ⚪ Purpose (optional, defaults to "Portfolio Maturity Assessment")

### **File Requirements:**
- **Formats:** PDF, DOCX, TXT, MD
- **Size:** Max 10MB per file
- **Count:** Max 100 files per batch
- **Recommended:** 10-50 documents for thorough assessment

---

**Status:** ✅ Complete workflow now in place  
**Next:** Test the full flow end-to-end with real documents

