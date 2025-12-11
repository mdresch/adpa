# Information Architecture - Week 1

**Document Version:** 1.0  
**Date:** Week 1, Phase 1  
**Status:** Information Architecture Foundation

---

## Executive Summary

This document defines the Information Architecture (IA) for ADPA, establishing how information is organized, categorized, and accessed across the platform. It integrates sitemap structure, content taxonomy, and search strategy to create a cohesive information system.

---

## 1. Information Architecture Overview

### 1.1 Purpose

The Information Architecture ensures:
- **Findability:** Users can easily locate information
- **Consistency:** Content follows predictable patterns
- **Scalability:** Structure supports growth
- **Discoverability:** Related content is discoverable
- **Traceability:** Content sources are trackable

### 1.2 Core Principles

1. **Hierarchical Organization:** Clear parent-child relationships
2. **Multi-Dimensional Classification:** Content categorized by multiple attributes
3. **Context-Aware Discovery:** Search and navigation adapt to user context
4. **Source Traceability:** All content links back to origin documents
5. **Framework Alignment:** Organization aligns with PMBOK/BABOK/DMBOK standards

---

## 2. Content Taxonomy

### 2.1 Primary Content Types

ADPA organizes content into **6 primary types**:

| Type | Description | Storage | Examples |
|------|-------------|---------|----------|
| **Projects** | Project management containers | `projects` table | Enterprise AI Adoption, Digital Transformation |
| **Documents** | Generated or uploaded documents | `documents` table | Project Charter, Risk Register, Requirements Doc |
| **Templates** | Reusable document templates | `templates` table | PMBOK Project Charter, BABOK Requirements |
| **Knowledge Base** | Lessons learned and best practices | `knowledge_base_entries` table | Risk mitigation strategies, Stakeholder engagement |
| **MDX Documentation** | System documentation | `docs/` directory | User guides, API docs, Setup guides |
| **Extracted Entities** | AI-extracted project data | Various tables | Stakeholders, Risks, Activities, Work Items |

### 2.2 Content Classification Dimensions

Content is classified along **multiple dimensions**:

#### A. Framework Dimension

**Purpose:** Align content with industry standards

**Values:**
- `PMBOK` - Project Management Body of Knowledge
- `BABOK` - Business Analysis Body of Knowledge
- `DMBOK` - Data Management Body of Knowledge
- `TOGAF` - The Open Group Architecture Framework
- `SABSA` - Sherwood Applied Business Security Architecture
- `ZACHMAN` - Zachman Framework
- `FEAF` - Federal Enterprise Architecture Framework
- `ITIL` - IT Infrastructure Library
- `COBIT` - Control Objectives for Information and Related Technologies

**Usage:**
- Templates are framework-specific
- Documents inherit framework from templates
- Search can filter by framework
- Knowledge base entries tagged with frameworks

#### B. Content Area Dimension (MDX Documentation)

**Purpose:** Organize documentation by purpose

**Values:**
- `getting-started` - Introduction and setup guides
- `setup-configuration` - Configuration documentation
- `development` - Development guides
- `deployment` - Deployment documentation
- `integrations` - Integration guides
- `features` - Feature documentation
- `architecture` - Architecture documentation
- `api` - API documentation
- `troubleshooting` - Troubleshooting guides
- `releases` - Release notes and changelogs

**URL Pattern:** `/docs/{area}/{slug}`

#### C. Maturity Level Dimension

**Purpose:** Classify content by complexity/expertise

**Values:**
- `beginner` - For users new to the topic
- `intermediate` - Requires some prior knowledge
- `advanced` - For experienced users
- `expert` - Deep technical content

**Usage:**
- MDX documentation frontmatter
- Knowledge base entry classification
- Search filtering

#### D. Knowledge Area Dimension (PMBOK)

**Purpose:** Organize by PMBOK knowledge areas

**Values:**
1. **Integration Management**
2. **Scope Management**
3. **Schedule Management**
4. **Cost Management**
5. **Quality Management**
6. **Resource Management**
7. **Communication Management**
8. **Risk Management**
9. **Procurement Management**
10. **Stakeholder Management**

**Usage:**
- Chart color coding (`getChartColor(index, 'knowledge')`)
- Knowledge base categorization
- Document organization

#### E. PMBOK 8 Performance Domain Dimension

