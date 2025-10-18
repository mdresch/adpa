# Document Naming & Enhanced Metadata 📋

## 📝 **Document Name Formulation**

### **Current Format:**
```
{Template Name} - {Date}
```

### **Examples:**
- `Stakeholder Requirements Definition Plan - 10/17/2025`
- `Risk Management Plan - 10/17/2025`
- `Quality Assurance Strategy - 10/17/2025`
- `Business Analysis Approach - 10/17/2025`

### **Components:**
1. **Template Name**: The full name from the template (e.g., "Stakeholder Requirements Definition Plan")
2. **Separator**: ` - ` (space-dash-space)
3. **Date**: Localized date format (e.g., `10/17/2025` for en-US)

---

## 👤 **Author & Attribution**

### **New Author Section in Metadata:**
```json
{
  "author": {
    "user_id": "uuid-of-user",
    "name": "John Smith",
    "email": "john.smith@company.com",
    "role": "Document Author",
    "generated_at": "2025-10-17T15:29:10.833Z"
  }
}
```

### **Author Information Captured:**
- ✅ **User ID**: Unique identifier
- ✅ **Full Name**: Display name of the author
- ✅ **Email**: Contact information
- ✅ **Role**: "Document Author" (explicitly marked)
- ✅ **Generated At**: Timestamp when document was created

---

## 🏷️ **Template Category & Tags**

### **Category System:**
Templates now include a `category` field for organizational grouping:

```json
{
  "document": {
    "category": "Project Management",
    "tags": ["stakeholder", "requirements", "planning", "pmbok"]
  }
}
```

### **Common Categories:**
- **Project Management** (PMBOK documents)
- **Business Analysis** (BABOK documents)
- **Data Management** (DMBOK documents)
- **Risk Management**
- **Quality Assurance**
- **Stakeholder Management**
- **Compliance & Audit**
- **Strategic Planning**

### **Tag System:**
Templates include a `tags` array for fine-grained classification:

**Example Tags by Category:**

**Project Management:**
- `project-charter`, `scope`, `schedule`, `budget`, `risk`, `quality`

**Business Analysis:**
- `requirements`, `stakeholder`, `solution`, `enterprise-analysis`, `elicitation`

**Data Management:**
- `data-governance`, `data-quality`, `metadata`, `data-architecture`

**Quality Assurance:**
- `testing`, `quality-metrics`, `continuous-improvement`, `standards`

---

## 📊 **Complete Metadata Structure**

### **Enhanced Document Metadata:**
```json
{
  "document": {
    "name": "Stakeholder Requirements Definition Plan - 10/17/2025",
    "template_name": "Stakeholder Requirements Definition Plan",
    "template_id": "e5c9b103-ef2d-47e1-83a9-f306780314b6",
    "template_version": 1,
    "template_description": "Comprehensive plan for defining stakeholder requirements",
    "framework": "PMBOK 7",
    "category": "Project Management",
    "tags": ["stakeholder", "requirements", "planning", "pmbok", "analysis"],
    "generated_at": "2025-10-17T15:29:10.833Z",
    "last_updated": "2025-10-17T15:29:10.833Z",
    "language": "en",
    "encoding": "UTF-8",
    "mime_type": "text/markdown"
  },
  
  "author": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Smith",
    "email": "john.smith@company.com",
    "role": "Document Author",
    "generated_at": "2025-10-17T15:29:10.833Z"
  },
  
  "file_metrics": {
    "word_count": 1247,
    "character_count": 7856,
    "file_size_bytes": 7856,
    "file_size_kb": "7.67",
    "file_hash": "a1b2c3d4e5f67890abcdef1234567890...",
    "compression_ratio": 0.950
  },
  
  "pipeline": {
    "job_id": "12423e72-e149-4735-96ea-3a30a334c184",
    "request_id": "88e0e76f-383c-49d9-925e-9eb62c50d33c",
    "completed_at": "2025-10-17T15:29:10.833Z",
    "total_duration_ms": 58711,
    "total_duration_seconds": "58.71",
    "overall_quality_score": 0.7091,
    "stages_completed": 6,
    "framework": "PMBOK 7"
  },
  
  "ai_usage": {
    "provider_used": "google",
    "model_used": "gemini-2.5-flash",
    "total_tokens": 2547,
    "estimated_cost_usd": "0.000025",
    "ai_calls_made": 2
  },
  
  "quality_metrics": {
    "overall_score": 0.7091,
    "context_quality": 0.8150,
    "template_quality": 0.7500,
    "generation_quality": 0.8500,
    "injection_quality": 0.6375,
    "assurance_quality": 0.7081,
    "formatting_quality": 0.4941,
    "assessments_performed": 7,
    "issues_found": 0
  }
}
```

