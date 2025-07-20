"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { FileText, Plus, Edit, Copy, Trash2, Download, Upload, Search, Filter } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function Templates() {
  const [templates] = useState([
    {
      id: "1",
      name: "BABOK Requirements Analysis",
      framework: "BABOK v3",
      category: "Requirements",
      description: "Comprehensive requirements analysis template following BABOK v3 guidelines",
      version: "2.1",
      lastModified: "2024-01-15",
      author: "System Admin",
      usage: 45,
      status: "active",
    },
    {
      id: "2",
      name: "PMBOK Project Charter",
      framework: "PMBOK 7",
      category: "Project Management",
      description: "Standard project charter template based on PMBOK 7th Edition",
      version: "1.8",
      lastModified: "2024-01-12",
      author: "PM Team",
      usage: 78,
      status: "active",
    },
    {
      id: "3",
      name: "DMBOK Data Governance Framework",
      framework: "DMBOK 2.0",
      category: "Data Management",
      description: "Data governance framework template (Beta - DMBOK 2.0)",
      version: "0.9",
      lastModified: "2024-01-10",
      author: "Data Team",
      usage: 12,
      status: "beta",
    },
    {
      id: "4",
      name: "Stakeholder Analysis Matrix",
      framework: "BABOK v3",
      category: "Stakeholder Management",
      description: "Comprehensive stakeholder analysis and engagement planning",
      version: "1.5",
      lastModified: "2024-01-08",
      author: "BA Team",
      usage: 34,
      status: "active",
    },
    {
      id: "5",
      name: "Risk Management Plan",
      framework: "PMBOK 7",
      category: "Risk Management",
      description: "Comprehensive risk identification, analysis, and response planning",
      version: "2.0",
      lastModified: "2024-01-05",
      author: "Risk Team",
      usage: 56,
      status: "active",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFramework, setSelectedFramework] = useState("all")

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFramework = selectedFramework === "all" || template.framework === selectedFramework
    return matchesSearch && matchesFramework
  })

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Document Templates</h1>
                <p className="text-muted-foreground">
                  Manage and configure document templates for BABOK, PMBOK, and DMBOK standards
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Template
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Create New Template</DialogTitle>
                      <DialogDescription>Create a new document template for the ADPA framework.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Template Name</label>
                          <Input placeholder="Enter template name" className="mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Framework</label>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                            <option value="">Select framework</option>
                            <option value="BABOK v3">BABOK v3</option>
                            <option value="PMBOK 7">PMBOK 7</option>
                            <option value="DMBOK 2.0">DMBOK 2.0</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Category</label>
                          <Input placeholder="e.g., Requirements, Planning" className="mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Version</label>
                          <Input placeholder="1.0" defaultValue="1.0" className="mt-1" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                          placeholder="Describe the purpose and usage of this template"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Create Template</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedFramework}
                  onChange={(e) => setSelectedFramework(e.target.value)}
                >
                  <option value="all">All Frameworks</option>
                  <option value="BABOK v3">BABOK v3</option>
                  <option value="PMBOK 7">PMBOK 7</option>
                  <option value="DMBOK 2.0">DMBOK 2.0</option>
                </select>
              </div>
            </div>

            <Tabs defaultValue="grid" className="space-y-4">
              <TabsList>
                <TabsTrigger value="grid">Grid View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="categories">By Category</TabsTrigger>
              </TabsList>

              <TabsContent value="grid" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <FileText className="h-8 w-8 text-primary" />
                          <div className="flex space-x-1">
                            <Badge variant={template.status === "active" ? "default" : "secondary"}>
                              {template.status}
                            </Badge>
                            <Badge variant="outline">{template.framework}</Badge>
                          </div>
                        </div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Version:</span>
                            <span className="font-medium">{template.version}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Usage:</span>
                            <span className="font-medium">{template.usage} times</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Modified:</span>
                            <span className="font-medium">{template.lastModified}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Author:</span>
                            <span className="font-medium">{template.author}</span>
                          </div>

                          <div className="flex space-x-2 pt-2">
                            <Button size="sm" className="flex-1">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="list" className="space-y-4">
                <div className="space-y-2">
                  {filteredTemplates.map((template) => (
                    <Card key={template.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <FileText className="h-6 w-6 text-primary" />
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold">{template.name}</h3>
                                <Badge variant={template.status === "active" ? "default" : "secondary"}>
                                  {template.status}
                                </Badge>
                                <Badge variant="outline">{template.framework}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                                <span>v{template.version}</span>
                                <span>•</span>
                                <span>{template.usage} uses</span>
                                <span>•</span>
                                <span>Modified {template.lastModified}</span>
                                <span>•</span>
                                <span>by {template.author}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="categories" className="space-y-4">
                {[
                  "Requirements",
                  "Project Management",
                  "Data Management",
                  "Stakeholder Management",
                  "Risk Management",
                ].map((category) => {
                  const categoryTemplates = filteredTemplates.filter((t) => t.category === category)
                  if (categoryTemplates.length === 0) return null

                  return (
                    <Card key={category}>
                      <CardHeader>
                        <CardTitle className="text-lg">{category}</CardTitle>
                        <CardDescription>{categoryTemplates.length} templates</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categoryTemplates.map((template) => (
                            <div
                              key={template.id}
                              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{template.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {template.framework}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{template.description}</p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>v{template.version}</span>
                                <span>{template.usage} uses</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
