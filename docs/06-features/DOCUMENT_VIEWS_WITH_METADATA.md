# 📊 Document Views with Rich Metadata

## 🎯 **Enhanced Views**

Three powerful views for accessing documents with comprehensive metadata:

1. **`documents_review_queue`** - AI-generated docs needing review
2. **`documents_uploaded`** - User-uploaded, pre-reviewed docs
3. **`documents_with_metadata`** - ALL documents with full metadata

---

## 📋 **View 1: Review Queue**

### **Purpose:**
Shows AI-generated documents requiring review with complete pipeline metrics.

### **Query:**
```sql
SELECT * FROM documents_review_queue;
```

### **Available Fields:**

#### **Basic Information:**
- `id` - Document UUID
- `name` - Document name
- `status` - Current status (generated, under_review)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

#### **User Information:**
- `created_by` - User ID
- `author_name` - Full name of author
- `author_email` - Author's email

#### **Project Information:**
- `project_id` - Project UUID
- `project_name` - Project name
- `project_description` - Project description

#### **Template Information:**
- `template_id` - Template UUID
- `template_name` - Template name (e.g., "Stakeholder Requirements Definition Plan")
- `template_framework` - Framework (e.g., "PMBOK 7", "BABOK")
- `template_category` - Category (e.g., "Project Management")
- `template_tags` - Array of tags
- `template_version` - Template version number

#### **Document Metrics:**
- `word_count` - Total words
- `character_count` - Total characters
- `document_version` - Document version
- `file_size_kb` - File size in KB

#### **Category & Tags:**
- `category` - Document category from metadata
- `framework` - Framework from metadata
- `tags` - Tags array (JSONB)

#### **AI Generation Metrics:**
- `quality_score` - Overall quality (0.0-1.0)
- `ai_provider` - Provider used (e.g., "google", "mistral")
- `ai_model` - Model used (e.g., "gemini-2.5-flash")
- `tokens_used` - Total tokens consumed
- `generation_cost` - Estimated cost in USD
- `processing_time` - Total processing time in seconds

#### **Review Tracking:**
- `age` - Time since creation (interval)
- `age_hours` - Age in hours (numeric)
- `sla_status` - SLA compliance:
  - `on_time` - Within SLA
  - `approaching` - Nearing deadline (generated > 24h)
  - `overdue` - Past deadline (generated > 48h, under_review > 5 days)

### **Example Queries:**

#### **Get overdue documents:**
```sql
SELECT 
  name,
  author_name,
  template_name,
  quality_score,
  age_hours,
  sla_status
FROM documents_review_queue
WHERE sla_status = 'overdue'
ORDER BY age_hours DESC;
```

#### **Group by template:**
```sql
SELECT 
  template_name,
  template_framework,
  COUNT(*) as pending_count,
  AVG(quality_score::numeric) as avg_quality,
  AVG(age_hours) as avg_age_hours
FROM documents_review_queue
GROUP BY template_name, template_framework
ORDER BY pending_count DESC;
```

#### **Find high-quality docs needing quick review:**
```sql
SELECT 
  name,
  author_name,
  template_name,
  quality_score,
  ai_provider,
  age_hours
FROM documents_review_queue
WHERE quality_score::numeric > 0.80
  AND age_hours < 24
ORDER BY quality_score::numeric DESC;
```

---

## 📤 **View 2: Uploaded Documents**

### **Purpose:**
Shows user-uploaded documents (pre-reviewed) with source tracking.

### **Query:**
```sql
SELECT * FROM documents_uploaded;
```

### **Available Fields:**

All fields from Review Queue, PLUS:

#### **Upload Tracking:**
- `upload_source` - Source of upload:
  - `manual_upload`
  - `sharepoint_sync`
  - `github_import`
  - `confluence_sync`
  - `onedrive_sync`
  - `email_import`
- `uploader_name` - Person who uploaded
- `uploader_email` - Uploader's email

#### **Review Tracking:**
- `reviewed_at` - Auto-set on upload
- `reviewed_by` - Set to uploader
- `reviewer_name` - Reviewer's name
- `published_at` - If moved to published
- `published_by` - Who published it
- `publisher_name` - Publisher's name

#### **Metadata Fields:**
- `author_name` - From metadata (if different from uploader)
- `file_hash` - SHA-256 hash for integrity

### **Example Queries:**

#### **Get documents by upload source:**
```sql
SELECT 
  upload_source,
  COUNT(*) as count,
  SUM(word_count) as total_words,
  AVG(word_count) as avg_words
FROM documents_uploaded
GROUP BY upload_source
ORDER BY count DESC;
```

