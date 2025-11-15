# 📚 Interpreting Context Sources in Document Generation

**Version**: 1.0  
**Last Updated**: October 29, 2025  
**Related**: CR-2025-001 (RAG Integration)

---

## 🎯 Overview

When ADPA generates a document, it automatically gathers context from multiple sources to ensure the generated content is comprehensive, relevant, and aligned with your project. This guide explains how to **interpret and understand** the context sources that were used during document generation.

---

## 🔍 What Are Context Sources?

**Context sources** are the information sources that ADPA uses to understand your project and generate relevant documents. These include:

- 📄 **Project Documents** - Existing documents in your project
- 📊 **Project Metadata** - Project details, stakeholders, requirements
- 🎯 **Approved Baselines** - Approved scope, timeline, budget
- 👤 **User Profile** - Your preferences and document history
- 🔗 **External Integrations** - Confluence, SharePoint, GitHub
- 📝 **Template Examples** - Similar documents from your organization

---

## 📊 Where to Find Context Source Information

### 1. Document Metadata Page

**Location**: `/projects/[projectId]/documents/[docId]/metadata`

**What You'll See:**
- **Source Documents** - List of documents used as context
- **Context Statistics** - Summary of context used
- **Generation Metadata** - Detailed context gathering metrics

### 2. Document Viewer

**Location**: `/projects/[projectId]/documents/[docId]/view`

**What You'll See:**
- **Source Documents Card** - Documents used as context
- **Context Statistics Card** - Overview of context availability

### 3. Generation Logs (Administrators)

**Location**: Server logs or document generation metadata

**What You'll See:**
- Detailed RAG chunk retrieval
- Relevance scores
- Stage-by-stage context gathering metrics

---

## 🏷️ Understanding Context Source Types

ADPA uses a **5-stage context gathering process** with different source types:

### Stage 1: RAG Semantic Search (PRIMARY - 40% weight)

**What It Is:**
- Semantic search across ALL project documents
- Finds relevant content by meaning, not just keywords
- Uses AI embeddings to understand document content

**Source Type**: `rag_semantic_search`

**What It Means:**
- ✅ **High Quality**: Content found by semantic similarity
- ✅ **Comprehensive**: Searches across all document types
- ✅ **Relevant**: Ranked by relevance score (0.0 - 1.0)

**Example:**
```
Source: RAG Semantic Search
Documents Found: 25 chunks from 8 documents
Average Relevance: 0.72 (High)
```

**How to Interpret:**
- **High Relevance (>0.7)**: Very relevant content found
- **Medium Relevance (0.5-0.7)**: Moderately relevant content
- **Low Relevance (<0.5)**: Less relevant, may be filtered out

---

### Stage 2: Baseline Integration (30% weight)

**What It Is:**
- Approved project baseline (scope, timeline, budget, resources)
- Ensures generated documents align with approved baselines
- Prevents drift from approved project parameters

**Source Type**: `baseline_context`

**What It Means:**
- ✅ **Approved**: Uses only approved baseline data
- ✅ **Consistent**: Ensures alignment with project baseline
- ✅ **Authoritative**: Official project parameters

**Example:**
```
Source: Baseline Integration
Baseline Status: Approved
Components Included:
  - Scope Baseline (in-scope, out-of-scope, assumptions)
  - Timeline Baseline (milestones, critical path)
  - Budget Baseline (budget, reserves)
  - Resource Baseline (team structure, roles)
```

**How to Interpret:**
- **Baseline Present**: Document will align with approved baseline
- **No Baseline**: Document generated without baseline constraints
- **Baseline Components**: Shows which baseline parts were used

---

### Stage 3: Direct SQL Queries (20% weight - Fallback)

**What It Is:**
- Direct database queries for critical metadata
- Project details, user profile, template information
- Used when RAG is unavailable or for essential data

**Source Type**: `direct_sql`, `project_database`, `user_profile`, `template_database`

**What It Means:**
- ✅ **Reliable**: Direct access to structured data
- ✅ **Fast**: Quick retrieval of metadata
- ✅ **Essential**: Critical project/user/template information

**Example:**
```
Source: Direct SQL Queries
Data Retrieved:
  - Project: Digital Transformation Initiative
  - User: John Doe (Project Manager)
  - Template: Risk Register Template v2.1
  - Stakeholders: 12 stakeholders
```