**Purpose:** Align with PMBOK 8th Edition performance domains

**Values:**
1. **Stakeholders Performance Domain**
2. **Team Performance Domain**
3. **Development Approach and Life Cycle Performance Domain**
4. **Planning Performance Domain**
5. **Project Work Performance Domain**
6. **Delivery Performance Domain**
7. **Measurement Performance Domain**
8. **Uncertainty Performance Domain**

**Usage:**
- Entity extraction categorization
- Project overview metrics
- Content discovery

#### F. Document Status Dimension

**Purpose:** Track document lifecycle

**Values:**
- `draft` - Work in progress
- `review` - Under review
- `published` - Published and visible
- `archived` - Archived (hidden from search)
- `deleted` - Soft-deleted

**Usage:**
- Document visibility
- Search filtering
- Workflow management

#### G. Knowledge Base Entry Type Dimension

**Purpose:** Classify knowledge base entries

**Values:**
- `best_practice` - Proven methods and standards
- `lessons_learned` - Insights from past experiences
- `process_improvement` - Process optimization
- `technology_innovation` - New technology adoption
- `methodology_advancement` - Methodology improvements

**Usage:**
- Knowledge base filtering
- Content discovery
- Value tracking

#### H. Knowledge Base Category Dimension

**Purpose:** Categorize knowledge base entries by domain

**Values:**
- `scope_management`
- `technical_approach`
- `timeline_management`
- `cost_management`
- `resource_management`
- `quality_management`
- `risk_management`
- `stakeholder_management`
- `integration_management`
- `ai_optimization`
- `tool_selection`
- `architecture`
- `other`

---

### 2.3 Tag Taxonomy

**Purpose:** Flexible, multi-dimensional tagging for cross-cutting concerns

**Tag Categories:**

1. **Framework Tags:**
   - `pmbok`, `babok`, `dmbok`, `togaf`, `sabsa`, `zachman`, `feaf`, `itil`, `cobit`

2. **Topic Tags:**
   - `project-management`, `risk-management`, `stakeholder-management`, `requirements-analysis`, `data-governance`

3. **Type Tags:**
   - `templates`, `guides`, `examples`, `best-practices`, `checklists`, `tools`

4. **Level Tags:**
   - `beginner`, `intermediate`, `advanced`, `expert`

5. **Domain Tags:**
   - `integration`, `scope`, `schedule`, `cost`, `quality`, `resource`, `communication`, `risk`, `procurement`, `stakeholder`

**Usage:**
- MDX frontmatter (`tags` field)
- Knowledge base entries
- Search filtering
- Related content discovery

---

## 3. Content Hierarchy

### 3.1 Hierarchical Structure

```
ADPA Platform
│
├── Projects (Top Level)
│   ├── Project Detail
│   │   ├── Documents
│   │   │   ├── Document Metadata
│   │   │   ├── Document Entities (Extracted)
│   │   │   └── Document Viewer
│   │   ├── Stakeholders
│   │   ├── Tasks/Work Items
│   │   ├── Baseline
│   │   ├── Financials
│   │   └── Performance Metrics
│   │
│   └── Programs (Container)
│       ├── Program Detail
│       │   ├── Projects (Assigned)
│       │   ├── Risks
│       │   ├── Reports
│       │   └── Prioritization
│       │
│       └── Portfolio (Top Level)
│           ├── OKRs
│           └── Prioritization Matrix
│
├── Templates (Top Level)
│   ├── Template List
│   ├── Template Detail
│   ├── Template Builder
│   └── Template Editor
│
├── Knowledge Base (Top Level)
│   ├── Entry List
│   ├── Entry Detail
│   └── Categories
│
├── Documentation (MDX)
│   ├── Getting Started
│   ├── Setup & Configuration
│   ├── Development
│   ├── Features
│   ├── Architecture
│   └── API Reference
│
└── System Management
    ├── Users & Roles
    ├── AI Providers
    ├── Integrations
    ├── Analytics
    ├── Security
    └── Settings
```

### 3.2 Content Relationships

#### Parent-Child Relationships

```
Project
  └── Documents (1:N)
      └── Extracted Entities (1:N)
          └── Source Document (N:1) [Traceability]

Program
  └── Projects (1:N)

Portfolio
  └── Programs (1:N)
      └── Projects (1:N)

Template
  └── Documents Generated (1:N)

Knowledge Base Entry
  └── Related Projects (N:M)
  └── Related Documents (N:M)
```

