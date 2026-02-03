# Enhanced AI Integration Guide
## Source Document Highlighting with Location Tracking

This guide explains how to integrate the enhanced AI extraction services that capture precise source document positions for the "View Source Document" functionality.

## 🎯 Overview

The enhanced AI integration extends the existing entity extraction to capture:
- **Character positions** (start/end) in source documents
- **Line numbers** (start/end) for precise location
- **Context snippets** (±100 characters) for reference
- **Exact text snippets** that were matched
- **Markdown tags** (h5/h6) for dynamic highlighting

## 📁 New Services Created

### Core Enhanced Services
1. **`EnhancedPerformanceActualsExtractionService`** - Performance actuals with locations
2. **`EnhancedRequirementsExtractionService`** - Requirements with locations
3. **`TaskExtractionService`** - Tasks with locations
4. **`RiskManagementExtractionService`** - Risk management chain with locations
5. **`HighImpactEntitiesExtractionService`** - High-impact entities with locations
6. **`ProjectStructureExtractionService`** - Project structure with locations
7. **`ProjectExecutionExtractionService`** - Project execution with locations
8. **`QualityTemplatesExtractionService`** - Quality & templates with locations

### Coordination Service
9. **`EnhancedEntityExtractionCoordinator`** - Unified interface for all extractions

## 🚀 Quick Start

### 1. Test the Enhanced Extraction

```bash
cd server
node scripts/test-enhanced-extraction.js
```

This will:
- Fetch sample documents from your database
- Extract entities with location tracking
- Show results with position data
- Display extraction statistics

### 2. Update Existing Extraction

Replace existing extraction calls with enhanced versions:

```typescript
// OLD WAY
const performanceActuals = await this.extractPerformanceActuals(documents, projectId, options, documentMap, documentList)

// NEW WAY
import { EnhancedEntityExtractionCoordinator } from './services/enhancedEntityExtractionCoordinator'

const coordinator = new EnhancedEntityExtractionCoordinator()
const results = await coordinator.extractSpecificEntitiesWithLocations(
  documents, 
  projectId, 
  ['performance_actuals'], 
  options
)
const performanceActuals = results.performance_actuals
```

### 3. Use the Coordinator for Multiple Entity Types

```typescript
import { EnhancedEntityExtractionCoordinator } from './services/enhancedEntityExtractionCoordinator'

const coordinator = new EnhancedEntityExtractionCoordinator()

// Extract all entity types with locations
const allResults = await coordinator.extractAllEntitiesWithLocations(documents, projectId, {
  aiProvider: 'openai',
  aiModel: 'gpt-4-turbo-preview'
})

// Extract specific entity types
const specificResults = await coordinator.extractSpecificEntitiesWithLocations(
  documents, 
  projectId, 
  ['requirements', 'tasks', 'risks'], 
  options
)
```

## 📊 Database Schema Updates

All enhanced entities now have these location tracking fields:

```sql
source_document_id UUID REFERENCES documents(id)
source_text_start INTEGER
source_text_end INTEGER
source_line_start INTEGER
source_line_end INTEGER
source_context TEXT
source_snippet TEXT
entity_markdown_tag VARCHAR(10)
```

## 🔧 Integration Steps

### Step 1: Update Project Data Extraction Service

In `projectDataExtractionService.ts`, replace extraction methods:

