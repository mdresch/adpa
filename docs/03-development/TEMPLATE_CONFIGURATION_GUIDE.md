# Template Configuration Guide for RAG Integration

## Overview

This guide explains how to configure document templates in ADPA to leverage the RAG (Retrieval-Augmented Generation) integration for intelligent context gathering. With RAG integration, templates can semantically search across all project documents to retrieve relevant context, rather than relying solely on exact template ID matches.

**Target Audience:** Developers configuring document templates and implementing custom analyzers.

**Related Documents:**
- [CR-2025-001: RAG Integration](../roadmap/CR-2025-001_RAG_INTEGRATION.md)
- [Document Templates Module README](../../server/src/modules/documentTemplates/README.md)
- [Context Injection System](../../server/src/modules/context/README.md)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Template Context Requirements](#template-context-requirements)
3. [RAG Integration Configuration](#rag-integration-configuration)
4. [Semantic Query Design](#semantic-query-design)
5. [Token Management](#token-management)
6. [Testing and Validation](#testing-and-validation)
7. [Examples](#examples)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Quick Start

### Prerequisites

- RAG feature flag enabled: `ENABLE_RAG_CONTEXT_RETRIEVAL=true`
- Documents chunked with embeddings (Phase 2 complete)
- Context retrieval service initialized

### Basic Template Configuration

Templates store their context requirements in the `context_requirements` JSONB column:

```typescript
// Example: Update template with context requirements
await pool.query(
  `UPDATE document_templates 
   SET context_requirements = $1 
   WHERE id = $2`,
  [
    {
      semantic_queries: [
        'project risks and mitigation strategies',
        'stakeholder requirements and constraints'
      ],
      retrieval_parameters: {
        topK: 10,
        min_similarity: 0.7,
        max_chunks: 20
      },
      context_sources: ['documents', 'project', 'templates']
    },
    templateId
  ]
)
```

---

## Template Context Requirements

### Schema Definition

The `context_requirements` field follows this structure:

```typescript
interface ContextRequirements {
  // Semantic queries for RAG retrieval
  semantic_queries: string[]
  
  // Retrieval parameters
  retrieval_parameters: {
    topK: number              // Number of top results per query
    min_similarity: number    // Minimum similarity score (0.0-1.0)
    max_chunks: number        // Maximum total chunks to retrieve
    enable_reranking?: boolean // Enable relevance reranking
  }
  
  // Context sources to include
  context_sources: Array<
    'documents' | 'project' | 'templates' | 
    'baseline' | 'history' | 'external'
  >
  
  // Optional: Token budget allocation
  token_budget?: {
    max_context_tokens: number
    context_ratio: number     // Ratio of context to prompt (0.0-1.0)
    priority_allocation: {
      [source: string]: number  // Priority weight per source
    }
  }
  
  // Optional: Framework-specific settings
  framework_settings?: {
    framework: string         // TOGAF, SABSA, COBIT, etc.
    required_sections?: string[]
    validation_rules?: object
  }
}
```

### Field Descriptions

#### semantic_queries

Array of natural language queries that describe the context needed for this template:

- **Purpose:** Define what information should be semantically retrieved
- **Format:** Natural language questions or descriptions
- **Best Practice:** 3-5 specific, distinct queries per template
- **Example:**
  ```typescript
  semantic_queries: [
    'project scope and objectives',
    'key stakeholders and their roles',
    'technical constraints and requirements',
    'budget and resource allocations'
  ]
  ```

#### retrieval_parameters

Controls how semantic search operates:

- **topK:** Number of results per query (recommended: 5-15)
- **min_similarity:** Threshold for relevance (recommended: 0.65-0.8)
- **max_chunks:** Total chunk limit across all queries (recommended: 15-30)
- **enable_reranking:** Apply additional relevance scoring (optional, slower)

#### context_sources

Specifies which context analyzers to use:

- **documents:** Semantic search across all project documents
- **project:** Project metadata and structure
- **templates:** Related template examples and patterns
- **baseline:** Baseline context (project fundamentals)
- **history:** Historical document versions
- **external:** External integrations (SharePoint, Confluence, etc.)

---

## RAG Integration Configuration

### Enabling RAG for Templates

RAG integration is controlled by the `ENABLE_RAG_CONTEXT_RETRIEVAL` environment variable and template-specific configuration:

```bash
# .env file
ENABLE_RAG_CONTEXT_RETRIEVAL=true
```

### Template-Level RAG Configuration

Each template can customize RAG behavior through `context_requirements`:

```typescript
const contextRequirements = {
  semantic_queries: [
    'business requirements and success criteria',
    'technical architecture and design decisions',
    'risks, issues, and mitigation plans'
  ],
  retrieval_parameters: {
    topK: 10,
    min_similarity: 0.72,
    max_chunks: 25,
    enable_reranking: true
  },
  context_sources: ['documents', 'project', 'history'],
  token_budget: {
    max_context_tokens: 6000,
    context_ratio: 0.65,
    priority_allocation: {
      documents: 0.6,
      project: 0.25,
      history: 0.15
    }
  }
}
```

### Analyzer Integration

The `TemplateContextAnalyzer` automatically integrates RAG when configured:

```typescript
// server/src/modules/contextGathering/analyzers/templateContextAnalyzer.ts
if (process.env.ENABLE_RAG_CONTEXT_RETRIEVAL === 'true' && this.retrieval) {
  const framework = templateData.framework || ''
  const queries = [
    `validation rules for ${framework} sections`,
    'examples of high-quality outputs for this template',
    'common pitfalls and corrections for this template type',
    'variable resolution examples and guidance'
  ]
  
  const ragChunks = []
  for (const q of queries) {
    const found = await this.retrieval.searchChunks({
      projectId: templateMetadata?.project_id || '',
      query: q,
      topK: 8
    })
    ragChunks.push(...found)
  }
}
```

---

## Semantic Query Design

### Writing Effective Semantic Queries

Good semantic queries are:

1. **Specific:** Target concrete information types
2. **Diverse:** Cover different aspects of context
3. **Concise:** 5-15 words per query
4. **Natural:** Use plain language, not SQL or code

#### ✅ Good Examples

```typescript
semantic_queries: [
  'stakeholder requirements and approval criteria',
  'technical dependencies and integration points',
  'project timeline and milestone dates',
  'budget constraints and resource limitations'
]
```

#### ❌ Bad Examples

```typescript
semantic_queries: [
  'information',  // Too vague
  'SELECT * FROM documents WHERE type = "requirements"',  // Not natural language
  'get me all the stakeholder requirements and their approval criteria and any feedback from reviews and all the meeting notes about requirements',  // Too long, unfocused
  'project data'  // Too generic
]
```

### Query Templates by Document Type

#### Business Requirements Document

```typescript
semantic_queries: [
  'business goals and success metrics',
  'stakeholder needs and pain points',
  'functional and non-functional requirements',
  'constraints and assumptions'
]
```

#### Technical Architecture Document

```typescript
semantic_queries: [
  'system architecture and design patterns',
  'technology stack and infrastructure',
  'integration requirements and APIs',
  'security and compliance requirements'
]
```

#### Risk Assessment Document

```typescript
semantic_queries: [
  'identified risks and threat scenarios',
  'risk impact and probability assessments',
  'mitigation strategies and contingency plans',
  'historical risk outcomes and lessons learned'
]
```

#### Project Charter

```typescript
semantic_queries: [
  'project vision and objectives',
  'scope and deliverables',
  'stakeholder roster and governance',
  'budget and resource commitments'
]
```

---

## Token Management

### Understanding Token Budgets

Token management ensures context doesn't exceed AI model limits:

```typescript
token_budget: {
  max_context_tokens: 6000,      // Maximum tokens for all context
  context_ratio: 0.65,           // 65% of available tokens for context
  priority_allocation: {
    documents: 0.6,              // 60% of context tokens
    project: 0.25,               // 25% of context tokens
    history: 0.15                // 15% of context tokens
  }
}
```

### Token Budget Calculation

```typescript
// Example for GPT-4 (8192 token limit)
const modelLimit = 8192
const contextRatio = 0.65
const maxContextTokens = modelLimit * contextRatio  // 5324 tokens

// Allocation per source
const documentsTokens = maxContextTokens * 0.6      // 3194 tokens
const projectTokens = maxContextTokens * 0.25       // 1331 tokens
const historyTokens = maxContextTokens * 0.15       // 799 tokens
```

### Adaptive Token Management

The system automatically truncates context when needed:

```typescript
retrieval_parameters: {
  topK: 15,
  min_similarity: 0.7,
  max_chunks: 30,  // Hard limit on chunks
}

// System behavior:
// 1. Retrieve top 15 chunks per query
// 2. Rerank by relevance score
// 3. Truncate to max_chunks (30)
// 4. Further truncate if exceeding token budget
// 5. Prioritize higher-scored chunks
```

### Model-Specific Configurations

```typescript
// GPT-3.5 Turbo (4K context)
{
  token_budget: {
    max_context_tokens: 2600,
    context_ratio: 0.65
  },
  retrieval_parameters: {
    max_chunks: 15
  }
}

// GPT-4 (8K context)
{
  token_budget: {
    max_context_tokens: 5300,
    context_ratio: 0.65
  },
  retrieval_parameters: {
    max_chunks: 25
  }
}

// GPT-4 Turbo (128K context)
{
  token_budget: {
    max_context_tokens: 83200,
    context_ratio: 0.65
  },
  retrieval_parameters: {
    max_chunks: 100
  }
}
```

---

## Testing and Validation

### Unit Testing Template Configuration

```typescript
// Test template context requirements
describe('Template Context Requirements', () => {
  it('should validate context requirements schema', () => {
    const requirements = {
      semantic_queries: ['test query'],
      retrieval_parameters: {
        topK: 10,
        min_similarity: 0.7,
        max_chunks: 20
      },
      context_sources: ['documents']
    }
    
    expect(validateContextRequirements(requirements)).toBe(true)
  })
  
  it('should retrieve context using semantic queries', async () => {
    const templateId = 'test-template'
    const analyzer = new TemplateContextAnalyzer(retrievalService)
    
    const context = await analyzer.analyzeTemplateContext(templateId)
    
    expect(context.template_metadata).toBeDefined()
    expect(context.template_usage_stats).toBeDefined()
  })
})
```

### Integration Testing

```typescript
// Test end-to-end context gathering with RAG
describe('RAG-Powered Context Gathering', () => {
  it('should gather context using semantic search', async () => {
    const stage = new ContextGatheringStage(
      pool,
      contextRetrievalService
    )
    
    const input = {
      document_id: 'doc-123',
      project_id: 'proj-456',
      template_id: 'template-789'
    }
    
    const result = await stage.process(input)
    
    expect(result.context_bundle).toBeDefined()
    expect(result.context_bundle.project_context).toBeDefined()
    expect(result.context_bundle.document_contexts).toBeDefined()
    expect(result.context_bundle.template_context).toBeDefined()
  })
})
```

### Validation Checklist

Before deploying a template configuration:

- [ ] Semantic queries are specific and diverse
- [ ] `topK` is between 5-15 for each query
- [ ] `min_similarity` is between 0.65-0.8
- [ ] `max_chunks` is appropriate for model token limit
- [ ] Token budget is within model constraints
- [ ] Context sources are relevant for template type
- [ ] Tested with sample documents
- [ ] Quality comparison done (with/without RAG)
- [ ] Performance measured (< 2s retrieval time)

---

## Examples

### Example 1: Business Case Template

```typescript
const businessCaseTemplate = {
  id: 'template-business-case',
  name: 'Business Case Document',
  framework: 'Custom',
  category: 'Business',
  context_requirements: {
    semantic_queries: [
      'business problem and opportunity statement',
      'cost-benefit analysis and ROI calculations',
      'stakeholder impact and change management',
      'alternative solutions and recommendations'
    ],
    retrieval_parameters: {
      topK: 12,
      min_similarity: 0.72,
      max_chunks: 28,
      enable_reranking: true
    },
    context_sources: ['documents', 'project', 'baseline'],
    token_budget: {
      max_context_tokens: 5000,
      context_ratio: 0.65,
      priority_allocation: {
        documents: 0.65,
        project: 0.25,
        baseline: 0.10
      }
    },
    framework_settings: {
      framework: 'Custom',
      required_sections: [
        'Executive Summary',
        'Problem Statement',
        'Proposed Solution',
        'Cost-Benefit Analysis',
        'Recommendation'
      ]
    }
  }
}
```

### Example 2: Security Assessment Template (SABSA)

```typescript
const securityAssessmentTemplate = {
  id: 'template-sabsa-security',
  name: 'SABSA Security Assessment',
  framework: 'SABSA',
  category: 'Security',
  context_requirements: {
    semantic_queries: [
      'security requirements and compliance standards',
      'threat landscape and vulnerability assessments',
      'security controls and safeguards',
      'risk treatment and mitigation strategies',
      'SABSA attributes and security services'
    ],
    retrieval_parameters: {
      topK: 10,
      min_similarity: 0.75,
      max_chunks: 25,
      enable_reranking: true
    },
    context_sources: ['documents', 'project', 'templates', 'external'],
    token_budget: {
      max_context_tokens: 6000,
      context_ratio: 0.7,
      priority_allocation: {
        documents: 0.5,
        project: 0.2,
        templates: 0.2,
        external: 0.1
      }
    },
    framework_settings: {
      framework: 'SABSA',
      required_sections: [
        'Contextual Layer',
        'Conceptual Layer',
        'Logical Layer',
        'Physical Layer',
        'Component Layer'
      ],
      validation_rules: {
        require_sabsa_attributes: true,
        require_risk_assessment: true
      }
    }
  }
}
```

### Example 3: Technical Design Document

```typescript
const technicalDesignTemplate = {
  id: 'template-technical-design',
  name: 'Technical Design Document',
  framework: 'TOGAF',
  category: 'Architecture',
  context_requirements: {
    semantic_queries: [
      'system architecture and component design',
      'technology stack and platform requirements',
      'API specifications and integration patterns',
      'data models and database schema',
      'non-functional requirements and constraints',
      'deployment architecture and infrastructure'
    ],
    retrieval_parameters: {
      topK: 15,
      min_similarity: 0.7,
      max_chunks: 35,
      enable_reranking: false
    },
    context_sources: ['documents', 'project', 'templates', 'history'],
    token_budget: {
      max_context_tokens: 8000,
      context_ratio: 0.68,
      priority_allocation: {
        documents: 0.55,
        project: 0.20,
        templates: 0.15,
        history: 0.10
      }
    },
    framework_settings: {
      framework: 'TOGAF',
      required_sections: [
        'Architecture Vision',
        'Business Architecture',
        'Data Architecture',
        'Application Architecture',
        'Technology Architecture'
      ]
    }
  }
}
```

### Example 4: Minimal Configuration

For simple templates that don't need extensive context:

```typescript
const simpleTemplate = {
  id: 'template-simple-status',
  name: 'Simple Status Report',
  framework: 'Custom',
  category: 'Reporting',
  context_requirements: {
    semantic_queries: [
      'project status and progress updates',
      'current issues and blockers'
    ],
    retrieval_parameters: {
      topK: 5,
      min_similarity: 0.7,
      max_chunks: 10
    },
    context_sources: ['documents', 'project']
  }
}
```

---

## Troubleshooting

### Common Issues

#### Issue: No Results from Semantic Search

**Symptoms:**
- Empty or minimal context retrieved
- No chunks found above similarity threshold

**Solutions:**
1. Lower `min_similarity` (try 0.65 instead of 0.75)
2. Ensure documents are chunked with embeddings
3. Check that documents exist in the project
4. Verify semantic queries are not too specific
5. Check RAG feature flag is enabled

```typescript
// Debug: Check chunk availability
const chunks = await pool.query(
  'SELECT COUNT(*) FROM document_chunks WHERE document_id IN (SELECT id FROM documents WHERE project_id = $1)',
  [projectId]
)
console.log(`Available chunks: ${chunks.rows[0].count}`)
```

#### Issue: Context Exceeds Token Limit

**Symptoms:**
- AI generation fails with token limit errors
- Context is truncated unexpectedly

**Solutions:**
1. Reduce `max_chunks` parameter
2. Lower `context_ratio` in token budget
3. Use a model with larger context window
4. Enable more aggressive truncation

```typescript
retrieval_parameters: {
  max_chunks: 15,  // Reduce from 30
  min_similarity: 0.75  // Increase to get only best matches
}
```

#### Issue: Irrelevant Context Retrieved

**Symptoms:**
- Retrieved chunks don't match expected content
- Low relevance to template needs

**Solutions:**
1. Refine semantic queries to be more specific
2. Increase `min_similarity` threshold
3. Enable `enable_reranking` for better relevance
4. Review and improve document chunking strategy

```typescript
semantic_queries: [
  // Too vague:
  'requirements',
  
  // Better:
  'functional requirements for user authentication',
  'non-functional performance requirements',
  'security and compliance requirements'
]
```

#### Issue: Slow Context Retrieval

**Symptoms:**
- Context gathering takes > 2 seconds
- Timeout errors

**Solutions:**
1. Reduce number of semantic queries
2. Lower `topK` per query
3. Disable `enable_reranking`
4. Add database indexes on embeddings
5. Enable Redis caching

```typescript
// Optimized for speed
retrieval_parameters: {
  topK: 5,  // Reduce from 15
  min_similarity: 0.75,  // Higher threshold = fewer comparisons
  max_chunks: 15,  // Reduce total chunks
  enable_reranking: false  // Disable for speed
}
```

### Debug Mode

Enable debug logging to troubleshoot RAG integration:

```bash
# .env
LOG_LEVEL=debug
ENABLE_RAG_CONTEXT_RETRIEVAL=true
```

```typescript
// In your analyzer
logger.debug('RAG retrieval starting', {
  templateId,
  queries: semantic_queries,
  parameters: retrieval_parameters
})

const results = await this.retrieval.searchChunks(params)

logger.debug('RAG retrieval complete', {
  templateId,
  chunksFound: results.length,
  averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length
})
```

---

## Best Practices

### 1. Design Queries for Semantic Understanding

- Use natural language, not database queries
- Focus on meaning and intent, not keywords
- Cover different aspects (functional, technical, business)
- Keep queries between 5-15 words

### 2. Tune Retrieval Parameters Iteratively

Start conservative, then optimize:

```typescript
// Initial configuration
retrieval_parameters: {
  topK: 10,
  min_similarity: 0.7,
  max_chunks: 20
}

// After testing, optimize:
retrieval_parameters: {
  topK: 12,
  min_similarity: 0.72,
  max_chunks: 25,
  enable_reranking: true
}
```

### 3. Allocate Token Budget Strategically

Prioritize the most important context sources:

```typescript
// Business-focused document
priority_allocation: {
  documents: 0.6,   // Business requirements docs
  project: 0.3,     // Project context
  templates: 0.1    // Template patterns
}

// Technical document
priority_allocation: {
  documents: 0.5,   // Technical specs
  project: 0.2,     // Project details
  templates: 0.2,   // Architecture patterns
  history: 0.1      // Past design decisions
}
```

### 4. Test with Real Data

Always validate with actual project documents:

```typescript
// Baseline test (without RAG)
const baseline = await generateDocument(templateId, { useRAG: false })

// RAG test
const ragEnhanced = await generateDocument(templateId, { useRAG: true })

// Compare quality
console.log('Baseline quality:', evaluateQuality(baseline))
console.log('RAG quality:', evaluateQuality(ragEnhanced))
console.log('Context coverage:', calculateCoverage(ragEnhanced))
```

### 5. Monitor and Iterate

Track metrics for continuous improvement:

- Context retrieval time
- Semantic search precision
- Token utilization
- User satisfaction with generated content
- Context relevance scores

### 6. Document Your Configuration Decisions

Add comments explaining your choices:

```typescript
context_requirements: {
  semantic_queries: [
    // High priority: Core business requirements
    'business goals and success criteria',
    
    // Medium priority: Stakeholder context
    'stakeholder needs and expectations',
    
    // Low priority: Background information
    'historical context and previous projects'
  ],
  retrieval_parameters: {
    topK: 12,  // Tested: 10 was too few, 15 had too much noise
    min_similarity: 0.72,  // Threshold validated with sample docs
    max_chunks: 25,  // Fits within GPT-4 8K context limit
    enable_reranking: true  // Improves precision by 15%
  }
}
```

### 7. Use Framework-Specific Configurations

Leverage framework knowledge in your queries:

```typescript
// TOGAF template
semantic_queries: [
  'enterprise architecture principles and standards',
  'TOGAF ADM phase deliverables',
  'architecture building blocks and patterns'
]

// SABSA template
semantic_queries: [
  'SABSA lifecycle phases and deliverables',
  'security attributes and service categories',
  'risk treatment and control objectives'
]
```

### 8. Implement Fallback Behavior

Always have a fallback when RAG fails:

```typescript
try {
  if (process.env.ENABLE_RAG_CONTEXT_RETRIEVAL === 'true' && this.retrieval) {
    // Attempt RAG retrieval
    const ragContext = await this.retrieval.searchChunks(params)
    return ragContext
  }
} catch (error) {
  logger.warn('RAG retrieval failed, falling back to direct query', { error })
  // Fallback to traditional context gathering
  return await this.gatherContextDirect(templateId)
}
```

---

## Additional Resources

### Documentation

- [RAG Integration Change Request](../roadmap/CR-2025-001_RAG_INTEGRATION.md)
- [Context Retrieval Service](../../server/src/modules/contextRetrieval/contextRetrievalService.ts)
- [Template Context Analyzer](../../server/src/modules/contextGathering/analyzers/templateContextAnalyzer.ts)
- [Document Templates API](../../server/src/modules/documentTemplates/README.md)

### Code Examples

- [Context Gathering Stage](../../server/src/modules/contextGathering/contextGatheringStage.ts)
- [Template Service](../../server/src/modules/documentTemplates/service.ts)

### Related Guides

- [Local Development Guide](./LOCAL_DEVELOPMENT_SUCCESS.md)
- [Docker Development Guide](./DOCKER_DEVELOPMENT_GUIDE.md)

---

**Document Version:** 1.0.0  
**Last Updated:** November 7, 2025  
**Maintained By:** ADPA Development Team