#### **Recent SharePoint uploads:**
```sql
SELECT 
  name,
  uploader_name,
  template_name,
  word_count,
  created_at,
  age
FROM documents_uploaded
WHERE upload_source = 'sharepoint_sync'
  AND age < INTERVAL '7 days'
ORDER BY created_at DESC;
```

#### **Find documents by template and uploader:**
```sql
SELECT 
  name,
  template_name,
  template_framework,
  uploader_name,
  word_count,
  created_at
FROM documents_uploaded
WHERE template_framework = 'PMBOK 7'
  AND uploader_name = 'John Smith'
ORDER BY created_at DESC;
```

---

## 🗂️ **View 3: All Documents with Metadata**

### **Purpose:**
Comprehensive view of ALL documents regardless of status.

### **Query:**
```sql
SELECT * FROM documents_with_metadata;
```

### **Available Fields:**

All fields from previous views, PLUS:

#### **Status Labels:**
- `status_label` - Human-readable status:
  - `📤 Uploaded (Pre-Reviewed)`
  - `🤖 Generated (Needs Review)`
  - `📝 Draft`
  - `👥 Under Review`
  - `✅ Reviewed`
  - `📢 Published`
  - `📦 Archived`

#### **Source Type:**
- `source_type` - Document origin:
  - `user_upload` - Manually uploaded
  - `ai_generated` - Created by pipeline
  - `manual` - Manually created

#### **All Review Tracking:**
- `review_notes` - Author's review comments
- `creator_name` - Original creator
- `reviewer_name` - Who reviewed
- `publisher_name` - Who published

### **Example Queries:**

#### **Get all documents for a project with full details:**
```sql
SELECT 
  name,
  status_label,
  source_type,
  template_name,
  template_framework,
  word_count,
  quality_score,
  creator_name,
  created_at
FROM documents_with_metadata
WHERE project_name = 'ADPA Implementation'
ORDER BY created_at DESC;
```

#### **Compare AI-generated vs uploaded documents:**
```sql
SELECT 
  source_type,
  COUNT(*) as document_count,
  AVG(word_count) as avg_words,
  AVG(quality_score::numeric) as avg_quality,
  SUM(tokens_used::integer) as total_tokens,
  SUM(generation_cost::numeric) as total_cost
FROM documents_with_metadata
WHERE source_type IN ('ai_generated', 'user_upload')
GROUP BY source_type;
```

#### **Find documents by framework and status:**
```sql
SELECT 
  template_framework,
  status_label,
  COUNT(*) as count
FROM documents_with_metadata
WHERE template_framework IN ('PMBOK 7', 'BABOK', 'DMBOK')
GROUP BY template_framework, status_label
ORDER BY template_framework, count DESC;
```

#### **Get documents with SLA issues:**
```sql
SELECT 
  name,
  status_label,
  creator_name,
  template_name,
  age_hours,
  sla_status
FROM documents_with_metadata
WHERE sla_status IN ('approaching', 'overdue')
ORDER BY 
  CASE sla_status
    WHEN 'overdue' THEN 1
    WHEN 'approaching' THEN 2
  END,
  age_hours DESC;
```

#### **Get quality metrics by template:**
```sql
SELECT 
  template_name,
  template_framework,
  COUNT(*) as total_docs,
  COUNT(CASE WHEN source_type = 'ai_generated' THEN 1 END) as ai_generated,
  COUNT(CASE WHEN source_type = 'user_upload' THEN 1 END) as uploaded,
  AVG(quality_score::numeric) as avg_quality,
  AVG(word_count) as avg_words,
  AVG(processing_time::numeric) as avg_processing_seconds
FROM documents_with_metadata
WHERE template_name IS NOT NULL
GROUP BY template_name, template_framework
ORDER BY total_docs DESC;
```

---

## 📊 **Visual Display Examples**

### **Review Queue Dashboard:**

```sql
-- Get review queue stats with template info
SELECT 
  d.id,
  d.name,
  d.status_label,
  d.creator_name,
  d.template_name,
  d.template_framework,
  d.template_category,
  d.quality_score,
  d.word_count,
  d.age_hours,
  d.sla_status,
  d.ai_provider,
  d.ai_model,
  d.processing_time
FROM documents_review_queue d
ORDER BY 
  CASE d.sla_status
    WHEN 'overdue' THEN 1
    WHEN 'approaching' THEN 2
    ELSE 3
  END,
  d.created_at ASC;
```