**How to Interpret:**
- **Project Data**: Basic project information
- **User Profile**: Your preferences and history
- **Template Info**: Template structure and requirements

---

### Stage 4: External Context (10% weight - Optional)

**What It Is:**
- Third-party integrations (Confluence, SharePoint, GitHub)
- External documentation and references
- Cross-platform knowledge

**Source Type**: `external_context`, `confluence`, `sharepoint`, `github`

**What It Means:**
- ✅ **Integrated**: Uses external knowledge sources
- ✅ **Comprehensive**: Cross-platform information
- ⚠️ **Optional**: May not be available for all projects

**Example:**
```
Source: External Context
Integrations Used:
  - Confluence: 3 pages referenced
  - SharePoint: 2 documents referenced
  - GitHub: 5 issues referenced
```

**How to Interpret:**
- **Confluence**: Knowledge base articles
- **SharePoint**: Shared documents
- **GitHub**: Code repositories and issues

---

### Stage 5: Context Optimization & Merging

**What It Is:**
- Combines all context sources
- Removes duplicates
- Prioritizes by relevance
- Optimizes for token budget

**Source Type**: `optimized_context`

**What It Means:**
- ✅ **Optimized**: Best context selected
- ✅ **Deduplicated**: No redundant information
- ✅ **Prioritized**: Most relevant content first

---

## 📈 Understanding Context Metrics

### Context Statistics

**Location**: Document metadata or viewer

**Metrics Explained:**

#### Documents Available vs. Used

```
Documents in Project: 8
Used as Context: 3
```

**What It Means:**
- **Total Available**: All documents in your project
- **Used as Context**: Documents that were actually used
- **Coverage**: Percentage of documents used (e.g., 3/8 = 37.5%)

**How to Interpret:**
- **High Usage (>50%)**: Many documents used - comprehensive context
- **Medium Usage (20-50%)**: Moderate context coverage
- **Low Usage (<20%)**: Limited context - may need more documents

#### Context Tokens

```
Estimated Context Tokens: ~12,125
```

**What It Means:**
- **Token Count**: Amount of context information provided to AI
- **Estimate**: Approximate token count (1 token ≈ 4 characters)

**How to Interpret:**
- **High Tokens (>10,000)**: Rich context - comprehensive information
- **Medium Tokens (5,000-10,000)**: Moderate context
- **Low Tokens (<5,000)**: Limited context - may need more documents

#### Relevance Scores

```
Average Relevance Score: 0.72
```

**What It Means:**
- **Score Range**: 0.0 (not relevant) to 1.0 (highly relevant)
- **Average**: Mean relevance across all retrieved chunks

**How to Interpret:**
- **High (>0.7)**: Very relevant context - excellent match
- **Medium (0.5-0.7)**: Moderately relevant - good match
- **Low (<0.5)**: Less relevant - may need better documents

#### RAG Chunks Retrieved

```
RAG Chunks Retrieved: 42
```

**What It Means:**
- **Chunks**: Semantic segments of documents found by RAG
- **Count**: Number of relevant chunks retrieved

**How to Interpret:**
- **High (>30)**: Comprehensive context coverage
- **Medium (15-30)**: Good context coverage
- **Low (<15)**: Limited context - may need more documents

---

## 📋 Reading Source Documents List

### Source Documents Card

**What You'll See:**

```
┌──────────────────────────────────────────────┐
│ 📚 Source Documents                          │
│ Documents used as context during generation │
│                                              │
│ ┌──────────────────────────────────────┐   │
│ │ Project Charter                      │   │
│ │ Charter Template                     │   │
│ │ Status: Published                    │   │
│ │ [View Document →]                    │   │
│ └──────────────────────────────────────┘   │
│                                              │
│ ┌──────────────────────────────────────┐   │
│ │ Risk Register                        │   │
│ │ Risk Register Template               │   │
│ │ Status: Draft                        │   │
│ │ [View Document →]                    │   │
│ └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

**Information Provided:**
- **Document Title**: Name of the source document
- **Template Type**: Template used for the source document
- **Status**: Current status (Published, Draft, Review, etc.)
- **Link**: Click to view the source document

**How to Interpret:**
- **Published Documents**: Approved, authoritative sources
- **Draft Documents**: Work-in-progress, may change
- **Multiple Documents**: Comprehensive context from multiple sources
- **Single Document**: Limited context - may need more documents

---

## 🎯 Real-World Examples

### Example 1: Risk Register Generation

**Context Sources Used:**

```
Stage 1: RAG Semantic Search
  - 25 chunks from 8 documents
  - Average relevance: 0.72
  - Documents:
    * Project Charter (5 chunks, relevance: 0.85)
    * Lessons Learned (4 chunks, relevance: 0.78)
    * Issue Log (3 chunks, relevance: 0.71)
    * Requirements Doc (2 chunks, relevance: 0.65)

