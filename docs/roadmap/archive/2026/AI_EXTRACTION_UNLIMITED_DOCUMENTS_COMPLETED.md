# AI Extraction Enhancement - Unlimited Document Support

**Status**: 🔵 Planned  
**Priority**: High  
**Estimated Effort**: Medium (3-5 days)  
**Dependencies**: AI Project Data Extraction (✅ Completed)  
**Target Release**: Q1 2026

---

## 📋 Feature Overview

Enhance the AI Project Data Extraction system to support **unlimited documents** in a project library, removing the current practical limitations and optimizing for large document corpora (50+, 100+, even 200+ documents).

---

## 🎯 Problem Statement

**Current Situation:**
While the backend technically supports all documents in a project, there are **practical limitations** that prevent effective extraction from large document libraries:

1. **UI Performance**: Large document lists (50+ docs) cause UI slowdown in the selection dialog
2. **Token Budget**: Long concatenated context may exceed LLM token limits (100K-200K tokens)
3. **Processing Time**: Very large corpora take 10+ minutes to process
4. **Memory Constraints**: Loading 100+ full documents into memory may cause issues
5. **Cost Concerns**: Processing 100+ documents with AI can be expensive

**User Pain Points:**
- Projects with comprehensive documentation (50-200 documents) cannot fully utilize AI extraction
- Semantic search and RAG effectiveness limited by incomplete entity extraction
- Users must manually select subsets of documents, missing valuable context
- Large enterprise projects cannot leverage full document corpus

**Impact:**
- ⚠️ **Reduced RAG Quality**: Missing entities from unprocessed documents
- ⚠️ **Incomplete Baseline**: Baseline drift detection less effective
- ⚠️ **Manual Workarounds**: Users must run multiple extractions
- ⚠️ **Inconsistent Results**: Different subsets produce different entity sets

---

## ✨ Proposed Solution

### Phase 1: Smart Document Batching (Immediate)

**Goal**: Process unlimited documents by intelligently batching them

#### Key Features:

1. **Automatic Batching**
   - Divide documents into optimal batches (10-15 docs per batch)
   - Process batches sequentially with progress tracking
   - Merge results with intelligent deduplication

2. **Progressive Loading UI**
   - Lazy-load document list in selection dialog
   - Virtual scrolling for 100+ documents
   - Search/filter capabilities

3. **Token Budget Management**
   - Calculate token usage per batch
   - Dynamically adjust batch size based on document length
   - Truncate very long documents intelligently (preserve key sections)

4. **Progress Tracking**
   - Show batch progress: "Processing batch 3 of 8 (37%)"
   - Time estimates: "~8 minutes remaining"
   - Cancellation support

#### Implementation:

