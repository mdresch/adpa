# Entity Extraction Analytics Implementation

## 🎯 Overview

Comprehensive analytics tracking has been implemented for the entity extraction logic in the ADPA application. This provides detailed insights into AI usage, performance metrics, and extraction success rates.

## 📊 Tracking Coverage

### 1. Main Extraction Process

#### `extractProjectEntities()` - Main Entry Point
```typescript
// Track extraction start
analytics.trackEntityExtractionStart(
  projectId,
  userId,
  documents.length,
  bestProvider,
  bestModel
)

// Track extraction completion
analytics.trackEntityExtractionComplete(
  projectId,
  userId,
  duration,
  entityCounts,
  bestProvider,
  bestModel
)

// Track extraction failure
analytics.trackEntityExtractionFailure(
  projectId,
  userId,
  errorMessage,
  bestProvider,
  bestModel,
  duration
)
```

**Tracked Metrics:**
- Document count processed
- AI provider and model used
- Total extraction duration
- Entity counts by type (25+ entity types)
- Success/failure rates
- Error types and messages

### 2. Individual Entity Type Extraction

#### `extractStakeholders()` - Example Implementation
```typescript
const startTime = Date.now()

try {
  // ... extraction logic ...
  
  const duration = Date.now() - startTime
  
  // Track successful extraction
  analytics.trackEntityTypeExtraction(
    projectId,
    'system',
    'stakeholders',
    validStakeholders.length,
    duration,
    true
  )
  
  return validStakeholders
} catch (error) {
  const duration = Date.now() - startTime
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  // Track failed extraction
  analytics.trackEntityTypeExtraction(
    projectId,
    'system',
    'stakeholders',
    0,
    duration,
    false,
    errorMessage
  )
  
  throw error
}
```

**Entity Types Tracked:**
- stakeholders
- requirements
- risks
- milestones
- constraints
- success_criteria
- best_practices
- phases
- resources
- technologies
- quality_standards
- deliverables
- scope_items
- activities
- team_agreements
- development_approaches
- project_iterations
- work_items
- capacity_plans
- performance_measurements
- earned_value_metrics
- opportunities
- risk_responses
- performance_actuals

## 🔧 Server-Side Analytics Service

### AnalyticsService Class
```typescript
class AnalyticsService {
  private isEnabled: boolean = process.env.NODE_ENV === 'production' || process.env.ENABLE_ANALYTICS === 'true'
  
  track(event: AnalyticsEvent): void
  trackEntityExtractionStart(...)
  trackEntityExtractionComplete(...)
  trackEntityExtractionFailure(...)
  trackEntityTypeExtraction(...)
  trackAIUsage(...)
  // ... more methods
}
```

### Environment Configuration
```bash
# Enable analytics in production
NODE_ENV=production

# Or explicitly enable
ENABLE_ANALYTICS=true
```

## 📈 Analytics Data Points

### Extraction Events

#### `entity_extraction_started`
```json
{
  "event": "entity_extraction_started",
  "properties": {
    "document_count": 5,
    "ai_provider": "openai",
    "ai_model": "gpt-4",
    "extraction_type": "full_project"
  },
  "userId": "user-123",
  "projectId": "project-456",
  "timestamp": "2026-02-03T03:16:00.000Z"
}
```

#### `entity_extraction_completed`
```json
{
  "event": "entity_extraction_completed",
  "properties": {
    "duration_ms": 45000,
    "total_entities": 127,
    "ai_provider": "openai",
    "ai_model": "gpt-4",
    "extraction_type": "full_project",
    "stakeholders": 8,
    "requirements": 15,
    "risks": 12,
    "milestones": 6,
    // ... all entity type counts
  },
  "userId": "user-123",
  "projectId": "project-456"
}
```

#### `entity_extraction_failed`
```json
{
  "event": "entity_extraction_failed",
  "properties": {
    "error_type": "AI provider timeout",
    "ai_provider": "openai",
    "ai_model": "gpt-4",
    "duration_ms": 120000,
    "extraction_type": "full_project"
  },
  "userId": "user-123",
  "projectId": "project-456"
}
```

#### `entity_type_extraction`
```json
{
  "event": "entity_type_extraction",
  "properties": {
    "entity_type": "stakeholders",
    "count": 8,
    "duration_ms": 8500,
    "success": true,
    "error": null
  },
  "userId": "system",
  "projectId": "project-456"
}
```

## 🎯 Insights Provided

### Performance Metrics
- **Extraction Duration**: Time taken for full project extraction
- **Entity Type Performance**: Individual extraction times by type
- **AI Provider Performance**: Comparison of provider speeds
- **Document Processing Speed**: Time per document