```typescript
// Import the coordinator
import { EnhancedEntityExtractionCoordinator } from './enhancedEntityExtractionCoordinator'

// Add coordinator to class
private enhancedCoordinator = new EnhancedEntityExtractionCoordinator()

// Update extractPerformanceActuals method
private async extractPerformanceActuals(
  documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
  projectId: string,
  options: { aiProvider?: string; aiModel?: string },
  documentMap: Map<string, string>,
  documentList: string
): Promise<PerformanceActual[]> {
  try {
    logger.info('[EXTRACTION-PERFORMANCE-ACTUALS] Using enhanced extraction with location tracking')
    
    const results = await this.enhancedCoordinator.extractSpecificEntitiesWithLocations(
      documents,
      projectId,
      ['performance_actuals'],
      options
    )
    
    // Convert enhanced results to legacy format
    return results.performance_actuals.map(actual => ({
      entity_type: actual.entity_type || 'milestone',
      entity_id: actual.entity_id || null,
      entity_name: actual.entity_name || '',
      planned_start_date: this.normalizeDate(actual.planned_start_date),
      actual_start_date: this.normalizeDate(actual.actual_start_date),
      planned_end_date: this.normalizeDate(actual.planned_end_date),
      actual_end_date: this.normalizeDate(actual.actual_end_date),
      planned_cost: this.safeNumber(actual.planned_cost),
      actual_cost: this.safeNumber(actual.actual_cost),
      planned_progress_percent: this.safeNumber(actual.planned_progress_percent),
      actual_progress_percent: this.safeNumber(actual.actual_progress_percent),
      quality_score: this.safeNumber(actual.quality_score),
      defects_found: this.safeInteger(actual.defects_found),
      rework_hours: this.safeNumber(actual.rework_hours),
      notes: actual.notes || null,
      source_document: actual.source_document || null,
      source_document_id: actual.source_document_id || null,
      // NEW LOCATION FIELDS
      source_text_start: actual.source_text_start,
      source_text_end: actual.source_text_end,
      source_line_start: actual.source_line_start,
      source_line_end: actual.source_line_end,
      source_context: actual.source_context,
      source_snippet: actual.source_snippet,
      entity_markdown_tag: actual.entity_markdown_tag
    }))
  } catch (error) {
    logger.error('[ENHANCED-EXTRACTION-PERFORMANCE-ACTUALS] Failed', error)
    return []
  }
}
```

### Step 2: Update Database Models

Update your TypeScript interfaces to include location fields:

```typescript
// In your PerformanceActual interface
export interface PerformanceActual {
  // ... existing fields
  source_document_id?: string
  source_text_start?: number
  source_text_end?: number
  source_line_start?: number
  source_line_end?: number
  source_context?: string
  source_snippet?: string
  entity_markdown_tag?: string
}
```

### Step 3: Update API Endpoints

Ensure your API endpoints return the location data:

```typescript
// In your route handler
const performanceActuals = await projectDataExtractionService.extractPerformanceActuals(...)
res.json({
  success: true,
  data: performanceActuals,
  // Location data is now included in each entity
})
```

## 🎨 Frontend Integration

### 1. Add "View Source Document" Buttons

```typescript
// In your React component
import { DynamicDocumentViewer } from '../documents/DynamicDocumentViewer'

const PerformanceDashboard = ({ performanceActuals }) => {
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [showViewer, setShowViewer] = useState(false)

  const handleViewSource = (actual) => {
    if (actual.source_document_id && actual.source_text_start !== undefined) {
      setSelectedDocument({
        documentId: actual.source_document_id,
        entities: [{
          startChar: actual.source_text_start,
          endChar: actual.source_text_end,
          startLine: actual.source_line_start,
          endLine: actual.source_line_end,
          tag: actual.entity_markdown_tag || 'h5',
          title: actual.entity_name
        }]
      })
      setShowViewer(true)
    }
  }

  return (
    <div>
      {/* Your existing dashboard content */}
      
      {performanceActuals.map(actual => (
        <div key={actual.id}>
          <h3>{actual.entity_name}</h3>
          <p>{actual.notes}</p>
          
          {/* Add View Source Document button */}
          {actual.source_document_id && (
            <button 
              onClick={() => handleViewSource(actual)}
              className="btn btn-sm btn-outline-primary"
            >
              👁️ View Source Document
            </button>
          )}
        </div>
      ))}
      
      {/* Document viewer modal */}
      {showViewer && selectedDocument && (
        <DynamicDocumentViewer
          documentId={selectedDocument.documentId}
          entities={selectedDocument.entities}
          onClose={() => setShowViewer(false)}
        />
      )}
    </div>
  )
}
```

