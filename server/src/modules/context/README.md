# Context Injection System

The Context Injection System is a comprehensive utility for enhancing AI prompts with relevant project context across different AI providers. It intelligently extracts, prioritizes, and injects contextual information while respecting provider token limits.

## Features

- **Multi-Provider Support**: Works with OpenAI, Google AI, and Azure providers
- **Intelligent Context Extraction**: Automatically extracts context from projects, documents, templates, users, and integrations
- **Token Management**: Respects provider-specific token limits and optimizes context usage
- **Context Prioritization**: Intelligently prioritizes context based on relevance and importance
- **Smart Truncation**: Automatically truncates context when approaching token limits
- **Flexible Configuration**: Customizable priority settings and context inclusion rules

## Architecture

```
Context Injection System
├── types.ts           # Type definitions and interfaces
├── injector.ts        # Main context injection logic
├── extractors.ts      # Context extraction from data sources
├── prioritizer.ts     # Context prioritization and selection
├── token-manager.ts   # Token counting and limit management
├── integration.ts     # Integration with AI service
├── examples.ts        # Usage examples
└── __tests__/         # Test files
```

## Quick Start

### Basic Usage

```typescript
import { ContextInjector } from './modules/context'

const request = {
  prompt: 'Generate a project status report',
  user_id: 'user-123',
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  project_id: 'project-456'
}

const response = await ContextInjector.injectContext(request)
console.log(response.enhanced_prompt)
```

### Enhanced AI Service Integration

```typescript
import { ContextAwareAIService } from './modules/context/integration'

const request = {
  prompt: 'Review this document and suggest improvements',
  user_id: 'user-123',
  provider: 'openai',
  model: 'gpt-4',
  project_id: 'project-456',
  document_ids: ['doc-789'],
  include_integrations: true
}

const response = await ContextAwareAIService.generateWithContext(request)
```

## Context Sources

The system can extract context from multiple sources:

### 1. Project Context
- Project details (name, description, framework)
- Status and priority information
- Team members and ownership
- Budget and timeline information

### 2. Document Context
- Document content (with smart summarization)
- Document metadata and status
- Version information
- Framework-specific structure

### 3. Template Context
- Template structure and variables
- Framework-specific templates
- Usage patterns and categories

### 4. User Context
- User profile and role information
- Permissions and access levels
- Preferences and settings

### 5. Integration Context
- Connected system information
- Sync status and recent changes
- External data sources

### 6. Custom Context
- User-provided context data
- Dynamic context variables
- Application-specific information

## Token Management

The system includes sophisticated token management:

### Provider Limits
```typescript
// Supported providers and their token limits
const limits = {
  openai: {
    'gpt-4': 8192,
    'gpt-4-turbo': 128000,
    'gpt-3.5-turbo': 4096
  },
  google: {
    'gemini-pro': 30720,
    'gemini-1.5-pro': 1048576
  }
}
```

### Token Optimization
- Automatic context truncation
- Smart content summarization
- Priority-based selection
- Efficiency scoring

## Context Prioritization

Context is prioritized using a flexible priority system:

```typescript
enum ContextPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

const priorityConfig = {
  project: ContextPriority.HIGH,
  documents: ContextPriority.HIGH,
  templates: ContextPriority.MEDIUM,
  user: ContextPriority.LOW,
  integrations: ContextPriority.LOW,
  custom: ContextPriority.MEDIUM
}
```

## Configuration Options

### Context Config
```typescript
const config = {
  max_context_ratio: 0.7,        // Max 70% of tokens for context
  enable_smart_truncation: true,  // Auto-truncate when needed
  preserve_user_prompt: true,     // Keep original prompt intact
  context_separator: '\n---\n',   // Separator between context and prompt
  include_metadata: false,        // Include metadata in context
  default_priority: ContextPriority.MEDIUM
}
```

### Extraction Options
```typescript
const extractionOptions = {
  include_content: true,          // Include full content
  include_metadata: true,         // Include metadata
  max_content_length: 2000,       // Max content length per item
  content_format: 'summary'       // 'full', 'summary', or 'outline'
}
```

## API Reference

