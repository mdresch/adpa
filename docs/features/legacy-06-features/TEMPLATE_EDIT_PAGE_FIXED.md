# Template Edit Page - Backend Validation Fix

**Date**: October 18, 2025  
**Issue**: Backend rejecting quality_threshold and prompt_version fields  
**Status**: ✅ **FIXED**

---

## 🐛 The Problem

**User tried to save template** from edit page and got error:

```json
{
  "errors": [
    {"field": "quality_threshold", "message": "\"quality_threshold\" is not allowed"},
    {"field": "prompt_version", "message": "\"prompt_version\" is not allowed"}
  ],
  "schemaKeys": ["name", "description", "framework", "category", "content", 
                 "variables", "is_public", "system_prompt", "template_paragraphs"]
}
```

**Root Cause**: Backend validation schema didn't include these fields!

---

## ✅ The Fix

### **Updated Backend Validation** (`server/src/routes/templates.ts`)

**Added to Joi schema**:
```typescript
validate(Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  framework: Joi.string().valid("TOGAF", "SABSA", "COBIT", "ITIL", "Custom", 
                                 "BABOK", "BABOK v3", "PMBOK", "PMBOK 7", 
                                 "DMBOK", "DMBOK 2.0").optional(),
  category: Joi.string().max(100).optional(),
  content: Joi.object().optional(),
  variables: Joi.array().optional(),
  is_public: Joi.boolean().optional(),
  system_prompt: Joi.string().max(10000).optional(),  // ← Increased from 5000
  quality_threshold: Joi.number().min(0).max(1).optional(),  // ← NEW!
  prompt_version: Joi.number().integer().min(1).optional(),  // ← NEW!
  template_paragraphs: Joi.array().items(...).optional(),
}))
```

**Added to SQL UPDATE**:
```sql
UPDATE templates 
SET ...
    quality_threshold = COALESCE($10, quality_threshold),  -- NEW
    prompt_version = COALESCE($11, prompt_version),        -- NEW
    updated_at = CURRENT_TIMESTAMP
WHERE id = $12
```

**Added to parameter array**:
```typescript
[
  name,
  description,
  ...
  quality_threshold,  // NEW - position 10
  prompt_version,     // NEW - position 11
  id,                 // position 12
]
```

---

## 📋 What's Now Editable

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| name | string | 2-255 chars | Template name |
| description | string | 0-1000 chars | Template description |
| framework | enum | 11 options | PMBOK 7, BABOK v3, Custom, etc. |
| category | string | 0-100 chars | Planning, Analysis, etc. |
| content | JSON | object | Template structure |
| variables | JSON | array | Dynamic placeholders |
| is_public | boolean | true/false | Public visibility |
| system_prompt | string | 0-10,000 chars | AI instructions (increased!) |
| **quality_threshold** | **number** | **0-1 (0-100%)** | **Min quality score** ✅ |
| **prompt_version** | **number** | **1+** | **Prompt version** ✅ |
| template_paragraphs | JSON | array | Section definitions |

---

## 🎯 Now You Can Edit

**From Template Edit Page**:
✅ Change quality threshold (50% to 95%)
✅ Increment prompt version (v1 → v2 → v3)
✅ Update system prompt (now up to 10,000 characters!)
✅ Add/modify variables
✅ Change framework (including all PMBOK/BABOK/DMBOK variants)
✅ Toggle public/private

---

## 🚀 Try Again

**Your template save will now work!**

1. Go back to edit page
2. Make your changes
3. Click "Save Template"
4. ✅ Success! No more validation errors

---

**Backend is now ready to accept all template edit fields!** 🎯

---

**End of Fix Report**