**Output:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│                    📋 DOCUMENTS REQUIRING REVIEW                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ⚠️  OVERDUE (2 documents)                                               │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ 🤖 Stakeholder Requirements Plan                           │         │
│  │    Template: PMBOK 7 Stakeholder Requirements Definition   │         │
│  │    Category: Project Management                            │         │
│  │    Author: John Smith                                      │         │
│  │    Quality: 70.9% │ Words: 1,247 │ Age: 51.3 hours ⚠️      │         │
│  │    AI: google/gemini-2.5-flash │ Time: 58.7s              │         │
│  │    [Review Now] [View Details]                             │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
│  🟡 APPROACHING SLA (1 document)                                         │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ 🤖 Risk Management Plan                                    │         │
│  │    Template: PMBOK 7 Risk Management Plan                 │         │
│  │    Category: Risk Management                               │         │
│  │    Author: Jane Doe                                        │         │
│  │    Quality: 82.3% │ Words: 2,156 │ Age: 28.5 hours 🟡      │         │
│  │    AI: mistral/mistral-large-latest │ Time: 62.3s         │         │
│  │    [Review Now] [View Details]                             │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
│  ✅ ON TIME (3 documents)                                                │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ 🤖 Quality Assurance Strategy                              │         │
│  │    Template: PMBOK 7 Quality Assurance Plan               │         │
│  │    Category: Quality Assurance                             │         │
│  │    Author: Bob Wilson                                      │         │
│  │    Quality: 88.1% │ Words: 1,823 │ Age: 5.2 hours ✅       │         │
│  │    AI: google/gemini-2.5-flash │ Time: 45.1s              │         │
│  │    [Review Now] [View Details]                             │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### **Uploaded Documents View:**

```sql
-- Get uploaded documents with template info
SELECT 
  name,
  upload_source,
  template_name,
  template_framework,
  template_category,
  uploader_name,
  word_count,
  created_at,
  age
FROM documents_uploaded
ORDER BY created_at DESC
LIMIT 10;
```

**Output:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│                 📤 UPLOADED DOCUMENTS (Pre-Reviewed)                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ ✅ Project Charter v2.0                                    │         │
│  │    Template: PMBOK 7 Project Charter                      │         │
│  │    Framework: PMBOK 7 │ Category: Project Management      │         │
│  │    Source: manual_upload │ Uploaded by: John Smith        │         │
│  │    Words: 3,456 │ Uploaded: 2 days ago                    │         │
│  │    [View] [Edit] [Publish]                                 │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ ✅ Requirements Specification                              │         │
│  │    Template: BABOK Business Requirements Document         │         │
│  │    Framework: BABOK │ Category: Business Analysis         │         │
│  │    Source: sharepoint_sync │ Uploaded by: Jane Doe        │         │
│  │    Words: 2,891 │ Uploaded: 5 days ago                    │         │
│  │    [View] [Edit] [Publish]                                 │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ ✅ Technical Design Document                               │         │
│  │    Template: Software Design Document                     │         │
│  │    Framework: Custom │ Category: Technical Documentation  │         │
│  │    Source: github_import │ Uploaded by: Bob Wilson        │         │
│  │    Words: 4,123 │ Uploaded: 1 week ago                    │         │
│  │    [View] [Edit] [Publish]                                 │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 **Advanced Filtering**

### **Filter by multiple criteria:**

```sql
SELECT 
  name,
  status_label,
  template_name,
  template_framework,
  template_category,
  creator_name,
  quality_score,
  word_count,
  age_hours
FROM documents_with_metadata
WHERE 
  template_framework = 'PMBOK 7'
  AND template_category = 'Project Management'
  AND status IN ('generated', 'reviewed')
  AND quality_score::numeric > 0.75
  AND word_count > 1000
ORDER BY quality_score::numeric DESC, created_at DESC;
```

### **Search by template tags:**

```sql
SELECT 
  name,
  template_name,
  template_tags,
  tags,
  creator_name,
  word_count
FROM documents_with_metadata
WHERE 
  template_tags @> ARRAY['stakeholder']
  OR tags @> '["stakeholder"]'::jsonb
ORDER BY created_at DESC;
```

---

## ✅ **Summary**

### **Three Powerful Views:**

1. **`documents_review_queue`**
   - AI-generated docs only
   - Needs review
   - SLA tracking
   - Quality metrics

2. **`documents_uploaded`**
   - User-uploaded only
   - Pre-reviewed
   - Upload source tracking
   - Immediately available

3. **`documents_with_metadata`**
   - ALL documents
   - Complete metadata
   - Status labels
   - Source type
   - Full lifecycle tracking

### **Key Features:**
- ✅ Template information (name, framework, category, tags)
- ✅ Quality metrics (score, AI provider, model)
- ✅ User tracking (creator, reviewer, publisher)
- ✅ Project association
- ✅ SLA monitoring
- ✅ Source tracking
- ✅ Rich metadata extraction
- ✅ Age calculation
- ✅ Human-readable labels

**All document views now include comprehensive template and metadata information!** 🎉

