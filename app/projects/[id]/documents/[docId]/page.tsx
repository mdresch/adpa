"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { apiClient } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Save,
  Download,
  Share,
  History,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  LinkIcon,
  Table,
  Undo,
  Redo,
  Eye,
  Edit3,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface DocumentParams {
  id: string
  docId: string
}

export default function DocumentEditor() {
  const params = useParams()
  const projectId = params?.id as string
  const docId = params?.docId as string
  const { isAuthenticated } = useAuth()
  const editorRef = useRef<HTMLDivElement>(null)
  
  const [isEditing, setIsEditing] = useState(true)
  const [documentTitle, setDocumentTitle] = useState("")
  const [lastSaved, setLastSaved] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [documentData, setDocumentData] = useState<any>(null)

  const [documentContent, setDocumentContent] = useState("")
  const autosaveTimer = useRef<number | null>(null)
  const isMounted = useRef(false)
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const savedTimeoutRef = useRef<number | null>(null)

  // Fetch document data
  const fetchDocument = async () => {
    try {
      setLoading(true)
      const document = await apiClient.getDocument(docId)
      setDocumentData(document)
      setDocumentTitle(document.name)
      setDocumentContent(document.content ? JSON.stringify(document.content) : "")
      setLastSaved(new Date(document.updated_at).toLocaleString())
    } catch (error) {
      console.error("Failed to fetch document:", error)
      toast.error("Failed to load document")
      
      // Fallback to mock data
      const mockData = {
        id: docId,
        name: "Business Architecture Overview",
        type: "Business Architecture",
        template: "Business Architecture Template",
        status: "draft",
        version: "1.0",
        author: "Sarah Johnson",
        lastModified: "2024-01-20",
        projectName: "Program Genesis",
      }
      setDocumentData(mockData)
      setDocumentTitle(mockData.name)
      setDocumentContent(`
    <h1>Business Architecture Overview</h1>
    
    <h2>1. Executive Summary</h2>
    <p>This document provides a comprehensive overview of the business architecture for Program Genesis, outlining the key business capabilities, processes, and organizational structure that will support the program's objectives.</p>
    
    <h2>2. Business Context</h2>
    <p>Program Genesis represents a strategic initiative to transform our core business operations through digital innovation and process optimization. This business architecture framework will serve as the foundation for all program activities.</p>
    
    <h2>3. Key Business Capabilities</h2>
    <h3>Core Capabilities:</h3>
    <ul>
      <li>Customer Relationship Management</li>
      <li>Product Development and Innovation</li>
      <li>Supply Chain Management</li>
      <li>Financial Management and Reporting</li>
      <li>Human Capital Management</li>
    </ul>
    
    <h3>Supporting Capabilities:</h3>
    <ul>
      <li>IT Infrastructure and Services</li>
      <li>Data Management and Analytics</li>
      <li>Compliance and Risk Management</li>
      <li>Quality Assurance and Control</li>
    </ul>
    
    <h2>4. Organizational Structure</h2>
    <table border="1" style="width: 100%; border-collapse: collapse;">
      <tr>
        <th style="padding: 8px; background-color: #f5f5f5;">Department</th>
        <th style="padding: 8px; background-color: #f5f5f5;">Key Responsibilities</th>
        <th style="padding: 8px; background-color: #f5f5f5;">Headcount</th>
      </tr>
      <tr>
        <td style="padding: 8px;">Business Operations</td>
        <td style="padding: 8px;">Core business process management</td>
        <td style="padding: 8px;">45</td>
      </tr>
      <tr>
        <td style="padding: 8px;">IT & Digital</td>
        <td style="padding: 8px;">Technology infrastructure and digital transformation</td>
        <td style="padding: 8px;">32</td>
      </tr>
      <tr>
        <td style="padding: 8px;">Finance & Procurement</td>
        <td style="padding: 8px;">Financial management and vendor relationships</td>
        <td style="padding: 8px;">18</td>
      </tr>
    </table>
    
    <h2>5. Business Processes</h2>
    <h3>Primary Processes:</h3>
    <ol>
      <li>Customer Onboarding and Management</li>
      <li>Order Processing and Fulfillment</li>
      <li>Product Development Lifecycle</li>
      <li>Financial Planning and Budgeting</li>
      <li>Performance Monitoring and Reporting</li>
    </ol>
    
    <h2>6. Technology Landscape</h2>
    <p>The business architecture will leverage modern technology solutions including cloud infrastructure, enterprise resource planning systems, customer relationship management platforms, and advanced analytics capabilities.</p>
    
    <h2>7. Key Performance Indicators</h2>
    <ul>
      <li>Customer Satisfaction Score: Target 85%</li>
      <li>Process Efficiency: 30% improvement</li>
      <li>Cost Reduction: 25% in operational expenses</li>
      <li>Time-to-Market: 40% reduction for new products</li>
    </ul>
    
    <h2>8. Risk Considerations</h2>
    <h3>Business Risks:</h3>
    <ul>
      <li>Market competition and disruption</li>
      <li>Regulatory compliance requirements</li>
      <li>Technology adoption challenges</li>
      <li>Change management and organizational resistance</li>
    </ul>
    
    <h2>9. Implementation Roadmap</h2>
    <p>The business architecture implementation will follow a phased approach over 24 months, with quarterly milestones and regular stakeholder reviews to ensure alignment with business objectives.</p>
    
    <h2>10. Governance and Oversight</h2>
    <p>A dedicated business architecture governance board will oversee the implementation, consisting of executive sponsors, business leaders, and technical architects to ensure strategic alignment and successful execution.</p>
  `)

    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (!editorRef.current) return

    const content = editorRef.current.innerHTML
    setDocumentContent(content)
    setLastSaved("Just now")
    // Here you would typically save to your backend
    console.log("Saving document:", content)
  }

  const formatText = (command: string, value?: string) => {
    if (!editorRef.current) return

    try {
      document.execCommand(command, false, value)
      editorRef.current.focus()
    } catch (error) {
      console.warn('execCommand not supported:', command)
    }
  }

  const insertTable = () => {
    if (!editorRef.current) return

    const table = `
      <table border="1" style="width: 100%; border-collapse: collapse; margin: 10px 0;">
        <tr>
          <th style="padding: 8px; background-color: #f5f5f5;">Header 1</th>
          <th style="padding: 8px; background-color: #f5f5f5;">Header 2</th>
          <th style="padding: 8px; background-color: #f5f5f5;">Header 3</th>
        </tr>
        <tr>
          <td style="padding: 8px;">Cell 1</td>
          <td style="padding: 8px;">Cell 2</td>
          <td style="padding: 8px;">Cell 3</td>
        </tr>
      </table>
    `

    try {
      document.execCommand("insertHTML", false, table)
    } catch (error) {
      console.warn('insertHTML not supported')
    }
  }

  // Save document
  const saveDocument = useCallback(async (silent = false) => {
    try {
      // indicate saving state for autosave vs manual save
      if (silent) setAutosaveStatus('saving')
      setSaving(true)
      await apiClient.updateDocument(docId, {
        name: documentTitle,
        content: { html: documentContent },
        status: documentData?.status || 'draft'
      })
      const now = new Date().toLocaleString()
      setLastSaved(now)
      if (!silent) {
        toast.success("Document saved successfully")
      } else {
        // show saved indicator briefly for autosave
        setAutosaveStatus('saved')
        if (savedTimeoutRef.current) {
          window.clearTimeout(savedTimeoutRef.current)
        }
        savedTimeoutRef.current = window.setTimeout(() => {
          setAutosaveStatus('idle')
          savedTimeoutRef.current = null
        }, 3000)
      }
    } catch (error) {
      console.error("Failed to save document:", error)
      if (!silent) toast.error("Failed to save document")
      else setAutosaveStatus('idle')
    } finally {
      setSaving(false)
    }
  }, [docId, documentTitle, documentContent, documentData])

  // Version history handler
  const handleVersionHistory = () => {
    toast.info("Version history feature coming soon!")
    // TODO: Implement version history modal/dialog
  }

  // Share document handler
  const handleShareDocument = () => {
    const shareUrl = `${window.location.origin}/projects/${projectId}/documents/${docId}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Document link copied to clipboard!")
    }).catch(() => {
      toast.error("Failed to copy link")
    })
  }

  // Export document handler
  const handleExportDocument = async () => {
    try {
      const content = documentContent || ""
      const blob = new Blob([content], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `${documentTitle || 'document'}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      toast.success("Document exported successfully!")
    } catch (error) {
      console.error("Failed to export document:", error)
      toast.error("Failed to export document")
    }
  }

  // Load document on mount
  useEffect(() => {
    if (isAuthenticated && docId) {
      fetchDocument()
    }
  }, [docId, isAuthenticated])

  // Autosave: debounce saves after user stops typing
  useEffect(() => {
    // Skip autosave on initial mount when content is first loaded
    if (!isMounted.current) {
      isMounted.current = true
      return
    }

    if (autosaveTimer.current) {
      window.clearTimeout(autosaveTimer.current)
    }

    // Schedule autosave in 2s
    autosaveTimer.current = window.setTimeout(() => {
      saveDocument(true).catch(() => {})
      autosaveTimer.current = null
    }, 2000)

    return () => {
      if (autosaveTimer.current) {
        window.clearTimeout(autosaveTimer.current)
        autosaveTimer.current = null
      }
    }
  }, [documentContent, saveDocument])

  // Keyboard shortcuts (Cmd/Ctrl+S to save, Cmd/Ctrl+B/I/U for formatting)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey
      if (!meta) return

      const key = e.key.toLowerCase()
      if (key === 's') {
        e.preventDefault()
        saveDocument(false)
      } else if (key === 'b') {
        e.preventDefault()
        formatText('bold')
      } else if (key === 'i') {
        e.preventDefault()
        formatText('italic')
      } else if (key === 'u') {
        e.preventDefault()
        formatText('underline')
      } else if (key === 'z') {
        e.preventDefault()
        formatText('undo')
      } else if (key === 'y') {
        e.preventDefault()
        formatText('redo')
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveDocument])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Document Header */}
          <div className="border-b bg-background p-4 visible-scrollbar">
            <div className="flex items-center justify-between mb-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/projects/${projectId}`}>{documentData?.projectName || "Project"}</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{documentData?.name || "Document"}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleVersionHistory}>
                  <History className="h-4 w-4 mr-2" />
                  Version History
                </Button>
                <Button variant="outline" size="sm" onClick={handleShareDocument}>
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportDocument}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button onClick={() => saveDocument()} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Input
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className="text-lg font-semibold border-none p-0 h-auto bg-transparent"
                />
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{documentData?.status || "Loading..."}</Badge>
                  <Badge variant="outline">v{documentData?.version || "1.0"}</Badge>
                  <Badge variant="outline">{documentData?.template || "Template"}</Badge>
                </div>
              </div>
              <div className="text-sm text-muted-foreground flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span>Last saved: {lastSaved}</span>
                  <span className="text-xs text-muted-foreground">• {documentData?.author || 'Unknown'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Autosave indicator */}
                  {autosaveStatus === 'saving' && (
                    <div className="text-xs text-amber-500">Saving…</div>
                  )}
                  {autosaveStatus === 'saved' && (
                    <div className="text-xs text-green-500">Saved</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="edit" className="flex-1 flex flex-col">
            <div className="border-b px-4">
              <TabsList className="h-12">
                <TabsTrigger value="edit" className="flex items-center space-x-2">
                  <Edit3 className="h-4 w-4" />
                  <span>Edit</span>
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <span>Preview</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="edit" className="flex-1 flex flex-col m-0 min-h-0">
              {/* Toolbar */}
              <div className="border-b bg-muted/30 p-2 sticky top-0 z-20 backdrop-blur-sm/5 shadow-sm">
                <TooltipProvider>
                  <div className="flex items-center space-x-1">
                    <div className="flex items-center space-x-1 pr-2 border-r">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => formatText("undo")}>
                            <Undo className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Undo</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => formatText("redo")}>
                            <Redo className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Redo</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex items-center space-x-1 pr-2 border-r">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => formatText("bold")}>
                            <Bold className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Bold</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => formatText("italic")}>
                            <Italic className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Italic</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => formatText("underline")}>
                            <Underline className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Underline</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex items-center space-x-1 pr-2 border-r">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => formatText("justifyLeft")}>
                            <AlignLeft className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Align Left</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => formatText("justifyCenter")}>
                            <AlignCenter className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Align Center</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => formatText("justifyRight")}>
                            <AlignRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Align Right</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex items-center space-x-1 pr-2 border-r">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => formatText("insertUnorderedList")}>
                            <List className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Bullet List</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => formatText("insertOrderedList")}>
                            <ListOrdered className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Numbered List</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const url = prompt("Enter URL:")
                              if (url) {
                                formatText("createLink", url)
                              }
                            }}
                          >
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Insert Link</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={insertTable}>
                            <Table className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Insert Table</TooltipContent>
                      </Tooltip>
                    </div>

                    <Separator orientation="vertical" className="h-6" />

                    <label htmlFor="formatBlockSelect" className="sr-only">
                      Text format
                    </label>
                    <select
                      id="formatBlockSelect"
                      aria-label="Text format"
                      className="text-sm border rounded px-2 py-1"
                      onChange={(e) => formatText("formatBlock", e.target.value)}
                    >
                      <option value="div">Normal</option>
                      <option value="h1">Heading 1</option>
                      <option value="h2">Heading 2</option>
                      <option value="h3">Heading 3</option>
                      <option value="h4">Heading 4</option>
                    </select>
                  </div>
                </TooltipProvider>
              </div>

              {/* Editor */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full overflow-y-auto overflow-x-hidden visible-scrollbar scroll-smooth">
                  <div
                    ref={editorRef}
                    contentEditable={isEditing}
                    dangerouslySetInnerHTML={{ __html: documentContent }}
                    className="h-full p-8 max-w-4xl mx-auto prose prose-lg focus:outline-none document-editor editor-content"
                    onInput={(e) => {
                      const target = e.target as HTMLDivElement
                      setDocumentContent(target.innerHTML)
                    }}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 m-0 min-h-0">
              <div className="h-full overflow-y-auto overflow-x-hidden visible-scrollbar scroll-smooth">
                <div
                  className="min-h-full p-8 max-w-4xl mx-auto prose prose-lg document-editor"
                  dangerouslySetInnerHTML={{ __html: documentContent }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
