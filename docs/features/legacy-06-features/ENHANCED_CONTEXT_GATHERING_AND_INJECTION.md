# Enhanced Context Gathering and Injection System

## Overview

The Enhanced Context Gathering and Injection System provides robust context gathering and injection capabilities for AI pipelines with comprehensive validation, freshness checking, access control, and detailed logging. This system ensures that AI outputs are relevant, accurate, and based on fresh, authorized data.

## Features

### ✅ Core Requirements Met

- **✅ Retrieve context from DB, document history, and external APIs**
- **✅ Validate freshness and access control**
- **✅ Log context sources and sizes**

### Additional Enhancements

- **Comprehensive Access Control**: Role-based access control with audit logging
- **Freshness Management**: Time-based context validation and staleness detection
- **Metrics Collection**: Detailed performance and quality metrics
- **Error Handling**: Graceful error handling with partial results
- **Health Monitoring**: System health status and monitoring

## Architecture

### Context Orchestrator

The `ContextOrchestrator` is the main component that coordinates all context gathering and injection activities:

```typescript
import { contextOrchestrator } from '@/modules/contextOrchestrator'

// Enhanced context gathering with validation
const result = await contextOrchestrator.gatherContextWithValidation({
  request_id: 'ctx_123',
  template_id: 'template_456',
  project_id: 'project_789',
  user_id: 'user_101',
  enable_access_control: true,
  enable_freshness_validation: true,
  freshness_threshold: 86400000 // 24 hours
})
```

### Key Components

1. **Context Gathering Stage**: Retrieves context from multiple sources
2. **Context Injection Service**: Injects context into AI prompts
3. **Access Control Manager**: Validates user permissions
4. **Freshness Manager**: Assesses context freshness
5. **Context Retrieval Service**: Handles semantic search and retrieval

## Context Sources

### Database Sources
- **Project Context**: Project data, stakeholders, requirements, risks
- **User Profile Context**: User preferences, expertise, history
- **Document History Context**: Previous documents, patterns, templates
- **Baseline Context**: Approved project baselines for drift detection

### External Sources
- **External APIs**: Third-party integrations (Confluence, SharePoint, GitHub)
- **RAG Integration**: Semantic search across document chunks
- **Real-time Data**: Live data feeds and updates

## Validation Features

### Access Control Validation

```typescript
// Access control is automatically validated for each context source
const accessResults = await validateAccessControl(request)

// Results include:
{
  contextId: 'project_789',
  sourceName: 'Project Data',
  allowed: true,
  reason: 'User has read permissions',
  timestamp: '2024-01-15T10:30:00Z'
}
```

### Freshness Validation

```typescript
// Freshness is assessed for all context sources
const freshnessResults = await validateFreshness(gatheringResult, threshold)

// Results include:
{
  context_id: 'project_789',
  freshness_score: 0.85,
  staleness_level: 'fresh', // 'fresh', 'stale', 'expired'
  time_since_update: 3600000, // milliseconds
  recommendations: ['Consider refreshing user preferences']
}
```

## Comprehensive Logging

### Context Source Logs

Every context source retrieval is logged with detailed information:

```typescript
{
  source_id: 'project_context',
  source_type: 'database',
  source_name: 'Project Context',
  retrieval_timestamp: '2024-01-15T10:30:00Z',
  retrieval_duration_ms: 150,
  data_size_bytes: 2048,
  success: true,
  freshness_score: 0.9,
  access_granted: true,
  cache_hit: false,
  metadata: {
    project_id: 'project_789',
    context_type: 'project_data'
  }
}
```

### Metrics Collection

Comprehensive metrics are collected for each context gathering operation:

```typescript
{
  request_id: 'ctx_123',
  total_sources_attempted: 5,
  successful_sources: 4,
  failed_sources: 1,
  total_data_size_bytes: 10240,
  total_processing_time_ms: 1500,
  average_freshness_score: 0.85,
  access_control_checks: 5,
  cache_hit_rate: 0.6,
  error_rate: 0.2
}
```

## API Endpoints

### Enhanced Context Gathering

```http
POST /api/context-orchestrator/gather
Content-Type: application/json

{
  "template_id": "template_456",
  "project_id": "project_789",
  "user_id": "user_101",
  "enable_access_control": true,
  "enable_freshness_validation": true,
  "freshness_threshold": 86400000,
  "context_size_limit": 10485760
}
```

### Enhanced Context Injection

```http
POST /api/context-orchestrator/inject
Content-Type: application/json

{
  "template_id": "template_456",
  "project_id": "project_789",
  "user_id": "user_101",
  "variables": {
    "project_name": "My Project"
  }
}
```