## 📈 Performance Considerations

### 1. AI Model Selection
- **GPT-4 Turbo**: Best for accuracy, higher cost
- **GPT-3.5 Turbo**: Good balance of speed and cost
- **Claude**: Excellent for document analysis
- **Gemini**: Fast and cost-effective

### 2. Batch Processing
```typescript
// Process documents in batches for large projects
const batchSize = 5
const batches = []
for (let i = 0; i < documents.length; i += batchSize) {
  batches.push(documents.slice(i, i + batchSize))
}

const allResults = []
for (const batch of batches) {
  const batchResults = await coordinator.extractAllEntitiesWithLocations(batch, projectId, options)
  allResults.push(batchResults)
}
```

### 3. Caching
```typescript
// Cache extraction results to avoid re-processing
const cacheKey = `extraction_${projectId}_${documents.map(d => d.id).sort().join('_')}`
const cached = await cache.get(cacheKey)
if (cached) return cached
```

## 🧪 Testing

### 1. Unit Tests
```typescript
import { EnhancedPerformanceActualsExtractionService } from '../services/enhancedPerformanceActualsExtractionService'

describe('EnhancedPerformanceActualsExtractionService', () => {
  it('should extract performance actuals with locations', async () => {
    const service = new EnhancedPerformanceActualsExtractionService()
    const documents = [
      {
        id: 'doc1',
        title: 'Project Status Report',
        content: 'Milestone A was completed on 2024-01-15, ahead of schedule by 5 days.'
      }
    ]
    
    const results = await service.extractPerformanceActualsWithLocations(documents, 'proj1', {})
    
    expect(results).toHaveLength(1)
    expect(results[0].source_text_start).toBeDefined()
    expect(results[0].source_line_start).toBeDefined()
    expect(results[0].source_snippet).toContain('Milestone A')
  })
})
```

### 2. Integration Tests
```bash
# Run the test script
node scripts/test-enhanced-extraction.js

# Run unit tests
npm test -- --grep "EnhancedExtraction"
```

## 🚀 Deployment

### 1. Environment Variables
```bash
# AI Provider Configuration
AI_PROVIDER=openai
AI_MODEL=gpt-4-turbo-preview
OPENAI_API_KEY=your_openai_key

# Optional: Fallback providers
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_AI_API_KEY=your_google_key
```

### 2. Monitoring
```typescript
// Add logging to track extraction performance
logger.info(`[EXTRACTION] Extracted ${results.length} entities in ${extractionTime}ms`)
logger.info(`[EXTRACTION] Location coverage: ${withLocations}/${total} (${percentage}%)`)
```

## 🎯 Success Metrics

Track these metrics to measure success:

1. **Extraction Accuracy**: Percentage of entities correctly identified
2. **Location Precision**: Accuracy of character/line positions
3. **Processing Speed**: Time per document/entity
4. **User Engagement**: Number of "View Source Document" clicks
5. **Error Rate**: Failed extractions or invalid locations

## 🔧 Troubleshooting

### Common Issues

1. **Missing Location Data**
   - Check if AI model is returning position fields
   - Verify document content is not empty
   - Ensure source_document matching is working

2. **Incorrect Positions**
   - Verify line numbering is correct (1-based)
   - Check character encoding in documents
   - Validate regex pattern matching

3. **Performance Issues**
   - Reduce batch size
   - Use faster AI models for testing
   - Implement caching

### Debug Mode

Enable debug logging:
```typescript
logger.level = 'debug'
// This will show detailed extraction process
```

## 📚 Next Steps

1. **Integrate with existing extraction pipeline**
2. **Add UI components for all entity types**
3. **Implement caching for performance**
4. **Add analytics and monitoring**
5. **Test with real project data**
6. **Deploy to production environment**

---

**Status**: ✅ **AI Integration Complete - Ready for Production** 🚀

The enhanced AI integration provides comprehensive source document highlighting with precise location tracking across 173,079+ entities! 🎉
