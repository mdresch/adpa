# Template Edit Page - Complete Implementation

**Date**: October 18, 2025  
**File**: `app/templates/[id]/edit/page.tsx`  
**Status**: ✅ **CREATED** (476 lines)

---

## 🎯 What Was Built

A comprehensive template editing interface where users can modify:

1. ✅ **Basic Information** - Name, description, framework, category
2. ✅ **AI System Prompts** - The main AI guidance for generation
3. ✅ **Template Content** - JSON structure for advanced processing
4. ✅ **Variables** - Dynamic placeholders for customization
5. ✅ **Quality Settings** - Threshold and versioning
6. ✅ **Visibility** - Public/private toggle with recommendations

---

## 📋 Page Structure

### **4 Main Tabs**

```
┌────────────────────────────────────────┐
│ [Basic Info] [AI Prompts] [Content] [Variables] │
└────────────────────────────────────────┘
```

#### **Tab 1: Basic Info** (Template Configuration)
- Template Name * (required)
- Description * (required)
- Framework dropdown (PMBOK 7, BABOK v3, DMBOK 2.0, Custom, etc.)
- Category dropdown (Planning, Analysis, etc.)
- Quality Threshold (0-100%, default 70%)
- Prompt Version (auto-increment button)
- Public/Private toggle

#### **Tab 2: AI Prompts** (System Prompt Editor)
- Large textarea for system prompt
- Character counter
- Best practices guide
- Example prompts
- Info panel explaining system prompts

#### **Tab 3: Template Content** (JSON Structure)
- JSON editor for template structure
- Format JSON button
- Clear button
- Used by advanced document processors
- Info panel explaining when to use

#### **Tab 4: Variables** (Dynamic Placeholders)
- Add/Remove variables
- Variable configuration:
  - Name (e.g., `projectName`)
  - Type (text, number, date, boolean)
  - Description
  - Default value
  - Required checkbox
- Usage example: `{{variableName}}`
- How-to guide

---

## 🎨 Features

### **Smart Validation**
```typescript
// Before save
✅ Name required
✅ Description required
✅ JSON validation for template content
✅ Quality threshold range check (0-100)
```

### **Auto-Save Protection**
```typescript
// Unsaved changes warning
if (formDirty) {
  confirm('You have unsaved changes. Discard?')
}
```

### **Visibility Recommendations**
```typescript
// Warning if making non-validated template public
if (status !== 'validated' && status !== 'production' && isPublic) {
  ⚠️  "Recommended: Keep private until Validated stage"
}
```

### **Prompt Version Management**
```typescript
// Increment button
onClick={() => {
  setPromptVersion(prev => prev + 1)
  toast.info(`Prompt version incremented to v${newVersion}`)
}}
```

---

## 📝 System Prompt Editor

### **What Users Can Do**:

**Define AI Behavior**:
```
You are a [ROLE] specializing in [EXPERTISE].

Your task is to [PRIMARY TASK].

RULES:
1. ✅ DO: [Specific instruction]
2. ❌ DON'T: [What to avoid]
3. ✅ EXTRACT: [What to pull from context]
4. ❌ DON'T GENERATE: [What not to create]

OUTPUT FORMAT:
[Specify Markdown structure]

QUALITY REQUIREMENTS:
- [Requirement 1]
- [Requirement 2]
```

**Best Practices Panel**:
- Define AI's role clearly
- Specify extraction vs. generation
- List required document sections
- Include DO and DON'T instructions
- Request specific output format
- Set tone and style expectations

---

## 🔧 Variables System

### **How Variables Work**

**1. Define in Template**:
```typescript
{
  name: "projectName",
  description: "Name of the project",
  type: "text",
  required: true
}
```

**2. Use in System Prompt**:
```
Create a project charter for {{projectName}} with budget {{budget}}
```

**3. User Provides at Generation Time**:
```json
{
  "projectName": "Cloud Migration 2025",
  "budget": "$500,000"
}
```

**4. AI Receives**:
```
Create a project charter for Cloud Migration 2025 with budget $500,000
```

### **Variable Types Supported**:
- **text**: Strings, names, descriptions
- **number**: Budgets, counts, percentages
- **date**: Dates, deadlines, milestones
- **boolean**: True/false flags

---

## 💾 Save Functionality

### **What Gets Saved**:

```json
{
  "name": "Updated template name",
  "description": "Updated description",
  "framework": "Custom",
  "category": "Planning",
  "system_prompt": "Full system prompt text...",
  "content": { /* JSON structure */ },
  "variables": [/* array of variables */],
  "quality_threshold": 0.70,  // 70%
  "prompt_version": 2,
  "is_public": false
}
```

### **Backend API Call**:
```typescript
PUT /api/templates/{id}
Headers: Authorization: Bearer {token}
Body: JSON payload above
```

### **After Save**:
- ✅ Cache cleared
- ✅ Template updated in database
- ✅ Redirected to template detail page
- ✅ Success toast shown

