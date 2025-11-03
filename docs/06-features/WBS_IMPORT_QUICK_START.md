# WBS Import - Quick Start Guide

## 🎉 **The Magic is Ready!**

You can now go from **AI-generated document → Extracted WBS → Project Tasks** in 3 clicks!

---

## ✨ **How to Test the Complete Flow**

### **Step 1: Generate a PMBOK Document with WBS** (2 min)

1. Navigate to Customer Portal Migration project:
   ```
   http://localhost:3000/projects/d031a664-3613-4f7d-a29a-7435735cb008
   ```

2. Click **"Documents"** tab

3. Click **"+ New Document"** or **"Generate Document"**

4. Select template: **"PMBOK Project Management Plan"**

5. Fill in project details, click **"Generate"**

6. Wait for AI to generate (30-60 seconds)

7. **Result**: Document created with WBS section like:
   ```markdown
   ## 5. Work Breakdown Structure
   
   ### 5.1 Design Phase
   - 5.1.1 Requirements Analysis (40 hours)
   - 5.1.2 Database Design (30 hours)
   - 5.1.3 UI/UX Mockups (25 hours)
   
   ### 5.2 Development Phase
   - 5.2.1 Backend API (80 hours)
   - 5.2.2 Frontend Components (60 hours)
   ...
   ```

---

### **Step 2: Extract WBS with AI** (3 min)

1. Click **"AI Extraction"** tab

2. Click **"⚡ Extract Project Data"** button

3. In the dialog:
   - **Documents**: Select the PMBOK document you just created
   - **AI Provider**: Google (Gemini 2.0 Flash Exp) or OpenAI
   - Click **"Start Extraction"**

4. **Wait 2-3 minutes** (progress bar shows status)

5. **Extraction completes!**
   - Toast: "Extraction complete! 444 entities extracted"
   - Toast: "💡 Found 11 activities! You can now import them as project tasks."

---

### **Step 3: Import WBS to Tasks** (10 seconds!) ⭐

1. **You should now see a purple card** that says:
   ```
   Convert WBS to Project Tasks
   
   Found 11 activities and 8 deliverables.
   Import them as project tasks with estimated hours, roles, and dependencies.
   
   [✨ Import WBS to Tasks]  ← Click this button!
   ```

2. **Click "Import WBS to Tasks"**

