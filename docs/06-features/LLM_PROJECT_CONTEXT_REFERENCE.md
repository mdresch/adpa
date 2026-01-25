# LLM Project Context Reference

**Version:** 1.0.0  
**Last Updated:** 2026-01-24  
**Status:** Production Documentation

## 📋 Overview

This document provides a comprehensive reference of **all project context data** that is **automatically provided to the LLM** when generating documents in ADPA. This context is included regardless of whether "Source Documents" are available, ensuring that every generated document has access to essential project information.

---

## 🎯 Standard Project Context (Always Included)

The following project aspects are **automatically included** in every document generation request, even when no source documents are available:

### 1. **Core Project Information**
**Source:** `projects` table  
**Priority:** 🔴 **CRITICAL** (Always included)

| Field | Description | Example |
|-------|-------------|---------|
| **Project Name** | Full project name | "Enterprise AI Adoption Initiative" |
| **Framework** | Project methodology/framework | "PMBOK 7", "BABOK 3.0", "DMBOK 2.0" |
| **Description** | Full project description text | Complete project overview and objectives |
| **Status** | Current project status | "planning", "in_progress", "on_hold" |
| **Budget** | Project budget (if available) | `$3,000,000` |
| **Start Date** | Project start date | `2024-01-15` |
| **End Date** | Project end date | `2024-12-31` |
| **Team Members** | Array of team member names/IDs | `["Sarah Chen", "John Doe", "Maria Garcia"]` |

**How it's used:**
- Included in the prompt as structured project context
- Ensures all generated documents reference the correct project name, framework, and key details
- Provides timeline and budget context for planning documents

---

### 2. **Stakeholder Information**
**Source:** `stakeholders` table  
**Priority:** 🟠 **HIGH** (Included when available)

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Stakeholder full name | "Executive Board" |
| **Role** | Stakeholder role/position | "Sponsor", "Product Owner", "End User" |
| **Interest Level** | Level of interest in project | "High", "Medium", "Low" |
| **Influence Level** | Level of influence on project | "High", "Medium", "Low" |

**Query Details:**
- Fetches up to **10 stakeholders** per project
- Ordered by influence level (DESC), then interest level (DESC)
- Only stakeholders with highest influence/interest are included

**How it's used:**
- Included in prompt as "Key Stakeholders" section
- Helps AI generate stakeholder-appropriate content
- Ensures stakeholder analysis documents are accurate

**Example in Prompt:**
```
## Key Stakeholders

- **Executive Board** (Sponsor) - Interest: High, Influence: High
- **Sarah Chen** (Product Owner) - Interest: High, Influence: Medium
- **John Doe** (End User) - Interest: Medium, Influence: Low
```

---

### 3. **Related Document Metadata**
**Source:** `documents` table (same project)  
**Priority:** 🟡 **MEDIUM** (Included when available)

| Field | Description | Example |
|-------|-------------|---------|
| **Document Name** | Name/title of related document | "Project Charter v1.0" |
| **Status** | Document status | "draft", "approved", "published" |

**Query Details:**
- Fetches up to **5 most recent documents** from the same project
- Ordered by `created_at DESC`
- **Only metadata is included** (name, status) - **NOT document content**

**How it's used:**
- Provides awareness of existing documents in the project
- Helps AI understand document ecosystem
- Prevents duplicate content generation

**Note:** This is **different** from "Source Documents" which include full document content. This is just metadata for context awareness.

---

### 4. **Template Structure & Guidance**
**Source:** `templates` table  
**Priority:** 🟢 **MEDIUM** (Included when template is selected)

| Field | Description | Example |
|-------|-------------|---------|
| **Template Name** | Name of the selected template | "Project Charter Template" |
| **System Prompt** | Template-specific AI instructions | Methodology-specific guidance |
| **Template Paragraphs** | Required/optional sections | Section structure with descriptions |
| **Section Order** | Ordering of sections | Numerical ordering for document flow |
| **Prompt Guidance** | Per-section generation guidance | Specific instructions for each section |

**How it's used:**
- Provides structured document outline
- Ensures compliance with template requirements
- Guides AI to generate content in correct format

**Example in Prompt:**
```
## Template: Project Charter Template

### Required Sections:

1. **Executive Summary** (section, required)
   Guidance: Provide high-level overview of project objectives
2. **Project Scope** (section, required)
   Guidance: Define what is included and excluded from the project
```

---

## 🔄 Context Flow in Document Generation

### Step 1: Context Gathering (`documentGenerationService.ts`)

```typescript
// 1. Fetch project context
const project = await this.getProjectContext(request.projectId)
// Returns: ProjectContext with all fields above

// 2. Fetch template (if provided)
const template = request.templateId 
  ? await this.getTemplate(request.templateId)
  : null

// 3. Build enriched prompt
const enrichedPrompt = await this.buildEnrichedPrompt({
  userPrompt: request.userPrompt,
  project,
  template,
})
```

### Step 2: Prompt Construction (`buildEnrichedPrompt()`)

The prompt is built in this order:

