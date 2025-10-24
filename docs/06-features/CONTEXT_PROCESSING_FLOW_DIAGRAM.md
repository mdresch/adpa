# Document Context Processing Flow Diagram

**Version:** 2.0.0  
**Last Updated:** 2025-10-21  
**Status:** Production Documentation

## 🔄 End-to-End Context Processing Flow

This document provides visual representations of how context flows through the ADPA document generation system.

---

## 1️⃣ High-Level Context Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INITIATES GENERATION                    │
│  • Selects template: "Risk Management Plan"                     │
│  • Selects project: "Enterprise AI Adoption"                    │
│  • Clicks "Generate Document"                                   │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                           │
│  • Build basic prompt from template                             │
│  • Add project context (name, description, budget)              │
│  • Add stakeholder context                                      │
│  • Add document library context (top 10 relevant docs)          │
│  • Enqueue job via POST /api/ai/generate                        │
│  • Close dialog immediately (user continues working)            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Express.js)                          │
│  • Validate request                                              │
│  • Generate job ID (UUID)                                        │
│  • Add to Redis Bull queue                                       │
│  • Return: { jobId, status: "queued" }                           │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              BACKGROUND WORKER (Bull Queue)                      │
│  Job Type: "ai-generate"                                         │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│           STAGE 1: CONTEXT GATHERING (3-5 seconds)              │
│                                                                  │
│  Parallel Queries:                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Project    │  │  Documents   │  │ Stakeholders │          │
│  │   (SQL)      │  │   (SQL)      │  │   (SQL)      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│         └─────────────────┴──────────────────┘                   │
│                           ↓                                      │
│  Context Data:                                                   │
│  • Project: name, framework, budget, team (500 tokens)           │
│  • Documents: 10 prioritized docs (6,000 tokens)                 │
│  • Stakeholders: 12 stakeholders (800 tokens)                    │
│  • Template: sections, requirements (1,200 tokens)               │
│  • User: preferences, style (300 tokens)                         │
│                                                                  │
│  Total Raw Context: 8,800 tokens                                 │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│      STAGE 2: CONTEXT PRIORITIZATION (1-2 seconds)              │
│                                                                  │
│  Calculate Relevance Scores:                                     │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ Document: "Project Charter" (approved)              │        │
│  │   • Keyword match: 80% (contains "risk")            │        │
│  │   • Lifecycle: 100% (prerequisite)                  │        │
│  │   • Recency: 90% (updated yesterday)                │        │
│  │   • Status: 100% (approved)                         │        │
│  │   → Final Score: 92.5 → INCLUDE (CRITICAL)          │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  Priority Allocation (Token Budget: 10,000):                     │
│  • CRITICAL (project, template): 3,000 tokens (30%)              │
│  • HIGH (documents, stakeholders): 5,000 tokens (50%)            │
│  • MEDIUM (user, custom): 1,500 tokens (15%)                     │
│  • LOW (integrations): 500 tokens (5%)                           │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│        STAGE 3: CONTEXT COMPRESSION (1-2 seconds)               │
│                                                                  │
│  Check if context exceeds budget:                                │
│  Raw context: 8,800 tokens                                       │
│  Budget: 10,000 tokens                                           │
│  Status: ✅ Within budget (no compression needed)                │
│                                                                  │
│  If exceeded, apply compression:                                 │
│  • Documents: Summarization (keep first 800 chars)               │
│  • Integrations: Keyword extraction                              │
│  • User preferences: Truncation                                  │
│                                                                  │
│  Compressed context: 8,800 → 7,200 tokens (18% reduction)        │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│         STAGE 4: CONTEXT INJECTION (0.5 seconds)                │
│                                                                  │
│  Build Enhanced Prompt:                                          │
│  ┌───────────────────────────────────────────────────┐          │
│  │ [USER PROMPT]                                     │          │
│  │ Generate a Risk Management Plan...                │          │
│  │                                                   │          │
│  │ ---                                               │          │
│  │ **PROJECT CONTEXT:**                              │          │
│  │ Project: Enterprise AI Adoption                   │          │
│  │ Framework: PMBOK 7                                │          │
│  │ Budget: $3M, Timeline: 12 months                  │          │
│  │                                                   │          │
│  │ **EXISTING DOCUMENTS:**                           │          │
│  │ 1. Project Charter (approved)                     │          │
│  │    Summary: [800 chars...]                        │          │
│  │ 2. Stakeholder Register (draft)                   │          │
│  │    Summary: [800 chars...]                        │          │
│  │                                                   │          │
│  │ **STAKEHOLDERS:**                                 │          │
│  │ - Executive Board (Sponsor, High/High)            │          │
│  │ - IT Department (Implementer, Med/Med)            │          │
│  │                                                   │          │
│  │ **INSTRUCTIONS:**                                 │          │
│  │ - Reuse stakeholders from existing documents      │          │
│  │ - Reference Project Charter objectives            │          │
│  │ - Ensure consistency with approved baseline       │          │
│  └───────────────────────────────────────────────────┘          │
│                                                                  │
│  Final Prompt: 12,300 tokens (prompt + context)                  │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│            STAGE 5: AI GENERATION (5-15 seconds)                │
│                                                                  │
│  POST to AI Provider (e.g., OpenAI GPT-4):                       │
│  Request: 12,300 input tokens                                    │
│  Response: 3,200 output tokens                                   │
│  Total: 15,500 tokens                                            │
│                                                                  │
│  Generated Content:                                              │
│  # Risk Management Plan                                          │
│  ## 1. Executive Summary                                         │
│  [Comprehensive content with project-specific details...]        │
│  ## 2. Risk Identification                                       │
│  [References stakeholders from Stakeholder Register...]          │
│  ## 3. Risk Register                                             │
│  | Risk | Probability | Impact | Owner |                         │
│  | Budget Overrun | High | High | Executive Board |              │
│  [Consistent with Project Charter budget constraints...]         │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│      STAGE 6: QUALITY ASSESSMENT (2-3 seconds)                  │
│                                                                  │
│  Calculate Quality Metrics:                                      │
│  • Completeness: 100% (has all sections)                         │
│  • Structure: 85% (proper H1/H2/H3)                              │
│  • Formatting: 90% (tables, bold, lists)                         │
│  • Content Depth: 80% (detailed sections)                        │
│  • Accuracy: 75% (specific data, citations)                      │
│  • Consistency: 85% (uniform sections)                           │
│  • Context Relevance: 90% (aligned with project)                 │
│  • Professional Quality: 85% (exec summary, conclusion)          │
│  • Standards Compliance: 80% (PMBOK requirements met)            │
│  • Complexity: 55% (moderate manual effort)                      │
│                                                                  │
│  Overall Quality: 83% (Grade: B - Good)                          │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│         STAGE 7: SAVE DOCUMENT (1 second)                       │
│                                                                  │
│  INSERT INTO documents:                                          │
│  • project_id: [project UUID]                                    │
│  • name: "Risk Management Plan"                                  │
│  • content: [Markdown text]                                      │
│  • word_count: 2,450                                             │
│  • sentence_count: 112                                           │
│  • paragraph_count: 42                                           │
│  • generation_metadata: {                                        │
│      aiProcessing: { provider, model, tokens },                  │
│      context: { summary, warnings },                             │
│      qualityMetrics: { all 10 dimensions }                       │
│    }                                                             │
│                                                                  │
│  Document ID: [new UUID]                                         │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│         STAGE 8: EMIT NOTIFICATIONS (0.5 seconds)               │
│                                                                  │
│  WebSocket Events:                                               │
│  ┌─────────────────────────────────────────────┐                │
│  │ Event: "job:completed"                      │                │
│  │ Data: {                                     │                │
│  │   jobId,                                    │                │
│  │   documentId,                               │                │
│  │   projectId,                                │                │
│  │   message: "Risk Management Plan generated" │                │
│  │ }                                           │                │
│  └─────────────────────────────────────────────┘                │
│                                                                  │
│  ┌─────────────────────────────────────────────┐                │
│  │ Event: "document:created"                   │                │
│  │ To Room: "project:[projectId]"              │                │
│  │ Data: { documentId, documentName }          │                │
│  └─────────────────────────────────────────────┘                │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                  FRONTEND RECEIVES NOTIFICATION                  │
│                                                                  │
│  Notification Center:                                            │
│  🔔 "Risk Management Plan has been created"                      │
│      [View Document] button                                      │
│                                                                  │
│  Toast Message:                                                  │
│  ✅ "Document generation complete!"                              │
│                                                                  │
│  Auto-refresh:                                                   │
│  • Project document list updates                                │
│  • Document count increments                                    │
│  • Project health indicators recalculated                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ Context Gathering Details

