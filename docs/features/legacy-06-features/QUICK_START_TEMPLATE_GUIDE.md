# Quick Start: Creating the Perfect Template

**5-Minute Guide to Understanding Template Components**

---

## 🎯 TL;DR (The Essentials)

**For 90% of templates, you only need**:
1. ⭐ **System Prompt** (tells AI how to behave) - 2,000 chars
2. 💬 **User Prompt** (provides specific data) - at runtime

**That's it!** Variables and template content are optional extras.

---

## 🧠 Part 1: System Prompt (THE MOST IMPORTANT)

### **What It Does**:
Tells the AI:
- **WHO** it is (role/expertise)
- **WHAT** to do (generate a charter)
- **HOW** to do it (extract from context, not make up data)
- **FORMAT** (Markdown with specific sections)

### **Your System Prompt Template**:

```
You are a [ROLE] specializing in [FRAMEWORK].

TASK: Create a [DOCUMENT TYPE] from the user's provided context.

EXTRACTION RULES:
1. ✅ DO: Extract real data from user's prompt
2. ❌ DON'T: Generate fake/example data
3. ✅ DO: Use actual names, dates, numbers
4. ❌ DON'T: Use placeholders like [Insert Name]

REQUIRED SECTIONS:
1. [Section Name] - [What to include]
2. [Section Name] - [What to include]
...

VALIDATION:
- No placeholders allowed
- All data must come from context
- Professional Markdown format

OUTPUT FORMAT: Pure Markdown
```

### **Example for Project Charter**:

```
You are a PROJECT DOCUMENT ANALYST creating a PMBOK 7 project charter.

EXTRACT FROM USER'S CONTEXT:
- Project name & purpose
- Stakeholders & roles
- Objectives & success criteria
- Scope (in/out)
- Timeline & budget
- Risks & assumptions

REQUIRED SECTIONS:
1. Project Overview (name, sponsor, PM, date, purpose)
2. Objectives (3-5 SMART objectives)
3. Scope (in-scope, out-of-scope)
4. Stakeholders (table with roles)
5. Success Criteria
6. Timeline
7. Budget
8. Risks
9. Approvals

RULES:
✅ Use REAL data from user's prompt
❌ NO placeholders like "[Project Name]"
✅ If data missing, state "Not specified in documentation"

OUTPUT: Professional Markdown document
```

**This alone will generate great documents!** ✅

---

## ✨ Part 2: Variables (Optional - For Reusability)

### **When to Use**:
- Template will be used many times with different values
- Same structure, different data each time
- Want consistent formatting

### **How They Work**:

**Step 1 - Define in Template**:
```
Name: projectName
Type: text
Required: yes
```

**Step 2 - Use in System Prompt**:
```
## Project Charter: {{projectName}}
**Sponsor:** {{sponsor}}
```

**Step 3 - User Provides at Runtime**:
```json
{
  "projectName": "Cloud Migration 2025",
  "sponsor": "Jane Smith, CIO"
}
```

**Step 4 - Backend Replaces**:
```
## Project Charter: Cloud Migration 2025
**Sponsor:** Jane Smith, CIO
```

**Benefit**: Consistent format every time! ✅

---

## 📄 Part 3: Template Content (Optional - Advanced Only)

### **When to Use**:
- Very complex documents (50+ pages)
- Need section-by-section generation
- Different AI settings per section
- Advanced quality validation

### **What It Looks Like**:
```json
{
  "sections": [
    {
      "name": "Executive Summary",
      "prompt_guidance": "Summarize in ≤ 500 words",
      "ai_model": "gpt-4",
      "temperature": 0.5
    },
    {
      "name": "Technical Details",
      "prompt_guidance": "Detailed technical specs",
      "ai_model": "gpt-4",
      "temperature": 0.3
    }
  ]
}
```

**For 90% of templates**: Leave as `{}` (empty) - system prompt is enough!

---

## 💬 Part 4: User Prompt (At Runtime)

### **What User Provides**:

```
"Create a project charter for cloud migration project.

Details:
- Moving from on-premise to AWS
- Budget: $500,000
- Timeline: 6 months
- Team: John (IT Lead), Mary (Finance), Robert (CEO)
- Goals: Cut costs 30%, improve scalability
- Risks: Data migration, staff training, downtime"
```

### **Backend Enriches With** (automatically):

```
+ Project metadata (if linked to project)
+ Related documents (if selected)
+ Integration data (if enabled)
+ Stakeholder info (from database)
```

### **Final Context to LLM**:

```
[User's prompt above]

PROJECT CONTEXT:
- Project ID: proj_123
- Created: 2025-10-01
- Department: IT
- Related docs: 3 requirements docs
```

---

## 🔄 The Complete Journey (One Picture)