---

## 🎨 UI Components

### **Header Section**:
```
[← Back]  Edit Template

Modify template configuration, prompts, and content

[development_status badge] [Version X badge]

[Cancel] [Save Changes]
```

### **Preview Section** (Bottom):
```
┌─────────────────────────────────────┐
│ 📄 Template Preview                 │
├─────────────────────────────────────┤
│  Template Name                      │
│  Template description               │
│                                     │
│  [PMBOK 7] [Planning] [Public] [v2] │
│                                     │
│  System Prompt Preview:             │
│  You are a PROJECT DOCUMENT...     │
│                                     │
│  Variables: 3                       │
│  [projectName] [budget] [deadline]  │
└─────────────────────────────────────┘
```

---

## 🚀 Usage Flow

### **To Edit a Template**:

1. **Navigate**: Templates list → Click Edit button
2. **Edit Basic Info**: Name, framework, category
3. **Update System Prompt**: Define AI behavior
4. **Add Variables** (optional): Dynamic placeholders
5. **Set Quality Threshold**: Minimum success percentage
6. **Toggle Visibility**: Public/private
7. **Preview**: Check how it looks
8. **Save**: Updates template

### **When to Increment Prompt Version**:
- Changed system prompt significantly
- Modified AI instructions
- Altered output structure
- Updated quality requirements

**Benefit**: Track which version generated which documents

---

## 📊 Integration with Lifecycle

### **Edit Restrictions by Stage**:

| Stage | Can Edit? | Recommendations |
|-------|-----------|-----------------|
| ⚪ Draft | ✅ Full edit | Make changes freely |
| 🔵 Testing | ✅ Full edit | Increment version if changing prompts |
| 🟣 Compliance | ⚠️ Limited | Avoid major changes during review |
| 🟡 Validated | ⚠️ Careful | Increment version, may need re-validation |
| 🟢 Production | ⚠️ Careful | Create new version or fork template |
| 📦 Archived | ❌ Read-only | Cannot edit archived templates |

**Best Practice**: Increment `prompt_version` when making significant changes to track document lineage

---

## 🔐 Permissions

### **Who Can Edit**:
- ✅ Template creator (owner)
- ✅ System administrators
- ✅ Users with `templates.update` permission
- ❌ Regular users (view only)

### **Permission Checks**:
```typescript
// In component
const { hasPermission } = useAuth()

// Backend
requirePermission("templates.update")

// Database
created_by = current_user.id OR role = 'admin'
```

---

## 💡 Key Features

### **1. System Prompt is Primary**
- Most important field
- Guides AI generation
- Can work standalone (without content/variables)
- Large textarea with examples

### **2. Template Content is Optional**
- Used by advanced processors only
- Can be left as `{}`
- JSON format
- Most templates don't need this

### **3. Variables Enable Reusability**
- Define once, use many times
- Dynamic document generation
- Type-safe values
- Optional default values

### **4. Quality Control**
- Set threshold per template
- Some templates may need higher quality (90%)
- Others can be more lenient (60%)

### **5. Version Tracking**
- Track prompt changes
- Know which version generated which document
- Helpful for debugging
- Required for auditing

---

## 📋 Example: Editing Your Project Charter Template

### **Current State**:
```
Name: Project Charter - Template Builder
Framework: Custom
Status: Compliance Review
Prompt Version: v1
```

### **What You Can Change**:

**Basic Info**:
- ✅ Keep name or rename
- ✅ Update description
- ✅ Framework: Custom (already set)
- ✅ Category: Planning → Business Architecture?

**System Prompt**:
- ✅ Add more detailed PMBOK 7 instructions
- ✅ Specify custom compliance rules
- ✅ Define required sections explicitly
- ✅ Add DO/DON'T examples

**Variables** (if needed):
- ✅ `{{projectName}}` - Project title
- ✅ `{{sponsor}}` - Project sponsor name
- ✅ `{{budget}}` - Estimated budget
- ✅ `{{deadline}}` - Target completion date

**Quality**:
- ✅ Increase to 80% (higher standard)
- ✅ Increment to v2 (if changing prompts)

---

## 🎯 What This Enables

### **For Template Creators**:
1. ✅ Full control over AI behavior
2. ✅ Define exact output requirements
3. ✅ Create reusable templates with variables
4. ✅ Set quality standards per template
5. ✅ Track version history

### **For Teams**:
1. ✅ Consistent document generation
2. ✅ Customizable templates
3. ✅ Quality-controlled outputs
4. ✅ Framework-aligned documents

---

## 🚀 Next Steps

**To Test**:
1. Navigate to: http://localhost:3001/templates/27788b37-2aa2-473f-accc-5a9e7eec7c48/edit
2. See all template settings
3. Modify system prompt
4. Add variables
5. Save changes

**The edit page is ready to use!** 🎯

---

**End of Template Edit Page Documentation**

