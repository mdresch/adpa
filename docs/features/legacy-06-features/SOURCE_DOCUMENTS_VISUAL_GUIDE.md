# Source Documents - Visual Guide

**What You'll See in the Document Viewer**

---

## Before vs After

### ❌ Before (Old System)
```
┌─────────────────────────────────┐
│ 📚 Source Documents             │
│                                 │
│ 📄 Business Requirements (PDF) │
│ 📄 Technical Architecture (DOCX)│
│ 📄 User Stories (MD)            │
│ 📄 API Specifications (JSON)    │
│                                 │
│ (Mock/demo data only)           │
└─────────────────────────────────┘
```

### ✅ After (New System with Tracking)
```
┌────────────────────────────────────────────────┐
│ 📊 Context Statistics                          │
│ What context was used to generate this document│
│                                                │
│ Documents in Project:               8          │
│ Used as Context:                    3          │
│ Stakeholders Available:            12          │
│ Custom Settings:                    2          │
│ Custom Metadata:                    3          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ Context Tokens:              ~12,125          │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ 📚 Source Documents                            │
│ Documents used as context during generation    │
│                                                │
│ ╔══════════════════════════════════════════╗  │
│ ║ Project Charter          [approved] [👁] ║  │
│ ║ Charter Template                         ║  │
│ ╚══════════════════════════════════════════╝  │
│      ↑ Click to view source document           │
│                                                │
│ ╔══════════════════════════════════════════╗  │
│ ║ Stakeholder Register        [final] [👁] ║  │
│ ║ Stakeholder Management Template          ║  │
│ ╚══════════════════════════════════════════╝  │
│                                                │
│ ╔══════════════════════════════════════════╗  │
│ ║ Scope Management Plan       [draft] [👁] ║  │
│ ║ Scope Management Template                ║  │
│ ╚══════════════════════════════════════════╝  │
│                                                │
│ (Real data - clickable links to actual docs)   │
└────────────────────────────────────────────────┘
```

---

## Real Example: Your Stakeholder Management Plan

### What You Just Generated

**Document**: Stakeholder Management Plan  
**Project**: Enterprise Data Governance Framework

### Console Output You Saw
```
📚 [CONTEXT-1/3] Document Library Analysis:
  Total documents in project: 4
  Template being generated: Stakeholder Management Plan
  Prioritized documents selected: 1
  Selected documents: Project Charter
  
📚 [SAVE-1.5/6] Source documents tracked: 1 documents
  Source document names: Project Charter
```

### What You'll See in Document Viewer

When you visit:  
`http://localhost:3000/projects/ce14bf1d-fe9c-4616-b729-1b22630f5644/documents/a43b0dd5-cf2c-4000-bc4b-1c63c671086a/view`

**New Sections Displayed**:

```
┌────────────────────────────────────────────────┐
│ 📊 Context Statistics                          │
│                                                │
│ Documents in Project:               4          │
│ Used as Context:                    1   ←──────┼─ Project Charter was used!
│ Stakeholders Available:             0          │
│ Custom Settings:                    0          │
│ Custom Metadata:                    0          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ Context Tokens:                ~1,884          │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ 📚 Source Documents                            │
│ Documents used as context during generation    │
│                                                │
│ ╔══════════════════════════════════════════╗  │
│ ║ Project Charter          [approved] [👁] ║  │
│ ║ Charter Template                         ║  │
│ ╚══════════════════════════════════════════╝  │
│      ↑                                         │
│      └─ Click here to view the Project Charter│
└────────────────────────────────────────────────┘
```

---

## Document Relationship Visualization

### Your Current Project Structure

```
Enterprise Data Governance Framework
│
├─ 📄 Project Charter (approved)
│   └─── Sources: (none - foundation document)
│
├─ 📄 Stakeholder Register (final)
│   └─── Sources: Project Charter ←── You'll see this link!
│
├─ 📄 Project Management Plan (draft)
│   └─── Sources: (to be determined when generated)
│
└─ 📄 Stakeholder Management Plan (draft) ←── Just generated!
    └─── Sources: Project Charter ←── Now visible in UI!
```

### When You Click the Eye Icon

```
Current View: Stakeholder Management Plan
     │
     │ Click [👁] on "Project Charter"
     ↓
Navigate to: Project Charter view
     │
     │ (You can now see what context was used)
     ↓
Source Documents: (none - this was the first doc)
```