### Health Status

```http
GET /api/context-orchestrator/health
```

### Metrics and Logs

```http
GET /api/context-orchestrator/metrics?start_date=2024-01-01&limit=100
GET /api/context-orchestrator/source-logs?source_type=database&success=true
```

## Configuration

### Context Orchestrator Configuration

```typescript
const config: ContextOrchestratorConfig = {
  enableAccessControl: true,
  enableFreshnessValidation: true,
  enableComprehensiveLogging: true,
  enableMetricsCollection: true,
  enableCaching: true,
  maxContextSizeBytes: 10 * 1024 * 1024, // 10MB
  maxProcessingTimeMs: 30000, // 30 seconds
  enableParallelProcessing: true,
  enableRetryLogic: true,
  maxRetries: 3
}
```

### Access Control Configuration

```typescript
const accessControlConfig = {
  enableRoleBasedAccess: true,
  enableAttributeBasedAccess: true,
  enableAuditLogging: true,
  enableComplianceChecking: true,
  defaultSecurityLevel: 'internal',
  sessionTimeout: 3600000 // 1 hour
}
```

### Freshness Management Configuration

```typescript
const freshnessConfig = {
  defaultStalenessThreshold: 86400000, // 24 hours
  defaultRefreshInterval: 3600000, // 1 hour
  enableAutoRefresh: true,
  enableStalenessCleanup: true,
  maxConcurrentRefreshes: 5
}
```

## Database Schema

### Context Gathering Metrics