```typescript
interface BatchExtractionOptions {
  projectId: string
  documentIds?: string[] // Optional: specific docs, or all if empty
  batchSize?: number // Default: auto-calculate based on token budget
  aiProvider?: string
  aiModel?: string
}

interface BatchProgress {
  currentBatch: number
  totalBatches: number
  processedDocuments: number
  totalDocuments: number
  percentComplete: number
  estimatedTimeRemaining: number // seconds
  status: 'queued' | 'processing' | 'merging' | 'completed' | 'failed'
}

class SmartBatchExtractor {
  /**
   * Extract entities from unlimited documents using intelligent batching
   */
  async extractWithBatching(options: BatchExtractionOptions): Promise<ExtractionResult> {
    // 1. Get all documents
    const allDocs = await this.getProjectDocuments(options.projectId, options.documentIds)
    
    // 2. Calculate optimal batch size
    const batches = this.createOptimalBatches(allDocs, options.aiProvider, options.aiModel)
    
    // 3. Process each batch
    const results = []
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      
      // Update progress
      await this.updateProgress({
        currentBatch: i + 1,
        totalBatches: batches.length,
        processedDocuments: i * batch.length,
        totalDocuments: allDocs.length,
        percentComplete: Math.floor((i / batches.length) * 100),
        estimatedTimeRemaining: this.estimateTimeRemaining(batches.length - i),
        status: 'processing'
      })
      
      // Extract from batch
      const batchResult = await this.extractBatch(batch, options)
      results.push(batchResult)
      
      // Respect rate limits
      if (i < batches.length - 1) {
        await this.delay(2000) // 2 second delay between batches
      }
    }
    
    // 4. Merge and deduplicate results
    await this.updateProgress({ status: 'merging', percentComplete: 95 })
    const merged = this.mergeResults(results)
    
    // 5. Save to database
    await this.saveExtractedEntities(merged, options.projectId)
    
    return merged
  }
  
  /**
   * Create optimal batches based on token budget
   */
  private createOptimalBatches(
    documents: Document[],
    aiProvider: string,
    aiModel: string
  ): Document[][] {
    const tokenLimit = this.getTokenLimit(aiProvider, aiModel)
    const batchTokenBudget = Math.floor(tokenLimit * 0.7) // Reserve 30% for prompt/response
    
    const batches: Document[][] = []
    let currentBatch: Document[] = []
    let currentBatchTokens = 0
    
    for (const doc of documents) {
      const docTokens = this.estimateTokens(doc.content)
      
      // If single document exceeds budget, truncate it intelligently
      if (docTokens > batchTokenBudget) {
        const truncated = this.truncateDocument(doc, batchTokenBudget)
        batches.push([truncated])
        continue
      }
      
      // If adding document exceeds budget, start new batch
      if (currentBatchTokens + docTokens > batchTokenBudget) {
        if (currentBatch.length > 0) {
          batches.push(currentBatch)
        }
        currentBatch = [doc]
        currentBatchTokens = docTokens
      } else {
        currentBatch.push(doc)
        currentBatchTokens += docTokens
      }
    }
    
    // Add final batch
    if (currentBatch.length > 0) {
      batches.push(currentBatch)
    }
    
    return batches
  }
  
  /**
   * Intelligently truncate document while preserving key information
   */
  private truncateDocument(doc: Document, targetTokens: number): Document {
    // Strategy: Keep headers, first N paragraphs of each section
    const sections = this.parseMarkdownSections(doc.content)
    
    let truncated = ''
    let tokens = 0
    
    for (const section of sections) {
      // Always include header
      const headerTokens = this.estimateTokens(section.header)
      if (tokens + headerTokens < targetTokens) {
        truncated += section.header + '\n\n'
        tokens += headerTokens
        
        // Include first few paragraphs of section
        const paragraphs = section.content.split('\n\n')
        for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
          const paraTokens = this.estimateTokens(paragraphs[i])
          if (tokens + paraTokens < targetTokens) {
            truncated += paragraphs[i] + '\n\n'
            tokens += paraTokens
          } else {
            break
          }
        }
      } else {
        break
      }
    }
    
    return { ...doc, content: truncated + '\n\n[Document truncated to fit token budget]' }
  }
  
  /**
   * Merge results from multiple batches with intelligent deduplication
   */
  private mergeResults(batchResults: ExtractionResult[]): ExtractionResult {
    const merged: ExtractionResult = {
      stakeholders: [],
      requirements: [],
      risks: [],
      milestones: [],
      constraints: [],
      successCriteria: [],
      bestPractices: [],
      phases: [],
      resources: [],
      technologies: [],
      qualityStandards: [],
      deliverables: [],
      scopeItems: [],
      activities: []
    }
    
    // Merge and deduplicate each entity type
    for (const result of batchResults) {
      merged.stakeholders.push(...result.stakeholders)
      merged.requirements.push(...result.requirements)
      merged.risks.push(...result.risks)
      // ... other entity types
    }
    
    // Deduplicate
    merged.stakeholders = this.deduplicateStakeholders(merged.stakeholders)
    merged.requirements = this.deduplicateRequirements(merged.requirements)
    merged.risks = this.deduplicateRisks(merged.risks)
    // ... other entity types
    
    return merged
  }
}
```

