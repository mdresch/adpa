# Visual Guide: Template Components → LLM Request

**Date**: October 18, 2025  
**Purpose**: Visual explanation of how template pieces combine into perfect LLM requests

---

## 🎨 The Complete Flow (Visual)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TEMPLATE EDIT PAGE                              │
│                  (Your Configuration)                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐     ┌──────────────┐
│ System       │    │ Variables    │     │ Template     │
│ Prompt       │    │ (Optional)   │     │ Content      │
│              │    │              │     │ (Optional)   │
│ "You are a   │    │ projectName  │     │ {sections:   │
│ PM expert... │    │ sponsor      │     │  [...]}      │
│              │    │ budget       │     │              │
│ Extract...   │    │              │     │              │
│ Do not...    │    │              │     │              │
└──────────────┘    └──────────────┘     └──────────────┘
        │                     │                     │
        │          ┌──────────┴──────────┐          │
        │          │                     │          │
        ▼          ▼                     ▼          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RUNTIME (User Generates)                          │
│                         /ai Page                                     │
└─────────────────────────────────────────────────────────────────────┘
        │                                         │
        ▼                                         ▼
┌──────────────────┐                    ┌──────────────────┐
│ User Provides    │                    │ User Enters      │
│ Variable Values  │                    │ Prompt           │
│                  │                    │                  │
│ projectName:     │                    │ "Create a        │
│ "Cloud Migration"│                    │  project charter │
│                  │                    │  for cloud       │
│ sponsor:         │                    │  migration...    │
│ "Jane Smith"     │                    │  Budget $500K... │
│                  │                    │  Timeline 6mo... │
│ budget: "$500K"  │                    │  Stakeholders... │
└──────────────────┘                    │  Objectives...   │
        │                               │  Risks..."       │
        │                               └──────────────────┘
        │                                         │
        └───────────────┬─────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  BACKEND PROCESSING                                  │
