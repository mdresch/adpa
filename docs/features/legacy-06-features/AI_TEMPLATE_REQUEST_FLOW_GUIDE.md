# Complete Guide: From Template to Perfect LLM Request

**Date**: October 18, 2025  
**Purpose**: Understanding how System Prompt + Template Content + Variables = Perfect AI Request  
**Audience**: Template creators and developers

---

## 🎯 The Big Picture

### **Goal**: Generate a high-quality, framework-compliant document

### **The Journey**:
```
Template Configuration → User Input → LLM Request → Generated Document
     (Your Setup)      (Runtime)    (AI Processing)   (Final Output)
```

---

## 📊 The 4 Key Components

### **Component 1: System Prompt** 🧠 (Most Important!)
**What it is**: Instructions that tell the AI its role and how to behave  
**Where**: AI Prompts tab in edit page  
**Used for**: Defining AI personality, extraction rules, output format

### **Component 2: Template Content** 📄 (Optional)
**What it is**: JSON structure defining document sections  
**Where**: Template Content tab in edit page  
**Used for**: Advanced multi-stage document processing

### **Component 3: Variables** ✨ (Optional)
**What it is**: Dynamic placeholders like `{{projectName}}`  
**Where**: Variables tab in edit page  
**Used for**: Making templates reusable with different values

### **Component 4: User Prompt** 💬 (Runtime)
**What it is**: What the user types when generating  
**Where**: AI generation page at runtime  
**Used for**: Specific instructions for this document

---

## 🔄 Complete Flow Example

Let me walk you through creating a **perfect PMBOK 7 Project Charter**:

---

### **STEP 1: Configure System Prompt** 🧠

**In Edit Page → AI Prompts Tab**:

```
You are a PROJECT DOCUMENT ANALYST creating a project charter from REAL PROJECT DATA.

CRITICAL EXTRACTION RULES:
1. ✅ EXTRACT project information from the provided context (project name, objectives, stakeholders, scope, etc.)
2. ❌ DO NOT generate a generic project charter template or educational content
3. ✅ USE actual project details: real names, dates, objectives, deliverables from the context
4. ❌ DO NOT create placeholder content like "[Project Name]" or "Example deliverables"
5. ✅ If specific data is missing from context, state "Data not available in project documentation" for that section
6. ✅ Base ALL charter content on the project documentation provided

CONTEXT SOURCES TO USE:
- Project name, description, and objectives
- Stakeholder information and roles
- Project scope and deliverables
- Timeline and milestones
- Budget and resources (if available)
- Success criteria and constraints
- Risk information

CHARTER STRUCTURE:
Your output must be a REAL project charter for THIS specific project, not a template.

## Project Charter: [Extract actual project name]

### 1. Project Overview
**Project Name:** [Extract from context]
**Project Manager:** [Extract from stakeholder data]
**Sponsor:** [Extract from stakeholder data]
**Date:** [Use actual date or "Not specified in documentation"]
**Purpose:** [Extract the actual business need/purpose from project documentation]

### 2. Project Objectives
[Extract and list the ACTUAL project objectives from the context]
- [Real objective 1 from documentation]
- [Real objective 2 from documentation]

### 3. Project Scope
**In Scope:** [Extract actual deliverables and scope items from context]
**Out of Scope:** [Extract explicit out-of-scope items if mentioned]

### 4. Stakeholders
[Extract REAL stakeholders from the provided context]

| Role | Name | Responsibilities |
|------|------|------------------|
| [Actual role] | [Actual name] | [Actual responsibilities] |

### 5. Success Criteria
[Extract the actual success criteria and KPIs from documentation]

### 6. Timeline & Milestones
[Extract actual timeline information if available in context]

### 7. Budget & Resources
[Extract budget and resource information if available, otherwise state "Not specified"]

### 8. Risks & Assumptions
**Key Risks:** [Extract identified risks from context]
**Assumptions:** [Extract stated assumptions]

### 9. Approvals
[Extract approval authority information from stakeholder data]

---

VALIDATION CHECKLIST:
- [ ] All names are real (from project context)
- [ ] All objectives are project-specific (not generic examples)
- [ ] All dates are actual or marked as "TBD" if not in context
- [ ] No placeholder brackets like [Insert X]
- [ ] Charter reflects THIS specific project only

OUTPUT FORMAT: Pure Markdown
TONE: Professional, concise, action-oriented
QUALITY: Every statement must be backed by context data
```