```
┌──────────────────────────────────────────────────────────────────────┐
│                    CONTEXT GATHERING STAGE                           │
│                        (Parallel Queries)                            │
└───────────────────────────┬──────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴────────────────────────────┐
        ↓                   ↓                   ↓         ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Project    │  │  Documents   │  │ Stakeholders │  │   Template   │
│   Context    │  │   Context    │  │   Context    │  │   Context    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       ↓                  ↓                  ↓                  ↓
    500 tokens        6,000 tokens       800 tokens       1,200 tokens

       ↓                  ↓                  ↓                  ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│     User     │  │   Baseline   │  │    Custom    │  │ Integrations │
│   Context    │  │   Context    │  │  Variables   │  │   Context    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       ↓                  ↓                  ↓                  ↓
    300 tokens         600 tokens        400 tokens        400 tokens

                            ↓
        ┌───────────────────┴────────────────────────────┐
        ↓                                                 ↓
┌──────────────────────────────────┐      ┌──────────────────────────┐
│   Total Raw Context: 10,200      │      │  Token Budget: 10,000    │
│   Status: ⚠️ OVER BUDGET          │      │  Compression: REQUIRED   │
└──────────────────────────────────┘      └──────────────────────────┘
```

---

## 3️⃣ Context Prioritization Algorithm