---

### Phase 2: Parallel Batch Processing (Enhancement)

**Goal**: Process multiple batches in parallel for faster extraction

#### Key Features:

1. **Concurrent API Calls**
   - Process 3-5 batches simultaneously
   - Respect provider rate limits
   - Dynamic concurrency based on API quotas

2. **Smart Queue Management**
   - Priority queue for critical documents
   - Retry failed batches automatically
   - Fallback to different AI providers

---

### Phase 3: Incremental Extraction (Advanced)

**Goal**: Extract only from new/changed documents

#### Key Features:

1. **Change Detection**
   - Track document versions
   - Only extract from documents modified since last extraction
   - Preserve existing entities from unchanged documents

2. **Differential Updates**
   - Compare new extraction with existing entities
   - Merge new entities, update modified ones
   - Mark obsolete entities

---

## 🎨 UI/UX Enhancements

### Enhanced Extraction Dialog

```
┌────────────────────────────────────────────────────────────┐
│  Extract Project Data with AI                       [X]     │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  📁 Document Selection                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Search documents...                               │  │
│  │                                                       │  │
│  │ ☑ Select All (247 documents)                        │  │
│  │ ─────────────────────────────────────────────────    │  │
│  │ ☑ Project Charter (2,345 words)                     │  │
│  │ ☑ Requirements Specification (12,456 words)         │  │
│  │ ☑ Risk Register (5,678 words)                       │  │
│  │ ☑ Stakeholder Analysis (3,890 words)                │  │
│  │ ... (showing 5 of 247)                               │  │
│  │                                                       │  │
│  │ [Load More] (242 remaining)        ⭐ Virtual Scroll │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ⚙️ Extraction Strategy                    ⭐ NEW           │
│  ○ Standard: Process all documents (recommended)            │
│  ○ Smart Batching: Optimize for large corpus (247 docs)    │
│  ○ Incremental: Only new/changed documents (faster)        │
│                                                              │
│  📊 Estimated Processing                                     │
│  ├─ Documents: 247                                          │
│  ├─ Total Size: ~1.2M words                                 │
│  ├─ Batches: 18 (auto-calculated)                          │
│  ├─ Time: ~12 minutes                                       │
│  └─ Cost: ~$3.50 (OpenAI GPT-4)                            │
│                                                              │
│  [Cancel]                          [Start Extraction]       │
└────────────────────────────────────────────────────────────┘
```

### Progress View (During Extraction)

```
┌────────────────────────────────────────────────────────────┐
│  Extracting Project Data...                         [X]     │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  📦 Processing Batch 5 of 18                                │
│  ████████████████████░░░░░░░░░░░░░░ 67%                    │
│                                                              │
│  Current Batch: Documents 65-78 (14 documents)              │
│  Status: Extracting stakeholders...                         │
│                                                              │
│  ⏱️ Progress Details:                                       │
│  ├─ Elapsed Time: 5m 23s                                    │
│  ├─ Estimated Remaining: 2m 47s                             │
│  ├─ Processed Documents: 64 / 247                           │
│  ├─ Entities Extracted: 423 (so far)                        │
│  └─ Current Speed: ~12 docs/minute                          │
│                                                              │
│  📊 Batch Status:                                           │
│  ✅ Completed: Batches 1-4 (64 docs)                        │
│  🔄 Processing: Batch 5 (14 docs)                           │
│  ⏳ Queued: Batches 6-18 (169 docs)                         │
│                                                              │
│  [Pause] [Cancel]                                           │
└────────────────────────────────────────────────────────────┘
```

### Completion Summary

