"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  FolderOpen,
  FileText,
  Plus,
  Search,
  Edit,
  Download,
  Trash2,
  Calendar,
  Users,
  DollarSign,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Eye,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"

export default function ProjectDetail() {
  const params = useParams()
  const projectId = params.id

  // Mock project data - in real app, fetch based on projectId
  const project = {
    id: projectId,
    name: "Customer Portal Redesign",
    description: "Complete redesign of the customer-facing portal with improved UX and new features",
    status: "active",
    progress: 65,
    startDate: "2024-01-15",
    endDate: "2024-06-30",
    manager: "Sarah Johnson",
    team: ["John Doe", "Jane Smith", "Mike Wilson", "Lisa Chen"],
    framework: "PMBOK 7",
    budget: "$250,000",
    phase: "Development",
    lastActivity: "2 hours ago",
  }

  const [documents] = useState([
    {
      id: "1",
      name: "Project Charter",
      type: "Project Management",
      template: "PMBOK Project Charter",
      status: "completed",
      lastModified: "2024-01-20",
      author: "Sarah Johnson",
      version: "2.1",
      size: "245 KB",
    },
    {
      id: "2",
      name: "Stakeholder Analysis",
      type: "Stakeholder Management",
      template: "Stakeholder Analysis Matrix",
      status: "in-progress",
      lastModified: "2024-01-18",
      author: "John Doe",
      version: "1.3",
      size: "189 KB",
    },
    {
      id: "3",
      name: "Risk Management Plan",
      type: "Risk Management",
      template: "Risk Management Plan",
      status: "completed",
      lastModified: "2024-01-15",
      author: "Jane Smith",
      version: "1.0",
      size: "312 KB",
    },
    {
      id: "4",
      name: "Requirements Specification",
      type: "Requirements",
      template: "BABOK Requirements Analysis",
      status: "draft",
      lastModified: "2024-01-22",
      author: "Mike Wilson",
      version: "0.8",
      size: "567 KB",
    },
    {
      id: "5",
      name: "Communication Plan",
      type: "Communication",
      template: "Communication Management Plan",
      status: "in-progress",
      lastModified: "2024-01-19",
      author: "Lisa Chen",
      version: "1.2",
      size: "123 KB",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "draft":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "in-progress":
        return "secondary"
      case "draft":
        return "outline"
      default:
        return "secondary"
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Breadcrumb */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{project.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Project Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <FolderOpen className="h-8 w-8 text-primary" />
                  <div>
                    <h1 className="text-3xl font-bold">{project.name}</h1>
                    <p className="text-muted-foreground">{project.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant="default">{project.status}</Badge>
                  <Badge variant="outline">{project.framework}</Badge>
                  <Badge variant="secondary">{project.phase}</Badge>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Generate New Document</DialogTitle>
                      <DialogDescription>
                        Create a new document from available templates for this project.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label htmlFor="template">Select Template</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                          <option value="">Choose a template</option>
                          <optgroup label="PMBOK 7 Templates">
                            <option value="project-charter">Project Charter</option>
                            <option value="scope-statement">Project Scope Statement</option>
                            <option value="wbs">Work Breakdown Structure</option>
                            <option value="risk-plan">Risk Management Plan</option>
                            <option value="comm-plan">Communication Plan</option>
                          </optgroup>
                          <optgroup label="BABOK v3 Templates">
                            <option value="requirements-analysis">Requirements Analysis</option>
                            <option value="stakeholder-analysis">Stakeholder Analysis</option>
                            <option value="business-case">Business Case</option>
                            <option value="solution-assessment">Solution Assessment</option>
                          </optgroup>
                          <optgroup label="DMBOK 2.0 Templates">
                            <option value="data-governance">Data Governance Framework</option>
                            <option value="data-quality">Data Quality Assessment</option>
                            <option value="data-architecture">Data Architecture</option>
                          </optgroup>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="doc-name">Document Name</Label>
                        <Input id="doc-name" placeholder="Enter document name" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="doc-description">Description (Optional)</Label>
                        <Input id="doc-description" placeholder="Brief description of the document" className="mt-1" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Generate Document</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Tabs defaultValue="documents" className="space-y-4">
              <TabsList>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="space-y-4">
                {/* Search */}
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>

                {/* Documents List */}
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => (
                    <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {getStatusIcon(doc.status)}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <Link
                                  href={`/projects/${projectId}/documents/${doc.id}`}
                                  className="font-semibold hover:text-primary transition-colors"
                                >
                                  {doc.name}
                                </Link>
                                <Badge variant={getStatusColor(doc.status)} className="text-xs">
                                  {doc.status}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                                <span>Template: {doc.template}</span>
                                <span>•</span>
                                <span>v{doc.version}</span>
                                <span>•</span>
                                <span>{doc.size}</span>
                                <span>•</span>
                                <span>Modified {doc.lastModified}</span>
                                <span>•</span>
                                <span>by {doc.author}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/projects/${projectId}/documents/${doc.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Progress</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{project.progress}%</div>
                      <Progress value={project.progress} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Budget</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{project.budget}</div>
                      <p className="text-xs text-muted-foreground">Total allocated</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Team Size</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{project.team.length + 1}</div>
                      <p className="text-xs text-muted-foreground">Including PM</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Documents</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{documents.length}</div>
                      <p className="text-xs text-muted-foreground">Generated docs</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="team" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Team</CardTitle>
                    <CardDescription>Team members and their roles</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{project.manager}</p>
                            <p className="text-sm text-muted-foreground">Project Manager</p>
                          </div>
                        </div>
                        <Badge>Lead</Badge>
                      </div>
                      {project.team.map((member, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {member
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{member}</p>
                              <p className="text-sm text-muted-foreground">Team Member</p>
                            </div>
                          </div>
                          <Badge variant="outline">Member</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Timeline</CardTitle>
                    <CardDescription>Key milestones and deadlines</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Project Start</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(project.startDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Current Phase: {project.phase}</p>
                          <p className="text-sm text-muted-foreground">In progress</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Project End</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(project.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