```
┌─────────────────────────────────────────────────────────────────┐
│                  CONTEXT PRIORITIZATION ENGINE                   │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
        ┌────────────────┴─────────────────┐
        ↓                                  ↓
┌──────────────────┐            ┌──────────────────┐
│  CALCULATE       │            │   TOKEN          │
│  RELEVANCE       │            │   BUDGET         │
│  SCORES          │            │   ALLOCATION     │
└────────┬─────────┘            └────────┬─────────┘
         ↓                                ↓
┌─────────────────────────────────────────────────────────────┐
│  For Each Context Item:                                     │
│                                                             │
│  Score = (keyword_match × 0.30) +                           │
│          (lifecycle_position × 0.25) +                      │
│          (recency × 0.20) +                                 │
│          (status × 0.15) +                                  │
│          (user_preference × 0.10)                           │
│                                                             │
│  Example: "Project Charter" for "Risk Management Plan"      │
│  = (0.8 × 0.30) + (1.0 × 0.25) + (0.9 × 0.20) +            │
│    (1.0 × 0.15) + (0.7 × 0.10)                              │
│  = 0.24 + 0.25 + 0.18 + 0.15 + 0.07                        │
│  = 0.89 (89/100) → CRITICAL PRIORITY                        │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│              RANKED CONTEXT ITEMS                                │
│                                                                  │
│  1. Project Info           - Score: 100 - CRITICAL - 500 tokens │
│  2. Template               - Score: 100 - CRITICAL - 1,200 t    │
│  3. Project Charter        - Score: 89  - CRITICAL - 1,800 t    │
│  4. Stakeholder Register   - Score: 78  - HIGH     - 1,200 t    │
│  5. All Stakeholders       - Score: 85  - HIGH     - 800 t      │
│  6. Scope Management Plan  - Score: 72  - HIGH     - 1,500 t    │
│  7. User Preferences       - Score: 65  - MEDIUM   - 300 t      │
│  8. Custom Variables       - Score: 60  - MEDIUM   - 400 t      │
│  9. Baseline Context       - Score: 55  - MEDIUM   - 600 t      │
│  10. Integration Data      - Score: 40  - LOW      - (SKIP)     │
│                                                                  │
│  Total Selected: 8,300 tokens ✅ (within 10,000 budget)          │
└─────────────────┬───────────────────────────────────────────────┘
                  ↓
          [Proceed to AI Generation]
```

---

## 4️⃣ Context Injection Patterns

### Pattern 1: Structured Context Block

