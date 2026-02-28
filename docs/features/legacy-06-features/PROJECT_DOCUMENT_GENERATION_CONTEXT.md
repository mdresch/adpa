# Project Document Generation - Context Analysis

**Date**: October 19, 2025  
**Page**: Project Details (`/projects/[id]`)  
**Feature**: Generate Document Dialog

---

## Current Context Building (As Implemented)

### What Context IS Currently Used

When you click "Generate Document" on the project details page, the system builds an AI prompt using the following **project-level context**:

```typescript
// Line 410-426 in app/projects/[id]/page.tsx
const projectDesc = project?.description || 'No project description available.'
const projectName = project?.name || 'Unknown Project'
const framework = project?.framework || 'General'

const teamContext = project?.team_members?.length 
  ? `Team Members: ${project.team_members.join(', ')}` 
  : 'Team composition to be determined'

const budgetContext = project?.budget 
  ? `Budget: $${project.budget}` 
  : 'Budget to be determined'

const timelineContext = project?.start_date && project?.end_date
  ? `Timeline: ${project.start_date} to ${project.end_date}`
  : 'Timeline to be determined'
```

### Current Context Components

| Context Element | Source | Example | Used in Prompt |
|---|---|---|---|
| **Project Name** | `project.name` | "Enterprise Data Governance Framework" | ✅ Yes |
| **Framework** | `project.framework` | "DMBOK 2.0" | ✅ Yes |
| **Description** | `project.description` | Full project description text | ✅ Yes |
| **Team Members** | `project.team_members[]` | Array of names | ✅ Yes |
| **Budget** | `project.budget` | "$500,000" | ✅ Yes |
| **Timeline** | `project.start_date`, `project.end_date` | "2024-01-01 to 2024-12-31" | ✅ Yes |
| **Template Content** | `templates` array | Selected template structure | ✅ Yes |

### What Context is NOT Currently Used

| Available Data | Source | Status | Impact |
|---|---|---|---|
| **Existing Project Documents** | `documents[]` state | ❌ **NOT USED** | Cannot reference or build upon previously generated documents |
| **Document Content** | `document.content` | ❌ **NOT USED** | No cross-document consistency or continuation |
| **Document Metadata** | `document.metadata` | ❌ **NOT USED** | Cannot reuse objectives, risks, or KPIs from other docs |
| **Stakeholder Details** | `stakeholders[]` state | ❌ **NOT USED** | Cannot auto-populate stakeholder tables with actual project stakeholders |
| **Project Settings** | `project.settings` (JSON) | ⚠️ **PARTIALLY** | Available but not explicitly included |
| **Project Metadata** | `project.metadata` (JSON) | ⚠️ **PARTIALLY** | Available but not explicitly included |

---

## How the Prompt is Built

### Prompt Structure (Lines 429-504)

```markdown
You are a senior project management consultant with expertise in [FRAMEWORK] methodology. 
Generate a comprehensive, production-ready [TEMPLATE_NAME] for the following project:

**Project Name**: [PROJECT_NAME]
**Framework**: [FRAMEWORK]
**Description**: [PROJECT_DESCRIPTION]
[TEAM_CONTEXT]
[BUDGET_CONTEXT]
[TIMELINE_CONTEXT]

**CRITICAL REQUIREMENTS - MUST FOLLOW:**
[Detailed instructions for length, formatting, tables, etc.]

**REQUIRED SECTIONS WITH MINIMUM LENGTHS:**
[Template sections]

**DETAILED FORMATTING REQUIREMENTS:**
[Markdown formatting rules]

**TABLES TO INCLUDE:**
[Table structure requirements]
```

### Key Characteristics

- ✅ **Comprehensive Instructions**: 800+ lines of detailed prompt engineering
- ✅ **Quality Standards**: Specifies minimum word counts, table requirements, formatting rules
- ✅ **Framework Alignment**: Explicitly asks for PMBOK 7 / DMBOK 2.0 / BABOK compliance
- ⚠️ **Isolated Generation**: Each document is generated independently without reference to other project documents

---

## Enhancement Opportunities

### 1. **Document Library Context Integration** (RECOMMENDED)