#### Cross-References

- **Documents → Templates:** `template_id` (which template was used)
- **Documents → Projects:** `project_id` (which project owns it)
- **Entities → Documents:** `source_document_id` (where entity was extracted)
- **Knowledge Base → Projects:** `related_project_ids` (where applied)
- **MDX → Related:** `related: [slug1, slug2]` (related documentation)

---

## 4. URL Structure & Routing

### 4.1 URL Design Principles

1. **Hierarchical:** URLs reflect content hierarchy
2. **RESTful:** Use standard HTTP verbs and resource patterns
3. **Human-Readable:** URLs are descriptive and meaningful
4. **Stable:** URLs don't change after publication
5. **SEO-Friendly:** Include relevant keywords

### 4.2 Recommended URL Patterns

#### Projects

```
/projects                          → List all projects
/projects/[id]                     → Project detail (with tabs)
/projects/[id]/documents           → Project documents
/projects/[id]/documents/[docId]   → Document detail/metadata
/projects/[id]/documents/[docId]/entities → Extracted entities
/projects/[id]/documents/[docId]/view     → Document viewer
/projects/[id]/stakeholders        → Project stakeholders
/projects/[id]/tasks               → Project tasks/work items
/projects/[id]/baseline            → Project baseline
/projects/[id]/drift               → Drift analysis
/projects/[id]/performance         → Performance metrics
/projects/[id]/financials          → Financial dashboard
```

#### Programs

```
/programs                    → List all programs
/programs/[id]               → Program detail
/programs/[id]/projects      → Assigned projects
/programs/[id]/risks         → Program risks
/programs/[id]/reports       → Program reports
/programs/[id]/prioritize    → Prioritization matrix
/programs/[id]/settings      → Program settings
```

#### Portfolio

```
/portfolio                   → Portfolio overview
/portfolio/okrs              → Portfolio OKRs
/portfolio/prioritize         → Portfolio prioritization
```

#### Documents

```
/documents                   → All documents (cross-project)
/documents/[id]              → Document detail
/documents/[id]/view         → Document viewer
/documents/[id]/sign         → Document signing
/documents/[id]/metadata     → Document metadata
/documents/[id]/entities     → Extracted entities
```

#### Templates

```
/templates                   → Template list
/templates/builder           → Template builder
/templates/[id]              → Template detail
/templates/[id]/edit         → Template editor
```

#### Knowledge Base

```
/knowledge                   → Knowledge base hub
/knowledge/entries           → All entries
/knowledge/entries/[id]      → Entry detail
/knowledge/categories        → Browse by category
/knowledge/tags              → Browse by tags
```

#### Documentation (MDX)

```
/docs                        → Documentation hub
/docs/getting-started        → Getting started guides
/docs/getting-started/[slug] → Specific guide
/docs/features/[slug]        → Feature documentation
/docs/api/[slug]             → API documentation
```

#### Search

```
/search                      → Universal search
/search?q=query&type=document → Filtered search
```

### 4.3 URL Naming Conventions

**Rules:**
- Use **kebab-case** for multi-word URLs
- Use **lowercase** only
- Use **plural** for list routes (`/projects`, `/documents`)
- Use **singular** for detail routes (`/projects/[id]`)
- Use **verbs** for actions (`/sign`, `/edit`, `/prioritize`)
- Use **nouns** for resources (`/documents`, `/templates`)

**Examples:**
- ✅ `/projects/[id]/documents` (good)
- ✅ `/templates/builder` (good)
- ✅ `/documents/[id]/sign` (good)
- ❌ `/Projects/[id]` (bad - uppercase)
- ❌ `/project-docs/[id]` (bad - inconsistent naming)

---

## 5. Navigation Structure

### 5.1 Primary Navigation (Sidebar)

**Current Structure:**
1. Dashboard (`/`)
2. Projects (`/projects`)
3. Approvals (`/approvals`)
4. Search (`/search`)
5. AI Providers (`/ai-providers`)
6. AI Analytics (`/ai-analytics`)
7. Integrations (`/integrations`)
8. Templates (`/templates`)
9. Template Builder (`/templates/builder`)
10. Process Flow Workflow (`/process-flow`)
11. Users & Roles (`/users`)
12. Job Monitor (`/jobs`)
13. Analytics (`/analytics`)
14. Security (`/security`)
15. System Settings (`/settings`)