```markdown
You are a senior project management consultant with PMBOK 7 expertise.

Generate a Risk Management Plan for:

---
**PROJECT CONTEXT:**
• Name: Enterprise AI Adoption for UK Banking
• Framework: PMBOK 7
• Budget: $3,000,000
• Timeline: 12 months
• Team: Sarah Chen (PM), John Doe (Tech Lead), 8 developers

---
**EXISTING DOCUMENTS (for consistency):**

1. **Project Charter** (approved) - Phase 3
   Key Objectives:
   - Reduce legacy system costs by 40%
   - Improve development efficiency by 60%
   - Deploy AI code assistant to 200 developers
   
   Key Risks Already Identified:
   - Data security concerns
   - Regulatory compliance
   
2. **Stakeholder Register** (draft) - Phase 4
   Key Stakeholders:
   - Executive Board (Sponsor, High/High)
   - IT Department (Implementer, Med/Med)
   - Compliance Team (Approver, High/Med)

---
**INSTRUCTIONS:**
✓ Reuse the stakeholders listed above in your Risk Register
✓ Build on the risks identified in Project Charter
✓ Reference related documents explicitly
✓ Ensure consistency with project budget and timeline
```

---

### Pattern 2: Inline Context References

```markdown
Generate a comprehensive Risk Management Plan.

The project "{{project.name}}" has a budget of ${{project.budget}} 
and must comply with {{project.metadata.compliance | join(", ")}}.

According to the approved Project Charter, the key objectives are:
{{charter.objectives | extract | bullet_list}}

Existing stakeholders that should be included as risk owners:
{{stakeholders | map(name, role) | table}}

Generate a Risk Register with at least 10 risks...
```

---

### Pattern 3: Token-Aware Context

```markdown
[User Prompt] (500 tokens)

--- CONTEXT (Budget: 10,000 tokens) ---

[1] Project Info (500/500 tokens) - CRITICAL ✅
[2] Template Structure (1,200/1,200 tokens) - CRITICAL ✅
[3] Document: Project Charter (1,800/1,800 tokens) - HIGH ✅
[4] Document: Stakeholder Register (1,200/1,200 tokens) - HIGH ✅
[5] Stakeholders (800/800 tokens) - HIGH ✅
[6] Document: Scope Plan (1,500/1,500 tokens) - MEDIUM ✅
[7] User Preferences (300/300 tokens) - MEDIUM ✅
[8] Custom Variables (400/400 tokens) - MEDIUM ✅
[9] Baseline (600/600 tokens) - MEDIUM ✅

Total Context: 8,300/10,000 tokens (83% utilized)
Remaining: 1,700 tokens (reserved for future expansions)

--- END CONTEXT ---

[AI Generation starts here...]
```

---

## 5️⃣ Context Compression Strategies

### When Compression is Needed

```
Raw Context: 15,000 tokens
Budget: 10,000 tokens
Overage: 5,000 tokens (33% over)

Action: Apply compression to LOW and MEDIUM priority items
```

### Compression Methods

#### **Method 1: Summarization** (Best for Documents)

**Before (1,800 tokens):**
```markdown
**Document: Scope Management Plan**

# Scope Management Plan

## 1. Executive Summary
This comprehensive Scope Management Plan defines the processes and procedures 
for managing project scope throughout the entire project lifecycle. It establishes 
the framework for how scope will be defined, validated, and controlled, ensuring 
that the project delivers exactly what was promised to stakeholders while 
maintaining flexibility to accommodate approved changes.

## 2. Scope Definition
[... 1,500 more words ...]
```

**After Summarization (900 tokens, 50% reduction):**
```markdown
**Document: Scope Management Plan** (Summary)

Key Points:
• Scope: Deploy AI code assistant to 200 developers
• Deliverables: AI platform, training program, support system
• Exclusions: Legacy system migration, hardware upgrades
• Acceptance Criteria: 90% user adoption, 60% efficiency gain
• Change Control: CCB approval required for scope changes
```

---

#### **Method 2: Truncation** (Fast, for Low-Priority)

