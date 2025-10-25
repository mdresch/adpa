# Document Storage Format - Markdown Standard

## Overview
ADPA stores all document content in **Markdown format** as plain text in the database. This ensures consistency, portability, and easy conversion to other formats.

## Core Principle

> **All text stored in the database should be in Markdown language.**
> 
> Upon retrieval, documents can be converted to PDF (.pdf), Word (.docx), or other formats, but the **primary storage format is always Markdown (plain text)**.

## Database Schema

### Documents Table
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name VARCHAR(255) NOT NULL,
  content TEXT,  -- Plain Markdown text (NOT JSON/JSONB)
  template_id UUID REFERENCES templates(id),
  status VARCHAR(50) DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Important**: The `content` column is of type `TEXT` and should contain plain Markdown strings, not JSON objects.

## Content Format Standards

### ✅ Correct Format (Plain Markdown String)
```markdown
# Project Requirements Document

## Overview
This document outlines the requirements...

## Functional Requirements

### 1. User Management
- User registration
- User authentication
- Role-based access control

### 2. Document Processing
- Upload documents
- Process with AI
- Generate reports
```

### ❌ Incorrect Format (JSON Object)
```json
{
  "text": "# Project Requirements...",
  "format": "markdown",
  "metadata": {}
}
```

## Backend Implementation

### Document Creation
```typescript
// Convert content to Markdown string if it's an object
let contentString = content
if (typeof content === 'object' && content !== null) {
  if (content.text) {
    contentString = content.text
  } else if (content.markdown) {
    contentString = content.markdown
  } else if (content.content) {
    contentString = content.content
  } else {
    // Fallback: stringify as JSON
    contentString = JSON.stringify(content, null, 2)
  }
}

// Store as plain text
await pool.query(
  'INSERT INTO documents (id, content, ...) VALUES ($1, $2, ...)',
  [id, contentString, ...]  // contentString is plain Markdown text
)
```

### Document Retrieval
```typescript
// Content is retrieved as plain Markdown text
const result = await pool.query('SELECT content FROM documents WHERE id = $1', [id])
const markdownContent = result.rows[0].content  // Already a string
```

## Frontend Handling

### Displaying Documents
```typescript
// Content is already a string, use directly in ReactMarkdown
<ReactMarkdown>
  {document.content}  // Plain Markdown string
</ReactMarkdown>
```

### Uploading Documents
```typescript
// When uploading, ensure content is sent as plain text
const content = await file.text()  // Read file as text

await apiClient.createDocument(projectId, {
  name: 'My Document',
  content: content,  // Send as plain string
  template_id: templateId
})
```

## Export Formats

While documents are stored as Markdown, they can be exported to various formats:

### 1. PDF Export
```typescript
import { jsPDF } from 'jspdf'

const exportToPDF = (markdownContent: string, title: string) => {
  const pdf = new jsPDF()
  pdf.text(markdownContent, 10, 10, { maxWidth: 180 })
  pdf.save(`${title}.pdf`)
}
```

### 2. Word/DOCX Export
```typescript
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'

const exportToWord = async (markdownContent: string, title: string) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: title, bold: true, size: 32 })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: markdownContent, size: 24 })
          ]
        })
      ]
    }]
  })

  const buffer = await Packer.toBuffer(doc)
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  })
  saveAs(blob, `${title}.docx`)
}
```

### 3. HTML Export
```typescript
import ReactMarkdown from 'react-markdown'
import { renderToString } from 'react-dom/server'

const exportToHTML = (markdownContent: string) => {
  const html = renderToString(
    <ReactMarkdown>{markdownContent}</ReactMarkdown>
  )
  return html
}
```

### 4. Markdown Export (Native Format)
```typescript
const exportToMarkdown = (markdownContent: string, filename: string) => {
  const blob = new Blob([markdownContent], { type: 'text/markdown' })
  saveAs(blob, `${filename}.md`)
}
```

## Migration for Existing Documents

If you have existing documents stored as JSON objects, run this migration:

```sql
-- Migration to convert JSON content to plain text
UPDATE documents
SET content = 
  CASE 
    WHEN content::jsonb ? 'text' THEN content::jsonb->>'text'
    WHEN content::jsonb ? 'markdown' THEN content::jsonb->>'markdown'
    WHEN content::jsonb ? 'content' THEN content::jsonb->>'content'
    ELSE content
  END
WHERE content IS NOT NULL
  AND content::jsonb IS NOT NULL;
```

## Best Practices

1. **Always Store as Plain Text**: Never `JSON.stringify()` the content before storing
2. **Validate Markdown**: Use Markdown linters to ensure valid syntax
3. **Sanitize Input**: Sanitize user-provided Markdown to prevent XSS
4. **Preserve Formatting**: Keep original line breaks and whitespace
5. **Use UTF-8 Encoding**: Ensure proper character encoding for international content
6. **Version Control**: Track document versions for history
7. **Backup Regularly**: Regular database backups to prevent data loss

## Common Pitfalls to Avoid

### ❌ Don't Stringify Objects
```typescript
// WRONG
const content = { text: "# My Document" }
await pool.query('INSERT INTO documents (content) VALUES ($1)', 
  [JSON.stringify(content)])  // Don't do this!
```

### ✅ Store Plain Text
```typescript
// CORRECT
const content = "# My Document\n\nThis is the content..."
await pool.query('INSERT INTO documents (content) VALUES ($1)', 
  [content])  // Store as plain text
```

### ❌ Don't Wrap in Objects When Sending
```typescript
// WRONG
await apiClient.createDocument(projectId, {
  content: { text: markdownContent }  // Don't wrap it!
})
```

### ✅ Send Plain Text
```typescript
// CORRECT
await apiClient.createDocument(projectId, {
  content: markdownContent  // Send as plain string
})
```

## Markdown Features Supported

ADPA supports full Markdown syntax including:

- **Headers**: `# H1`, `## H2`, `### H3`, etc.
- **Emphasis**: `*italic*`, `**bold**`, `***bold italic***`
- **Lists**: Ordered and unordered lists
- **Code Blocks**: ` ```language` syntax for code highlighting
- **Tables**: GitHub-flavored Markdown tables
- **Links**: `[text](url)` format
- **Images**: `![alt](url)` format
- **Blockquotes**: `>` prefix
- **Horizontal Rules**: `---` or `***`
- **Task Lists**: `- [ ]` and `- [x]`

## Conclusion

By standardizing on Markdown as the storage format, ADPA ensures:
- **Simplicity**: Plain text is easy to work with
- **Portability**: Markdown can be easily converted to any format
- **Consistency**: One format for all documents
- **Future-Proof**: Plain text will always be readable
- **Version Control**: Easy to diff and track changes
- **Search**: Full-text search works efficiently on plain text

