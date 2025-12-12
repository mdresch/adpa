# Extraction Module

This directory contains the modular extraction system for project data extraction.

## Structure

```
extraction/
├── base/                    # Base utilities (shared across all entities)
│   ├── ExtractionResult.ts  # Result types and interfaces
│   ├── ExtractionContext.ts # Context management
│   ├── Parser.ts            # JSON parsing and cleanup
│   ├── PromptBuilder.ts    # Prompt construction
│   ├── SourceDocumentResolver.ts # Document resolution
│   ├── Deduper.ts          # Deduplication logic
│   ├── Persistence.ts      # Database helpers
│   └── index.ts            # Exports
├── entities/               # Entity-specific modules (to be created)
│   └── <entity>/          # Per-entity extraction logic
│       ├── extract<Entity>.ts
│       ├── save<Entity>.ts
│       └── index.ts
├── cache/                  # Cache utilities
│   ├── AICacheService.ts  # Cache wrapper for DI
│   └── index.ts
└── README.md              # This file
```

## Base Utilities

### ExtractionResult.ts
Defines types for extraction results, including:
- `ExtractionResult<T>` - Result of extracting a single entity type
- `ExtractionStats` - Statistics about extraction operations
- `ExtractionDocument` - Document information
- `ExtractionOptions` - Options for extraction operations
- `SourceResolutionResult` - Source document resolution result

### ExtractionContext.ts
Manages context for extraction operations:
- Project and user information
- Document management (map, list, context)
- Provider/model configuration
- Helper methods for document lookup

### Parser.ts
Handles parsing of AI responses:
- JSON extraction from markdown code blocks
- Control character fixing
- Unescaped quote handling
- Incomplete JSON recovery
- Type coercion utilities

### PromptBuilder.ts
Constructs AI prompts for entity extraction:
- `buildExtractionPrompt()` - Standard extraction prompt
- `buildCustomPrompt()` - Custom prompt with full control

### SourceDocumentResolver.ts
Resolves source document titles to document IDs:
- `resolveSourceDocumentId()` - Basic resolution
- `resolveSourceDocumentIdStrict()` - Strict resolution with fallback

### Deduper.ts
Provides deduplication utilities:
- `deduplicateEntities()` - Generic deduplication
- `deduplicateByField()` - Deduplicate by single field
- `deduplicateByFields()` - Deduplicate by multiple fields
- Normalization helpers

### Persistence.ts
Provides database persistence utilities:
- `EntityPersistence<T>` - Interface for entity persistence
- `executeWithTransaction()` - Transaction wrapper
- `buildBulkInsertPlaceholders()` - Bulk insert helpers
- Type normalization utilities

## Cache Utilities

### AICacheService.ts
Wraps the existing `aiCacheService` for dependency injection:
- `IExtractionCacheService` - Cache interface
- `ExtractionCacheService` - Implementation wrapper
- Maintains backward compatibility with existing cache service

## Usage Example

```typescript
import { ExtractionContext, parseAIResponse, buildExtractionPrompt } from './base'
import { extractionCacheService } from './cache'

// Create context
const context = new ExtractionContext(projectId, userId, documents, options)

// Build prompt
const prompt = buildExtractionPrompt(
  context,
  'stakeholders',
  'stakeholders mentioned',
  jsonStructure,
  requirements
)

// Call AI and parse
const response = await aiService.generate({ prompt })
const parsed = parseAIResponse(response.content)
const entities = parsed.stakeholders || []

// Check cache
const cached = await extractionCacheService.get(
  projectId,
  context.documentContext,
  'stakeholders',
  options.aiProvider,
  options.aiModel
)
```

## Next Steps

1. Create entity modules in `entities/<entity>/`
2. Implement `ExtractionRegistry` to map entity types to extractors
3. Implement `ExtractionOrchestrator` to coordinate extraction
4. Migrate entities one by one from the monolith