**Before (800 tokens):**
```markdown
**User Preferences:**
• Writing Style: Professional, detailed
• Tone: Formal, executive-level
• Detail Level: Comprehensive with examples
• Table Density: High (prefer tables over text)
• Section Depth: Deep (4+ levels of headers)
• Formatting: Modern Markdown with emojis
• Language: American English
• References: Always cite sources
```

**After Truncation (400 tokens, 50% reduction):**
```markdown
**User Preferences:**
• Writing Style: Professional, detailed
• Tone: Formal, executive-level
• Detail Level: Comprehensive
• Table Density: High
[...]
```

---

#### **Method 3: Keyword Extraction** (Aggressive, for Integrations)

**Before (1,500 tokens):**
```markdown
**Confluence Pages:**

Page 1: "System Architecture Overview"
Content: The Enterprise AI platform consists of multiple microservices 
deployed on Kubernetes clusters. The architecture follows a hexagonal 
pattern with clear separation between domain logic and infrastructure...
[... 1,200 more words ...]
```

**After Keyword Extraction (300 tokens, 80% reduction):**
```markdown
**External References:**
Keywords: microservices, Kubernetes, hexagonal architecture, API gateway,
authentication, authorization, data encryption, GDPR compliance, CI/CD
pipeline, monitoring, logging, Prometheus, Grafana
```

---

## 6️⃣ Context Cache Strategy

### Cache Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    CACHE LAYER 1: Redis                      │
│                   (Short-term, 5-10 min)                     │
│                                                              │
│  Key Pattern: context:{projectId}:{templateId}              │
│  TTL: 300 seconds (5 minutes)                                │
│  Hit Rate: 67%                                               │
│                                                              │
│  Cached Data:                                                │
│  • Project info                                              │
│  • Stakeholders list                                         │
│  • Document list (IDs and names)                             │
│  • Template structure                                        │
└────────────────────────┬─────────────────────────────────────┘
                         ↓ (if miss)
┌─────────────────────────────────────────────────────────────┐
│                  CACHE LAYER 2: Database                     │
│                  (Document content cache)                    │
│                                                              │
│  Materialized View: document_context_cache                   │
│  Refresh: Every 15 minutes                                   │
│                                                              │
│  Cached Data:                                                │
│  • Document summaries (pre-truncated to 800 chars)           │
│  • Extracted stakeholders                                    │
│  • Extracted objectives, risks, metrics                      │
└────────────────────────┬─────────────────────────────────────┘
                         ↓ (if miss)
┌─────────────────────────────────────────────────────────────┐
│                 CACHE LAYER 3: Full Query                    │
│                 (No cache, direct DB query)                  │
│                                                              │
│  Fetch full documents from database                          │
│  Process and compress on-the-fly                             │
│  Store in Cache Layer 1 for future requests                  │
└─────────────────────────────────────────────────────────────┘
```

### Cache Performance

| Scenario | Cache Hit | Query Time | Context Gathering Time |
|----------|-----------|------------|----------------------|
| Same project, different template | Layer 1 (67%) | < 50ms | 0.5s |
| Different project, same template | Layer 2 (20%) | 200-500ms | 1.5s |
| First generation (cold start) | Layer 3 (13%) | 1-3s | 3-5s |

---

## 7️⃣ Context Dimension Trade-Offs

### Scenario A: Quick Generation (Prototype Document)

**Goal:** Fast generation, minimal context  
**Token Budget:** 2,000 tokens  
**Duration:** 5-10 seconds

**Dimensions Included:**
- ✅ Project (500 tokens)
- ✅ Template (800 tokens)
- ✅ User basic prefs (200 tokens)
- ❌ Document history (skipped)
- ❌ Stakeholders (skipped)
- ❌ Integrations (skipped)

**Result:**
- Generic document with project name/description
- Fast but less specific
- Good for drafts or prototypes

---

### Scenario B: Standard Generation (Production Document)

**Goal:** High-quality, context-aware  
**Token Budget:** 10,000 tokens  
**Duration:** 15-30 seconds

**Dimensions Included:**
- ✅ Project (500 tokens)
- ✅ Template (1,200 tokens)
- ✅ Top 10 documents (6,000 tokens)
- ✅ All stakeholders (800 tokens)
- ✅ User preferences (300 tokens)
- ✅ Custom variables (400 tokens)
- ❌ Integrations (optional)
- ❌ Baseline (optional)

**Result:**
- Highly specific to project
- References existing documents
- Uses real stakeholder names
- Consistent with project standards

---

### Scenario C: Comprehensive Generation (Executive Document)

**Goal:** Maximum quality, all context  
**Token Budget:** 50,000 tokens  
**Duration:** 30-60 seconds

**Dimensions Included:**
- ✅ Project (500 tokens)
- ✅ Template (1,500 tokens)
- ✅ ALL project documents (30,000 tokens)
- ✅ All stakeholders (1,000 tokens)
- ✅ User full profile (800 tokens)
- ✅ Custom variables (600 tokens)
- ✅ Baseline context (2,000 tokens)
- ✅ Integration data (5,000 tokens)

**Result:**
- Executive-ready quality
- Deep integration with project knowledge
- Maximum consistency
- References all relevant documents
- Includes external data (Confluence, SharePoint)

---

## 8️⃣ Processing Steps in Background Jobs

### Job Type: `ai-generate`

```
Step 1: Job Queued (< 100ms)
├─ Generate UUID job ID
├─ Deduplication check (Redis)
├─ Save to jobs table (pending)
├─ Add to Bull queue (ai-processing)
└─ Return jobId to frontend