---

## 🔍 **Enhanced Search & Filtering**

### **Search by Category:**
```sql
SELECT * FROM documents 
WHERE metadata->>'category' = 'Project Management'
AND created_at > NOW() - INTERVAL '30 days';
```

### **Search by Tags:**
```sql
SELECT * FROM documents 
WHERE metadata->'document'->>'tags' @> '["stakeholder", "requirements"]';
```

### **Search by Author:**
```sql
SELECT * FROM documents 
WHERE metadata->'author'->>'name' = 'John Smith'
ORDER BY created_at DESC;
```

### **Combined Search:**
```sql
SELECT * FROM documents 
WHERE metadata->>'category' = 'Project Management'
  AND metadata->'author'->>'user_id' = '550e8400-e29b-41d4-a716-446655440000'
  AND (metadata->'quality_metrics'->>'overall_score')::numeric > 0.80
ORDER BY created_at DESC;
```

---

## 📈 **Analytics by Category & Tags**

### **Category Distribution:**
```sql
SELECT 
  metadata->'document'->>'category' as category,
  COUNT(*) as document_count,
  AVG((metadata->'quality_metrics'->>'overall_score')::numeric) as avg_quality,
  AVG((metadata->'ai_usage'->>'total_tokens')::integer) as avg_tokens
FROM documents
WHERE metadata IS NOT NULL
GROUP BY category
ORDER BY document_count DESC;
```

### **Tag Cloud:**
```sql
SELECT 
  jsonb_array_elements_text(metadata->'document'->'tags') as tag,
  COUNT(*) as frequency
FROM documents
WHERE metadata IS NOT NULL
GROUP BY tag
ORDER BY frequency DESC
LIMIT 50;
```

### **Author Productivity:**
```sql
SELECT 
  metadata->'author'->>'name' as author_name,
  COUNT(*) as documents_generated,
  AVG((metadata->'quality_metrics'->>'overall_score')::numeric) as avg_quality,
  SUM((metadata->'ai_usage'->>'total_tokens')::integer) as total_tokens,
  SUM((metadata->'ai_usage'->>'estimated_cost_usd')::numeric) as total_cost
FROM documents
WHERE metadata IS NOT NULL
GROUP BY author_name
ORDER BY documents_generated DESC;
```

---

## 🎯 **Use Cases**

### **1. Project Portfolio Management**
Filter all documents by category "Project Management" to see all PM-related deliverables across projects.

### **2. Author Attribution**
Track which team members are generating documents, their quality scores, and productivity metrics.

### **3. Template Performance by Category**
Compare quality scores and generation times across different document categories.

### **4. Tag-Based Discovery**
Find all documents related to "stakeholder" or "requirements" regardless of project or template.

### **5. Framework Compliance**
Identify all PMBOK 7 compliant documents with their quality scores and authors.

### **6. Cost Allocation**
Track AI generation costs by author, category, or project for budget management.

---

## 🚀 **Future Enhancements**

### **1. Auto-Tagging**
Use AI to automatically suggest tags based on document content:
```typescript
interface AutoTagging {
  suggestedTags: string[]
  confidence: number
  source: "ai-analysis" | "template-default" | "user-defined"
}
```

### **2. Category Hierarchy**
Support nested categories:
```json
{
  "category": "Project Management",
  "subcategory": "Risk Management",
  "specialty": "Financial Risk"
}
```

### **3. Author Teams**
Support multiple authors and contributors:
```json
{
  "author": { "primary": "John Smith" },
  "contributors": [
    { "name": "Jane Doe", "role": "Reviewer" },
    { "name": "Bob Wilson", "role": "Technical Editor" }
  ]
}
```

### **4. Custom Taxonomies**
Allow organizations to define custom categories and tag taxonomies:
```json
{
  "custom_taxonomy": {
    "department": "Engineering",
    "division": "Software Development",
    "project_phase": "Planning",
    "document_maturity": "Draft"
  }
}
```

---

## ✅ **Summary**

### **Document Naming:**
- ✅ Format: `{Template Name} - {Date}`
- ✅ Consistent and readable
- ✅ Includes template name and generation date

### **Author Attribution:**
- ✅ Explicit `author` section in metadata
- ✅ User ID, name, email, role
- ✅ Timestamp of creation

### **Categorization:**
- ✅ Template `category` for broad grouping
- ✅ Template `tags` array for detailed classification
- ✅ Searchable and filterable

### **Enhanced Metadata:**
- ✅ Complete document properties
- ✅ Full author information
- ✅ Category and tags
- ✅ Template description
- ✅ All pipeline metrics
- ✅ AI usage and costs
- ✅ Quality scores

**The document library now has enterprise-grade metadata for complete traceability, searchability, and analytics!** 🎉