│              (server/src/routes/ai.ts)                              │
└─────────────────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 1. Get       │ │ 2. Replace   │ │ 3. Build     │
│ Template     │ │ Variables    │ │ Context      │
│              │ │              │ │              │
│ SELECT *     │ │ {{project}}  │ │ Extract:     │
│ FROM         │ │ → "Cloud..."│ │ - Project    │
│ templates    │ │              │ │ - Documents  │
│              │ │ {{sponsor}}  │ │ - Integr.    │
│              │ │ → "Jane..."  │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│               4. COMBINE INTO FINAL REQUEST                          │
│                                                                      │
│  System Message:                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ You are a PM expert creating project charter for           │    │
│  │ Cloud Migration Initiative 2025 with sponsor Jane Smith... │    │
│  │                                                             │    │
│  │ EXTRACT: project name, objectives, stakeholders...          │    │
│  │ DO NOT: generate fake data, use placeholders...            │    │
│  │                                                             │    │
│  │ STRUCTURE:                                                  │    │
│  │ ## Project Charter: Cloud Migration Initiative 2025        │    │
│  │ **Sponsor:** Jane Smith                                     │    │
│  │ ### 1. Overview...                                          │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  User Message:                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Create a project charter for cloud migration...            │    │
│  │                                                             │    │
│  │ CONTEXT:                                                    │    │
│  │ - Budget: $500,000                                          │    │
│  │ - Timeline: 6 months                                        │    │
│  │ - Stakeholders: John Doe (IT), Mary (Finance)...           │    │
│  │ - Objectives: 30% cost reduction, scalability...           │    │
│  │ - Risks: Data migration, training, downtime...             │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                5. SEND TO LLM (Google Gemini / OpenAI)              │
│                                                                      │
│  POST https://api.openai.com/v1/chat/completions                   │
│  {                                                                   │
│    "model": "gpt-4",                                                │
│    "messages": [                                                     │
│      { "role": "system", "content": "[System Prompt]" },           │
│      { "role": "user", "content": "[User Prompt + Context]" }      │
│    ],                                                                │
│    "temperature": 0.7,                                              │
│    "max_tokens": 4000                                               │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  6. LLM GENERATES DOCUMENT                           │
│                                                                      │
│  # Project Charter: Cloud Migration Initiative 2025                 │
│                                                                      │
│  **Sponsor:** Jane Smith, CIO                                       │
│  **Budget:** $500,000                                               │
│  **Timeline:** 6 months                                             │
│                                                                      │
│  ## 1. Project Overview                                             │
│  This project aims to migrate on-premise infrastructure to AWS...   │
│                                                                      │
│  ## 2. Objectives                                                   │
│  1. Reduce infrastructure costs by 30%                              │
│  2. Improve system scalability for 3x traffic...                    │
│                                                                      │
│  [... full markdown document ...]                                   │
└─────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│              7. QUALITY ANALYSIS & VALIDATION                        │
│                                                                      │
│  Document Quality Check:                                             │
│  ✅ Has sections (10/10)                                            │
│  ✅ Proper Markdown formatting                                      │
│  ✅ No placeholders found                                           │
│  ✅ Word count: 2,500 words                                         │
│  ✅ Professional tone                                                │
│  ✅ Real data extracted from context                                │
│                                                                      │
│  Overall Quality Score: 87.4% > 70% threshold ✅                    │
│  Result: SUCCESS                                                     │
│                                                                      │
│  Track Validation:                                                   │
│  - validation_count++ (now 4)                                       │
│  - success_count++ (now 4)                                          │
│  - success_rate = 100%                                              │
└─────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                8. RETURN TO USER                                     │
│                                                                      │
│  ✅ Markdown document ready                                         │
│  ✅ Quality: 87.4%                                                  │
│  ✅ Tokens used: 3,247                                              │
│  ✅ Processing time: 4.2s                                           │
│                                                                      │
│  [Download Markdown] [Copy] [Create Project from This]             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Component Breakdown

### **1. System Prompt (The Brain)** 🧠

```
┌─────────────────────────────────────┐
│ SYSTEM PROMPT                       │
├─────────────────────────────────────┤
│                                     │
│ 🎭 ROLE DEFINITION                  │
│ "You are a [Expert Role]..."        │
│ → Gives AI expertise & personality  │
│                                     │
│ 📋 EXTRACTION RULES                 │
│ "✅ EXTRACT from context"           │
│ "❌ DO NOT generate fake data"     │
│ → Controls how AI uses input        │
│                                     │
│ 📐 STRUCTURE                        │
│ "Required sections:                 │
│  1. Overview                        │
│  2. Objectives..."                  │
│ → Defines output format             │
│                                     │
│ ✅ VALIDATION                       │
│ "No placeholders allowed"           │
│ "All data from context"             │
│ → Sets quality rules                │
│                                     │
│ 📄 OUTPUT FORMAT                    │
│ "Pure Markdown, professional tone"  │
│ → Specifies delivery format         │
└─────────────────────────────────────┘
         │
         ▼
    AI Behavior Defined ✅
```

---

### **2. Variables (The Customizer)** ✨

```
┌──────────────────────────────────────────┐
│ VARIABLES SYSTEM                         │
├──────────────────────────────────────────┤
│                                          │
│ In System Prompt:                        │
│ ┌──────────────────────────────────────┐ │
│ │ ## Charter: {{projectName}}          │ │
│ │ **Sponsor:** {{sponsor}}             │ │
│ │ **Budget:** {{budget}}               │ │
│ └──────────────────────────────────────┘ │
│                                          │
│         ▼ (at runtime)                   │
│                                          │
│ User Provides Values:                    │
│ ┌──────────────────────────────────────┐ │
│ │ projectName: "Cloud Migration 2025"  │ │
│ │ sponsor: "Jane Smith, CIO"           │ │
│ │ budget: "$500,000"                   │ │
│ └──────────────────────────────────────┘ │
│                                          │
│         ▼ (backend replaces)             │
│                                          │
│ Final Prompt:                            │
│ ┌──────────────────────────────────────┐ │
│ │ ## Charter: Cloud Migration 2025     │ │
│ │ **Sponsor:** Jane Smith, CIO         │ │
│ │ **Budget:** $500,000                 │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
         │
         ▼
    Dynamic Reusability ✅
```

**Why use variables?**:
- ✅ One template → many documents
- ✅ Consistent formatting
- ✅ Type-safe values
- ✅ Default values support

---

### **3. Template Content (The Architect)** 📄

```
┌────────────────────────────────────────────┐
│ TEMPLATE CONTENT (JSON)                    │
├────────────────────────────────────────────┤
│ {                                          │
│   "sections": [                            │
│     {                                      │
│       "name": "Project Overview",          │
│       "type": "required",                  │
│       "prompt_guidance": "Extract PM,      │
│                          sponsor, purpose" │
│     },                                     │
│     {                                      │
│       "name": "Objectives",                │
│       "type": "required",                  │
│       "prompt_guidance": "List 3-5 SMART   │
│                          objectives"       │
│     }                                      │
│   ]                                        │
│ }                                          │
└────────────────────────────────────────────┘
         │
         ▼ (used by advanced processor)
┌────────────────────────────────────────────┐
│ MULTI-STAGE PROCESSING                     │
├────────────────────────────────────────────┤
│                                            │
│ For each section:                          │
│  1. Build section-specific prompt          │
│  2. Call LLM for that section             │
│  3. Validate section quality              │
│  4. Assemble into final document          │
│                                            │
│ Benefits:                                  │
│  ✅ Better quality per section            │
│  ✅ Section-specific AI settings          │
│  ✅ Granular validation                   │
└────────────────────────────────────────────┘
```

**When to use**:
- ✅ Very complex documents (50+ pages)
- ✅ Different AI models per section
- ✅ Section-specific validation rules

**When to skip**:
- ✅ Simple documents (most cases!)
- ✅ Single-pass generation works fine
- ✅ System prompt is sufficient

---

### **4. User Prompt (The Specifics)** 💬

```
┌──────────────────────────────────────────┐
│ USER PROMPT (At Runtime)                 │
├──────────────────────────────────────────┤
│                                          │
│ What user types on /ai page:             │
│ ┌──────────────────────────────────────┐ │
│ │ "Create a project charter for our    │ │
│ │  cloud migration initiative.         │ │
│ │                                      │ │
│ │  Details:                            │ │
│ │  - Move to AWS from on-premise       │ │
│ │  - Budget: $500,000                  │ │
│ │  - Timeline: 6 months                │ │
│ │  - Stakeholders: John (IT), Mary...  │ │
│ │  - Goals: 30% cost reduction...      │ │
│ │  - Risks: Migration complexity..."   │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Backend enriches with:                   │
│  + Project metadata (if project linked) │
│  + Document context (if docs selected)  │
│  + Integration data (if enabled)        │
└──────────────────────────────────────────┘
```

---

## 💡 The Magic Combination

### **Example: Your Custom Project Charter**

**🧠 System Prompt** (What you configure):
```
Role: PROJECT DOCUMENT ANALYST
Rules: Extract from context, no fake data
Structure: 9 sections (Overview, Objectives, Scope...)
Validation: No placeholders
Format: Markdown
```

**✨ Variables** (What you define):
```
{{projectName}} = "Cloud Migration 2025"
{{sponsor}} = "Jane Smith"
{{budget}} = "$500,000"
```

**💬 User Prompt** (What user types):
```
Real project details:
- Moving to AWS
- 6-month timeline
- Stakeholders: John, Mary, Robert
- Objectives: Cost -30%, scalability, DR
- Risks: Migration, training, downtime
```

**= Final LLM Request**:
```
SYSTEM: You are a PROJECT DOCUMENT ANALYST...
        Create charter for Cloud Migration 2025...
        Sponsor: Jane Smith...
        
        EXTRACT from context
        NO placeholders
        9 sections required
        
USER: [Real project details from user]
      Budget: $500,000
      Timeline: 6 months
      Stakeholders: [actual names]
      Objectives: [specific goals]
      
      Create professional PMBOK-compliant charter
```

**= Generated Document**: ✅ **High-quality, real-data charter!**

---

## 🎓 Practical Examples

### **Example 1: Simple Template (System Prompt Only)**

**Use Case**: Meeting Notes

#### **Configuration**:

**System Prompt**:
```
You are a MEETING SECRETARY.

Extract from user's notes:
- Meeting date & time
- Attendees
- Topics discussed
- Decisions made
- Action items

FORMAT:
# Meeting Notes: [Date]
**Attendees:** [Names]

## Discussion
[Summary]

## Decisions
1. [Decision]

## Actions
- [ ] [Task] - [Owner] - [Due Date]
```

**Variables**: None  
**Template Content**: None

#### **User Prompt**:
```
"Meeting on Oct 18 with John, Mary, and Bob. Discussed Q4 budget. 
Decided to approve $50K for new CRM. Action: Mary to get 3 quotes by Oct 25."
```

#### **LLM Receives**:
```
SYSTEM: "You are a MEETING SECRETARY... Extract date, attendees..."

USER: "Meeting on Oct 18 with John, Mary, Bob..."
```

#### **LLM Generates**:
```markdown
# Meeting Notes: October 18, 2025

**Attendees:** John, Mary, Bob

## Discussion
- Q4 budget review
- CRM system requirements

## Decisions
1. Approved $50,000 budget for new CRM system

## Actions
- [ ] Get 3 CRM quotes - Mary - Due: Oct 25
```

**Simple! System Prompt did all the work!** ✅

---

### **Example 2: Reusable Template (With Variables)**

**Use Case**: Employee Onboarding Checklist

#### **Configuration**:

**System Prompt**:
```
You are an HR ONBOARDING SPECIALIST creating a checklist for {{employeeName}} 
joining as {{jobTitle}} in {{department}}.

CHECKLIST ITEMS:
✅ IT Setup (laptop, accounts, access)
✅ HR Paperwork (forms, policies, benefits)
✅ Department Orientation
✅ Role-specific training for {{jobTitle}}
✅ Meet team members
✅ First week goals

Format as Markdown checklist with dates and owners.
```

**Variables**:
```
Variable 1: employeeName (text, required)
Variable 2: jobTitle (text, required)
Variable 3: department (text, required)
Variable 4: startDate (date, required)
```

**Template Content**: None

#### **Runtime (User 1)**:
```
Variables:
- employeeName: "Alice Johnson"
- jobTitle: "Senior Developer"
- department: "Engineering"
- startDate: "2025-11-01"

Prompt: "Standard onboarding for new developer"
```

#### **LLM Receives**:
```
SYSTEM: "Creating checklist for Alice Johnson joining as Senior Developer 
         in Engineering..."

USER: "Standard onboarding for new developer"
```

#### **Generated**:
```markdown
# Onboarding Checklist: Alice Johnson
**Role:** Senior Developer  
**Department:** Engineering  
**Start Date:** November 1, 2025

## Week 1 Checklist

### IT Setup
- [ ] Laptop & peripherals - IT Dept - Oct 30
- [ ] Email & Slack account - IT - Oct 30
- [ ] GitHub access - Engineering Lead - Nov 1
- [ ] Development environment setup - Nov 1

### HR Onboarding
- [ ] Complete Form I-9 - HR - Nov 1
- [ ] Benefits enrollment - HR - Nov 1-3
...
```

#### **Runtime (User 2)** - Same Template, Different Person:
```
Variables:
- employeeName: "Bob Chen"
- jobTitle: "Marketing Manager"
- department: "Marketing"
- startDate: "2025-11-15"
```

**Generated**: Different checklist for Bob! Same template! ✅

---

### **Example 3: Complex Template (All Components)**

**Use Case**: Business Case Analysis (Custom Framework)

#### **Configuration**:

**System Prompt** (2,500 chars):
```
You are a SENIOR BUSINESS ANALYST at {{companyName}} creating a business case 
using our Internal Business Case Framework v2.0.

CUSTOM COMPLIANCE REQUIREMENTS:
1. ✅ Must analyze minimum {{minOptions}} alternative options
2. ✅ Financial analysis must project {{evaluationYears}} years
3. ✅ ROI, NPV (using {{discountRate}}% rate), and Payback Period required
4. ✅ Risk assessment categorized as Low/Medium/High/Critical
5. ✅ Must include executive summary ≤ 500 words
6. ✅ Must show sensitivity analysis (best/worst/expected scenarios)

EXTRACTION FROM CONTEXT:
- Current situation & pain points
- Proposed solution details
- Cost breakdown (upfront, ongoing, savings)
- Benefits (quantitative & qualitative)
- Stakeholder impacts
- Implementation timeline
- Risk factors

BUSINESS CASE STRUCTURE:

# Business Case: {{projectName}}
**Company:** {{companyName}}
**Prepared By:** [Extract from context]
**Date:** [Today's date]

## Executive Summary
[≤ 500 words overview]

## 1. Business Need & Current Situation
[Extract pain points, current costs, problems]

## 2. Options Analysis
Compare {{minOptions}}+ alternatives:

### Option 1: [Status Quo]
### Option 2: [Proposed Solution]
### Option 3: [Alternative Approach]

## 3. Financial Analysis ({{evaluationYears}} years)

| Metric | Option 1 | Option 2 | Option 3 |
|--------|----------|----------|----------|
| Upfront Cost | [Amount] | [Amount] | [Amount] |
| Annual Cost | [Amount] | [Amount] | [Amount] |
| Total Cost ({{evaluationYears}}y) | [Amount] | [Amount] | [Amount] |
| NPV (@{{discountRate}}%) | [Amount] | [Amount] | [Amount] |
| ROI | [%] | [%] | [%] |
| Payback Period | [Years] | [Years] | [Years] |

### Sensitivity Analysis
- Best Case: [Scenario & impact]
- Expected Case: [Scenario & impact]
- Worst Case: [Scenario & impact]

## 4. Benefits Analysis
**Quantitative:**
- [Measurable benefit with $]

**Qualitative:**
- [Strategic benefits]

## 5. Risk Assessment

| Risk | Probability | Impact | Category | Mitigation |
|------|------------|--------|----------|------------|
| [Risk] | [H/M/L] | [H/M/L] | [Category] | [Strategy] |

## 6. Implementation Plan
[Phased approach with timeline]

## 7. Recommendation
[Recommended option with justification]

VALIDATION:
- [ ] {{minOptions}}+ options analyzed
- [ ] {{evaluationYears}}-year financials
- [ ] NPV calculated at {{discountRate}}%
- [ ] Sensitivity analysis included
- [ ] Executive summary ≤ 500 words
```

**Variables** (5):
```json
[
  {
    "name": "companyName",
    "type": "text",
    "description": "Company name",
    "required": true
  },
  {
    "name": "projectName",
    "type": "text",
    "description": "Initiative name",
    "required": true
  },
  {
    "name": "minOptions",
    "type": "number",
    "description": "Minimum options to analyze",
    "default_value": "3",
    "required": true
  },
  {
    "name": "evaluationYears",
    "type": "number",
    "description": "Years for financial projection",
    "default_value": "3",
    "required": true
  },
  {
    "name": "discountRate",
    "type": "number",
    "description": "NPV discount rate (%)",
    "default_value": "10",
    "required": true
  }
]
```

**Template Content**:
```json
{
  "sections": [
    {
      "section_id": "exec_summary",
      "section_name": "Executive Summary",
      "max_words": 500,
      "ai_model": "gpt-4",
      "temperature": 0.5
    },
    {
      "section_id": "financial_analysis",
      "section_name": "Financial Analysis",
      "validation_rules": ["must_include_npv", "must_include_roi", "must_include_payback"],
      "ai_model": "gpt-4",
      "temperature": 0.3
    }
  ],
  "custom_compliance_rules": {
    "minimum_options": 3,
    "financial_projection_years": 3,
    "risk_categories": ["Low", "Medium", "High", "Critical"],
    "executive_summary_max_words": 500
  }
}
```

#### **Runtime**:

**User provides**:
```
Variables:
- companyName: "Acme Corp"
- projectName: "New CRM Implementation"
- minOptions: 3
- evaluationYears: 5
- discountRate: 12

Prompt:
"Analyze business case for CRM replacement. Current system costs $200K/year 
maintenance, limited features. Proposed: Salesforce at $500K upfront + $75K/year. 
Alternative: Custom build at $800K upfront + $40K/year. Benefits: +20% sales 
efficiency, +30% customer retention, -50% admin time. Risks: Implementation 
complexity, user adoption, data migration."
```

#### **Backend Processing**:

1. **Replace variables in system prompt**
2. **Extract section definitions from template content**
3. **Build section-specific prompts**
4. **Generate each section separately** (if using advanced processor)
5. **Validate each section**
6. **Assemble final document**

#### **LLM Generates**: 
- Complete business case
- 3 options analyzed (Status Quo, Salesforce, Custom)
- 5-year financial projections
- NPV calculated at 12% discount rate
- Sensitivity analysis
- Risk matrix
- Executive summary (exactly 500 words!)

---

## 🎯 Decision Tree: What to Use When

```
START: Creating a template
  │
  ▼
Do you need the SAME template with DIFFERENT values?
  │
  ├─ YES → Add Variables ✨
  │         Example: {{projectName}}, {{sponsor}}
  │
  └─ NO → Skip variables
  
  ▼
Is document structure COMPLEX (20+ sections, different AI per section)?
  │
  ├─ YES → Use Template Content 📄
  │         Define sections in JSON
  │
  └─ NO → Skip template content
  
  ▼
ALWAYS: Write excellent System Prompt 🧠
  │
  ▼
Define:
- AI role & expertise
- Extraction vs. generation rules
- Required sections
- Validation rules
- Output format
  │
  ▼
DONE! Template ready ✅
```

---

## 📊 Complexity Comparison

| Template Type | System Prompt | Variables | Template Content | Effort | Quality |
|--------------|---------------|-----------|------------------|--------|---------|
| **Simple** (Meeting Notes) | ✅ 500 chars | ❌ No | ❌ No | 15 min | Good |
| **Standard** (Project Charter) | ✅ 2,000 chars | ✅ 3-5 | ❌ No | 45 min | Excellent |
| **Complex** (Business Case) | ✅ 3,000 chars | ✅ 5-10 | ✅ Yes | 2-3 hours | Exceptional |

**Recommendation**: Start simple! 80% of templates only need a good system prompt.

---

## ✅ Your Template Edit Page - What to Do

**Tab 1: Basic Info**
```
✅ Name: "Project Charter - Template Builder"
✅ Framework: "Custom"
✅ Category: "Planning"
✅ Quality: 70-85%
✅ Version: Increment when changing prompts
```

**Tab 2: AI Prompts** ⭐ **MOST IMPORTANT**
```
✅ Write 2,000+ character system prompt
✅ Define AI role
✅ Set extraction rules
✅ Specify structure
✅ Add validation checklist
✅ For custom framework: Add custom compliance rules
```

**Tab 3: Template Content**
```
⚠️  Optional - only if using advanced processor
✅ Most templates: Leave as {}
```

**Tab 4: Variables**
```
✅ Optional - only if reusing template often
✅ Good for: company names, dates, standard values
✅ Use {{variableName}} syntax
```

---

## 🚀 Quick Start: Edit Your Template Now

1. **Navigate to**: Your template → Click "Edit"
2. **Go to**: "AI Prompts" tab
3. **Add custom compliance rules** to system prompt:

```
CUSTOM COMPLIANCE REQUIREMENTS (Your Company):
1. ✅ Project charter must include legal disclaimer
2. ✅ Must follow internal documentation format
3. ✅ Risk section must categorize as Critical/High/Medium/Low
4. ✅ Budget must be in approved format ($XXX,XXX)
5. ✅ Must include executive sponsor sign-off section

MINIMUM QUALITY STANDARDS:
- All stakeholder names must be real
- Objectives must be SMART (Specific, Measurable...)
- Timeline must have specific dates
- Budget must itemize major categories
```

4. **Increment version**: v1 → v2
5. **Save**
6. **Test**: Generate a document and see improved quality!

---

## 🎯 The Perfect Request Formula

```
Perfect LLM Request = 

  System Prompt (AI Instructions)
  × Variables (Dynamic Values)  
  + Template Content (Structure)
  + User Prompt (Specific Data)
  + Context (Project/Docs Data)
  
  = High-Quality Document ✅
```

**Priority Order**:
1. ⭐ System Prompt (80% of quality)
2. 💬 User Prompt (15% of quality)
3. ✨ Variables (5% - convenience)
4. 📄 Template Content (0-5% - advanced cases only)

---

**Focus on writing an excellent system prompt, and you'll get excellent documents!** 🎯

---

**End of Visual Guide**