Step 2: Worker Picks Up Job (0-2s wait)
├─ Update status: "processing"
├─ Progress: 10%
└─ Log: "Starting AI generation for job [jobId]"

Step 3: Context Gathering (3-5s)
├─ Parallel queries:
│  ├─ SELECT * FROM projects WHERE id = $1
│  ├─ SELECT * FROM documents WHERE project_id = $1 LIMIT 20
│  ├─ SELECT * FROM stakeholders WHERE project_id = $1
│  ├─ SELECT * FROM templates WHERE id = $1
│  └─ SELECT * FROM users WHERE id = $1
├─ Progress: 30%
└─ Log: "Context gathered: 6 dimensions, 8,800 tokens"

Step 4: Context Prioritization (1-2s)
├─ Calculate relevance scores for all items
├─ Sort by score descending
├─ Allocate tokens by priority
├─ Progress: 40%
└─ Log: "Selected 8/12 documents, 12/12 stakeholders"

Step 5: Context Compression (1-2s)
├─ Check if context exceeds budget
├─ If yes: Apply compression strategies
│  ├─ Summarize document content
│  ├─ Truncate low-priority items
│  └─ Extract keywords from integrations
├─ Progress: 50%
└─ Log: "Compressed 8,800 → 7,200 tokens (18% reduction)"

Step 6: Context Injection (0.5s)
├─ Build structured prompt
├─ Inject context sections
├─ Add consistency instructions
├─ Progress: 55%
└─ Log: "Enhanced prompt: 12,300 tokens (7,200 context + 5,100 user)"

Step 7: AI Generation (5-15s)
├─ Call AI provider (OpenAI, Google, Mistral)
├─ Stream response if supported
├─ Progress: 60% → 90%
└─ Log: "AI response received: 3,200 tokens, 15.4s duration"

Step 8: Quality Calculation (2-3s)
├─ Calculate all 10 quality dimensions
├─ Generate recommendations
├─ Progress: 95%
└─ Log: "Quality: 83% overall, 10 dimensions calculated"

Step 9: Save Document (1s)
├─ Calculate content stats (word, sentence, paragraph count)
├─ Build generation_metadata object
├─ INSERT INTO documents (...)
├─ Progress: 98%
└─ Log: "Document saved: [docId]"

Step 10: Baseline Validation (1-2s)
├─ Check if project has active baseline
├─ If yes: Validate document against baseline
├─ Detect drifts
├─ Progress: 99%
└─ Log: "Baseline check: 0 drifts detected"

Step 11: Emit Notifications (0.5s)
├─ WebSocket: "job:completed"
├─ WebSocket: "document:created" (to project room)
├─ Update job status: "completed"
├─ Progress: 100%
└─ Log: "Job completed: [jobId]"

Total Duration: 18-35 seconds (average: 24s)
```

---

### Job Type: `baseline-extract`

```
Step 1: Job Queued (< 100ms)
└─ Return jobId immediately