**Recommended Additions:**
- Programs (`/programs`) - Add to sidebar
- Portfolio (`/portfolio`) - Add to sidebar
- Knowledge Base (`/knowledge`) - Add to sidebar

### 5.2 Secondary Navigation

**Breadcrumbs:**
```
Home > Projects > [Project Name] > Documents > [Document Name] > Metadata
Home > Programs > [Program Name] > Settings
Home > Templates > [Template Name] > Edit
```

**Contextual Navigation:**
- Related documents sidebar
- Related knowledge base entries
- Project navigation tabs
- Program navigation tabs

### 5.3 Search & Discovery

**Search Entry Points:**
- Global search bar (header)
- Dedicated search page (`/search`)
- Filtered searches (by type, framework, etc.)

**Discovery Mechanisms:**
- Related content suggestions
- Tag-based filtering
- Category browsing
- Framework-based filtering
- Maturity level filtering

---

## 6. Content Organization Patterns

### 6.1 Project-Centric Organization

**Pattern:** Projects are the primary organizational unit

**Structure:**
```
Project
  ├── Documents (generated/uploaded)
  ├── Stakeholders (extracted/managed)
  ├── Tasks/Work Items (extracted/managed)
  ├── Risks (extracted/managed)
  ├── Baseline (snapshot)
  └── Metrics (calculated)
```

**Benefits:**
- Clear ownership
- Contextual grouping
- Access control
- Traceability

### 6.2 Template-Centric Organization

**Pattern:** Templates define document structure

**Structure:**
```
Template
  ├── Framework (PMBOK/BABOK/DMBOK)
  ├── Category (charter, plan, register)
  ├── Variables (placeholders)
  └── Generated Documents (instances)
```

**Benefits:**
- Consistency
- Reusability
- Standardization
- Framework alignment

### 6.3 Knowledge-Centric Organization

**Pattern:** Knowledge base organizes reusable insights

**Structure:**
```
Knowledge Base Entry
  ├── Type (best_practice, lessons_learned)
  ├── Category (scope_management, risk_management)
  ├── Tags (flexible)
  ├── Related Projects (where applied)
  └── Value Metrics (savings, time saved)
```

**Benefits:**
- Reusability
- Value tracking
- Cross-project learning
- Continuous improvement

### 6.4 Documentation-Centric Organization

**Pattern:** MDX documentation organized by purpose

**Structure:**
```
Documentation
  ├── Area (getting-started, features, api)
  ├── Level (beginner, intermediate, advanced)
  ├── Framework (if applicable)
  └── Tags (flexible)
```

**Benefits:**
- User-focused organization
- Progressive disclosure
- Easy discovery
- SEO optimization

---

## 7. Metadata & Classification

### 7.1 Core Metadata Fields

**All Content Types:**
- `id` - Unique identifier (UUID)
- `title` / `name` - Human-readable title
- `description` - Brief description
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `created_by` - Creator user ID
- `status` - Lifecycle status

**Documents:**
- `project_id` - Parent project
- `template_id` - Source template
- `framework` - Framework alignment
- `category` - Document category
- `content` - Markdown content (canonical format)
- `format` - Storage format (always 'markdown')
- `source_document_id` - For extracted entities (traceability)

**Templates:**
- `framework` - Framework (PMBOK/BABOK/DMBOK)
- `category` - Template category
- `variables` - Template variables (JSONB)
- `content` - Template content

**Knowledge Base:**
- `entry_type` - Type (best_practice, lessons_learned, etc.)
- `category` - Domain category
- `tags` - Flexible tags (array)
- `related_project_ids` - Where applied
- `business_value_score` - Value metric
- `replicable` - Can be reused

**MDX Documentation:**
- `slug` - URL-friendly identifier
- `area` - Content area
- `level` - Expertise level
- `tags` - Flexible tags
- `related` - Related document slugs
- `seo` - SEO metadata

### 7.2 Classification Hierarchy

```
Content
  ├── Type (Project, Document, Template, Knowledge, MDX)
  ├── Framework (PMBOK, BABOK, DMBOK, etc.)
  ├── Category (Domain-specific)
  ├── Status (Draft, Published, Archived)
  ├── Level (Beginner, Intermediate, Advanced, Expert)
  └── Tags (Multi-dimensional)
```