```
┌──────────────────────────────────────────────────────┐
│              YOU CONFIGURE (Edit Page)                │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Tab 1: Basic Info                                   │
│  ├─ Name: "Project Charter"                          │
│  ├─ Framework: "Custom"                              │
│  └─ Quality: 70%                                     │
│                                                       │
│  Tab 2: AI Prompts ⭐ MOST IMPORTANT                 │
│  └─ System Prompt: "You are a PM expert...          │
│                     Extract from context...          │
│                     Required sections...             │
│                     No placeholders..."              │
│                     (2,000 characters)               │
│                                                       │
│  Tab 3: Variables (optional)                         │
│  └─ {{projectName}}, {{sponsor}}, {{budget}}        │
│                                                       │
│  Tab 4: Template Content (usually skip)              │
│  └─ {} (empty - system prompt is enough)            │
│                                                       │
│  [Save Template]                                     │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│           USER GENERATES (AI Page)                    │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Select Template: "Project Charter"                  │
│                                                       │
│  Provide Variables (if defined):                     │
│  ├─ projectName: "Cloud Migration 2025"             │
│  ├─ sponsor: "Jane Smith"                            │
│  └─ budget: "$500,000"                              │
│                                                       │
│  Enter Prompt:                                       │
│  └─ "Migration to AWS, 6 months, stakeholders:      │
│      John, Mary, Robert. Objectives: -30% cost..."  │
│                                                       │
│  [Generate Document]                                 │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│            BACKEND COMBINES (Automatic)               │
├──────────────────────────────────────────────────────┤
│                                                       │
│  1. Get system prompt from template                  │
│  2. Replace {{variables}} with user values           │
│  3. Add user's prompt                                │
│  4. Enrich with project/document context            │
│  5. Build final LLM request                          │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│           FINAL LLM REQUEST                          │
├──────────────────────────────────────────────────────┤
│                                                       │
│  System Message:                                     │
│  "You are a PM expert creating charter for          │
│   Cloud Migration 2025 with sponsor Jane Smith...   │
│                                                       │
│   EXTRACT from context, NO fake data                │
│   Required sections: Overview, Objectives...         │
│   No placeholders allowed"                           │
│                                                       │
│  User Message:                                       │
│  "Migration to AWS, budget $500,000, 6 months...    │
│                                                       │
│   CONTEXT:                                           │
│   - Stakeholders: John, Mary, Robert                │
│   - Objectives: -30% cost, scalability              │
│   - Risks: migration, training, downtime"           │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│              LLM GENERATES                           │
├──────────────────────────────────────────────────────┤
│                                                       │
│  # Project Charter: Cloud Migration 2025            │
│  **Sponsor:** Jane Smith, CIO                       │
│  **Budget:** $500,000                               │
│                                                       │
│  ## 1. Project Overview                             │
│  Migration of on-premise infrastructure to AWS...   │
│                                                       │
│  ## 2. Objectives                                   │
│  1. Reduce infrastructure costs by 30%              │
│  2. Improve scalability for 3x traffic...           │
│                                                       │
│  [... complete document with REAL data ...]         │
│                                                       │
│  Quality: 87.4% > 70% threshold ✅                  │
│  Result: SUCCESS                                    │
└──────────────────────────────────────────────────────┘
```

---

## 🎯 Action Steps for You

### **Right Now - Edit Your Template**:

1. **Click Edit** on your template
2. **Go to "AI Prompts" tab**
3. **Update system prompt** with:
   ```
   CUSTOM COMPLIANCE RULES (Add these):
   
   Your Company Requirements:
   1. ✅ Must include company legal disclaimer
   2. ✅ Follow internal doc format
   3. ✅ Risk assessment must categorize properly
   4. ✅ Budget in approved format
   5. ✅ Executive sign-off section
   
   BUSINESS JUSTIFICATION:
   - Why does this document exist?
   - What business need does it address?
   - Who will use it and how?
   ```
4. **Increment version**: v1 → v2
5. **Save**

### **Then Test**:

1. Go to `/ai` page
2. Select your updated template
3. Generate a document
4. See improved quality with custom rules!

---

## 📚 Summary

| Component | Priority | When to Use | Example |
|-----------|----------|-------------|---------|
| **System Prompt** | ⭐⭐⭐⭐⭐ | Always! | "You are a PM expert... Extract... Validate..." |
| **User Prompt** | ⭐⭐⭐⭐⭐ | Always! | "Create charter for cloud migration..." |
| **Variables** | ⭐⭐⭐ | If reusing often | `{{projectName}`, `{{sponsor}}` |
| **Template Content** | ⭐ | Only complex docs | `{"sections": [...]}` |

**Focus 80% of effort on System Prompt!** That's where the magic happens! 🎯

---

**Ready to edit your template and make it perfect?**

Navigate to: http://localhost:3001/templates/27788b37-2aa2-473f-accc-5a9e7eec7c48/edit

---

**End of Quick Start Guide**