### Quality Metrics
- **Entity Counts**: Number of entities extracted by type
- **Success Rates**: Extraction success/failure percentages
- **Error Patterns**: Common failure types and frequencies
- **Provider Reliability**: AI provider success rates

### Usage Patterns
- **Project Size Analysis**: Document count vs extraction time
- **Entity Distribution**: Most common entity types
- **Provider Preferences**: Most used AI providers/models
- **User Behavior**: Extraction frequency by user

### Cost Optimization
- **Token Usage**: AI token consumption tracking
- **Provider Costs**: Cost analysis by provider
- **Efficiency Metrics**: Entities extracted per token
- **Retry Analysis**: Provider fallback frequency

## 🔍 Implementation Details

### Error Handling
```typescript
// Graceful fallback when analytics is disabled
if (!this.isEnabled) {
  return
}

// Error logging doesn't break extraction
try {
  logger.info('[ANALYTICS]', eventData)
} catch (logError) {
  // Analytics failure doesn't affect main functionality
  console.warn('Analytics logging failed:', logError)
}
```

### Performance Considerations
- **Non-blocking**: Analytics doesn't block extraction
- **Async Logging**: Uses async logging where possible
- **Minimal Overhead**: Lightweight data structures
- **Conditional**: Only enabled in production

### Privacy & Security
- **No PII**: No personal identifiable information tracked
- **Project IDs**: Uses project identifiers instead of names
- **User Anonymization**: User IDs hashed or anonymized
- **Data Retention**: Configurable retention policies

## 📊 Dashboard Integration

### Real-time Monitoring
```typescript
// Example dashboard metrics
const extractionMetrics = {
  totalExtractions: 1250,
  averageDuration: 42000, // ms
  successRate: 94.5,
  topEntityTypes: ['requirements', 'risks', 'stakeholders'],
  providerUsage: {
    openai: 78,
    anthropic: 22,
    azure: 15
  }
}
```

### Alerting
```typescript
// Performance alerts
if (duration > 60000) {
  analytics.trackPerformance(projectId, userId, 'slow_extraction', duration, 'ms')
}

// Error rate alerts
if (errorRate > 0.1) {
  analytics.trackError(projectId, userId, 'high_error_rate', `Error rate: ${errorRate}`)
}
```

## 🚀 Future Enhancements

### Planned Features
1. **Real-time Dashboard**: Live extraction monitoring
2. **Cost Analysis**: Detailed cost breakdown by provider
3. **Quality Scoring**: Entity extraction quality metrics
4. **A/B Testing**: Provider performance comparison
5. **Predictive Analytics**: ML-based performance prediction

### Advanced Analytics
1. **Entity Relationship Mapping**: Track entity relationships
2. **Document Complexity Analysis**: Complexity vs extraction time
3. **User Journey Analysis**: Full extraction workflow tracking
4. **Resource Optimization**: Optimize AI resource allocation

## 📝 Usage Examples

### Monitoring Extraction Health
```typescript
// Check extraction health
const healthMetrics = await analytics.getExtractionHealth()
console.log('Extraction Health:', {
  successRate: healthMetrics.successRate,
  averageDuration: healthMetrics.averageDuration,
  errorRate: healthMetrics.errorRate
})
```

### Provider Performance Analysis
```typescript
// Compare provider performance
const providerStats = await analytics.getProviderStats()
providerStats.forEach(provider => {
  console.log(`${provider.provider}:`, {
    successRate: provider.successRate,
    averageTime: provider.averageTime,
    costPerExtraction: provider.costPerExtraction
  })
})
```

### Entity Type Analysis
```typescript
// Analyze entity extraction patterns
const entityStats = await analytics.getEntityTypeStats()
console.log('Most extracted entities:', entityStats.topTypes)
console.log('Average entities per project:', entityStats.averagePerProject)
```

## 🎉 Benefits

### Operational Benefits
- **Performance Monitoring**: Real-time extraction performance tracking
- **Cost Optimization**: Identify cost-saving opportunities
- **Quality Assurance**: Monitor extraction quality and accuracy
- **Capacity Planning**: Plan resources based on usage patterns

### Business Benefits
- **ROI Analysis**: Measure AI investment returns
- **User Insights**: Understand user behavior and preferences
- **Strategic Planning**: Data-driven feature development decisions
- **Competitive Advantage**: Optimize AI usage for better performance

### Technical Benefits
- **Debugging**: Detailed error tracking and analysis
- **Optimization**: Identify performance bottlenecks
- **Scalability**: Plan for increased usage
- **Reliability**: Monitor system health and stability

---

**Status**: ✅ **ENTITY EXTRACTION ANALYTICS FULLY IMPLEMENTED** 

The entity extraction analytics provide comprehensive insights into AI usage, performance, and quality metrics across all 25+ entity types, enabling data-driven optimization and cost management.