---

## 8. Search & Discovery Strategy

### 8.1 Search Dimensions

**Searchable Fields:**
- **Title/Name** - High weight
- **Description** - Medium weight
- **Content** - Low weight (for documents)
- **Tags** - Medium weight
- **Framework** - Filterable
- **Category** - Filterable
- **Author** - Filterable

**Search Types:**
1. **Lexical Search** - PostgreSQL full-text search (current)
2. **Semantic Search** - Vector embeddings (future)
3. **Hybrid Search** - Combine both (future)

### 8.2 Filtering & Faceting

**Available Filters:**
- **Content Type:** Project, Document, Template, User, Knowledge
- **Framework:** PMBOK, BABOK, DMBOK, etc.
- **Category:** Domain-specific categories
- **Status:** Draft, Published, Archived
- **Author:** User filter
- **Date Range:** Created/updated date
- **Tags:** Multi-select tag filter
- **Maturity Level:** Beginner, Intermediate, Advanced, Expert

**Faceted Search:**
- Show counts for each filter option
- Enable multi-select filtering
- Show active filters
- Clear all filters option

### 8.3 Discovery Mechanisms

**Related Content:**
- **Document → Related Documents:** Based on tags, framework, project
- **Template → Generated Documents:** Show all documents using template
- **Knowledge Base → Related Projects:** Show where knowledge was applied
- **MDX → Related Docs:** Based on `related` frontmatter field

**Browse Patterns:**
- **By Framework:** `/templates?framework=PMBOK`
- **By Category:** `/knowledge?category=risk_management`
- **By Tag:** `/search?tags=project-management,best-practices`
- **By Maturity Level:** `/docs?level=intermediate`

---

## 9. Content Lifecycle

### 9.1 Document Lifecycle

```
Draft → Review → Published → Archived → Deleted
  ↑                                    ↓
  └─────────────── Regenerate ─────────┘
```

**States:**
1. **Draft** - Work in progress
2. **Review** - Under review/approval
3. **Published** - Live and searchable
4. **Archived** - Hidden from search, read-only
5. **Deleted** - Soft-deleted, recoverable

### 9.2 Knowledge Base Lifecycle

```
Draft → Pending Review → Approved → Published → Archived → Superseded
```

**States:**
1. **Draft** - Initial creation
2. **Pending Review** - Submitted for peer review
3. **Approved** - Approved by reviewers
4. **Published** - Published to knowledge base
5. **Archived** - No longer active
6. **Superseded** - Replaced by newer entry

### 9.3 Template Lifecycle

```
Draft → Testing → Compliance → Validated → Production → Archived → Deprecated
```

**States:**
1. **Draft** - Work in progress
2. **Testing** - Under testing
3. **Compliance** - Compliance review
4. **Validated** - Validated and approved
5. **Production** - Live and available
6. **Archived** - Archived
7. **Deprecated** - Deprecated (use newer version)

---

## 10. Information Relationships

### 10.1 Traceability Chain

**Critical Requirement:** All extracted entities must be traceable to source documents.

```
Document (Source)
  └── Extracted Entity
      ├── source_document_id → Document
      ├── project_id → Project
      └── Metadata (extraction timestamp, AI provider, etc.)
```

**Benefits:**
- Audit trail
- Source verification
- Click-through to source
- Quality assurance

### 10.2 Content Dependencies

**Template → Document:**
- Documents inherit framework from templates
- Documents use template variables
- Template changes can trigger regeneration

**Project → Documents:**
- Documents belong to projects
- Documents inherit project context
- Project deletion cascades (or soft-deletes)

**Knowledge Base → Projects:**
- Knowledge entries can be applied to projects
- Track application success
- Measure value delivered

**MDX → Related MDX:**
- Documentation cross-references
- Related content discovery
- Learning paths

---

## 11. Recommended URL Structure Summary

### 11.1 Core Resources

```
# Projects
/projects
/projects/[id]
/projects/[id]/[resource]  # documents, stakeholders, tasks, etc.

# Programs
/programs
/programs/[id]
/programs/[id]/[resource]  # projects, risks, reports, etc.

# Portfolio
/portfolio
/portfolio/[resource]  # okrs, prioritize

# Documents
/documents
/documents/[id]
/documents/[id]/[action]  # view, sign, metadata, entities

# Templates
/templates
/templates/builder
/templates/[id]
/templates/[id]/edit

# Knowledge Base
/knowledge
/knowledge/entries
/knowledge/entries/[id]
/knowledge/categories
/knowledge/tags

# Documentation
/docs
/docs/[area]
/docs/[area]/[slug]

# Search
/search
/search?q=query&[filters]
```