Step 2: Gather All Documents (1-2s)
├─ SELECT * FROM documents WHERE project_id = $1
├─ Filter by selected document IDs (if specified)
├─ Progress: 30%
└─ Context: 5-50 documents (5,000-50,000 tokens)

Step 3: AI Baseline Extraction (3-5s)
├─ Prompt: "Extract project baseline from documents..."
├─ Context: Full document corpus
├─ AI analyzes objectives, scope, constraints
├─ Progress: 70%
└─ Response: Structured baseline object

Step 4: Save Baseline (1s)
├─ INSERT INTO project_baselines
├─ Link to document corpus
├─ Progress: 90%
└─ Baseline ID: [uuid]

Step 5: Emit Notifications (0.5s)
├─ WebSocket: "job:completed"
├─ WebSocket: "baseline:created" (to project room)
├─ Progress: 100%
└─ User sees notification: "Baseline extracted!"

Total Duration: 5-10 seconds (average: 7s)
```

---

### Job Type: `pipeline-processing`

```
6-Stage Pipeline (30-90 seconds total)

Stage 1: Context Gathering (5-10s)
├─ Comprehensive context from all 8 dimensions
├─ No compression (full fidelity)
└─ Context: 30,000-80,000 tokens

Stage 2: Context Compression (2-5s)
├─ Smart compression to fit token budget
├─ Preserve critical information
└─ Context: 8,000-15,000 tokens

Stage 3: Content Structuring (3-5s)
├─ Create document outline from template
├─ Map context to sections
└─ Structured plan for generation

Stage 4: AI Generation (10-30s)
├─ Generate content section by section
├─ Use context for each section
└─ Progressive content building

Stage 5: Quality Assurance (5-10s)
├─ Validate against template requirements
├─ Check consistency with baseline
├─ Calculate quality metrics
└─ Generate improvement recommendations

Stage 6: Formatting & Export (5-10s)
├─ Apply final Markdown formatting
├─ Save to database
├─ Generate PDF/DOCX (if requested)
└─ Emit notifications

Total Duration: 30-90 seconds (average: 55s)
```

---

## 🎯 Context Strategy Selection Guide

### By Document Type

| Document Type | Recommended Strategy | Priority Dimensions | Token Budget |
|--------------|---------------------|---------------------|--------------|
| **Ideation** | Quick | Project, Template | 2,000 |
| **Business Case** | Standard | Project, Template, Documents | 8,000 |
| **Project Charter** | Comprehensive | All except Integrations | 15,000 |
| **Management Plans** | Standard | Project, Template, Documents, Stakeholders | 10,000 |
| **Registers** | Standard | Project, Stakeholders, Documents | 8,000 |
| **Technical Specs** | Comprehensive | All dimensions + Integrations | 25,000 |
| **Change Requests** | Standard | Project, Baseline, Documents | 10,000 |
| **Reports** | Comprehensive | All dimensions | 20,000 |

---

### By User Role

| Role | Strategy | Reasoning |
|------|----------|-----------|
| **Project Manager** | Comprehensive | Needs full project visibility |
| **Business Analyst** | Standard | Focus on requirements and stakeholders |
| **Developer** | Quick | Technical specs, minimal context |
| **Executive** | Comprehensive | High-level, all dimensions |

---

### By Project Phase

| Phase | Strategy | Context Focus |
|-------|----------|---------------|
| **Initiation** | Quick → Standard | Project basics, minimal history |
| **Planning** | Comprehensive | All approved documents, stakeholders |
| **Execution** | Standard | Current status, baselines, changes |
| **Monitoring** | Standard | Baseline, documents, metrics |
| **Closure** | Comprehensive | Full project history, lessons learned |

---

## 📈 Context Quality Metrics

### Measuring Context Effectiveness

**Metrics Tracked:**
1. **Context Relevance Score** (0-100%)
   - How relevant was the provided context to the generated output?
   - Measured by: keyword overlap, reference usage, consistency

2. **Context Utilization Rate** (0-100%)
   - How much of the provided context was actually used?
   - Measured by: references in output, stakeholder reuse, objective alignment

3. **Context Freshness** (0-100%)
   - How up-to-date is the context data?
   - Measured by: document update timestamps, cache age

4. **Token Efficiency** (tokens used / quality achieved)
   - Lower is better
   - Optimal: 100-150 tokens per quality point
   - Example: 10,000 tokens → 83% quality = 120 tokens/point ✅

---

## 🔧 Configuration API

### Set Project-Level Context Preferences

```typescript
POST /api/projects/:projectId/context-config