```sql
CREATE TABLE context_gathering_metrics (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL,
    total_sources_attempted INTEGER NOT NULL DEFAULT 0,
    successful_sources INTEGER NOT NULL DEFAULT 0,
    failed_sources INTEGER NOT NULL DEFAULT 0,
    total_data_size_bytes BIGINT NOT NULL DEFAULT 0,
    total_processing_time_ms INTEGER NOT NULL DEFAULT 0,
    average_freshness_score DECIMAL(3,2) DEFAULT 0.0,
    access_control_checks INTEGER NOT NULL DEFAULT 0,
    cache_hit_rate DECIMAL(3,2) DEFAULT 0.0,
    error_rate DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Context Source Logs

```sql
CREATE TABLE context_source_logs (
    id SERIAL PRIMARY KEY,
    source_id VARCHAR(255) NOT NULL,
    source_type VARCHAR(100) NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    retrieval_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    retrieval_duration_ms INTEGER NOT NULL DEFAULT 0,
    data_size_bytes BIGINT NOT NULL DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    freshness_score DECIMAL(3,2) DEFAULT 0.0,
    access_granted BOOLEAN NOT NULL DEFAULT false,
    cache_hit BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Usage Examples

### Basic Context Gathering

```typescript
import { contextOrchestrator } from '@/modules/contextOrchestrator'

const request = {
  request_id: 'ctx_' + Date.now(),
  template_id: 'project_charter',
  project_id: 'proj_123',
  user_id: 'user_456',
  document_type: 'project_charter',
  gathering_config: {
    context_sources: [
      {
        source_id: 'project_context',
        source_name: 'Project Context',
        source_type: 'database',
        enabled: true
      }
    ],
    enable_rag_integration: true,
    enable_baseline_integration: true
  }
}

const result = await contextOrchestrator.gatherContextWithValidation(request)

console.log('Context gathered:', {
  totalSources: result.metrics.total_sources_attempted,
  successfulSources: result.metrics.successful_sources,
  totalDataSize: result.metrics.total_data_size_bytes,
  processingTime: result.metrics.total_processing_time_ms,
  warnings: result.warnings,
  errors: result.errors
})
```

### Context Injection with Validation

```typescript
const injectionRequest = {
  template_id: 'project_charter',
  project_id: 'proj_123',
  user_id: 'user_456',
  variables: {
    project_name: 'Digital Transformation Initiative',
    project_manager: 'John Doe'
  }
}

const injectionResult = await contextOrchestrator.injectContextWithValidation(injectionRequest)

if (injectionResult.success) {
  console.log('Context injected successfully:', injectionResult.bundle.bundle_id)
} else {
  console.error('Context injection failed:', injectionResult.errors)
}
```

### Health Monitoring

```typescript
const healthStatus = await contextOrchestrator.getHealthStatus()

console.log('System Health:', {
  overallHealth: healthStatus.overall_health,
  accessControlEnabled: healthStatus.access_control_enabled,
  freshnessValidationEnabled: healthStatus.freshness_validation_enabled,
  loggingEnabled: healthStatus.comprehensive_logging_enabled
})
```

## Error Handling

The system provides comprehensive error handling with graceful degradation:

### Partial Results on Error

Even when errors occur, the system returns partial results with detailed error information:

```typescript
{
  result_id: 'error_ctx_123',
  request_id: 'ctx_123',
  context_data: {}, // Partial data if available
  access_control_results: [...],
  freshness_validation_results: [...],
  source_logs: [...],
  metrics: {...},
  warnings: ['Access denied for 1 context sources'],
  errors: ['Context gathering failed: Database connection timeout']
}
```

### Retry Logic

The system includes configurable retry logic for transient failures:

```typescript
const config = {
  enableRetryLogic: true,
  maxRetries: 3,
  retryDelay: 1000 // milliseconds
}
```

## Performance Optimization

### Parallel Processing

Context sources are processed in parallel when possible:

```typescript
const config = {
  enableParallelProcessing: true,
  maxConcurrentSources: 5
}
```

### Caching

Intelligent caching reduces redundant data retrieval:

```typescript
const config = {
  enableCaching: true,
  cacheTTL: 3600000, // 1 hour
  cacheStrategy: 'lru' // Least Recently Used
}
```

### Size Limits

Context size limits prevent memory issues:

```typescript
const config = {
  maxContextSizeBytes: 10 * 1024 * 1024, // 10MB
  maxProcessingTimeMs: 30000 // 30 seconds
}
```

## Monitoring and Analytics

### Real-time Metrics

Monitor context gathering performance in real-time:

- **Success Rate**: Percentage of successful context retrievals
- **Average Processing Time**: Mean time to gather context
- **Cache Hit Rate**: Percentage of cache hits vs misses
- **Freshness Score**: Average freshness of retrieved context
- **Error Rate**: Percentage of failed operations

### Alerting

Set up alerts for:

- High error rates (> 10%)
- Slow processing times (> 30 seconds)
- Low freshness scores (< 0.7)
- Access control violations
- System health degradation

## Security Considerations

### Access Control

- **Role-based Access Control (RBAC)**: Users can only access context they have permissions for
- **Attribute-based Access Control (ABAC)**: Fine-grained access control based on attributes
- **Audit Logging**: All access attempts are logged for compliance

### Data Protection

- **Encryption**: Sensitive context data is encrypted at rest and in transit
- **Data Minimization**: Only necessary context is retrieved and stored
- **Retention Policies**: Context data is automatically cleaned up based on policies

### Compliance

- **GDPR Compliance**: Personal data handling follows GDPR requirements
- **SOX Compliance**: Financial data access is audited and controlled
- **HIPAA Compliance**: Healthcare data is protected according to HIPAA standards

## Testing

### Unit Tests

Comprehensive unit tests cover all major functionality:

```bash
npm test -- contextOrchestrator.test.ts
```

### Integration Tests

Integration tests validate end-to-end functionality:

```bash
npm test -- integration/context-orchestrator.test.ts
```

### Performance Tests

Performance tests ensure the system meets SLA requirements:

```bash
npm run test:performance -- context-orchestrator
```

## Troubleshooting

### Common Issues

1. **High Error Rates**
   - Check database connectivity
   - Verify access permissions
   - Review error logs

2. **Slow Performance**
   - Enable parallel processing
   - Increase cache TTL
   - Optimize database queries

3. **Stale Context**
   - Reduce freshness threshold
   - Enable auto-refresh
   - Check data update frequency

### Debug Mode

Enable debug mode for detailed logging:

```typescript
const config = {
  enableDebugLogging: true,
  logLevel: 'debug'
}
```

### Health Checks

Regular health checks help identify issues early:

```bash
curl -X GET http://localhost:3000/api/context-orchestrator/health
```

## Future Enhancements

### Planned Features

1. **Machine Learning Integration**: AI-powered context relevance scoring
2. **Advanced Caching**: Distributed caching with Redis
3. **Real-time Updates**: WebSocket-based real-time context updates
4. **Context Versioning**: Version control for context data
5. **Advanced Analytics**: Predictive analytics for context freshness

### Roadmap

- **Q1 2024**: Machine Learning Integration
- **Q2 2024**: Advanced Caching and Real-time Updates
- **Q3 2024**: Context Versioning
- **Q4 2024**: Advanced Analytics

## Conclusion

The Enhanced Context Gathering and Injection System provides a robust, scalable, and secure foundation for AI-powered document generation. With comprehensive validation, detailed logging, and advanced monitoring capabilities, it ensures that AI outputs are based on fresh, relevant, and authorized data while maintaining high performance and reliability.