### 11.2 URL Patterns by Content Type

| Content Type | List URL | Detail URL | Action URLs |
|-------------|----------|------------|-------------|
| Projects | `/projects` | `/projects/[id]` | `/projects/[id]/documents`, `/projects/[id]/settings` |
| Documents | `/documents` or `/projects/[id]/documents` | `/documents/[id]` | `/documents/[id]/view`, `/documents/[id]/sign` |
| Templates | `/templates` | `/templates/[id]` | `/templates/[id]/edit`, `/templates/builder` |
| Knowledge | `/knowledge/entries` | `/knowledge/entries/[id]` | `/knowledge/categories`, `/knowledge/tags` |
| MDX Docs | `/docs/[area]` | `/docs/[area]/[slug]` | N/A (static) |

---

## 12. Taxonomy Implementation

### 12.1 Database Schema

**Taxonomy Fields in Tables:**

```sql
-- Documents
documents.framework          -- PMBOK, BABOK, DMBOK
documents.category           -- Document category
documents.status             -- draft, review, published, archived
documents.template_id         -- Source template
documents.project_id         -- Parent project

-- Templates
templates.framework          -- PMBOK, BABOK, DMBOK
templates.category           -- Template category
templates.status             -- draft, testing, production, deprecated

-- Knowledge Base
knowledge_base_entries.entry_type  -- best_practice, lessons_learned, etc.
knowledge_base_entries.category     -- scope_management, risk_management, etc.
knowledge_base_entries.tags        -- JSONB array
knowledge_base_entries.status      -- draft, published, archived

-- Extracted Entities
*_entities.source_document_id -- Traceability (REQUIRED)
*_entities.project_id        -- Parent project
```

### 12.2 MDX Frontmatter Taxonomy

**Required:**
- `title` - Document title
- `slug` - URL identifier

**Optional:**
- `area` - Content area (getting-started, features, etc.)
- `level` - Expertise level (beginner, intermediate, advanced, expert)
- `framework` - Framework alignment
- `tags` - Multi-dimensional tags
- `related` - Related document slugs
- `status` - Publication status

---

## 13. Search Integration with IA

### 13.1 Searchable Content Types

1. **Projects** - Name, description, metadata
2. **Documents** - Title, content (Markdown), metadata
3. **Templates** - Name, description, content
4. **Users** - Name, email, role
5. **Knowledge Base** - Title, description, content, tags
6. **MDX Documentation** - Title, content, frontmatter

### 13.2 Search Indexing Strategy

**Full-Text Search Fields:**
- **High Weight:** Title, name
- **Medium Weight:** Description, tags
- **Low Weight:** Content body

**Filterable Fields:**
- Framework
- Category
- Status
- Author
- Date range
- Tags
- Content type

**Sortable Fields:**
- Relevance (search score)
- Date (created/updated)
- Title (alphabetical)

### 13.3 Semantic Search (Future)

**Vector Embeddings:**
- Generate embeddings for all content
- Store in PostgreSQL with pgvector
- Enable semantic similarity search
- Combine with lexical search for hybrid results

---

## 14. Content Discovery Patterns

### 14.1 Hierarchical Discovery

**Pattern:** Navigate down hierarchy
```
Projects → Project → Documents → Document → Entities
Programs → Program → Projects → Project → Documents
```

### 14.2 Faceted Discovery

**Pattern:** Filter by multiple dimensions
```
Search → Filter by Framework (PMBOK) → Filter by Category (Risk) → Results
```

### 14.3 Related Content Discovery

**Pattern:** Discover through relationships
```
Document → Related Documents (same tags/framework)
Template → Generated Documents (using this template)
Knowledge Base → Related Projects (where applied)
```

### 14.4 Search-Driven Discovery

**Pattern:** Find through search
```
Search Query → Results → Filter → Refine → Select
```

---

## 15. Implementation Guidelines

### 15.1 Content Creation