```
┌────────────────────────────────────────────────────────────┐
│  ✅ Extraction Complete!                            [X]     │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  🎉 Successfully extracted 1,847 entities from 247 docs     │
│                                                              │
│  📊 Entity Breakdown:                                        │
│  ├─ Stakeholders: 95                                        │
│  ├─ Requirements: 267                                       │
│  ├─ Risks: 143                                              │
│  ├─ Milestones: 67                                          │
│  ├─ Constraints: 89                                         │
│  ├─ Success Criteria: 52                                    │
│  ├─ Best Practices: 134                                     │
│  ├─ Phases: 23                                              │
│  ├─ Resources: 178                                          │
│  ├─ Technologies: 112                                       │
│  ├─ Quality Standards: 76                                   │
│  ├─ Deliverables: 145                                       │
│  ├─ Scope Items: 234                                        │
│  └─ Activities: 232                                         │
│                                                              │
│  ⏱️ Processing Time: 11m 34s                                │
│  💰 Cost: $3.42 (OpenAI GPT-4 Turbo)                       │
│  🧠 Batches Processed: 18 (avg 13.7 docs/batch)            │
│  📈 Deduplication: 342 duplicates removed                   │
│                                                              │
│  [View Extracted Data] [Close]                              │
└────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### Backend Changes

#### 1. Update Extraction Service

```typescript
// server/src/services/projectDataExtractionService.ts

export class ProjectDataExtractionService {
  /**
   * Extract with smart batching for unlimited documents
   */
  async extractProjectEntitiesWithBatching(
    projectId: string,
    userId: string,
    options: {
      aiProvider?: string
      aiModel?: string
      documentIds?: string[]
      batchStrategy?: 'auto' | 'standard' | 'incremental'
    } = {}
  ): Promise<ExtractionResult> {
    const strategy = options.batchStrategy || 'auto'
    
    // Get all documents (no LIMIT)
    const allDocuments = await this.getProjectDocuments(projectId, options.documentIds)
    
    logger.info(`[EXTRACTION] Processing ${allDocuments.length} documents with strategy: ${strategy}`)
    
    if (strategy === 'standard' && allDocuments.length <= 15) {
      // Small corpus - use existing single-batch method
      return this.extractProjectEntities(projectId, userId, options)
    }
    
    // Large corpus - use smart batching
    return this.extractWithSmartBatching(projectId, userId, allDocuments, options)
  }
  
  /**
   * Create optimal batches based on token limits
   */
  private createOptimalBatches(
    documents: Document[],
    tokenLimit: number
  ): Document[][] {
    // Implementation above
  }
  
