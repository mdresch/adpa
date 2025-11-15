# Source Document ID Backfill Script

**Date**: 2025-01-XX  
**Status**: ✅ Script Created - Ready to Run  
**Purpose**: Associate existing extracted entities with their source documents for full traceability

---

## 📋 Overview

This script backfills `source_document_id` for all existing extracted entities that don't have a source document assigned. It uses intelligent matching strategies to link entities to their most likely source documents.

---

## 🎯 Matching Strategies

The script uses three strategies to match entities to documents:

### **1. Project-Based Matching** (Required)
- Entities and documents must belong to the same `project_id`
- This is the primary filter - entities are only matched to documents from their project

### **2. Timestamp-Based Matching** (30% weight)
- Entities created within 7 days of document creation get higher scores
- Documents created before the entity (entity extracted from document) get bonus points
- This assumes entities are extracted shortly after documents are created

### **3. Content-Based Matching** (70% weight)
- **Entity name matching**: Entity name appears in document content/title (40% weight)
- **Exact name match**: Entity name matches document title exactly (20% bonus)
- **Description matching**: Entity description appears in document content (10% weight)
- Uses fuzzy text matching (normalized, word overlap similarity)

### **Scoring Threshold**
- Only matches with score ≥ 0.1 (10% confidence) are applied
- Lower scores are skipped to avoid incorrect associations

---

## 🚀 Usage

### **Dry Run (Recommended First)**

Test the script without making changes:

```bash
cd server
npm run backfill:source-documents:dry-run
```

This will:
- ✅ Show what would be updated
- ✅ Display match scores
- ✅ Provide statistics
- ❌ **Not make any database changes**

### **Live Run**

Apply the backfill:

```bash
cd server
npm run backfill:source-documents
```

This will:
- ✅ Update `source_document_id` for matched entities
- ✅ Update `updated_at` timestamp
- ✅ Provide detailed statistics

---

## 📊 What Gets Processed

The script processes **24 entity tables**:

1. `stakeholders`
2. `requirements`
3. `risks`
4. `milestones`
5. `constraints`
6. `success_criteria`
7. `best_practices`
8. `phases`
9. `resources`
10. `technologies`
11. `quality_standards`
12. `deliverables`
13. `scope_items`
14. `activities`
15. `work_items`
16. `project_iterations`
17. `capacity_plans`
18. `earned_value_metrics`
19. `opportunities`
20. `risk_responses`
21. `performance_actuals`
22. `team_agreements`
23. `development_approaches`
24. `performance_measurements`

---

## 📝 Example Output

```
🚀 Starting Source Document ID Backfill
========================================
Mode: LIVE (will update database)

📋 Processing table: stakeholders
   Found 45 entities without source_document_id
   📄 Project abc-123: 7 documents available
   ✅ Updated: 42, Skipped: 3

📋 Processing table: requirements
   Found 128 entities without source_document_id
   📄 Project abc-123: 7 documents available
   ✅ Updated: 115, Skipped: 13

...

============================================================
📊 Backfill Summary
============================================================
Total entities processed: 1,234
Successfully matched: 1,089
Could not match: 145
Match rate: 88.3%

📋 Detailed Results by Table:
   stakeholders              Total:    45 | Updated:    42 | Skipped:     3
   requirements              Total:   128 | Updated:   115 | Skipped:    13
   risks                     Total:    67 | Updated:    58 | Skipped:     9
   ...
```

---

## 🔍 How Matching Works

### **Example 1: Stakeholder Matching**

**Entity**:
- Name: "John Smith"
- Project: `project-abc`
- Created: `2025-01-10 14:30:00`

**Documents** (same project):
1. Document A: "Project Charter" - Created: `2025-01-08` - Contains "John Smith"
2. Document B: "Stakeholder Analysis" - Created: `2025-01-10 14:00:00` - Contains "John Smith"
3. Document C: "Risk Register" - Created: `2025-01-12` - No mention of "John Smith"

**Match Result**: Document B (best score)
- ✅ Same project
- ✅ Created before entity (entity extracted from document)
- ✅ Name appears in content
- ✅ Timestamp close (30 minutes difference)

### **Example 2: Requirement Matching**

**Entity**:
- Name: "User Authentication System"
- Description: "Users must be able to log in with email and password"
- Project: `project-xyz`
- Created: `2025-01-15`

**Documents**:
1. Document A: "Requirements Document" - Created: `2025-01-14` - Contains "User Authentication System" and description
2. Document B: "Project Plan" - Created: `2025-01-16` - Mentions authentication briefly

**Match Result**: Document A (best score)
- ✅ Same project
- ✅ Created before entity
- ✅ Exact name match in title
- ✅ Description matches content

---

## ⚠️ Limitations

1. **No Perfect Match**: Some entities may not match any document if:
   - Documents were deleted
   - Entity was manually created (not extracted)
   - Entity name/description doesn't appear in any document

2. **Multiple Documents**: If an entity could match multiple documents, the script picks the best match based on scoring. This may not always be 100% accurate.

3. **Historical Data**: For very old entities, timestamp matching may be less reliable.

4. **Manual Entities**: Entities created manually (not via extraction) won't have a source document and will be skipped.

---

## ✅ Verification

After running the script, verify results:

```sql
-- Check entities with source_document_id
SELECT 
  'stakeholders' as table_name,
  COUNT(*) as total,
  COUNT(source_document_id) as with_source,
  COUNT(*) - COUNT(source_document_id) as without_source
FROM stakeholders
UNION ALL
SELECT 'requirements', COUNT(*), COUNT(source_document_id), COUNT(*) - COUNT(source_document_id)
FROM requirements
-- ... repeat for other tables
```

---

## 🔄 Re-running

The script is **idempotent** - safe to run multiple times:
- Only updates entities where `source_document_id IS NULL`
- Won't overwrite existing `source_document_id` values
- Can be run again if new documents are added

---

## 📋 Next Steps

1. ✅ **Run dry-run** to see what would be updated
2. ✅ **Review statistics** to ensure reasonable match rate
3. ✅ **Run live** to apply changes
4. ✅ **Verify results** using SQL queries
5. ✅ **Test traceability** - Click through from entity to source document in UI

---

**Status**: ✅ Script Ready - Run `npm run backfill:source-documents:dry-run` to test