Add existing project documents to the prompt context to enable:

#### Benefits:
- **Consistency**: Reuse objectives, risks, stakeholders across documents
- **Continuation**: Build upon previously generated content
- **Cross-referencing**: Reference related documents (e.g., "As defined in the Risk Management Plan...")
- **Completeness**: Populate tables with actual project data from other documents

#### Proposed Implementation:

```typescript
// After line 426, add:
// Build document library context
let documentLibraryContext = ''
if (documents && documents.length > 0) {
  documentLibraryContext = `\n**Existing Project Documents:**\n`
  documentLibraryContext += documents
    .filter(doc => doc.status === 'final' || doc.status === 'approved')
    .slice(0, 5) // Limit to 5 most relevant docs to avoid token limit
    .map(doc => {
      const summary = doc.content ? doc.content.substring(0, 500) : 'No content'
      return `- **${doc.name}** (${doc.template_name || 'Unknown Template'}): ${summary}...`
    })
    .join('\n')
  
  documentLibraryContext += `\n\n**INSTRUCTION:** Review the existing documents above and ensure consistency in objectives, stakeholders, risks, and timelines. Reference related documents where appropriate (e.g., "As outlined in the Risk Management Plan...").`
}

// Then include it in the aiPrompt around line 437:
**Timeline**: ${timelineContext}
${documentLibraryContext}

**CRITICAL REQUIREMENTS - MUST FOLLOW:**
```

### 2. **Stakeholder Integration** (HIGH VALUE)

```typescript
// Build stakeholder context
let stakeholderContext = ''
if (stakeholders && stakeholders.length > 0) {
  stakeholderContext = `\n**Project Stakeholders:**\n`
  stakeholderContext += stakeholders.map(sh => 
    `- ${sh.name} (${sh.role}) - ${sh.interest_level} interest, ${sh.influence_level} influence`
  ).join('\n')
  
  stakeholderContext += `\n\n**INSTRUCTION:** When generating stakeholder tables, use the actual stakeholders listed above with their roles and influence levels.`
}
```

### 3. **Custom Variables Integration** (EASY WIN)

```typescript
// Build custom variables context from project.settings and project.metadata
let customContext = ''
if (project?.settings || project?.metadata) {
  customContext = `\n**Custom Project Variables:**\n`
  
  if (project.settings) {
    customContext += `Settings: ${JSON.stringify(project.settings, null, 2)}\n`
  }
  
  if (project.metadata) {
    customContext += `Metadata: ${JSON.stringify(project.metadata, null, 2)}\n`
  }
  
  customContext += `\n**INSTRUCTION:** Incorporate relevant custom variables into the document where applicable.`
}
```

---

## Token Limit Considerations

### Current Prompt Size
- Base prompt structure: ~800 lines (~50,000 characters)
- Template instructions: Variable (depends on template)
- **Estimated tokens**: ~12,000 - 15,000 tokens

### With Enhancements
- Adding 5 document summaries (500 chars each): +2,500 chars (~600 tokens)
- Adding stakeholders list (20 stakeholders × 100 chars): +2,000 chars (~500 tokens)
- Adding custom variables: +1,000 chars (~250 tokens)
- **New estimated tokens**: ~13,500 - 17,000 tokens

### Risk Assessment
- ✅ **Safe**: Most models support 100K+ input tokens
- ✅ **Models Used**: 
  - Google Gemini 2.5 Flash: 1M tokens
  - OpenAI GPT-4: 128K tokens
  - Claude Sonnet: 200K tokens
- ✅ **Conclusion**: Enhancement is **well within limits**

---

## Comparison: Project Details vs Process Flow

### Project Details Page (Current Location)
**File**: `app/projects/[id]/page.tsx`

**Context Used**:
```
✅ Project name
✅ Project framework
✅ Project description
✅ Team members
✅ Budget
✅ Timeline
❌ Existing documents (NOT USED)
❌ Stakeholders (NOT USED)
❌ Custom settings/metadata (NOT USED)
```

**Purpose**: Generate documents for a specific project using project-level context.

### Process Flow Page
**File**: `app/process-flow/page.tsx`