3. **Watch the magic!** ✨
   - Button shows: "Importing WBS..." with spinner
   - Takes 2-5 seconds
   - Toast appears: "WBS Import Complete! Created 11 tasks (350 hours estimated)"
   - May show: "2 tasks need role assignment" (if roles couldn't be auto-matched)

4. **Done!** 🎉

---

## 🔍 **Verify Tasks Were Created**

### **Option A: Check Database** (Direct SQL)

```sql
SELECT 
  task_number,
  wbs_code,
  task_name,
  estimated_hours,
  required_role_name,
  status
FROM project_tasks
WHERE project_id = 'd031a664-3613-4f7d-a29a-7435735cb008'
AND imported_from_wbs = TRUE
ORDER BY wbs_code;
```

**Expected Result**:
```
task_number | wbs_code | task_name               | estimated_hours | required_role_name
------------+----------+-------------------------+-----------------+-------------------
TASK-001    | 5.1.1    | Requirements Analysis   | 40              | Business Analyst
TASK-002    | 5.1.2    | Database Design         | 30              | Database Architect
TASK-003    | 5.1.3    | UI/UX Mockups          | 25              | UX Designer
TASK-004    | 5.2.1    | Backend API            | 80              | Senior Developer
...
```

### **Option B: Via API** (Using curl or Postman)

```bash
curl http://localhost:5000/api/tasks/project/d031a664-3613-4f7d-a29a-7435735cb008 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "task_id": "uuid",
      "task_number": "TASK-001",
      "wbs_code": "5.1.1",
      "task_name": "Requirements Analysis",
      "estimated_hours": 40,
      "required_role_name": "Business Analyst",
      "status": "planned",
      "imported_from_wbs": true
    },
    ...
  ]
}
```

### **Option C: Via Verification Script**

```powershell
cd d:\source\repos\adpa\server

# Create and run verification script
npx tsx -e "import { Pool } from 'pg'; const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); pool.query('SELECT COUNT(*) as task_count, SUM(estimated_hours) as total_hours FROM project_tasks WHERE project_id = \\'d031a664-3613-4f7d-a29a-7435735cb008\\' AND imported_from_wbs = TRUE').then(r => { console.log('Tasks imported:', r.rows[0]); pool.end(); })"
```

**Expected Output**:
```
Tasks imported: { task_count: '11', total_hours: '350' }
```

---

## 🎯 **What the System Does Automatically**

When you click "Import WBS to Tasks", the backend:

### **1. Parses Extracted Entities**
```typescript
Found entities from extraction_jobs:
- Activities: 11
- Deliverables: 8
- Milestones: 5
- Dependencies: 12
```

### **2. Intelligent Data Extraction**
For each activity, it:
- **Parses WBS codes**: "5.1.1" from text
- **Extracts hours**: "40 hours", "40h", "(40)" → 40
- **Identifies roles**: "Senior Developer", "BA" → Matches to project_roles
- **Finds dependencies**: "depends on 5.1.2" → Creates task_dependencies

### **3. Creates Project Tasks**
```sql
INSERT INTO project_tasks (
  task_number: "TASK-001",
  wbs_code: "5.1.1",
  task_name: "Requirements Analysis",
  estimated_hours: 40,
  required_role_id: "ba-role-uuid",
  required_role_name: "Business Analyst",
  source_document_id: "doc-uuid",  -- Links back to PMBOK doc
  source_entity_id: "activity-001", -- Links to extracted entity
  imported_from_wbs: TRUE
)
```

### **4. Returns Summary**
```json
{
  "tasksCreated": 11,
  "totalEstimatedHours": 350,
  "totalEstimatedCost": 48500,
  "tasksNeedingRoleAssignment": 2,
  "errors": []
}
```

---

## 📊 **Example: What Gets Imported**

### **From AI-Generated PMBOK Document**:

```markdown
## 5. Work Breakdown Structure

### 5.1 Design Phase (3 activities, 95 hours)

#### 5.1.1 Requirements Analysis
- Duration: 40 hours
- Role: Business Analyst
- Deliverable: Requirements Document
- Description: Gather and document functional and non-functional requirements

#### 5.1.2 Database Design  
- Duration: 30 hours
- Role: Database Architect
- Deliverable: Database Schema, ERD
- Dependencies: Must complete 5.1.1 first

#### 5.1.3 UI/UX Design
- Duration: 25 hours
- Role: UX Designer
- Deliverable: Wireframes, Mockups
```

### **After WBS Import**:

```
✅ 3 tasks created in project_tasks table:

TASK-001: Requirements Analysis
- WBS: 5.1.1
- Est Hours: 40
- Role: Business Analyst
- Status: Planned
- Source: Project_Management_Plan.md

TASK-002: Database Design
- WBS: 5.1.2
- Est Hours: 30
- Role: Database Architect
- Dependencies: TASK-001 (finish-to-start)
- Status: Planned

TASK-003: UI/UX Design
- WBS: 5.1.3
- Est Hours: 25  
- Role: UX Designer
- Status: Planned
```

---

## 🚀 **Test It NOW!**

### **Quick Test (5 minutes)**:

1. **Go to any project** with documents
2. **Click "AI Extraction" tab**
3. **Click "Extract Project Data"** (if not already extracted)
4. **Wait for completion** (see entity counts)
5. **Look for purple "Convert WBS to Project Tasks" card**
6. **Click "Import WBS to Tasks" button**
7. **See success toast** with task count!

---

## 🎨 **What You'll See**

### **Before Extraction**:
```
┌────────────────────────────────────────┐
│ No Extracted Data                      │
│ Extract structured entities...         │
└────────────────────────────────────────┘
```

### **After Extraction**:
```
┌────────────────────────────────────────┐
│ ✅ Total Entities Extracted: 444       │
│                                        │
│ 📊 Entity Counts:                      │
│ Stakeholders: 95                       │
│ Activities: 11  ← This triggers button │
│ Deliverables: 8                        │
│ ...                                    │
│                                        │
│ 💡 RAG Integration Active              │
│                                        │
│ ╔══════════════════════════════════╗  │
│ ║ Convert WBS to Project Tasks     ║  │
│ ║                                  ║  │
│ ║ Found 11 activities and 8        ║  │
│ ║ deliverables. Import them as     ║  │
│ ║ project tasks...                 ║  │
│ ║                                  ║  │
│ ║ [✨ Import WBS to Tasks]         ║  │
│ ╚══════════════════════════════════╝  │
└────────────────────────────────────────┘
```

### **During Import**:
```
[🔄 Importing WBS...]  (button disabled, spinner)
```

### **After Import**:
```
Toast: ✅ WBS Import Complete! Created 11 tasks (350 hours estimated)
Toast: ℹ️ 2 tasks need role assignment
```

---

## ⚠️ **Important Notes**

### **Requirements**:
- ✅ Document must be AI-generated (contains WBS section)
- ✅ Extraction must have been run on the document
- ✅ Extraction must have found activities/deliverables
- ✅ Backend server must be running (port 5000)

### **If Button Doesn't Appear**:
Check:
- Did extraction complete successfully?
- Does `entityCounts.activities > 0`?
- Are you on the AI Extraction tab?
- Refresh the page

### **If Import Fails**:
Check backend logs:
```powershell
cd d:\source\repos\adpa\server
# Look at logs/combined.log for errors
```

Common issues:
- No extracted data found
- Document ID not saved
- Authentication token expired
- Database connection issue

---

## 🎯 **What Happens Next?**

After WBS import, you can:

1. **View tasks** (Need Tasks tab - not built yet)
2. **Assign resources** (Need scheduling UI - not built yet)
3. **Or continue via API**:
   ```bash
   # Get tasks
   GET /api/tasks/project/:projectId
   
   # Assign resource
   POST /api/tasks/:taskId/assign
   
   # Get suggested resources
   GET /api/tasks/:taskId/suggest-resources
   ```

---

## 📋 **Current Status**

```
✅ Generate PMBOK document - WORKING
✅ AI extraction - WORKING  
✅ Import WBS button - WORKING (NEW!)
✅ Tasks created in database - WORKING
❌ View tasks in UI - NOT BUILT YET
❌ Assign resources in UI - NOT BUILT YET
❌ Employee timesheet - NOT BUILT YET
```

**Backend**: 100% complete ✅  
**Frontend**: 25% complete (Import button only)  
**Next**: Build Tasks tab to view/manage imported tasks

---

## 🚀 **Try It Now!**

**The fastest way to see the magic:**

1. Go to: http://localhost:3000/projects/d031a664-3613-4f7d-a29a-7435735cb008
2. Click "AI Extraction" tab
3. If already extracted, you should see the purple "Import WBS" button
4. Click it!
5. Watch tasks get created! ✨

---

**Let me know when you've tested it and I'll build the Tasks tab next so you can see and manage the imported tasks!** 🎯