Stage 2: Baseline Integration
  - Approved baseline included
  - Scope baseline: In-scope items
  - Timeline baseline: Key milestones
  - Budget baseline: Approved budget

Stage 3: Direct SQL Queries
  - Project: Digital Transformation Initiative
  - User: John Doe (Project Manager)
  - Template: Risk Register Template v2.1
  - Stakeholders: 12 stakeholders

Stage 4: External Context
  - Confluence: 2 pages (Risk Management Process)
  - GitHub: 3 issues (related risks)

Stage 5: Optimization
  - 42 chunks merged
  - 8 duplicates removed
  - Prioritized by relevance
  - Token budget: 12,125 tokens
```

**How to Interpret:**

1. **RAG Found Relevant Content**: 25 chunks from 8 documents with high relevance (0.72 average)
   - ✅ **Project Charter** had highest relevance (0.85) - likely contains project risks
   - ✅ **Lessons Learned** (0.78) - provides mitigation strategies
   - ✅ **Issue Log** (0.71) - identifies current issues that may become risks

2. **Baseline Ensures Alignment**: Approved baseline included
   - ✅ Document will align with approved scope, timeline, budget

3. **Comprehensive Context**: 42 chunks total
   - ✅ Rich context for comprehensive risk assessment

4. **External Knowledge**: Confluence and GitHub referenced
   - ✅ Cross-platform knowledge included

**Result**: A Risk Register that:
- Includes risks from Project Charter
- Uses mitigation strategies from Lessons Learned
- References current issues from Issue Log
- Aligns with approved baseline
- Incorporates external knowledge

---

### Example 2: Requirements Document Generation

**Context Sources Used:**

```
Stage 1: RAG Semantic Search
  - 18 chunks from 5 documents
  - Average relevance: 0.68
  - Documents:
    * Project Charter (6 chunks, relevance: 0.82)
    * Stakeholder Register (4 chunks, relevance: 0.75)
    * User Stories (3 chunks, relevance: 0.70)
    * Use Cases (2 chunks, relevance: 0.65)

Stage 2: Baseline Integration
  - No approved baseline (new project)

Stage 3: Direct SQL Queries
  - Project: Mobile App Development
  - User: Jane Smith (Business Analyst)
  - Template: Requirements Document Template v1.5
  - Stakeholders: 8 stakeholders

Stage 4: External Context
  - None (no integrations configured)

Stage 5: Optimization
  - 18 chunks merged
  - 2 duplicates removed
  - Token budget: 8,500 tokens
```

**How to Interpret:**

1. **RAG Found Stakeholder Needs**: 18 chunks from 5 documents
   - ✅ **Project Charter** (0.82) - contains high-level requirements
   - ✅ **Stakeholder Register** (0.75) - identifies stakeholder needs
   - ✅ **User Stories** (0.70) - provides user requirements

2. **No Baseline**: New project without approved baseline
   - ⚠️ Document generated without baseline constraints

3. **Limited External Context**: No external integrations
   - ⚠️ Only internal project documents used

4. **Moderate Context**: 18 chunks total
   - ✅ Good context coverage for requirements document

**Result**: A Requirements Document that:
- Includes requirements from Project Charter
- Incorporates stakeholder needs from Stakeholder Register
- References user stories and use cases
- Generated without baseline constraints (new project)

---

### Example 3: Project Status Report Generation

**Context Sources Used:**

```
Stage 1: RAG Semantic Search
  - 35 chunks from 12 documents
  - Average relevance: 0.75
  - Documents:
    * Previous Status Reports (8 chunks, relevance: 0.88)
    * Task Lists (6 chunks, relevance: 0.80)
    * Milestone Tracking (5 chunks, relevance: 0.77)
    * Financial Reports (4 chunks, relevance: 0.72)

