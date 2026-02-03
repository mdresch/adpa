# View Source Document with Yellow Highlighting - Implementation Guide

## 🎯 **Objective**
Enable users to click "View Source Document" on any extracted entity and see the original document with the entity highlighted in yellow, automatically scrolled to the correct location.

## ✅ **Current Status**
- Database schema ready (Migration 366)
- Enhanced extraction service created
- Document viewer component created
- Need integration with existing extraction flow

## 🔧 **Implementation Steps**

### **Step 1: Run Database Migration**
```bash
cd server && node scripts/migrate-single.js 366
```

### **Step 2: Update Performance Actuals Extraction**
Modify `server/src/services/projectDataExtractionService.ts`:

```typescript
// Import the enhanced service
import { EnhancedEntityExtractionService } from './enhancedEntityExtractionService'

// In extractPerformanceActuals method:
private async extractPerformanceActuals(...) {
  // Replace existing extraction with enhanced version
  const enhancedService = new EnhancedEntityExtractionService()
  const actuals = await enhancedService.extractEntitiesWithLocations(
    documents,
    'performance_actuals',
    prompt,
    options
  )
  
  // Process as before with location data included
  return actuals.map((actual: any) => ({
    // ... existing fields
    source_text_start: actual.source_text_start,
    source_text_end: actual.source_text_end,
    source_line_start: actual.source_line_start,
    source_line_end: actual.source_line_end,
    source_context: actual.source_context,
    source_snippet: actual.source_snippet
  }))
}
```

### **Step 3: Add API Endpoint for Document Content**
Create `server/src/routes/documentRoutes.ts`:

```typescript
router.get('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params
    const { projectId } = req.query
    
    // Get document with content
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

### **Step 4: Add "View Source Document" Button to Performance Dashboard**
Update `components/project/PerformanceDashboard.tsx`:

```typescript
// Add to each table row
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )
    
    const result = await response.json()
    if (result.success) {
      setSelectedDocument({
        ...result.data,
        highlights: [{
          id: actual.id,
          entity_name: actual.entity_name,
          entity_type: actual.entity_type,
          source_text_start: actual.source_text_start,
          source_text_end: actual.source_text_end,
          source_line_start: actual.source_line_start,
          source_line_end: actual.source_line_end,
          source_context: actual.source_context,
          source_snippet: actual.source_snippet
        }],
        initialScrollTo: {
          line: actual.source_line_start,
          char: actual.source_text_start
        }
      })
      setShowDocumentViewer(true)
    }
  } catch (error) {
    console.error('Failed to load document:', error)
  }
}

// Add DocumentViewer component at the end
<DocumentViewer
  isOpen={showDocumentViewer}
  onClose={() => setShowDocumentViewer(false)}
  documentId={selectedDocument?.id || ''}
  documentTitle={selectedDocument?.title || ''}
  documentContent={selectedDocument?.content || ''}
  highlights={selectedDocument?.highlights || []}
  initialScrollTo={selectedDocument?.initialScrollTo}
/>
```

### **Step 5: Update AI Prompt for Location Tracking**
Modify the performance actuals prompt in `projectDataExtractionService.ts`:

```typescript
const prompt = `You are analyzing project documents to extract PERFORMANCE ACTUALS with precise location tracking.

CRITICAL LOCATION TRACKING:
For each performance actual, you MUST provide:
- source_text_start: Character position where text starts (0-based)
- source_text_end: Character position where text ends
- source_line_start: Line number where entity starts (1-based)
- source_line_end: Line number where entity ends
- source_context: Surrounding text (±100 characters)
- source_snippet: Exact text that was extracted

{
  "performance_actuals": [
    {
      "entity_type": "milestone",
      "entity_name": "Testing Complete",
      "actual_end_date": "2026-02-28",
      "source_document": "Project Charter",
      "source_text_start": 1234,
      "source_text_end": 1248,
      "source_line_start": 45,
      "source_line_end": 45,
      "source_context": "...Testing Complete on 2026-02-28...",
      "source_snippet": "Testing Complete"
    }
  ]
}

${documentContext}

Return ONLY valid JSON.`
```

## 🎨 **User Experience Flow**

1. **User clicks "View Source Document"** button on any performance actual
2. **System fetches** the source document content
3. **Document Viewer opens** in a floating dialog
4. **Entity is highlighted** in yellow
5. **Document auto-scrolls** to the entity location
6. **User can:**
   - Navigate between multiple entities in the document
   - Search within the document
   - Click entities to jump to their locations
   - View context and exact snippets

## 🔍 **Technical Features**

### **Yellow Highlighting**
- Uses HTML `<mark>` tag with `bg-yellow-200` styling
- Highlights exact text spans based on character positions
- Multiple entities can be highlighted simultaneously

### **Auto-Scroll Navigation**
- Scrolls to exact character position
- Falls back to line number if character position unavailable
- Smooth scrolling with visual feedback

### **Entity List Panel**
- Shows all entities found in the document
- Click to jump to specific entity locations
- Shows entity type, name, and line ranges
- Current entity highlighted in panel

### **Search Functionality**
- Real-time search within document
- Line filtering based on search terms
- Maintains highlighting during search

## 📊 **Database Schema**

```sql
-- New fields in performance_actuals table
source_text_start INTEGER,     -- Character start position
source_text_end INTEGER,       -- Character end position  
source_line_start INTEGER,     -- Line start number (1-based)
source_line_end INTEGER,       -- Line end number (1-based)
source_context TEXT,           -- Surrounding context (±100 chars)
source_snippet TEXT            -- Exact extracted text
```

## 🚀 **Benefits**

1. **Full Traceability**: Users can see exactly where AI extracted data from
2. **Transparency**: Builds trust in AI extraction process
3. **Verification**: Users can validate extraction accuracy
4. **Context**: Shows surrounding text for better understanding
5. **Navigation**: Easy jumping between entities and documents

## 📋 **Testing Checklist**

- [ ] Migration runs successfully
- [ ] Enhanced extraction captures location data
- [ ] Document viewer displays content correctly
- [ ] Yellow highlighting works for entities
- [ ] Auto-scroll navigates to correct positions
- [ ] Entity list shows all extracted entities
- [ ] Search functionality works
- [ ] Multiple entities highlighted correctly
- [ ] Error handling for missing documents
- [ ] Performance with large documents

## 🎯 **Success Metrics**

- Users can trace any extracted entity back to source
- Zero-click navigation from entity to source location
- Visual highlighting makes entities easy to identify
- Search and navigation work smoothly
- Performance remains acceptable for large documents
