"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import {
  Download,
  Edit,
  Share,
  Copy,
  FileText,
  Calendar,
  User,
  Clock,
  BarChart3,
  ExternalLink,
  ArrowLeft,
  Eye,
  Settings,
  History,
} from "@/components/ui/icons-shim"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { jsPDF } from "jspdf"
import { Document, Packer, Paragraph, TextRun } from "docx"
import { saveAs } from "file-saver"

// Mock document data
const mockDocument = {
  id: "demo-doc-123",
  title: "Enhanced Document Viewer Demo",
  content: `# Enhanced Document Viewer Demo

## Overview
This document demonstrates the **Enhanced Document Viewer** features implemented in the ADPA system.

## Rich Markdown Rendering

### Code Syntax Highlighting
Here's some JavaScript code with syntax highlighting:

\`\`\`javascript
// Enhanced Document Viewer Implementation
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"

function DocumentViewer({ document }) {
  return (
    <ReactMarkdown
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
              showLineNumbers={true}
            >
              {String(children).replace(/\\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
      }}
    >
      {document.content}
    </ReactMarkdown>
  );
}
\`\`\`

### Python Example
\`\`\`python
def export_to_pdf(document_content):
    """Export document to PDF format"""
    pdf = jsPDF()
    pdf.text(document_content, 10, 10)
    pdf.save("document.pdf")
    return pdf
\`\`\`

### SQL Query Example
\`\`\`sql
SELECT 
    d.id,
    d.title,
    d.content,
    d.created_at,
    u.name as author
FROM documents d
JOIN users u ON d.author_id = u.id
WHERE d.status = 'published'
ORDER BY d.created_at DESC;
\`\`\`

## Features Demonstrated

### 1. Rich Text Formatting
- **Bold text** and *italic text*
- \`Inline code\` formatting
- [Links](https://example.com) and references

### 2. Lists and Tables
- Unordered lists
- Numbered lists
- Nested lists

| Feature | Status | Implementation |
|---------|--------|----------------|
| Markdown Rendering | ✅ Complete | ReactMarkdown + SyntaxHighlighter |
| Export Options | ✅ Complete | PDF, Word, Markdown |
| Version History | ✅ Complete | Git-like versioning |
| Edit Mode | ✅ Complete | In-place editing |
| Metadata Display | ✅ Complete | Document information panel |

### 3. Advanced Features
- **Export Options**: PDF, Word (DOCX), Markdown
- **Version History**: Track changes and compare versions
- **Edit Mode**: In-place editing with auto-save
- **Metadata Display**: Document information, compression stats
- **Process Flow Integration**: Seamless workflow integration

## Document Statistics
- **Word Count**: 247 words
- **Character Count**: 1,456 characters
- **Compression Ratio**: 85% (original: 2.1MB, compressed: 315KB)
- **Processing Time**: 2.3 seconds
- **AI Model Used**: GPT-4 Turbo
- **Token Usage**: 1,247 input tokens, 892 output tokens

## Conclusion
The Enhanced Document Viewer provides a comprehensive document management experience with:
- Professional markdown rendering
- Syntax highlighting for code blocks
- Multiple export formats
- Version control and history
- Real-time editing capabilities
- Integration with the Process Flow Workflow

This implementation demonstrates the power of modern web technologies in creating rich, interactive document experiences.`,
  author: "System Administrator",
  created_at: "2024-01-15T10:30:00Z",
  updated_at: "2024-01-15T14:45:00Z",
  status: "published",
  word_count: 247,
  character_count: 1456,
  compression_ratio: 85,
  original_size: "2.1MB",
  compressed_size: "315KB",
  processing_time: "2.3s",
  ai_model: "GPT-4 Turbo",
  input_tokens: 1247,
  output_tokens: 892,
  source_documents: [
    { id: "src-1", title: "Technical Requirements", type: "PDF" },
    { id: "src-2", title: "User Stories", type: "DOCX" },
    { id: "src-3", title: "API Documentation", type: "MD" }
  ]
}

const mockVersions = [
  {
    id: "v1",
    version: "1.0",
    created_at: "2024-01-15T10:30:00Z",
    author: "System Administrator",
    changes: "Initial document creation",
    word_count: 247
  },
  {
    id: "v2", 
    version: "1.1",
    created_at: "2024-01-15T12:15:00Z",
    author: "System Administrator",
    changes: "Added code examples and feature table",
    word_count: 312
  },
  {
    id: "v3",
    version: "1.2", 
    created_at: "2024-01-15T14:45:00Z",
    author: "System Administrator",
    changes: "Updated statistics and conclusion",
    word_count: 247
  }
]

