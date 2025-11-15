# MDX Frontmatter Specification

**Document Version:** 1.0  
**Date:** Week 1, Phase 1  
**Status:** Specification for Content Authors

---

## Overview

This document defines the frontmatter schema for MDX content files in the ADPA system. Frontmatter provides structured metadata that enables search, navigation, categorization, and SEO optimization.

---

## Frontmatter Structure

All MDX content files must include frontmatter at the beginning of the file, enclosed in YAML delimiters (`---`).

### Basic Structure

```yaml
---
title: "Document Title"
slug: "document-slug"
area: "content-area"
level: "beginner"
readingTime: 5
tags: ["tag1", "tag2"]
related: ["slug1", "slug2"]
seo:
  title: "SEO Title"
  description: "SEO Description"
  keywords: ["keyword1", "keyword2"]
---
```

---

## Required Fields

### `title` (string, required)

**Description:** The human-readable title of the document.

**Rules:**
- Must be a non-empty string
- Maximum length: 200 characters
- Should be descriptive and clear
- Used in navigation, search results, and page headers

**Example:**
```yaml
title: "Project Charter Template Guide"
```

---

### `slug` (string, required)

**Description:** URL-friendly identifier for the document.

**Rules:**
- Must be unique across all content
- Must be lowercase
- Can contain letters, numbers, and hyphens
- No spaces or special characters
- Used to generate URLs: `/docs/{area}/{slug}`
- Should be stable (don't change after publication)

**Example:**
```yaml
slug: "project-charter-template-guide"
```

**Validation Regex:**
```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

---

## Optional Fields

### `area` (string, optional)

**Description:** Content area or category classification.

**Allowed Values:**
- `"getting-started"` - Introduction and setup guides
- `"setup-configuration"` - Configuration documentation
- `"development"` - Development guides
- `"deployment"` - Deployment documentation
- `"integrations"` - Integration guides
- `"features"` - Feature documentation
- `"architecture"` - Architecture documentation
- `"api"` - API documentation
- `"troubleshooting"` - Troubleshooting guides
- `"releases"` - Release notes and changelogs

**Example:**
```yaml
area: "getting-started"
```

**Default:** `null` (uncategorized)

---

### `level` (string, optional)

**Description:** Content difficulty or expertise level.

**Allowed Values:**
- `"beginner"` - For users new to the topic
- `"intermediate"` - Requires some prior knowledge
- `"advanced"` - For experienced users
- `"expert"` - Deep technical content

**Example:**
```yaml
level: "intermediate"
```

**Default:** `"beginner"`

---

### `readingTime` (number, optional)

**Description:** Estimated reading time in minutes.

**Rules:**
- Must be a positive integer
- Should be calculated based on average reading speed (225 words/minute)
- Used in UI to show reading time estimates

**Example:**
```yaml
readingTime: 5
```

**Calculation Formula:**
```
readingTime = Math.ceil(wordCount / 225)
```

**Default:** Auto-calculated from content if not provided

---

### `tags` (array of strings, optional)

**Description:** Array of tags for categorization and filtering.

**Rules:**
- Each tag must be a non-empty string
- Maximum 20 tags per document
- Tags should be lowercase
- Use kebab-case for multi-word tags
- Tags are used for filtering and related content discovery

**Example:**
```yaml
tags:
  - "project-management"
  - "pmbok"
  - "templates"
  - "best-practices"
```

**Default:** `[]` (empty array)

---

### `related` (array of strings, optional)

**Description:** Array of slugs referencing related documents.

**Rules:**
- Each slug must reference an existing document
- Maximum 10 related documents
- Used to generate "Related Content" sections
- Should reference documents that complement or extend the current content

**Example:**
```yaml
related:
  - "project-scope-management"
  - "stakeholder-management-guide"
  - "risk-management-basics"
```

**Default:** `[]` (empty array)

---

### `seo` (object, optional)

**Description:** SEO metadata for search engine optimization.

**Structure:**
```yaml
seo:
  title: string        # SEO title (max 60 chars)
  description: string  # Meta description (max 160 chars)
  keywords: array      # SEO keywords (max 10)
```

**Fields:**

#### `seo.title` (string, optional)
- SEO-optimized title (may differ from `title`)
- Maximum 60 characters (for search engine display)
- Should include primary keywords
- Default: Uses `title` field if not provided

#### `seo.description` (string, optional)
- Meta description for search engines
- Maximum 160 characters
- Should be compelling and include keywords
- Used in search result snippets
- Default: Auto-generated from content if not provided

#### `seo.keywords` (array of strings, optional)
- SEO keywords for search engines
- Maximum 10 keywords
- Should be relevant and specific
- Default: Uses `tags` if not provided

**Example:**
```yaml
seo:
  title: "Project Charter Template - PMBOK Guide"
  description: "Learn how to create a comprehensive project charter using PMBOK best practices. Includes template and examples."
  keywords:
    - "project charter"
    - "pmbok"
    - "project management"
    - "project initiation"
```

**Default:** `null` (SEO fields auto-generated from other frontmatter)

---

## Additional Metadata Fields

### `author` (string, optional)

**Description:** Author name or identifier.

**Example:**
```yaml
author: "John Smith"
```

---

### `created` (ISO 8601 date string, optional)

**Description:** Document creation date.

**Format:** `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ssZ`

**Example:**
```yaml
created: "2024-01-15"
```

**Default:** File creation date

---

### `updated` (ISO 8601 date string, optional)

**Description:** Last update date.

**Format:** `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ssZ`

**Example:**
```yaml
updated: "2024-01-20T10:30:00Z"
```

**Default:** File modification date

---

### `status` (string, optional)

**Description:** Document status.

**Allowed Values:**
- `"draft"` - Work in progress
- `"review"` - Under review
- `"published"` - Published and visible
- `"archived"` - Archived (hidden from search)

**Example:**
```yaml
status: "published"
```

**Default:** `"draft"`

---

### `framework` (string, optional)

**Description:** Framework or standard this document relates to.

**Allowed Values:**
- `"PMBOK"` - Project Management Body of Knowledge
- `"BABOK"` - Business Analysis Body of Knowledge
- `"DMBOK"` - Data Management Body of Knowledge
- `"TOGAF"` - The Open Group Architecture Framework
- `"SABSA"` - Sherwood Applied Business Security Architecture
- `"ZACHMAN"` - Zachman Framework
- `"FEAF"` - Federal Enterprise Architecture Framework
- `"ITIL"` - IT Infrastructure Library
- `"COBIT"` - Control Objectives for Information and Related Technologies

**Example:**
```yaml
framework: "PMBOK"
```

---

### `version` (string, optional)

**Description:** Document version.

**Format:** Semantic versioning (e.g., `"1.0.0"`) or simple version (e.g., `"v2"`)

**Example:**
```yaml
version: "1.2.0"
```

---

### `deprecated` (boolean, optional)

**Description:** Whether this document is deprecated.

**Example:**
```yaml
deprecated: true
```

**Default:** `false`

---

## Complete Example

```yaml
---
title: "Project Charter Template Guide"
slug: "project-charter-template-guide"
area: "features"
level: "intermediate"
readingTime: 8
tags:
  - "project-management"
  - "pmbok"
  - "templates"
  - "project-initiation"
  - "best-practices"
related:
  - "project-scope-management"
  - "stakeholder-management-guide"
  - "risk-management-basics"
seo:
  title: "Project Charter Template - PMBOK Guide"
  description: "Learn how to create a comprehensive project charter using PMBOK best practices. Includes template and examples."
  keywords:
    - "project charter"
    - "pmbok"
    - "project management"
    - "project initiation"
author: "John Smith"
created: "2024-01-15"
updated: "2024-01-20T10:30:00Z"
status: "published"
framework: "PMBOK"
version: "1.0.0"
deprecated: false
---

# Project Charter Template Guide

Content starts here...
```

---

## Validation Rules

### Required Field Validation

1. **`title`** - Must be present and non-empty
2. **`slug`** - Must be present, unique, and match regex pattern

### Type Validation

- `title`, `slug`, `area`, `level`, `author`, `framework`, `version` - Must be strings
- `readingTime` - Must be a positive integer
- `tags`, `related`, `seo.keywords` - Must be arrays of strings
- `seo` - Must be an object
- `deprecated` - Must be a boolean
- `created`, `updated` - Must be valid ISO 8601 date strings
- `status` - Must be one of the allowed values

### Content Validation

- `title` - Max 200 characters
- `slug` - Max 100 characters, must match regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- `tags` - Max 20 tags, each tag max 50 characters
- `related` - Max 10 related slugs
- `seo.title` - Max 60 characters
- `seo.description` - Max 160 characters
- `seo.keywords` - Max 10 keywords

---

## Frontmatter Processing

### Parsing

Frontmatter is parsed using a YAML parser (e.g., `js-yaml` or `gray-matter`).

**Example:**
```typescript
import matter from 'gray-matter'

const { data, content } = matter(fileContent)
// data contains frontmatter
// content contains MDX content
```

### Validation

Frontmatter should be validated against this schema before content is indexed or displayed.

**Example Validation Function:**
```typescript
interface Frontmatter {
  title: string
  slug: string
  area?: string
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  readingTime?: number
  tags?: string[]
  related?: string[]
  seo?: {
    title?: string
    description?: string
    keywords?: string[]
  }
  author?: string
  created?: string
  updated?: string
  status?: 'draft' | 'review' | 'published' | 'archived'
  framework?: string
  version?: string
  deprecated?: boolean
}

function validateFrontmatter(data: any): Frontmatter {
  // Validation logic
  if (!data.title || typeof data.title !== 'string') {
    throw new Error('title is required and must be a string')
  }
  // ... more validation
  return data as Frontmatter
}
```

---

## Search Indexing

Frontmatter fields are indexed for search:

### Full-Text Search Fields
- `title` - High weight
- `seo.description` - Medium weight
- `tags` - Medium weight
- `content` (body) - Low weight

### Filterable Fields
- `area`
- `level`
- `framework`
- `tags`
- `status`
- `author`

### Sortable Fields
- `created`
- `updated`
- `readingTime`

---

## Best Practices

### Writing Good Frontmatter

1. **Be Descriptive:** Use clear, descriptive titles and descriptions
2. **Use Consistent Tags:** Establish a tag taxonomy and use it consistently
3. **Link Related Content:** Add related documents to help users discover content
4. **Optimize for SEO:** Include relevant keywords in SEO fields
5. **Keep Slugs Stable:** Don't change slugs after publication (breaks links)
6. **Update Timestamps:** Keep `updated` field current when content changes

### Tag Taxonomy

Establish a consistent tag taxonomy:

**Categories:**
- Framework tags: `pmbok`, `babok`, `dmbok`, `togaf`, `sabsa`
- Topic tags: `project-management`, `risk-management`, `stakeholder-management`
- Type tags: `templates`, `guides`, `examples`, `best-practices`
- Level tags: `beginner`, `intermediate`, `advanced`

### SEO Guidelines

1. **Title:** Include primary keyword, keep under 60 characters
2. **Description:** Write compelling copy, include keywords naturally, keep under 160 characters
3. **Keywords:** Use 5-10 relevant keywords, prioritize high-value terms

---

## Migration Guide

### Existing Content

For existing content without frontmatter:

1. Add minimal required fields (`title`, `slug`)
2. Auto-generate `slug` from filename or title
3. Set default values for optional fields
4. Gradually enrich with additional metadata

### Example Migration Script

```typescript
function addFrontmatterToFile(fileContent: string, filename: string): string {
  const slug = filename.replace('.mdx', '').toLowerCase()
  const title = slug.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
  
  const frontmatter = `---
title: "${title}"
slug: "${slug}"
status: "published"
---

`
  
  return frontmatter + fileContent
}
```

---

## Tools and Utilities

### Frontmatter Validator

Create a CLI tool to validate frontmatter:

```bash
npm run validate-frontmatter docs/**/*.mdx
```

### Frontmatter Generator

Create a tool to generate frontmatter templates:

```bash
npm run generate-frontmatter --title "My Document" --area "features"
```

---

## Appendix: Field Reference

| Field | Type | Required | Default | Max Length |
|-------|------|----------|---------|------------|
| `title` | string | ✅ Yes | - | 200 |
| `slug` | string | ✅ Yes | - | 100 |
| `area` | string | ❌ No | `null` | - |
| `level` | string | ❌ No | `"beginner"` | - |
| `readingTime` | number | ❌ No | Auto-calc | - |
| `tags` | string[] | ❌ No | `[]` | 20 items |
| `related` | string[] | ❌ No | `[]` | 10 items |
| `seo.title` | string | ❌ No | `title` | 60 |
| `seo.description` | string | ❌ No | Auto-gen | 160 |
| `seo.keywords` | string[] | ❌ No | `tags` | 10 items |
| `author` | string | ❌ No | - | - |
| `created` | string | ❌ No | File date | - |
| `updated` | string | ❌ No | File date | - |
| `status` | string | ❌ No | `"draft"` | - |
| `framework` | string | ❌ No | - | - |
| `version` | string | ❌ No | - | - |
| `deprecated` | boolean | ❌ No | `false` | - |

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Week 1, Phase 1 | Initial frontmatter specification | ADPA Team |

---

**End of Document**

