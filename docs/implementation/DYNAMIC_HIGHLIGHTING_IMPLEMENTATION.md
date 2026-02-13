# Dynamic Highlighting Implementation Guide
## 🎯 **Clean Markdown + Dynamic h5/h6 Highlighting**

Perfect solution! Store clean markdown, apply h5/h6 highlighting only when user clicks "View Source Document".

## ✅ **Architecture Overview:**

### **1. Clean Document Storage**
- Original markdown stored untouched in database
- No permanent h5/h6 modifications
- Position data captured during extraction

### **2. Position Data Capture (Migration 366)**
```sql
source_text_start INTEGER,     -- Character start position
source_text_end INTEGER,       -- Character end position  
source_line_start INTEGER,     -- Line start number
source_line_end INTEGER,       -- Line end number
source_context TEXT,           -- Surrounding context (±100 chars)
source_snippet TEXT            -- Exact extracted text
```

### **3. Dynamic Highlighting on Demand**
- Apply h5/h6 tags only when user clicks "View Source Document"
- Use stored position data for precise highlighting
- Auto-scroll to exact location

## 🚀 **Implementation Steps:**

### **Step 1: Run Migration**
```bash
cd server && node scripts/migrate-single.js 366
```

### **Step 2: Update AI Extraction to Capture Positions**
Modify `server/src/services/projectDataExtractionService.ts`:

```typescript
// Enhanced prompt for position tracking
const prompt = `You are analyzing project documents to extract PERFORMANCE ACTUALS.

CRITICAL POSITION TRACKING:
For each performance actual, you MUST provide precise location data:

{
  "performance_actuals": [
    {
      "entity_type": "milestone",
      "entity_name": "Testing Complete",
      "actual_end_date": "2026-02-28",
      "source_document": "Project Charter",
      "source_text_start": 1234,  // Character position where text starts
      "source_text_end": 1248,    // Character position where text ends
      "source_line_start": 45,    // Line number where entity starts
      "source_line_end": 45,      // Line number where entity ends
      "source_context": "...Testing Complete on 2026-02-28...",
      "source_snippet": "Testing Complete"
    }
  ]
}

${documentContext}

Return ONLY valid JSON.`

// Process extracted entities with position data
const actuals = parsed.performance_actuals || []
const enhancedActuals = actuals.map((actual: any) => ({
  ...actual,
  source_text_start: actual.source_text_start,
  source_text_end: actual.source_text_end,
  source_line_start: actual.source_line_start,
  source_line_end: actual.source_line_end,
  source_context: actual.source_context,
  source_snippet: actual.source_snippet
}))
```

### **Step 3: Add Document Content API**
Create `server/src/routes/documentRoutes.ts`:

```typescript
router.get('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params
    const { projectId } = req.query
    
    const document = await db.query(
      `SELECT id, title, content, template_name FROM documents 
       WHERE id = $1 AND project_id = $2`,
      [documentId, projectId]
    )
    
    if (!document.rows[0]) {
      return res.status(404).json({ error: 'Document not found' })
    }
    
    res.json({
      success: true,
      data: document.rows[0]
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

### **Step 4: Add "View Source Document" to Performance Dashboard**
Update `components/project/PerformanceDashboard.tsx`:

```typescript
// Add to table rows
<td className="p-2">
  <Button
    variant="outline"
    size="sm"
    onClick={() => handleViewSourceDocument(actual)}
    className="h-8 px-2"
  >
    <BarChart3 className="h-3 w-3" />
  </Button>
</td>

// Add state and handler
const [showDocumentViewer, setShowDocumentViewer] = useState(false)
const [selectedDocument, setSelectedDocument] = useState(null)