1. **System Instructions** - Framework-specific expertise declaration
2. **Project Context Section** - Core project information
3. **Key Stakeholders Section** - Stakeholder details (if available)
4. **Template Structure** - Template sections and guidance (if template provided)
5. **Output Requirements** - Markdown formatting instructions
6. **User Request** - User's specific instructions

### Step 3: AI Generation

The enriched prompt is sent to the AI service, which:
- Uses the system prompt (if template has one)
- Includes all project context in the user message
- Generates document content based on all provided context

---

## 📊 Context Inclusion Matrix

| Context Type | Always Included? | Conditional? | Source Table | Max Items |
|--------------|------------------|--------------|--------------|-----------|
| **Project Name** | ✅ Yes | No | `projects` | 1 |
| **Framework** | ✅ Yes | No | `projects` | 1 |
| **Description** | ✅ Yes | No | `projects` | 1 |
| **Status** | ✅ Yes | No | `projects` | 1 |
| **Budget** | ⚠️ If available | Yes | `projects` | 1 |
| **Start/End Dates** | ⚠️ If available | Yes | `projects` | 2 |
| **Team Members** | ⚠️ If available | Yes | `projects.team_members` | Array |
| **Stakeholders** | ⚠️ If available | Yes | `stakeholders` | 10 |
| **Related Documents** | ⚠️ If available | Yes | `documents` | 5 (metadata only) |
| **Template Structure** | ⚠️ If template selected | Yes | `templates` | 1 |

---

## 🔍 Difference: Project Context vs. Source Documents

### **Project Context** (This Document)
- **Always included** in every generation
- Provides **foundational project information**
- Includes: project details, stakeholders, team members, related document metadata
- **Does NOT include** full document content
- Purpose: Ensure documents reference correct project details

### **Source Documents** (Metadata Section)
- **Only included** when `includeDocuments=true` in request
- Provides **full document content** from existing project documents
- Includes: document content, lifecycle phase, priority rank, reading metrics
- Purpose: Enable AI to reference and build upon existing documents
- Stored in `generation_metadata.source_documents`

**Key Point:** Even when "Source Documents" shows "No source documents", the LLM still receives all the project context listed above. This is why generated documents contain project-specific details even without source documents.

---

## 📝 Example: Complete Context Sent to LLM

When generating a document, the LLM receives a prompt like this:

```
You are an expert business analyst and technical writer specializing in PMBOK 7 framework.

Generate a professional, well-structured document in Markdown format.

## Project Context

**Project Name:** Enterprise AI Adoption Initiative
**Framework:** PMBOK 7
**Description:** This project aims to implement AI capabilities across the organization...
**Status:** in_progress

## Key Stakeholders

- **Executive Board** (Sponsor) - Interest: High, Influence: High
- **Sarah Chen** (Product Owner) - Interest: High, Influence: Medium
- **John Doe** (End User) - Interest: Medium, Influence: Low

## Template: Project Charter Template

### Required Sections:

1. **Executive Summary** (section, required)
   Guidance: Provide high-level overview of project objectives
2. **Project Scope** (section, required)
   Guidance: Define what is included and excluded from the project

## Output Requirements

- Format: Markdown only
- Use proper headings (# ## ###)
- Include tables where appropriate
- Use bullet points and numbered lists
- Include code blocks if relevant
- Be professional and concise

## User Request

Generate a comprehensive project charter for the Enterprise AI Adoption Initiative...

---

Generate the document now. Output only the Markdown content, no explanations.
```

---

## 🔧 Technical Implementation

### Backend Service: `documentGenerationService.ts`

**Method:** `getProjectContext(projectId: string)`

```typescript
// Fetches from projects table
SELECT id, name, framework, description, budget, start_date, end_date, status, team_members
FROM projects WHERE id = $1

// Fetches stakeholders
SELECT name, role, interest_level, influence_level
FROM stakeholders WHERE project_id = $1
ORDER BY influence_level DESC, interest_level DESC
LIMIT 10

// Fetches related documents (metadata only)
SELECT name, status
FROM documents WHERE project_id = $1
ORDER BY created_at DESC
LIMIT 5
```

**Method:** `buildEnrichedPrompt()`

Constructs the complete prompt with all project context, stakeholders, template structure, and user instructions.

---

## ✅ Summary

**Standard Project Context Always Provided to LLM:**

1. ✅ **Project Name, Framework, Description, Status**
2. ✅ **Budget, Start Date, End Date** (if available)
3. ✅ **Team Members** (if available)
4. ✅ **Stakeholders** (up to 10, if available)
5. ✅ **Related Document Metadata** (up to 5, if available)
6. ✅ **Template Structure** (if template selected)
7. ✅ **User's Specific Instructions**

**This context is included regardless of whether "Source Documents" are available**, ensuring that every generated document has access to essential project information and can produce project-specific, contextually relevant content.

---

## 📚 Related Documentation

- `PROJECT_DOCUMENT_GENERATION_CONTEXT.md` - Frontend context building
- `DOCUMENT_CONTEXT_DIMENSIONS_AND_STRATEGIES.md` - Advanced context strategies
- `COMPLIANCE_METRICS_STORAGE_FIX.md` - Document metadata storage

---

**Last Updated:** 2026-01-24  
**Maintained By:** ADPA Development Team
