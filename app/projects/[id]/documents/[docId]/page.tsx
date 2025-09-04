"use client"

import { useState, useRef } from "react"
import { useParams } from "next/navigation"
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
  const editorRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(true)
  const [documentTitle, setDocumentTitle] = useState("Project Charter")
  const [lastSaved, setLastSaved] = useState("2 minutes ago")

  // Mock document data
  const documentData = {
    id: docId,
    name: "Project Charter",
    type: "Project Management",
    template: "PMBOK Project Charter",
    status: "in-progress",
    version: "2.1",
    author: "Sarah Johnson",
    lastModified: "2024-01-20",
    projectName: "Customer Portal Redesign",
  }

  const [documentContent, setDocumentContent] = useState(`
    <h1>Project Charter: Customer Portal Redesign</h1>
    
    <h2>1. Project Overview</h2>
    <p>This project aims to completely redesign the customer-facing portal to improve user experience, enhance functionality, and modernize the technology stack. The new portal will provide customers with better self-service capabilities and streamlined access to their account information.</p>
    
    <h2>2. Project Objectives</h2>
    <ul>
      <li>Improve customer satisfaction scores by 25%</li>
      <li>Reduce customer service calls by 30%</li>
      <li>Implement modern, responsive design</li>
      <li>Enhance security and compliance features</li>
      <li>Integrate with existing backend systems</li>
    </ul>
    
    <h2>3. Project Scope</h2>
    <h3>In Scope:</h3>
    <ul>
      <li>Complete UI/UX redesign</li>
      <li>Frontend development using React/Next.js</li>
      <li>API integration and optimization</li>
      <li>Mobile responsiveness</li>
      <li>User authentication and authorization</li>
      <li>Testing and quality assurance</li>
    </ul>
    
    <h3>Out of Scope:</h3>
    <ul>
      <li>Backend system modifications</li>
      <li>Database schema changes</li>
      <li>Third-party integrations beyond existing APIs</li>
    </ul>
    
    <h2>4. Key Stakeholders</h2>
    <table border="1" style="width: 100%; border-collapse: collapse;">
      <tr>
        <th style="padding: 8px; background-color: #f5f5f5;">Name</th>
        <th style="padding: 8px; background-color: #f5f5f5;">Role</th>
        <th style="padding: 8px; background-color: #f5f5f5;">Responsibility</th>
      </tr>
      <tr>
        <td style="padding: 8px;">Sarah Johnson</td>
        <td style="padding: 8px;">Project Manager</td>
        <td style="padding: 8px;">Overall project coordination and delivery</td>
      </tr>
      <tr>
        <td style="padding: 8px;">John Doe</td>
        <td style="padding: 8px;">Lead Developer</td>
        <td style="padding: 8px;">Technical implementation and architecture</td>
      </tr>
      <tr>
        <td style="padding: 8px;">Jane Smith</td>
        <td style="padding: 8px;">UX Designer</td>
        <td style="padding: 8px;">User experience design and research</td>
      </tr>
    </table>
    
    <h2>5. Timeline and Milestones</h2>
    <p><strong>Project Duration:</strong> January 15, 2024 - June 30, 2024</p>
    
    <h3>Key Milestones:</h3>
    <ul>
      <li><strong>Phase 1 - Discovery & Planning:</strong> January 15 - February 15, 2024</li>
      <li><strong>Phase 2 - Design & Prototyping:</strong> February 16 - March 31, 2024</li>
      <li><strong>Phase 3 - Development:</strong> April 1 - May 31, 2024</li>
      <li><strong>Phase 4 - Testing & Deployment:</strong> June 1 - June 30, 2024</li>
    </ul>
    
    <h2>6. Budget and Resources</h2>
    <p><strong>Total Budget:</strong> $250,000</p>
    <p><strong>Team Size:</strong> 5 members</p>
    <p><strong>Technology Stack:</strong> React, Next.js, TypeScript, Tailwind CSS</p>
    
    <h2>7. Success Criteria</h2>
    <ul>
      <li>Customer satisfaction score improvement of 25%</li>
      <li>Page load time under 2 seconds</li>
      <li>Mobile responsiveness across all devices</li>
      <li>Zero critical security vulnerabilities</li>
      <li>Successful deployment with 99.9% uptime</li>
    </ul>
    
    <h2>8. Risks and Assumptions</h2>
    <h3>Key Risks:</h3>
    <ul>
      <li>API integration complexity may cause delays</li>
      <li>User acceptance testing may reveal additional requirements</li>
      <li>Third-party service dependencies</li>
    </ul>
    
    <h3>Assumptions:</h3>
    <ul>
      <li>Existing APIs will remain stable during development</li>
      <li>Stakeholders will be available for timely feedback</li>
      <li>No major technology changes during project timeline</li>
    </ul>
    
    <h2>9. Approval</h2>
    <p>This project charter has been reviewed and approved by:</p>
    <ul>
      <li><strong>Project Sponsor:</strong> [Name] - [Date]</li>
      <li><strong>Project Manager:</strong> Sarah Johnson - January 15, 2024</li>
      <li><strong>Technical Lead:</strong> John Doe - January 15, 2024</li>
    </ul>
  `)

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
                    <BreadcrumbLink href={`/projects/${projectId}`}>{documentData.projectName}</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{documentData.name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  Version History
                </Button>
                <Button variant="outline" size="sm">
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
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
                  <Badge variant="secondary">{documentData.status}</Badge>
                  <Badge variant="outline">v{documentData.version}</Badge>
                  <Badge variant="outline">{documentData.template}</Badge>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Last saved: {lastSaved} • {documentData.author}
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

            <TabsContent value="edit" className="flex-1 flex flex-col m-0">
              {/* Toolbar */}
              <div className="border-b bg-muted/30 p-2">
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
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto overflow-x-hidden visible-scrollbar scroll-smooth">
                  <div
                    ref={editorRef}
                    contentEditable={isEditing}
                    dangerouslySetInnerHTML={{ __html: documentContent }}
                    className="min-h-full p-8 max-w-4xl mx-auto prose prose-lg focus:outline-none document-editor editor-content"
                    onInput={(e) => {
                      const target = e.target as HTMLDivElement
                      setDocumentContent(target.innerHTML)
                    }}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 m-0">
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