const handleViewSourceDocument = async (actual) => {
  if (!actual.source_document_id) return
  
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/documents/${actual.source_document_id}?projectId=${projectId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )
    
    const result = await response.json()
    if (result.success) {
      // Get all entities from this document
      const documentEntities = actuals.filter(a => a.source_document_id === actual.source_document_id)
      
      setSelectedDocument({
        ...result.data,
        entities: documentEntities,
        initialScrollTo: {
          char: actual.source_text_start,
          line: actual.source_line_start
        }
      })
      setShowDocumentViewer(true)
    }
  } catch (error) {
    console.error('Failed to load document:', error)
  }
}

// Add DynamicDocumentViewer at the end
import { DynamicDocumentViewer } from './documents/DynamicDocumentViewer'

<DynamicDocumentViewer
  isOpen={showDocumentViewer}
  onClose={() => setShowDocumentViewer(false)}
  documentId={selectedDocument?.id || ''}
  documentTitle={selectedDocument?.title || ''}
  documentContent={selectedDocument?.content || ''}
  entities={selectedDocument?.entities || []}
  initialScrollTo={selectedDocument?.initialScrollTo}
/>
```

## 🎨 **How It Works:**

### **1. Extraction Phase**
```typescript
// AI extracts with position data
{
  entity_name: "Testing Complete",
  source_text_start: 1234,
  source_text_end: 1248,
  source_line_start: 45,
  source_line_end: 45,
  source_context: "...Testing Complete on 2026-02-28...",
  source_snippet: "Testing Complete"
}
```

### **2. Storage Phase**
```sql
-- Clean markdown stored in documents table
content: "The project milestone Testing Complete was achieved..."

-- Position data stored in performance_actuals table
source_text_start: 1234,
source_text_end: 1248,
source_line_start: 45,
source_line_end: 45
```

### **3. Viewing Phase**
```typescript
// User clicks "View Source Document"
// 1. Fetch clean document content
// 2. Apply dynamic highlighting using stored positions
// 3. Auto-scroll to exact location
const highlightedContent = applyDynamicHighlighting(content, entities)
// Result: "The project milestone <h5>Testing Complete</h5> was achieved..."
```

## 🔍 **Dynamic Highlighting Function:**

```typescript
function applyDynamicHighlighting(content: string, entities: Entity[]): string {
  let highlightedContent = content
  
  // Sort by start position (reverse to avoid position shifting)
  const sortedEntities = entities
    .filter(e => e.source_text_start !== undefined)
    .sort((a, b) => (b.source_text_start || 0) - (a.source_text_start || 0))
  
  // Apply h5/h6 tags using stored positions
  sortedEntities.forEach((entity, index) => {
    const tag = index % 2 === 0 ? 'h5' : 'h6'
    const before = highlightedContent.substring(0, entity.source_text_start)
    const entityText = highlightedContent.substring(entity.source_text_start, entity.source_text_end)
    const after = highlightedContent.substring(entity.source_text_end)
    
    highlightedContent = `${before}<${tag}>${entityText}</${tag}>${after}`
  })
  
  return highlightedContent
}
```

## ✅ **Benefits:**

1. **🧹 Clean Storage** - Original markdown never modified
2. **🎯 Precise Positioning** - Uses exact character positions
3. **⚡ On-Demand Highlighting** - Only when user requests
4. **🔄 Flexible** - Can change highlighting strategy anytime
5. **📍 Auto-Scroll** - Jumps to exact location
6. **💾 Efficient** - No need to process all documents upfront

## 📊 **User Experience:**

1. **User sees clean performance data** in dashboard
2. **Clicks "View Source Document"** on any entity
3. **Document opens** with entity highlighted in yellow
4. **Auto-scrolls** to exact location
5. **Can navigate** between multiple entities
6. **Search** within document
7. **Original markdown** remains clean in database

## 🎯 **Success Metrics:**

- ✅ Clean markdown storage
- ✅ Precise position capture
- ✅ Dynamic h5/h6 highlighting
- ✅ Auto-scroll to location
- ✅ Multiple entity support
- ✅ Search and navigation
- ✅ Performance optimization

**Status**: ✅ **PERFECT SOLUTION - CLEAN MARKDOWN + DYNAMIC HIGHLIGHTING**
