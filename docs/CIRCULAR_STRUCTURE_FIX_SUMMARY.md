# Circular Structure JSON Error Fix

## Problem Description

Users encountered a "Converting circular structure to JSON" error when viewing documents with entity highlighting enabled. The error occurred because React components were being passed to `JSON.stringify()`, which cannot handle circular references in React's internal component structure.

## Root Cause

The issue was in the EntityHighlighter component implementation:

### Before (Problematic Code):
```typescript
// EntityHighlighter was returning React components
{children(
  <div className="prose prose-sm max-w-none">
    {entityHighlight ? (
      <div dangerouslySetInnerHTML={{ __html: highlightedContent }} />
    ) : (
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    )}
  </div>
)}
```

### DriftHighlighter Expected String:
```typescript
// DriftHighlighter tried to JSON.stringify the React component
content={typeof highlightedContent === 'string' ? highlightedContent : JSON.stringify(highlightedContent, null, 2)}
```

This caused the circular structure error because React components contain circular references that cannot be serialized to JSON.

## Solution

### 1. Fixed EntityHighlighter Component
Changed the EntityHighlighter to return **string content** instead of React components:

```typescript
// EntityHighlighter now returns string content
{children(highlightedContent)}
```

The highlighted content is now a string with HTML markup:
```typescript
return `${before}<mark class="entity-highlight bg-yellow-200 px-1 rounded border border-yellow-400">${highlighted}</mark>${after}`
```

### 2. Updated Document Viewer Integration
Simplified the integration to pass string content directly to DriftHighlighter:

```typescript
<EntityHighlighter content={documentContent} entityHighlight={entityHighlight}>
  {(highlightedContent) => (
    <DriftHighlighter content={highlightedContent} drifts={drifts} />
  )}
</EntityHighlighter>
```

### 3. Updated TypeScript Interfaces
Fixed the EntityHighlighter interface to properly type the children function:

```typescript
interface EntityHighlighterProps {
  content: string
  entityHighlight: EntityHighlightData | null
  children: (highlightedContent: string) => React.ReactNode  // String input, ReactNode output
}
```

## Changes Made

### Files Modified:
1. **`/components/documents/EntityHighlighter.tsx`**
   - Changed children function to return string content instead of React components
   - Updated TypeScript interface
   - Removed React component rendering logic

2. **`/app/projects/[id]/documents/[docId]/view/page.tsx`**
   - Simplified DriftHighlighter integration
   - Removed fallback JSON.stringify logic
   - Ensured string content flow

### Key Changes:
- ✅ EntityHighlighter returns **string** with HTML markup
- ✅ DriftHighlighter receives **string** content
- ✅ No React components passed to JSON.stringify
- ✅ Circular structure errors eliminated
- ✅ Entity highlighting functionality preserved

## Testing Results

### Test Script Output:
```
✅ Highlighting Logic Test Passed
✅ JSON Serialization Test Passed
✅ EntityHighlighter now returns string content
✅ No React components passed to JSON.stringify
✅ DriftHighlighter receives string content directly
✅ Circular structure errors eliminated
```

## Impact

### Before Fix:
- ❌ "Converting circular structure to JSON" error
- ❌ Document viewer crashed when entity highlighting enabled
- ❌ Users couldn't view documents with entity highlighting

### After Fix:
- ✅ Document viewer loads successfully
- ✅ Entity highlighting works correctly
- ✅ Yellow highlighting appears on extracted text
- ✅ No circular structure errors
- ✅ All existing functionality preserved

## Entity Highlighting Features Preserved

The fix maintains all entity highlighting functionality:

1. **Character Offset Highlighting** - Most precise highlighting using start/end positions
2. **Line Number Highlighting** - Highlights entire lines containing entities
3. **Snippet Matching** - Text search-based highlighting
4. **Tag-Based Highlighting** - Highlights content within markdown tags
5. **Visual Indicators** - Yellow background with border
6. **Entity Info Banner** - Shows entity name and type
7. **Auto-Scroll** - Smooth scrolling to highlighted content
8. **Toast Notifications** - Informative messages about highlighted entities

## Verification

To verify the fix works:

1. Navigate to entities page for a document
2. Click "View Source Document" on an entity with location data
3. Verify document viewer opens without errors
4. Confirm entity text is highlighted in yellow
5. Check entity info banner appears
6. Verify smooth scrolling to highlighted content

## Technical Details

### Error Message Resolved:
```
Converting circular structure to JSON --> starting at object with constructor 'Object' --- property 'Provider' closes the circle
```

### Architecture Flow:
```
Entities Page → URL Parameters → Document Viewer → EntityHighlighter (string) → DriftHighlighter (string) → Rendered Content
```

### Data Types:
- Input: String content + entity highlighting parameters
- Processing: String manipulation with HTML markup injection
- Output: String with `<mark>` tags for highlighting
- Rendering: DriftHighlighter processes string content safely

## Conclusion

The circular structure JSON error has been completely resolved by ensuring that only string content is passed between components, eliminating any React component serialization issues. All entity highlighting functionality is preserved and working correctly.