**Purpose of System Prompt**:
- Defines AI's expertise (Project Document Analyst)
- Sets extraction rules (pull from context, don't generate fake data)
- Specifies output structure (exact sections)
- Sets quality expectations (no placeholders!)

---

### **STEP 2: Define Variables** ✨ (Optional)

**In Edit Page → Variables Tab**:

**Variable #1**:
```
Name: projectName
Type: text
Description: Official name of the project
Default Value: (none)
Required: Yes

Usage: {{projectName}}
```

**Variable #2**:
```
Name: sponsor
Type: text
Description: Project sponsor's full name
Default Value: (none)
Required: Yes

Usage: {{sponsor}}
```

**Variable #3**:
```
Name: targetDate
Type: date
Description: Target completion date
Default Value: (none)
Required: No

Usage: {{targetDate}}
```

**How System Prompt Uses Variables**:
```
## Project Charter: {{projectName}}

**Sponsor:** {{sponsor}}
**Target Completion:** {{targetDate}}
```

**At Runtime** (user provides):
```json
{
  "projectName": "Cloud Migration Initiative 2025",
  "sponsor": "Jane Smith, CIO",
  "targetDate": "2025-12-31"
}
```

**AI Receives**:
```
## Project Charter: Cloud Migration Initiative 2025

**Sponsor:** Jane Smith, CIO
**Target Completion:** 2025-12-31
```

---

### **STEP 3: Configure Template Content** 📄 (Advanced - Optional)

**In Edit Page → Template Content Tab**:

```json
{
  "blocks": [],
  "sections": [
    {
      "section_id": "overview",
      "section_name": "Project Overview",
      "section_type": "required",
      "description": "High-level project information",
      "prompt_guidance": "Extract project name, PM, sponsor, date, and business purpose",
      "required": true,
      "order": 1
    },
    {
      "section_id": "objectives",
      "section_name": "Project Objectives",
      "section_type": "required",
      "description": "Specific, measurable objectives",
      "prompt_guidance": "List 3-5 SMART objectives from project documentation",
      "required": true,
      "order": 2
    },
    {
      "section_id": "scope",
      "section_name": "Project Scope",
      "section_type": "required",
      "description": "In-scope and out-of-scope items",
      "prompt_guidance": "Clearly define scope boundaries",
      "required": true,
      "order": 3
    }
  ],
  "metadata": {
    "framework": "PMBOK 7",
    "document_type": "Project Charter",
    "complexity": "medium"
  }
}
```

**Purpose of Template Content**:
- Defines document structure (sections)
- Used by multi-stage document processor
- Provides section-specific guidance
- Controls section order

**Note**: **Most templates don't need this!** System Prompt is usually sufficient.

---

### **STEP 4: User Generates Document** 💬

**On AI Page** (`/ai`):

**User selects**:
- Template: "Project Charter - Template Builder"
- Provider: Google Gemini or OpenAI

**User provides variables** (if defined):
```
projectName: "Cloud Migration Initiative 2025"
sponsor: "Jane Smith, CIO"
targetDate: "2025-12-31"
```

**User enters prompt**:
```
Create a project charter for our cloud migration project. We're moving from on-premise 
servers to AWS. Budget is $500K, timeline is 6 months. Key stakeholders are IT team 
(John Doe - lead), Finance team (Mary Johnson), and Executive team (CEO Robert Brown). 
Main objectives are: reduce infrastructure costs by 30%, improve scalability, enhance 
disaster recovery. Risks include data migration complexity, staff training needs, and 
potential downtime during cutover.
```

---

### **STEP 5: Backend Builds Final LLM Request** 🔧

**What the backend does** (`server/src/services/aiService.ts`):

```typescript
// 1. Get template from database
const template = await getTemplate(template_id)

// 2. Replace variables in system prompt
let processedPrompt = template.system_prompt
processedPrompt = processedPrompt.replace(/\{\{projectName\}\}/g, "Cloud Migration Initiative 2025")
processedPrompt = processedPrompt.replace(/\{\{sponsor\}\}/g, "Jane Smith, CIO")
processedPrompt = processedPrompt.replace(/\{\{targetDate\}\}/g, "2025-12-31")

// 3. Combine system prompt + user prompt
const finalPrompt = `${processedPrompt}

USER REQUEST:
${userPrompt}

CONTEXT INFORMATION:
- Project: Cloud Migration Initiative 2025
- Sponsor: Jane Smith, CIO
- Budget: $500,000
- Timeline: 6 months
- Stakeholders: John Doe (IT Lead), Mary Johnson (Finance), Robert Brown (CEO)
- Objectives: Reduce costs 30%, improve scalability, enhance DR
- Risks: Data migration, training, downtime`

// 4. Send to LLM
const response = await callLLM({
  provider: "google",
  model: "gemini-2.0-flash-exp",
  messages: [
    {
      role: "system",
      content: processedPrompt  // Your carefully crafted system prompt!
    },
    {
      role: "user",
      content: userPrompt + context  // User's request + extracted context
    }
  ],
  temperature: 0.7,
  max_tokens: 4000
})
```

---

## 🎯 **The Perfect LLM Request (Final Result)**

### **What Actually Goes to the LLM**:

**System Message** (from your system prompt):
```
You are a PROJECT DOCUMENT ANALYST creating a project charter from REAL PROJECT DATA.

CRITICAL EXTRACTION RULES:
1. ✅ EXTRACT project information from the provided context
2. ❌ DO NOT generate a generic template
3. ✅ USE actual project details: Cloud Migration Initiative 2025
4. ❌ DO NOT create placeholder content

CHARTER STRUCTURE:
## Project Charter: Cloud Migration Initiative 2025

### 1. Project Overview
**Project Name:** Cloud Migration Initiative 2025
**Sponsor:** Jane Smith, CIO
**Target Completion:** 2025-12-31
...

VALIDATION CHECKLIST:
- [ ] All names are real
- [ ] All objectives are project-specific
- [ ] No placeholder brackets
```

**User Message** (combined user prompt + context):
```
Create a project charter for our cloud migration project. 

PROJECT DETAILS:
- Moving from on-premise to AWS
- Budget: $500,000
- Timeline: 6 months
- Stakeholders:
  • John Doe - IT Lead
  • Mary Johnson - Finance
  • Robert Brown - CEO
- Objectives:
  • Reduce infrastructure costs by 30%
  • Improve scalability
  • Enhance disaster recovery
- Risks:
  • Data migration complexity
  • Staff training needs
  • Potential downtime during cutover
```

**LLM Response** (Markdown document):
```markdown
# Project Charter: Cloud Migration Initiative 2025

## 1. Project Overview

**Project Name:** Cloud Migration Initiative 2025  
**Project Manager:** John Doe  
**Sponsor:** Jane Smith, CIO  
**Date:** October 18, 2025  
**Target Completion:** December 31, 2025

**Purpose:** Migrate all on-premise infrastructure to Amazon Web Services (AWS) 
to reduce operational costs, improve system scalability, and enhance disaster 
recovery capabilities.

## 2. Project Objectives

1. **Cost Reduction**: Reduce infrastructure operational costs by 30% within 12 months of migration
2. **Scalability**: Implement auto-scaling capabilities to handle 3x traffic spikes without manual intervention
3. **Disaster Recovery**: Achieve 99.9% uptime with automated backup and recovery processes

## 3. Project Scope

**In Scope:**
- Migration of all production servers to AWS EC2
- Database migration to AWS RDS
- Implementation of AWS CloudWatch for monitoring
- Staff training on AWS management
- Disaster recovery setup with cross-region replication

**Out of Scope:**
- Development of new applications
- Legacy system decommissioning (separate project)
- Network infrastructure upgrades

## 4. Stakeholders

| Role | Name | Responsibilities |
|------|------|------------------|
| Sponsor | Jane Smith, CIO | Executive oversight, budget approval |
| Project Manager | John Doe | Day-to-day management, delivery |
| Finance Lead | Mary Johnson | Budget tracking, cost analysis |
| Executive Sponsor | Robert Brown, CEO | Strategic alignment, final approvals |

## 5. Success Criteria

- ✅ All production systems successfully migrated to AWS
- ✅ 30% reduction in monthly infrastructure costs achieved
- ✅ Zero critical incidents during migration
- ✅ All staff trained on AWS operations
- ✅ Disaster recovery tested and validated

## 6. Timeline & Milestones

| Milestone | Target Date | Description |
|-----------|-------------|-------------|
| Planning Complete | Month 1 | AWS architecture design finalized |
| Pilot Migration | Month 2 | Test migration of non-critical systems |
| Data Migration | Month 3-4 | Transfer all databases and data |
| Application Migration | Month 4-5 | Move all applications to AWS |
| Testing & Validation | Month 5-6 | End-to-end testing |
| Go-Live | December 2025 | Full production cutover |

**Total Duration:** 6 months  
**Budget:** $500,000

## 7. Budget & Resources

**Budget Breakdown:**
- AWS Infrastructure: $200,000
- Migration Tools & Services: $150,000
- Staff Training: $50,000
- Consulting Support: $75,000
- Contingency (10%): $25,000

**Total:** $500,000

## 8. Risks & Assumptions

**Key Risks:**
1. **Data Migration Complexity** (High)
   - Mitigation: Phased approach, extensive testing
2. **Staff Training Needs** (Medium)
   - Mitigation: Dedicated training program, AWS certification support
3. **Potential Downtime During Cutover** (High)
   - Mitigation: Cutover during low-usage window, rollback plan ready

**Assumptions:**
- AWS services will be available and reliable
- Current application architecture is cloud-compatible
- Staff will be available for training
- No major regulatory changes during migration

## 9. Approvals

**This charter requires approval from:**

| Name | Role | Signature | Date |
|------|------|-----------|------|
| Jane Smith | CIO & Sponsor | ____________ | ________ |
| Robert Brown | CEO | ____________ | ________ |
| John Doe | Project Manager | ____________ | ________ |

---

**Charter Prepared By:** System Administrator  
**Date Prepared:** October 18, 2025  
**Version:** 1.0
```

---

## 🔍 Let's Break Down How Each Component Contributed

### **1. System Prompt Contribution** 🧠

**What it did**:
- ✅ Told AI to be a "PROJECT DOCUMENT ANALYST"
- ✅ Instructed to EXTRACT from context (not generate fake data)
- ✅ Specified exact structure (9 sections)
- ✅ Set validation rules (no placeholders!)
- ✅ Defined output format (Markdown)

**Result**: AI knew to pull from user's prompt instead of making things up

---

### **2. User Prompt Contribution** 💬

**What it provided**:
- ✅ Real project name: "Cloud Migration Initiative 2025"
- ✅ Budget: $500,000
- ✅ Timeline: 6 months
- ✅ Stakeholders: John, Mary, Robert
- ✅ Objectives: Cost reduction, scalability, DR
- ✅ Risks: Migration complexity, training, downtime

**Result**: AI had real data to work with (not placeholders!)

---

### **3. Variables Contribution** ✨

**If you had defined variables**:

In system prompt:
```
## Project Charter: {{projectName}}
**Sponsor:** {{sponsor}}
**Target Date:** {{targetDate}}
```

At runtime, user provides:
```json
{
  "projectName": "Cloud Migration Initiative 2025",
  "sponsor": "Jane Smith, CIO",
  "targetDate": "2025-12-31"
}
```

Backend replaces:
```
## Project Charter: Cloud Migration Initiative 2025
**Sponsor:** Jane Smith, CIO
**Target Date:** 2025-12-31
```

**Result**: Consistent format with dynamic values!

---

### **4. Template Content Contribution** 📄

**If using advanced processor**:

Template content defines:
```json
{
  "sections": [
    {
      "section_name": "Project Overview",
      "prompt_guidance": "Extract project name, PM, sponsor, purpose"
    }
  ]
}
```

**Advanced processor would**:
1. Generate each section separately
2. Use section-specific guidance
3. Validate each section
4. Assemble final document

**Result**: More controlled, section-by-section generation

---

## 📋 Recipe for the Perfect Template

### **Template Type: Project Charter (PMBOK 7)**

**Ingredients**:

**1. System Prompt** (2,000-3,000 characters):
```
✅ Define role: "You are a PROJECT DOCUMENT ANALYST"
✅ Set rules: "EXTRACT from context, DO NOT generate fake data"
✅ Specify structure: "9 sections: Overview, Objectives, Scope..."
✅ Set validation: "No placeholders, all data from context"
✅ Define format: "Output pure Markdown"
```

**2. Variables** (3-5 optional):
```
✅ {{projectName}} - Consistent naming
✅ {{sponsor}} - Sponsor's name
✅ {{targetDate}} - Deadline
✅ {{budget}} - Budget amount
✅ {{department}} - Owning department
```

**3. Template Content** (if using advanced processing):
```json
{
  "sections": [
    {"name": "Overview", "required": true, "prompt_guidance": "..."},
    {"name": "Objectives", "required": true, "prompt_guidance": "..."},
    ...
  ]
}
```

**4. Quality Threshold**: 70-85%

**5. Prompt Version**: Increment when changing prompts

---

## 🎯 What Happens at Runtime

### **User Action Flow**:

```
1. User goes to /ai page
   ↓
2. Selects template: "Project Charter - Template Builder"
   ↓
3. (If variables defined) Fills in variable values
   ↓
4. Types user prompt with project details
   ↓
5. Clicks "Generate"
   ↓
6. Backend processes request
```

### **Backend Processing**:

```typescript
// server/src/routes/ai.ts

async function generateDocument(request) {
  // 1. Get template
  const template = await getTemplate(request.template_id)
  
  // 2. Process variables
  let systemPrompt = template.system_prompt
  for (const [key, value] of Object.entries(request.variables)) {
    systemPrompt = systemPrompt.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
      value
    )
  }
  
  // 3. Build context
  const context = await buildContext({
    userPrompt: request.prompt,
    projectData: request.project_id ? await getProject(request.project_id) : null,
    documents: request.document_ids ? await getDocuments(request.document_ids) : [],
    integrations: request.include_integrations
  })
  
  // 4. Combine into final request
  const messages = [
    {
      role: "system",
      content: systemPrompt  // ← Your carefully crafted instructions!
    },
    {
      role: "user",
      content: `${request.prompt}

CONTEXT:
${context}`  // ← Extracted project data
    }
  ]
  
  // 5. Call LLM
  const response = await callAI({
    provider: request.provider,
    model: request.model,
    messages,
    temperature: request.temperature || 0.7
  })
  
  // 6. Validate quality
  const quality = analyzeDocumentQuality(response.content)
  
  // 7. Track validation
  await updateTemplateValidation(
    template.id,
    quality.overallQuality / 100
  )
  
  // 8. Return markdown document
  return {
    content: response.content,  // ← Generated markdown!
    quality: quality,
    metadata: { /* stats */ }
  }
}
```

---

## 🧪 Example: Simple Template (System Prompt Only)

**For**: Meeting Notes Template

**System Prompt**:
```
You are a MEETING SECRETARY creating professional meeting notes.

Extract the following from the user's description:
- Meeting date and time
- Attendees
- Discussion topics
- Decisions made
- Action items with owners

OUTPUT FORMAT:
# Meeting Notes: [Date]

**Attendees:** [List names]

## Discussion
[Summarize key discussion points]

## Decisions
1. [Decision with rationale]

## Action Items
- [ ] [Task] - Owner: [Name] - Due: [Date]

Keep it concise and action-oriented.
```

**No variables needed!**  
**No template content needed!**  
**Just a good system prompt!**

---

## 🔥 Example: Complex Template (All Components)

**For**: Business Case Document (Custom Framework)

### **System Prompt**:
```
You are a BUSINESS ANALYST creating a business case for {{companyName}}.

Framework: Custom Business Case Methodology

REQUIRED SECTIONS:
1. Executive Summary
2. Business Need & Opportunity
3. Options Analysis
4. Financial Analysis (ROI, NPV, Payback)
5. Risk Assessment
6. Implementation Plan
7. Recommendation

Extract ALL data from context. If data missing, state explicitly.

CUSTOM COMPLIANCE RULES:
✅ Must include 3+ alternative options
✅ Financial analysis must show 3-year projection
✅ Risk assessment must categorize as Low/Medium/High
✅ Must include sensitivity analysis

OUTPUT: Professional Markdown with tables and charts
```

### **Variables**:
```json
[
  { "name": "companyName", "type": "text", "required": true },
  { "name": "discountRate", "type": "number", "required": true },
  { "name": "evaluationPeriod", "type": "number", "default_value": "3" }
]
```

### **Template Content** (for advanced processing):
```json
{
  "sections": [
    {
      "section_name": "Financial Analysis",
      "prompt_guidance": "Calculate ROI, NPV using {{discountRate}}, project {{evaluationPeriod}} years",
      "validation_rules": ["must_include_roi", "must_include_npv", "must_include_payback"]
    }
  ],
  "custom_compliance_rules": {
    "minimum_options": 3,
    "financial_years": 3,
    "risk_categories": ["Low", "Medium", "High"]
  }
}
```

### **User Input** (at runtime):
```
Variables:
- companyName: "Acme Corporation"
- discountRate: 10
- evaluationPeriod: 5

Prompt:
"Create a business case for implementing a new CRM system. Current system is 10 years old, 
costing $200K/year in maintenance. New system costs $500K upfront, $50K/year ongoing. 
Expected benefits: 20% sales increase, 30% customer retention improvement, 50% admin time savings..."
```

### **Final LLM Request**:
```
SYSTEM: You are a BUSINESS ANALYST creating a business case for Acme Corporation...
        Custom compliance: 3+ options, 5-year projection, risk categories...

USER: Create business case for CRM system...
      Context: Current $200K/year, New $500K+$50K/year, Benefits: +20% sales...
      
      Calculate using 10% discount rate over 5 years
```

### **LLM Generates**:
- Executive Summary
- 3 options analyzed (Status Quo, New CRM, Hybrid)
- Financial analysis with 5-year NPV
- Risk assessment (categorized)
- Recommendation with justification

---

## ✅ Best Practices Summary

### **1. System Prompt - The Foundation** 🧠

**Do**:
- ✅ Define clear role (Project Analyst, Business Analyst, etc.)
- ✅ Specify extraction rules (what to pull from context)
- ✅ List exact sections required
- ✅ Set quality standards
- ✅ Include validation checklist

**Don't**:
- ❌ Make it too short (< 500 chars usually not enough)
- ❌ Be vague ("create a good document")
- ❌ Forget to specify output format
- ❌ Allow placeholders

### **2. Variables - For Reusability** ✨

**Use variables when**:
- ✅ Same template, different values
- ✅ Company name, dates, names
- ✅ Numbers (budgets, headcount)
- ✅ Repeated information

**Don't use variables for**:
- ❌ Unique narrative content
- ❌ Analysis and recommendations
- ❌ Context-specific details

### **3. Template Content - For Advanced Processing** 📄

**Use template content when**:
- ✅ Need section-by-section generation
- ✅ Complex multi-part documents
- ✅ Different AI settings per section
- ✅ Section-specific validation

**Skip template content if**:
- ❌ Simple single-pass generation
- ❌ System prompt is sufficient
- ❌ Not using multi-stage processor

### **4. User Prompt - The Specifics** 💬

**User should provide**:
- ✅ Real project data
- ✅ Specific details (names, dates, numbers)
- ✅ Context (current situation, problems, goals)
- ✅ Any special requirements

---

## 🎓 Step-by-Step Tutorial

### **Building Your First Template**

**Scenario**: Create a "Risk Register" template

#### **Step 1: Define System Prompt**

```
You are a RISK MANAGEMENT EXPERT creating a project risk register.

EXTRACT FROM CONTEXT:
- Project name and objectives
- Identified risks
- Risk categories
- Mitigation strategies

RISK REGISTER FORMAT:

# Risk Register: [Project Name]

| Risk ID | Risk Description | Category | Probability | Impact | Score | Mitigation Strategy | Owner |
|---------|-----------------|----------|-------------|--------|-------|-------------------|-------|
| R001 | [Description] | [Category] | [H/M/L] | [H/M/L] | [1-25] | [Strategy] | [Name] |

RULES:
✅ Score = Probability × Impact (scale 1-5 each)
✅ Categorize risks: Technical, Business, External, Organizational
✅ At least 5 risks required
✅ Each risk must have mitigation strategy
❌ Do NOT create generic example risks
✅ All risks must come from user's context

OUTPUT: Markdown table with complete risk analysis
```

#### **Step 2: Add Variables** (optional)

```
Variable: projectName
Type: text
Required: yes
Usage: # Risk Register: {{projectName}}
```

#### **Step 3: Set Quality**

```
Quality Threshold: 75%
(Ensures risk register is complete and well-structured)
```

#### **Step 4: Save Template**

Template is now ready!

---

### **Using the Template**

#### **User goes to /ai page**:

**Selects**: Risk Register template

**Provides variable**:
```
projectName: "Cloud Migration Initiative 2025"
```

**Enters prompt**:
```
Identify risks for our cloud migration project:
- Technical: Data migration complexity, integration challenges, performance issues
- Business: Budget overruns, timeline delays, staff resistance
- External: Vendor reliability, AWS service changes, security threats
- Organizational: Skill gaps, change management, stakeholder alignment

Current team has limited AWS experience. Budget is tight at $500K. 
Timeline is aggressive (6 months). Critical systems must maintain 99.9% uptime.
```

#### **LLM Receives**:

**System**: "You are a RISK MANAGEMENT EXPERT... Create table format... Extract these risks..."

**User**: "Identify risks for cloud migration... [detailed context]"

#### **LLM Generates**:

```markdown
# Risk Register: Cloud Migration Initiative 2025

| Risk ID | Risk Description | Category | Probability | Impact | Score | Mitigation Strategy | Owner |
|---------|-----------------|----------|-------------|--------|-------|-------------------|-------|
| R001 | Data migration complexity causing data loss | Technical | High | High | 25 | Implement phased migration with rollback capability | John Doe (IT Lead) |
| R002 | Budget overrun due to unexpected AWS costs | Business | Medium | High | 15 | Implement AWS cost monitoring, set spending alerts | Mary Johnson (Finance) |
| R003 | Staff lacking AWS expertise | Organizational | High | Medium | 15 | AWS certification program, hire AWS consultant | HR + IT |
...
```

---

## 🎯 The Magic Formula

### **Perfect LLM Request =**

```
System Prompt (AI Instructions)
    +
Template Content (Structure - optional)
    +
Variables (Dynamic Values - optional)
    +
User Prompt (Specific Data)
    +
Context (Project/Document Data - optional)
    =
High-Quality, Framework-Compliant Document!
```

---

## 💡 Quick Reference

### **For Simple Documents** (90% of cases):

```
✅ System Prompt: Define role, rules, structure, format
✅ User Prompt: Provide specific data
❌ Variables: Skip (unless reusing template often)
❌ Template Content: Skip (system prompt is enough)
```

### **For Complex Documents**:

```
✅ System Prompt: Comprehensive instructions
✅ Variables: For repeated values (company name, dates)
✅ Template Content: Section definitions (if using advanced processor)
✅ User Prompt: Detailed context and requirements
```

### **For Custom Frameworks**:

```
✅ System Prompt: Include custom compliance rules
✅ Custom Compliance Rules JSON: Define minimum requirements
✅ Variables: Company-specific fields
✅ Quality Threshold: Higher (80-85%)
```

---

## 🚀 Your Template's Current Setup

**Template**: Project Charter - Template Builder  
**Framework**: Custom  
**Status**: 🟣 Compliance Review

**What you have**:
- ✅ System Prompt: Defined (PMBOK 7 structure)
- ❓ Variables: None yet (can add if needed)
- ❓ Template Content: Empty `{}` (fine for now)
- ✅ Quality Threshold: 70%

**To improve**:
1. Add custom compliance rules to system prompt
2. Define variables for reusability
3. Increment to v2 when updating

---

## 📖 Recommended Reading Order

**To Master Template Creation**:

1. ⭐ **Start here**: Learn system prompts (this guide)
2. Practice with simple templates (meeting notes, summaries)
3. Add variables for reusability
4. Experiment with quality thresholds
5. (Advanced) Try template content for complex docs

**Most important**: **System Prompt is 80% of the work!** Get that right and you'll generate great documents.

---

**Navigate to your template's edit page to see all these controls in action!**

http://localhost:3001/templates/27788b37-2aa2-473f-accc-5a9e7eec7c48/edit

---

**End of Guide**