**This creates a navigable document graph!** 🔗

---

## Empty State (First Document)

When viewing the **first document** you ever generated (e.g., Project Charter):

```
┌────────────────────────────────────────────────┐
│ 📚 Source Documents                            │
│ Documents used as context during generation    │
│                                                │
│ No source documents - this was the first       │
│ document generated or no context was available.│
└────────────────────────────────────────────────┘
```

**This is expected and correct!** ✅ The first document has no context.

---

## Full Example: Risk Management Plan

### If You Generate a Risk Plan After Having:
- ✅ Project Charter (approved)
- ✅ Stakeholder Register (final)
- ✅ Scope Management Plan (draft)
- ✅ Schedule Management Plan (draft)

### The View Will Show:

```
┌────────────────────────────────────────────────┐
│ 📊 Context Statistics                          │
│                                                │
│ Documents in Project:               8          │
│ Used as Context:                    5   ←──────┼─ Maximum (top 5)
│ Stakeholders Available:            12          │
│ Custom Settings:                    2          │
│ Custom Metadata:                    3          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ Context Tokens:               ~14,500          │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ 📚 Source Documents (5 documents)              │
│                                                │
│ 1. Project Charter          [approved] [👁]    │
│    Charter Template                            │
│                                                │
│ 2. Stakeholder Register        [final] [👁]    │
│    Stakeholder Management Template             │
│                                                │
│ 3. Scope Management Plan       [draft] [👁]    │
│    Scope Management Template                   │
│                                                │
│ 4. Schedule Management Plan    [draft] [👁]    │
│    Schedule Management Template                │
│                                                │
│ 5. Cost Management Plan        [draft] [👁]    │
│    Cost Management Template                    │
└────────────────────────────────────────────────┘
```

**Every source document is clickable!** Click [👁] to view any of them.

---

## How to Verify It's Working

### Step-by-Step Verification

1. **Generate a new document** (any template)
2. **Check browser console** (F12 → Console tab)
3. **Look for**:
   ```
   📚 [SAVE-1.5/6] Source documents tracked: X documents
     Source document names: [list]
   ```
4. **Navigate to the document view**
5. **Scroll down** to the right sidebar
6. **Find**: "Context Statistics" card (if context was used)
7. **Find**: "Source Documents" card
8. **Verify**: Your source documents are listed
9. **Click**: The eye icon [👁] on any source document
10. **Result**: You navigate to that document!

---

## Testing Scenarios

### Scenario A: Empty Project
```
Action: Generate first document (Project Charter)
Console: Prioritized documents selected: 0
View: "No source documents - this was the first document..."
✅ Expected behavior
```

### Scenario B: Second Document
```
Action: Generate Stakeholder Register (Charter exists)
Console: Selected documents: Project Charter
View: Source Documents shows "Project Charter" with link
✅ Context is working!
```

### Scenario C: Complex Document
```
Action: Generate Risk Plan (Charter, Stakeholder, Scope exist)
Console: Selected documents: Project Charter, Stakeholder Register, Scope Plan
View: All 3 source documents listed with links
✅ Full context system operational!
```

---

## Troubleshooting

### Issue: "No source documents" but I have documents in project

**Cause**: The documents might not be relevant to the template type  
**Example**: Generating "Risk Plan" but only have "User Stories" document  
**Solution**: User Stories don't contain risk-related keywords, so they're not selected. This is correct behavior.

---

### Issue: Source documents not clickable

**Cause**: Link import issue or metadata structure  
**Solution**: Refresh the page. The fix is now deployed with proper Link component.

---

### Issue: Context Statistics not showing

**Cause**: Document was generated before the feature was implemented  
**Solution**: This is expected. Only newly generated documents will have context_stats.

---

## Summary

✅ **Source Documents Tracking**: Fully operational  
✅ **Context Statistics**: Visible in document viewer  
✅ **Clickable Links**: Navigate between related documents  
✅ **Audit Trail**: Complete lineage tracking  

**Test it now!**
1. Go to your project
2. Generate a document
3. View it
4. See your Project Charter listed under "Source Documents"
5. Click to navigate!

**Your document library is now an interconnected knowledge graph!** 🕸️🎯