### ContextInjector

#### `injectContext(request, config?)`
Main method for injecting context into prompts.

**Parameters:**
- `request: ContextRequest` - The context injection request
- `config?: ContextConfig` - Optional configuration

**Returns:** `Promise<ContextResponse>`

#### `validateRequest(request)`
Validates a context request.

#### `getContextStats(request)`
Gets statistics about available context and tokens.

### ContextAwareAIService

#### `generateWithContext(request)`
Generates AI response with automatic context injection.

#### `getContextPreview(request)`
Gets a preview of the enhanced prompt without generating.

#### `getContextStatistics(request)`
Gets detailed statistics and recommendations.

#### `batchGenerateWithContext(requests)`
Processes multiple requests with context.

## Examples

### Document Review with Context
```typescript
const request = {
  prompt: 'Review this document for compliance issues',
  user_id: 'user-123',
  provider: 'openai',
  model: 'gpt-4',
  project_id: 'project-456',
  document_ids: ['compliance-doc-1'],
  custom_context: {
    compliance_framework: 'SOX',
    review_criteria: ['accuracy', 'completeness', 'compliance']
  },
  context_priority: {
    documents: ContextPriority.CRITICAL,
    custom: ContextPriority.HIGH,
    project: ContextPriority.MEDIUM
  }
}

const response = await ContextAwareAIService.generateWithContext(request)
```

### Template-Based Generation
```typescript
const request = {
  prompt: 'Create a business requirements document',
  user_id: 'user-123',
  provider: 'google',
  model: 'gemini-pro',
  project_id: 'project-456',
  template_id: 'brd-template-v2',
  custom_context: {
    stakeholders: ['PM', 'BA', 'Dev Lead'],
    timeline: '6 weeks',
    budget: '$100K'
  }
}

const response = await ContextAwareAIService.generateWithContext(request)
```

### Multi-Framework Analysis
```typescript
const request = {
  prompt: 'Compare BABOK and PMBOK approaches for this project',
  user_id: 'user-123',
  provider: 'openai',
  model: 'gpt-4-turbo',
  project_id: 'project-456',
  include_integrations: true,
  custom_context: {
    frameworks: ['BABOK', 'PMBOK'],
    comparison_aspects: ['processes', 'deliverables', 'roles']
  }
}

const response = await ContextAwareAIService.generateWithContext(request)
```

## Error Handling

The system includes comprehensive error handling:

```typescript
try {
  const response = await ContextInjector.injectContext(request)
  // Handle successful response
} catch (error) {
  if (error.message.includes('Token limit exceeded')) {
    // Handle token limit errors
    // Reduce context scope or use different model
  } else if (error.message.includes('extraction failed')) {
    // Handle context extraction errors
    // Fall back to basic prompt
  } else {
    // Handle other errors
  }
}
```

## Performance Considerations

### Caching
- Context extraction results can be cached
- Token calculations are optimized
- Database queries are minimized

### Optimization Tips
1. Use appropriate models for context size
2. Limit document count for better performance
3. Use content summarization for large documents
4. Configure priority settings based on use case
5. Monitor token usage and adjust limits

## Testing

Run the test suite:
```bash
npm test server/src/modules/context/__tests__/
```

The test suite covers:
- Context injection functionality
- Token management
- Provider compatibility
- Error handling
- Edge cases

## Contributing

When contributing to the context injection system:

1. Follow TypeScript best practices
2. Add tests for new functionality
3. Update documentation
4. Consider token efficiency
5. Test with multiple providers
6. Handle edge cases gracefully

## Troubleshooting

### Common Issues

**Token Limit Exceeded**
- Reduce context scope
- Use models with higher limits
- Enable smart truncation
- Adjust max_context_ratio

**Context Extraction Failed**
- Check database connectivity
- Verify user permissions
- Validate entity IDs
- Review extraction options

**Poor Context Relevance**
- Adjust priority configuration
- Use custom context
- Improve prompt specificity
- Review context sources

**Performance Issues**
- Enable caching
- Limit document count
- Use content summarization
- Optimize database queries

For more detailed troubleshooting, check the logs and error messages provided by the system.