Stage 2: Baseline Integration
  - Approved baseline included
  - Timeline baseline: Current milestones
  - Budget baseline: Current budget status

Stage 3: Direct SQL Queries
  - Project: Enterprise Migration Project
  - User: Mike Johnson (Project Manager)
  - Template: Status Report Template v3.0
  - Stakeholders: 15 stakeholders

Stage 4: External Context
  - Confluence: 5 pages (Project Updates)
  - SharePoint: 3 documents (Status Reports Archive)

Stage 5: Optimization
  - 48 chunks merged
  - 12 duplicates removed
  - Token budget: 15,200 tokens
```

**How to Interpret:**

1. **Excellent RAG Coverage**: 35 chunks from 12 documents with high relevance (0.75 average)
   - ✅ **Previous Status Reports** (0.88) - highest relevance for status reporting
   - ✅ **Task Lists** (0.80) - provides progress updates
   - ✅ **Milestone Tracking** (0.77) - shows milestone achievements

2. **Baseline Alignment**: Approved baseline included
   - ✅ Status report aligns with approved timeline and budget

3. **Rich External Context**: Confluence and SharePoint referenced
   - ✅ Cross-platform status information included

4. **Comprehensive Context**: 48 chunks total
   - ✅ Very rich context for comprehensive status report

**Result**: A Status Report that:
- Follows format from previous status reports
- Includes progress from task lists
- References milestone achievements
- Incorporates financial updates
- Aligns with approved baseline
- Includes external status information

---

## 🎓 Best Practices for Interpreting Context Sources

### 1. Check Relevance Scores

**High Relevance (>0.7):**
- ✅ Excellent match - content is highly relevant
- ✅ Document likely contains exactly what you need
- ✅ AI will use this content effectively

**Medium Relevance (0.5-0.7):**
- ✅ Good match - content is moderately relevant
- ✅ Document contains useful information
- ✅ AI will use this content appropriately

**Low Relevance (<0.5):**
- ⚠️ Less relevant - content may not be ideal
- ⚠️ Document may not contain exactly what you need
- ⚠️ Consider adding more relevant documents

### 2. Review Source Document Status

**Published Documents:**
- ✅ Approved, authoritative sources
- ✅ Reliable, stable information
- ✅ Best for generating official documents

**Draft Documents:**
- ⚠️ Work-in-progress, may change
- ⚠️ Information may not be final
- ⚠️ Use with caution for official documents

### 3. Assess Context Coverage

**High Coverage (>50% documents used):**
- ✅ Comprehensive context
- ✅ Multiple perspectives included
- ✅ Well-informed document generation

**Medium Coverage (20-50% documents used):**
- ✅ Good context coverage
- ✅ Adequate information
- ✅ May benefit from more documents

**Low Coverage (<20% documents used):**
- ⚠️ Limited context
- ⚠️ May need more documents
- ⚠️ Consider adding relevant documents to project

### 4. Monitor Token Count

**High Tokens (>10,000):**
- ✅ Rich context - comprehensive information
- ✅ AI has extensive information to work with
- ✅ May result in longer, more detailed documents

**Medium Tokens (5,000-10,000):**
- ✅ Good context - adequate information
- ✅ Balanced information for generation
- ✅ Standard document length expected

**Low Tokens (<5,000):**
- ⚠️ Limited context - may need more information
- ⚠️ Consider adding more documents
- ⚠️ Document may be shorter or less detailed

### 5. Understand Stage Weights

**RAG Semantic Search (40%):**
- ✅ Primary source - most important
- ✅ Finds relevant content by meaning
- ✅ Comprehensive cross-document search

**Baseline Integration (30%):**
- ✅ Ensures alignment with approved baseline
- ✅ Prevents drift from project parameters
- ✅ Authoritative project information

**Direct SQL Queries (20%):**
- ✅ Essential metadata
- ✅ Project/user/template information
- ✅ Reliable structured data

**External Context (10%):**
- ✅ Optional - may not be available
- ✅ Cross-platform knowledge
- ✅ Third-party integrations

---

## 🔧 Troubleshooting Context Sources

### Issue: Low Relevance Scores

**Symptoms:**
- Average relevance < 0.5
- Documents don't seem relevant

**Possible Causes:**
1. Documents don't contain relevant content
2. Semantic search query doesn't match document content
3. Documents are too generic or unrelated

**Solutions:**
- Add more relevant documents to project
- Ensure documents contain content related to template
- Check document content quality

---

### Issue: Limited Context Coverage

**Symptoms:**
- Low number of documents used (<20%)
- Few RAG chunks retrieved (<15)

**Possible Causes:**
1. Project has few documents
2. Documents don't contain relevant content
3. Semantic search threshold too high

**Solutions:**
- Add more documents to project
- Ensure documents contain relevant content
- System automatically adjusts thresholds

---

### Issue: No Baseline Context

**Symptoms:**
- Baseline integration shows "No baseline"
- Document generated without baseline constraints

**Possible Causes:**
1. No approved baseline exists for project
2. Baseline not yet approved
3. Baseline approval expired

**Solutions:**
- Create and approve project baseline
- Ensure baseline is current and approved
- Baseline is optional - document will still generate

---

### Issue: Missing External Context

**Symptoms:**
- External context shows "None"
- No Confluence/SharePoint/GitHub references

**Possible Causes:**
1. External integrations not configured
2. No external documents available
3. Integration API unavailable

**Solutions:**
- Configure external integrations (optional)
- External context is optional - document will still generate
- Check integration configuration and API status

---

## 📚 Related Documentation

- **RAG Integration Release Notes**: `docs/09-releases/RAG_INTEGRATION_RELEASE_NOTES.md`
- **Source Documents Tracking**: `docs/06-features/SOURCE_DOCUMENTS_TRACKING.md`
- **Context Gathering Implementation**: `docs/implementations/RAG_INTEGRATION_IMPLEMENTATION_SUMMARY.md`
- **Template Configuration Guide**: `docs/03-development/TEMPLATE_CONFIGURATION_GUIDE.md`

---

## ❓ Frequently Asked Questions

### Q: What does "RAG chunks" mean?

**A:** RAG chunks are semantic segments of documents that were found by semantic search. Each chunk represents a relevant piece of content from a document. For example, a 5,000-word document might be split into 20 chunks, and RAG might retrieve the 5 most relevant chunks.

### Q: Why are some documents used but others aren't?

**A:** ADPA uses semantic search to find the most relevant documents. Documents that don't contain relevant content (low relevance score) are filtered out to keep context focused and relevant.

### Q: What's a good relevance score?

**A:** Relevance scores range from 0.0 (not relevant) to 1.0 (highly relevant). Scores above 0.7 are excellent, 0.5-0.7 are good, and below 0.5 are less relevant.

### Q: Can I see what specific content was used from each document?

**A:** Currently, you can see which documents were used, but not the exact content chunks. This information is available in detailed logs for administrators.

### Q: Why does my document show "No baseline" even though I have a baseline?

**A:** Only **approved** baselines are used. If your baseline is draft or pending approval, it won't be included. Ensure your baseline is approved.

### Q: How can I improve context coverage?

**A:** Add more relevant documents to your project. Documents that contain content related to the template you're generating will be more likely to be used as context.

### Q: What if I don't want certain documents used as context?

**A:** Currently, all relevant documents are automatically used. If you need to exclude specific documents, you can archive them or contact your administrator.

### Q: Does external context always work?

**A:** External context is optional and requires integrations to be configured. If integrations aren't configured or are unavailable, external context won't be included, but document generation will still work.

---

## 🎉 Summary

Understanding context sources helps you:

- ✅ **Know what information** was used to generate your document
- ✅ **Assess document quality** based on context coverage
- ✅ **Identify gaps** in context (low coverage, low relevance)
- ✅ **Improve future generations** by adding relevant documents
- ✅ **Trust the output** by understanding the source of information

**Key Takeaways:**

1. **RAG Semantic Search** is the primary source (40% weight) - finds relevant content by meaning
2. **Baseline Integration** ensures alignment (30% weight) - uses approved project parameters
3. **Relevance Scores** indicate how relevant content is (0.0-1.0 scale)
4. **Context Coverage** shows how much of your project knowledge was used
5. **Source Documents** list shows which documents contributed to generation

**Remember:** Context sources are automatically selected based on relevance. The more relevant documents you have in your project, the better your generated documents will be!

---

**End of Guide**