**When creating content:**
1. **Assign Framework** - Always specify framework alignment
2. **Set Category** - Use consistent category taxonomy
3. **Add Tags** - Use established tag taxonomy
4. **Set Status** - Use appropriate lifecycle status
5. **Link Relationships** - Connect to related content

### 15.2 URL Generation

**Rules:**
- Use `slug` field for MDX documentation URLs
- Use UUID for database records (`/projects/[uuid]`)
- Use kebab-case for human-readable segments
- Keep URLs stable (don't change after publication)

### 15.3 Search Implementation

**Phase 1 (Current):**
- PostgreSQL full-text search (`tsvector`)
- Filter by type, framework, category
- Sort by relevance, date, title

**Phase 2 (Future):**
- Add semantic search (vector embeddings)
- Hybrid search (lexical + semantic)
- Advanced relevance ranking

### 15.4 Taxonomy Maintenance

**Best Practices:**
- Review and update taxonomy quarterly
- Document new categories/tags before use
- Deprecate unused categories/tags
- Maintain tag taxonomy reference
- Train content authors on taxonomy

---

## 16. Content Organization Examples

### 16.1 Example: Project Document Flow

```
1. User creates Project: "Enterprise AI Adoption"
   └── Framework: PMBOK
   └── Category: Technology Transformation

2. User generates Document: "Project Charter"
   └── Template: PMBOK Project Charter Template
   └── Inherits: Framework (PMBOK), Project context
   └── URL: /projects/[project-id]/documents/[doc-id]

3. AI extracts Entities from Document
   └── Stakeholders (5 extracted)
   └── Risks (3 extracted)
   └── All linked via source_document_id
   └── URL: /projects/[project-id]/documents/[doc-id]/entities

4. User views Document Metadata
   └── Shows: Author, Reviewers, Category, Framework
   └── Shows: Related documents, Related knowledge base entries
   └── URL: /projects/[project-id]/documents/[doc-id]
```

### 16.2 Example: Knowledge Base Discovery

```
1. User searches: "risk mitigation strategies"
   └── Search finds: Knowledge base entries with matching tags
   └── Filters: Category = risk_management, Type = best_practice
   └── Results: 12 entries

2. User selects entry: "Proactive Risk Identification"
   └── Shows: Related projects (where applied)
   └── Shows: Value metrics (cost saved, time saved)
   └── URL: /knowledge/entries/[entry-id]

3. User applies to current project
   └── Links: Knowledge entry → Project
   └── Tracks: Application success
   └── Updates: Value metrics
```

### 16.3 Example: Documentation Navigation

```
1. User browses: /docs/getting-started
   └── Lists: All getting-started guides
   └── Filters: By level (beginner, intermediate)
   └── Shows: Reading time, tags

2. User selects: "Project Setup Guide"
   └── URL: /docs/getting-started/project-setup-guide
   └── Shows: Related guides (from frontmatter)
   └── Shows: Table of contents

3. User discovers related content
   └── Related: "Template Configuration" (same tags)
   └── Related: "AI Provider Setup" (same area)
```

---

## 17. Integration Points

### 17.1 Sitemap Integration

**Reference:** `docs/sitemap-week1.md`

The sitemap defines:
- All available routes
- Navigation hierarchy
- URL patterns
- Route organization

**IA adds:**
- Content taxonomy
- Classification dimensions
- Content relationships
- Discovery patterns

### 17.2 Search Strategy Integration

**Reference:** `docs/search-strategy-week1.md`

The search strategy defines:
- Search architecture
- Indexing approach
- Query processing
- Result ranking

**IA adds:**
- Searchable content types
- Filterable dimensions
- Taxonomy for filtering
- Discovery mechanisms

### 17.3 MDX Frontmatter Integration

**Reference:** `docs/mdx-frontmatter-spec.md`

The frontmatter spec defines:
- Metadata schema
- Field definitions
- Validation rules

**IA adds:**
- Taxonomy values
- Classification usage
- Content relationships
- URL generation

---

## 18. Best Practices

### 18.1 Content Organization

1. **Be Consistent:** Use established taxonomy values
2. **Be Descriptive:** Use clear, meaningful titles and descriptions
3. **Be Complete:** Fill in all relevant metadata fields
4. **Be Traceable:** Always link entities to source documents
5. **Be Related:** Link related content for discovery

### 18.2 URL Design

1. **Be Hierarchical:** Reflect content structure
2. **Be Stable:** Don't change URLs after publication
3. **Be Descriptive:** Use meaningful path segments
4. **Be RESTful:** Follow REST conventions
5. **Be SEO-Friendly:** Include relevant keywords

### 18.3 Taxonomy Usage

1. **Use Established Values:** Don't create new categories without review
2. **Use Multiple Dimensions:** Classify along multiple axes
3. **Use Tags Liberally:** Tags enable flexible discovery
4. **Use Consistent Naming:** Follow naming conventions
5. **Document New Values:** Add new taxonomy values to this document

---

## 19. Future Enhancements

### 19.1 Advanced Discovery

- **AI-Powered Recommendations:** Suggest related content based on user behavior
- **Learning Paths:** Guided paths through documentation
- **Content Clustering:** Group similar content automatically
- **Trend Analysis:** Identify trending topics and content

### 19.2 Enhanced Taxonomy

- **Auto-Classification:** AI suggests categories and tags
- **Taxonomy Validation:** Automated validation of taxonomy usage
- **Taxonomy Analytics:** Track taxonomy usage and effectiveness
- **Dynamic Taxonomies:** User-defined taxonomies per organization

### 19.3 Content Relationships

- **Relationship Visualization:** Visual graph of content relationships
- **Impact Analysis:** Show impact of content changes
- **Dependency Tracking:** Track content dependencies
- **Version Relationships:** Link content versions

---

## 20. Appendix: Taxonomy Reference

### 20.1 Framework Taxonomy

| Framework | Code | Use Case |
|-----------|------|----------|
| PMBOK | `PMBOK` | Project Management |
| BABOK | `BABOK` | Business Analysis |
| DMBOK | `DMBOK` | Data Management |
| TOGAF | `TOGAF` | Enterprise Architecture |
| SABSA | `SABSA` | Security Architecture |
| ZACHMAN | `ZACHMAN` | Enterprise Architecture |
| FEAF | `FEAF` | Federal Architecture |
| ITIL | `ITIL` | IT Service Management |
| COBIT | `COBIT` | IT Governance |

### 20.2 Content Area Taxonomy (MDX)

| Area | Code | Description |
|------|------|-------------|
| Getting Started | `getting-started` | Introduction guides |
| Setup & Configuration | `setup-configuration` | Configuration docs |
| Development | `development` | Development guides |
| Deployment | `deployment` | Deployment docs |
| Integrations | `integrations` | Integration guides |
| Features | `features` | Feature documentation |
| Architecture | `architecture` | Architecture docs |
| API | `api` | API documentation |
| Troubleshooting | `troubleshooting` | Troubleshooting guides |
| Releases | `releases` | Release notes |

### 20.3 Knowledge Base Entry Types

| Type | Code | Description |
|------|------|-------------|
| Best Practice | `best_practice` | Proven methods |
| Lessons Learned | `lessons_learned` | Past experiences |
| Process Improvement | `process_improvement` | Process optimization |
| Technology Innovation | `technology_innovation` | New technology |
| Methodology Advancement | `methodology_advancement` | Methodology improvements |

### 20.4 Knowledge Base Categories

| Category | Code | Domain |
|----------|------|--------|
| Scope Management | `scope_management` | PMBOK |
| Technical Approach | `technical_approach` | General |
| Timeline Management | `timeline_management` | PMBOK |
| Cost Management | `cost_management` | PMBOK |
| Resource Management | `resource_management` | PMBOK |
| Quality Management | `quality_management` | PMBOK |
| Risk Management | `risk_management` | PMBOK |
| Stakeholder Management | `stakeholder_management` | PMBOK |
| Integration Management | `integration_management` | PMBOK |
| AI Optimization | `ai_optimization` | ADPA-specific |
| Tool Selection | `tool_selection` | General |
| Architecture | `architecture` | General |
| Other | `other` | Uncategorized |

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Week 1, Phase 1 | Initial Information Architecture document | ADPA Team |

---

## Related Documents

- **Sitemap:** `docs/sitemap-week1.md` - Route structure and navigation
- **Search Strategy:** `docs/search-strategy-week1.md` - Search implementation
- **MDX Frontmatter:** `docs/mdx-frontmatter-spec.md` - Content metadata schema
- **Design Tokens:** `docs/design-tokens.md` - Design system tokens

---

**End of Document**