  /**
   * Process batches with progress tracking
   */
  private async extractWithSmartBatching(
    projectId: string,
    userId: string,
    documents: Document[],
    options: any
  ): Promise<ExtractionResult> {
    const tokenLimit = this.getTokenLimit(options.aiProvider, options.aiModel)
    const batches = this.createOptimalBatches(documents, tokenLimit)
    
    logger.info(`[EXTRACTION] Created ${batches.length} optimal batches`)
    
    const allResults: ExtractionResult[] = []
    
    for (let i = 0; i < batches.length; i++) {
      logger.info(`[EXTRACTION] Processing batch ${i + 1}/${batches.length}`)
      
      // Extract from batch
      const batchResult = await this.extractFromBatch(batches[i], projectId, options)
      allResults.push(batchResult)
      
      // Update job progress
      const progress = Math.floor(((i + 1) / batches.length) * 100)
      await this.updateJobProgress(projectId, progress, `Batch ${i + 1}/${batches.length} complete`)
      
      // Rate limiting: 2 second delay between batches
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    // Merge and deduplicate
    logger.info(`[EXTRACTION] Merging ${allResults.length} batch results`)
    const merged = this.mergeAndDeduplicateResults(allResults)
    
    // Save to database
    await this.saveExtractedEntities(merged, projectId, userId)
    
    return merged
  }
}
```

#### 2. Add Token Calculation

```typescript
// server/src/utils/tokenCounter.ts

export class TokenCounter {
  /**
   * Estimate tokens for text (approximation)
   * Rule of thumb: 1 token ≈ 4 characters for English
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }
  
  /**
   * Get token limit for AI provider/model
   */
  static getTokenLimit(provider: string, model: string): number {
    const limits: Record<string, Record<string, number>> = {
      'openai': {
        'gpt-4-turbo-preview': 128000,
        'gpt-4': 8192,
        'gpt-3.5-turbo': 16384
      },
      'google': {
        'gemini-2.0-flash-exp': 1000000, // 1M context
        'gemini-pro': 30720
      },
      'anthropic': {
        'claude-3-opus': 200000,
        'claude-3-sonnet': 200000
      }
    }
    
    return limits[provider]?.[model] || 8192 // Default fallback
  }
}
```

#### 3. Enhanced Deduplication

```typescript
/**
 * Intelligent deduplication with similarity matching
 */
private deduplicateWithSimilarity<T extends { title?: string; name?: string }>(
  entities: T[],
  similarityThreshold: number = 0.85
): T[] {
  const unique: T[] = []
  const seen = new Set<string>()
  
  for (const entity of entities) {
    const key = (entity.title || entity.name || '').toLowerCase().trim()
    
    // Exact match check
    if (seen.has(key)) {
      continue
    }
    
    // Similarity check against existing
    let isDuplicate = false
    for (const existing of unique) {
      const existingKey = (existing.title || existing.name || '').toLowerCase().trim()
      const similarity = this.calculateSimilarity(key, existingKey)
      
      if (similarity >= similarityThreshold) {
        isDuplicate = true
        break
      }
    }
    
    if (!isDuplicate) {
      unique.push(entity)
      seen.add(key)
    }
  }
  
  return unique
}

/**
 * Calculate Levenshtein similarity (0-1)
 */
private calculateSimilarity(str1: string, str2: string): number {
  const distance = this.levenshteinDistance(str1, str2)
  const maxLength = Math.max(str1.length, str2.length)
  return 1 - (distance / maxLength)
}
```

---

### Frontend Changes

#### 1. Virtual Scrolling for Document List

```typescript
// app/projects/[id]/components/ProjectDataExtraction.tsx

import { useVirtualizer } from '@tanstack/react-virtual'

export function ProjectDataExtraction({ projectId, documents }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filter documents based on search
  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Virtual scrolling for large lists
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: filteredDocuments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Estimated height of each item
    overscan: 10
  })
  
  return (
    <div className="space-y-2">
      {/* Search box */}
      <Input
        placeholder="Search documents..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      
      {/* Virtual scrolled list */}
      <div ref={parentRef} className="h-64 overflow-auto border rounded-lg">
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const doc = filteredDocuments[virtualItem.index]
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`
                }}
              >
                <Checkbox
                  id={doc.id}
                  checked={selectedDocuments.includes(doc.id)}
                  onCheckedChange={(checked) => handleToggleDocument(doc.id, checked)}
                />
                <label>{doc.name}</label>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

#### 2. Enhanced Progress Display

```typescript
// Show detailed batch progress
const [batchProgress, setBatchProgress] = useState({
  currentBatch: 0,
  totalBatches: 0,
  processedDocs: 0,
  totalDocs: 0,
  percentComplete: 0,
  estimatedTimeRemaining: 0
})

// Poll for detailed progress
const pollDetailedProgress = async (jobId: string) => {
  const response = await fetch(`/api/project-data-extraction/status/${jobId}`)
  const data = await response.json()
  
  setBatchProgress(data.batchProgress || {})
  setExtractionProgress(data.progress || 0)
}
```

---

## 📊 Performance Optimization

### Token Budget Strategy

| Provider | Model | Context Window | Usable for Extraction | Docs/Batch (est.) |
|----------|-------|----------------|----------------------|-------------------|
| OpenAI | GPT-4 Turbo | 128K tokens | ~90K tokens | 15-20 docs |
| Google | Gemini 2.0 Flash | 1M tokens | ~700K tokens | 100-150 docs |
| Anthropic | Claude 3 Opus | 200K tokens | ~140K tokens | 25-30 docs |

### Recommended Strategies by Corpus Size

| Document Count | Strategy | Expected Time | Cost Estimate |
|----------------|----------|---------------|---------------|
| 1-15 docs | Standard (single batch) | 2-3 min | $0.20-$0.50 |
| 16-50 docs | Smart batching (3-5 batches) | 5-8 min | $0.80-$2.00 |
| 51-100 docs | Smart batching (6-10 batches) | 10-15 min | $2.50-$5.00 |
| 101-200 docs | Smart batching + Gemini | 15-25 min | $3.00-$6.00 |
| 200+ docs | Incremental extraction | 20-40 min | $5.00-$10.00 |

---

## 🧪 Testing Plan

### Unit Tests
- ✅ Batch creation with various document sizes
- ✅ Token estimation accuracy
- ✅ Deduplication across batches
- ✅ Merge logic with conflicts

### Integration Tests
- ✅ Extract from 50 documents (3-4 batches)
- ✅ Extract from 100 documents (7-8 batches)
- ✅ Extract from 200 documents (15-20 batches)
- ✅ Progress tracking updates
- ✅ Job cancellation mid-extraction

### Performance Tests
- Target: 100 docs in < 15 minutes
- Target: No memory issues with 200+ docs
- Target: Accurate token budget management

---

## 📈 Success Metrics

### Technical Metrics
- ✅ Support for 200+ documents without errors
- ✅ Memory usage < 2GB for 200 document corpus
- ✅ Token budget utilization > 85%
- ✅ Deduplication effectiveness > 95%

### User Experience
- ✅ Clear progress indicators throughout extraction
- ✅ Accurate time estimates (±20%)
- ✅ No UI freezes during large extractions
- ✅ Cancellation works within 5 seconds

### Business Value
- ✅ 100% context coverage (all docs processed)
- ✅ RAG quality improvement from incomplete → complete
- ✅ Baseline drift detection accuracy +40%
- ✅ Enterprise-ready for large documentation sets

---

## 🚀 Rollout Plan

### Phase 1: Backend Enhancement (Days 1-2)
- Implement smart batching logic
- Add token estimation
- Enhanced deduplication

### Phase 2: Frontend UI (Days 2-3)
- Virtual scrolling for document list
- Enhanced progress display
- Strategy selection

### Phase 3: Testing (Day 4)
- Test with 50, 100, 200 document corpora
- Performance optimization
- Error handling

### Phase 4: Deployment (Day 5)
- Deploy to staging
- User acceptance testing
- Production deployment

---

## ✅ Acceptance Criteria

- [ ] System handles 200+ documents without errors
- [ ] Batch creation optimizes for token limits
- [ ] Progress tracking shows current batch and ETA
- [ ] Deduplication works across batches (no duplicate entities)
- [ ] Virtual scrolling works smoothly with 200+ docs in UI
- [ ] Extraction time < 20 minutes for 200 documents
- [ ] Memory usage stays under 2GB
- [ ] User can cancel mid-extraction
- [ ] Results match single-batch extraction quality

---

## 📚 Related Documentation

- **AI Extraction Service**: `/docs/features/AI_PROJECT_DATA_EXTRACTION.md`
- **RAG Integration**: `/RAG_INTEGRATION_IMPLEMENTATION_SUMMARY.md`
- **Baseline Integration**: `/docs/roadmap/entity-baseline-integration.md`

---

**Created**: October 31, 2025  
**Status**: 🔵 Ready for Implementation  
**Next Steps**: Review with team, prioritize in sprint planning