**Context Used**:
```
✅ Template content
✅ Project information (selected from dropdown)
✅ AI provider/model settings
✅ Context window optimization
❌ Existing documents (NOT USED)
```

**Purpose**: Batch processing and testing templates with project information injection.

---

## Recommendations

### Priority 1: Add Document Library Context ⭐⭐⭐
**Why**: Enables document consistency and cross-referencing  
**Effort**: Medium (2-3 hours)  
**Value**: High - transforms independent documents into a cohesive project library

### Priority 2: Add Stakeholder Context ⭐⭐⭐
**Why**: Auto-populates stakeholder tables with actual project data  
**Effort**: Low (1 hour)  
**Value**: High - saves manual editing and ensures accuracy

### Priority 3: Add Custom Variables Context ⭐⭐
**Why**: Enables project-specific customization  
**Effort**: Low (1 hour)  
**Value**: Medium - useful for specialized projects with custom tracking

### Priority 4: Add Smart Document Selection ⭐
**Why**: Only include relevant documents (e.g., when generating "Risk Plan", include "Project Charter" and "Stakeholder Register")  
**Effort**: High (4-5 hours)  
**Value**: High - improves context quality and reduces token waste

---

## Example: Enhanced Prompt with Full Context

```typescript
const aiPrompt = `You are a senior project management consultant with expertise in ${framework} methodology. 
Generate a comprehensive, production-ready ${templateContent.title} for the following project:

**Project Name**: ${projectName}
**Framework**: ${framework}
**Description**: ${projectDesc}
${teamContext}
${budgetContext}
${timelineContext}

**Existing Project Documents:**
- **Project Charter** (Charter Template): # Purpose: To establish a unified data governance framework...
- **Stakeholder Register** (Stakeholder Template): Executive Steering Committee includes CIO, CISO, VP GRC...
- **Risk Management Plan** (Risk Template): Top risks identified: R-01 Data Quality Issues (High/High)...

**Project Stakeholders:**
- Dr. Alistair Finch (CIO) - High interest, High influence
- Maria Santos (CISO) - High interest, High influence
- VRM Team (Primary Users) - High interest, Medium influence

**Custom Project Variables:**
- Compliance Frameworks: GDPR, HIPAA, SOC 2
- Data Sources: 12 critical systems
- Legacy System: Oracle ERP (25 years old)

**INSTRUCTION:** 
1. Review the existing documents above and ensure consistency in objectives, stakeholders, risks, and timelines.
2. Reference related documents where appropriate (e.g., "As outlined in the Risk Management Plan...").
3. Use the actual stakeholders listed above in any stakeholder tables or matrices.
4. Incorporate custom variables where relevant to the document type.

**CRITICAL REQUIREMENTS - MUST FOLLOW:**
[... rest of prompt ...]
```

---

## Answer to Your Question

**"Which context does this generate document use? How is it built up? Does it use documents available from the project library?"**

### Current Answer:
The document generation on the project details page (`/projects/[id]`) currently uses:

1. ✅ **Basic Project Information**: Name, description, framework
2. ✅ **Project Attributes**: Team members, budget, timeline
3. ✅ **Template Structure**: Selected template sections and framework
4. ❌ **NO** - It does **NOT** currently use existing documents from the project library
5. ❌ **NO** - It does **NOT** currently use stakeholder data
6. ❌ **NO** - It does **NOT** currently use custom settings/metadata from the Variables tab

### The Context is Built:
- **Lines 410-426**: Extract project attributes from the `project` object
- **Lines 429-504**: Build a comprehensive AI prompt with formatting instructions
- **Lines 572-584**: Send the prompt to the AI Gateway

### Why Documents Aren't Used:
- The `documents` array is fetched (line 281-296) and displayed in the UI
- But it's **never referenced** in the `handleCreateDocument` function
- This means each document is generated **independently** without knowledge of other documents

---

## Next Steps

Would you like me to **enhance the document generation** to include:
1. 📚 Existing project documents for context and consistency?
2. 👥 Project stakeholders to auto-populate stakeholder tables?
3. ⚙️ Custom project variables from the Variables tab?

This would make the generated documents even more accurate and reduce manual editing! 🚀