{
  "priority_override": {
    "stakeholders": "CRITICAL",  // Stakeholder-heavy project
    "integrations": "MEDIUM"     // Enable Confluence context
  },
  "token_budget": 15000,
  "compression": {
    "method": "summarization",
    "level": "moderate"
  },
  "cache_ttl": 600  // 10 minutes
}
```

### Set User-Level Context Preferences

```typescript
PUT /api/users/me/context-preferences

{
  "preferred_dimensions": ["project", "documents", "stakeholders"],
  "max_context_tokens": 10000,
  "enable_integrations": false,
  "compression_tolerance": "moderate"
}
```

---

## 📊 Example: Full Context for Risk Management Plan

```json
{
  "dimensions": {
    "project": {
      "priority": "CRITICAL",
      "tokens": 500,
      "data": {
        "name": "Enterprise AI Adoption",
        "framework": "PMBOK 7",
        "budget": 3000000,
        "timeline": "12 months",
        "team_size": 15
      }
    },
    "documents": {
      "priority": "HIGH",
      "tokens": 6000,
      "count": 10,
      "items": [
        {
          "name": "Project Charter",
          "relevance_score": 89,
          "content_summary": "...",
          "tokens": 1800
        }
      ]
    },
    "stakeholders": {
      "priority": "HIGH",
      "tokens": 800,
      "count": 12,
      "items": [
        {
          "name": "Executive Board",
          "role": "Sponsor",
          "influence": "High"
        }
      ]
    },
    "template": {
      "priority": "CRITICAL",
      "tokens": 1200,
      "data": {
        "name": "Risk Management Plan",
        "sections": 9,
        "requires_tables": true
      }
    },
    "user": {
      "priority": "MEDIUM",
      "tokens": 300,
      "data": {
        "role": "Project Manager",
        "expertise": "PMBOK Expert"
      }
    },
    "custom": {
      "priority": "MEDIUM",
      "tokens": 400,
      "data": {
        "compliance": ["GDPR", "SOC2"],
        "industry": "Banking"
      }
    },
    "baseline": {
      "priority": "MEDIUM",
      "tokens": 600,
      "data": {
        "version": "1.2",
        "approved_risks": 8
      }
    },
    "integrations": {
      "priority": "LOW",
      "tokens": 0,
      "enabled": false
    }
  },
  "summary": {
    "total_tokens": 9800,
    "budget": 10000,
    "utilization": "98%",
    "compression_applied": false,
    "dimensions_included": 7,
    "cache_hits": 3
  }
}
```

---

## 🚀 Performance Optimization Tips

### 1. Cache Warm-Up
```typescript
// Pre-fetch context for upcoming generations
await contextService.warmCache(projectId, templateIds)
```

### 2. Batch Context Gathering
```typescript
// Generate multiple documents with shared context
const context = await gatherContext(projectId)
for (const template of templates) {
  await generateWithSharedContext(template, context)
}
```

### 3. Progressive Context Loading
```typescript
// Start with minimal context, expand if needed
const baseContext = await gatherMinimalContext()
const result = await tryGenerate(baseContext)
if (result.quality < 70) {
  const fullContext = await gatherFullContext()
  return await generate(fullContext)
}
```

---

## 📚 Related Files

### Backend Implementation
- `server/src/modules/context/integration.ts` - Context-aware AI service
- `server/src/modules/context/injector.ts` - Context injection logic
- `server/src/modules/contextRepository/` - Context data fetching
- `server/src/services/queueService.ts` - Background job processing

### Frontend Context Building
- `app/projects/[id]/page.tsx` - Document library context
- `app/ai/page.tsx` - AI provider context

### Configuration
- `server/.env` - Context budget settings
- `projects.settings` - Per-project context config
- `users.preferences` - Per-user context preferences

---

**Built with ❤️ for intelligent, context-aware document generation**