export default function DemoDocumentViewer() {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(mockDocument.content)
  const [showVersions, setShowVersions] = useState(false)

  const exportToPDF = () => {
    const pdf = new jsPDF()
    pdf.text(mockDocument.content, 10, 10, { maxWidth: 180 })
    pdf.save(`${mockDocument.title}.pdf`)
    toast.success("Document exported to PDF")
  }

  const exportToWord = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: mockDocument.title,
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: mockDocument.content,
                size: 24,
              }),
            ],
          }),
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
    saveAs(blob, `${mockDocument.title}.docx`)
    toast.success("Document exported to Word")
  }

  const exportToMarkdown = () => {
    const blob = new Blob([mockDocument.content], { type: "text/markdown" })
    saveAs(blob, `${mockDocument.title}.md`)
    toast.success("Document exported to Markdown")
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mockDocument.content)
    toast.success("Document content copied to clipboard")
  }

  const shareDocument = () => {
    if (navigator.share) {
      navigator.share({
        title: mockDocument.title,
        text: mockDocument.content.substring(0, 200) + "...",
        url: window.location.href,
      })
    } else {
      copyToClipboard()
    }
  }

  const saveEdit = () => {
    // Mock save functionality
    toast.success("Document saved successfully")
    setIsEditing(false)
  }

  const cancelEdit = () => {
    setEditedContent(mockDocument.content)
    setIsEditing(false)
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <PageTransition>
            <AnimatedLayout>
              <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Documents
                      </Button>
                      <div>
                        <h1 className="text-3xl font-bold">{mockDocument.title}</h1>
                        <p className="text-muted-foreground">
                          Enhanced Document Viewer Demo
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{mockDocument.status}</Badge>
                      <Button variant="outline" size="sm" onClick={() => setShowVersions(!showVersions)}>
                        <History className="h-4 w-4 mr-2" />
                        Versions ({mockVersions.length})
                      </Button>
                    </div>
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Main Content */}
                  <div className="lg:col-span-3">
                    <AnimatedCard>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center space-x-2">
                            <FileText className="h-5 w-5" />
                            <span>Document Content</span>
                          </CardTitle>
                          <div className="flex items-center space-x-2">
                            {!isEditing ? (
                              <>
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy
                                </Button>
                                <Button variant="outline" size="sm" onClick={shareDocument}>
                                  <Share className="h-4 w-4 mr-2" />
                                  Share
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="outline" size="sm" onClick={cancelEdit}>
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={saveEdit}>
                                  Save Changes
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {!isEditing ? (
                          <div className="prose prose-lg max-w-none">
                            <ReactMarkdown
                              components={{
                                code({ node, inline, className, children, ...props }: {
                                  node?: any;
                                  inline?: boolean;
                                  className?: string;
                                  children?: React.ReactNode;
                                  [key: string]: any;
                                }) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return !inline && match ? (
                                    <SyntaxHighlighter
                                      style={vscDarkPlus}
                                      language={match[1]}
                                      PreTag="div"
                                      showLineNumbers={true}
                                      customStyle={{ margin: '1rem 0', borderRadius: '8px' }}
                                      {...props}
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  ) : (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                table({ children }: { children?: React.ReactNode }) {
                                  return (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full border-collapse border border-gray-300">
                                        {children}
                                      </table>
                                    </div>
                                  );
                                },
                                th({ children }: { children?: React.ReactNode }) {
                                  return (
                                    <th className="border border-gray-300 px-4 py-2 bg-gray-50 font-semibold">
                                      {children}
                                    </th>
                                  );
                                },
                                td({ children }: { children?: React.ReactNode }) {
                                  return (
                                    <td className="border border-gray-300 px-4 py-2">
                                      {children}
                                    </td>
                                  );
                                },
                              }}
                            >
                              {mockDocument.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <textarea
                            value={editedContent}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedContent(e.target.value)}
                            className="w-full h-96 p-4 border rounded-lg font-mono text-sm"
                            placeholder="Edit document content..."
                          />
                        )}
                      </CardContent>
                    </AnimatedCard>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Document Information */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <FileText className="h-5 w-5" />
                          <span>Document Information</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Author</p>
                            <p className="text-sm text-muted-foreground">{mockDocument.author}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Created</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(mockDocument.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Last Updated</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(mockDocument.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Statistics</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Words:</span>
                              <span className="ml-2 font-medium">{mockDocument.word_count}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Characters:</span>
                              <span className="ml-2 font-medium">{mockDocument.character_count}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </AnimatedCard>

                    {/* Generation Stats */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <BarChart3 className="h-5 w-5" />
                          <span>Generation Stats</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Compression</p>
                          <div className="text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Ratio:</span>
                              <span className="font-medium">{mockDocument.compression_ratio}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Original:</span>
                              <span className="font-medium">{mockDocument.original_size}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Compressed:</span>
                              <span className="font-medium">{mockDocument.compressed_size}</span>
                            </div>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">AI Processing</p>
                          <div className="text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Model:</span>
                              <span className="font-medium">{mockDocument.ai_model}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Time:</span>
                              <span className="font-medium">{mockDocument.processing_time}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Input Tokens:</span>
                              <span className="font-medium">{mockDocument.input_tokens}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Output Tokens:</span>
                              <span className="font-medium">{mockDocument.output_tokens}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </AnimatedCard>

                    {/* Export Options */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Download className="h-5 w-5" />
                          <span>Export Options</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start" onClick={exportToPDF}>
                          <Download className="h-4 w-4 mr-2" />
                          Export as PDF
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={exportToWord}>
                          <Download className="h-4 w-4 mr-2" />
                          Export as Word
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={exportToMarkdown}>
                          <Download className="h-4 w-4 mr-2" />
                          Export as Markdown
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Settings className="h-4 w-4 mr-2" />
                          Print Document
                        </Button>
                      </CardContent>
                    </AnimatedCard>

                    {/* Source Documents */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <ExternalLink className="h-5 w-5" />
                          <span>Source Documents</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {mockDocument.source_documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 rounded border">
                              <div>
                                <p className="text-sm font-medium">{doc.title}</p>
                                <p className="text-xs text-muted-foreground">{doc.type}</p>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  </div>
                </div>

                {/* Version History */}
                {showVersions && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6"
                  >
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <History className="h-5 w-5" />
                          <span>Version History</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {mockVersions.map((version) => (
                            <div key={version.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center space-x-4">
                                <Badge variant="outline">v{version.version}</Badge>
                                <div>
                                  <p className="font-medium">{version.changes}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {version.author} • {new Date(version.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">
                                  {version.word_count} words
                                </span>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  </motion.div>
                )}
              </div>
            </AnimatedLayout>
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
