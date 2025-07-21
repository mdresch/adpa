"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import {
  Plus,
  Minus,
  Save,
  Eye,
  Code,
  Settings,
  FileText,
  Layers,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  Upload,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"

interface TemplateVariable {
  id: string
  name: string
  type: "text" | "number" | "date" | "boolean" | "select" | "textarea"
  label: string
  description: string
  required: boolean
  default_value?: string
  options?: string[]
}

interface TemplateSection {
  id: string
  title: string
  content: string
  order: number
  variables: string[]
}

export default function TemplateBuilderPage() {
  const { user, hasPermission } = useAuth()
  const { isConnected } = useWebSocket()
  
  const [templateName, setTemplateName] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [templateFramework, setTemplateFramework] = useState("")
  const [templateCategory, setTemplateCategory] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [variables, setVariables] = useState<TemplateVariable[]>([])
  const [sections, setSections] = useState<TemplateSection[]>([])
  const [activeTab, setActiveTab] = useState("design")
  const [previewMode, setPreviewMode] = useState(false)
  const [saving, setSaving] = useState(false)

  const frameworks = ["TOGAF", "SABSA", "ZACHMAN", "FEAF", "DoDAF", "MODAF", "Custom"]
  const categories = ["Business Architecture", "Application Architecture", "Technology Architecture", "Security Architecture", "Data Architecture"]

  const addVariable = () => {
    const newVariable: TemplateVariable = {
      id: `var_${Date.now()}`,
      name: "",
      type: "text",
      label: "",
      description: "",
      required: false,
    }
    setVariables([...variables, newVariable])
  }

  const updateVariable = (id: string, updates: Partial<TemplateVariable>) => {
    setVariables(variables.map(v => v.id === id ? { ...v, ...updates } : v))
  }

  const removeVariable = (id: string) => {
    setVariables(variables.filter(v => v.id !== id))
    // Remove variable references from sections
    setSections(sections.map(s => ({
      ...s,
      variables: s.variables.filter(vId => vId !== id)
    })))
  }

  const addSection = () => {
    const newSection: TemplateSection = {
      id: `section_${Date.now()}`,
      title: "",
      content: "",
      order: sections.length,
      variables: [],
    }
    setSections([...sections, newSection])
  }

  const updateSection = (id: string, updates: Partial<TemplateSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id))
  }

  const moveSection = (id: string, direction: "up" | "down") => {
    const index = sections.findIndex(s => s.id === id)
    if (index === -1) return

    const newSections = [...sections]
    const targetIndex = direction === "up" ? index - 1 : index + 1

    if (targetIndex >= 0 && targetIndex < sections.length) {
      [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]]
      // Update order
      newSections.forEach((section, idx) => {
        section.order = idx
      })
      setSections(newSections)
    }
  }

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required")
      return
    }

    if (!templateFramework) {
      toast.error("Framework selection is required")
      return
    }

    if (sections.length === 0) {
      toast.error("At least one section is required")
      return
    }

    try {
      setSaving(true)
      
      const templateData = {
        name: templateName,
        description: templateDescription,
        framework: templateFramework,
        category: templateCategory,
        is_public: isPublic,
        variables: variables,
        content: {
          sections: sections,
          metadata: {
            created_with: "template_builder",
            version: "1.0",
          }
        }
      }

      await apiClient.createTemplate(templateData)
      toast.success("Template saved successfully!")
      
      // Reset form
      setTemplateName("")
      setTemplateDescription("")
      setTemplateFramework("")
      setTemplateCategory("")
      setIsPublic(false)
      setVariables([])
      setSections([])
      
    } catch (error) {
      console.error("Failed to save template:", error)
      toast.error("Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  const generatePreview = () => {
    let preview = ""
    sections.forEach(section => {
      preview += `# ${section.title}\n\n`
      let content = section.content
      
      // Replace variable placeholders
      variables.forEach(variable => {
        const placeholder = `{{${variable.name}}}`
        const replacement = variable.default_value || `[${variable.label}]`
        content = content.replace(new RegExp(placeholder, 'g'), replacement)
      })
      
      preview += `${content}\n\n`
    })
    
    return preview
  }

  if (!hasPermission("templates.create")) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                  <p className="text-muted-foreground">You don't have permission to create templates.</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatedLayout>
              <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center justify-between"
                >
                  <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                      <Layers className="h-8 w-8 text-purple-500" />
                      Template Builder
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Create custom document templates with variables and sections
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm text-muted-foreground">
                        {isConnected ? 'Connected' : 'Offline'}
                      </span>
                    </div>
                    <Button onClick={() => setPreviewMode(!previewMode)} variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      {previewMode ? 'Edit' : 'Preview'}
                    </Button>
                    <Button onClick={saveTemplate} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Template'}
                    </Button>
                  </div>
                </motion.div>

                {previewMode ? (
                  /* Preview Mode */
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle>Template Preview</CardTitle>
                      <CardDescription>
                        Preview of how the template will appear when used
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted rounded-lg p-6">
                        <pre className="whitespace-pre-wrap text-sm">
                          {generatePreview()}
                        </pre>
                      </div>
                    </CardContent>
                  </AnimatedCard>
                ) : (
                  /* Builder Mode */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Template Configuration */}
                    <div className="lg:col-span-1 space-y-6">
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Template Configuration
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Template Name</Label>
                            <Input
                              id="name"
                              placeholder="Enter template name"
                              value={templateName}
                              onChange={(e) => setTemplateName(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              placeholder="Describe the template purpose"
                              value={templateDescription}
                              onChange={(e) => setTemplateDescription(e.target.value)}
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="framework">Framework</Label>
                            <Select value={templateFramework} onValueChange={setTemplateFramework}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select framework" />
                              </SelectTrigger>
                              <SelectContent>
                                {frameworks.map(framework => (
                                  <SelectItem key={framework} value={framework}>
                                    {framework}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={templateCategory} onValueChange={setTemplateCategory}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(category => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="public"
                              checked={isPublic}
                              onCheckedChange={setIsPublic}
                            />
                            <Label htmlFor="public">Make template public</Label>
                          </div>
                        </CardContent>
                      </AnimatedCard>

                      {/* Variables */}
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Hash className="h-5 w-5" />
                            Variables
                          </CardTitle>
                          <CardDescription>
                            Define dynamic variables for the template
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {variables.map((variable) => (
                              <div key={variable.id} className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <Input
                                    placeholder="Variable name"
                                    value={variable.name}
                                    onChange={(e) => updateVariable(variable.id, { name: e.target.value })}
                                    className="flex-1 mr-2"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeVariable(variable.id)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                <Input
                                  placeholder="Display label"
                                  value={variable.label}
                                  onChange={(e) => updateVariable(variable.id, { label: e.target.value })}
                                />
                                
                                <Select
                                  value={variable.type}
                                  onValueChange={(value: any) => updateVariable(variable.id, { type: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="textarea">Long Text</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="boolean">Yes/No</SelectItem>
                                    <SelectItem value="select">Dropdown</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={variable.required}
                                    onCheckedChange={(checked) => updateVariable(variable.id, { required: checked })}
                                  />
                                  <Label className="text-sm">Required</Label>
                                </div>
                              </div>
                            ))}
                            
                            <Button onClick={addVariable} variant="outline" className="w-full">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Variable
                            </Button>
                          </div>
                        </CardContent>
                      </AnimatedCard>
                    </div>

                    {/* Template Content */}
                    <div className="lg:col-span-2 space-y-6">
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Template Sections
                          </CardTitle>
                          <CardDescription>
                            Build your template content with sections and variables
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {sections.map((section, index) => (
                              <div key={section.id} className="border rounded-lg p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                  <Input
                                    placeholder="Section title"
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="flex-1 mr-4"
                                  />
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => moveSection(section.id, "up")}
                                      disabled={index === 0}
                                    >
                                      ↑
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => moveSection(section.id, "down")}
                                      disabled={index === sections.length - 1}
                                    >
                                      ↓
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeSection(section.id)}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <Textarea
                                  placeholder="Section content (use {{variable_name}} for variables)"
                                  value={section.content}
                                  onChange={(e) => updateSection(section.id, { content: e.target.value })}
                                  rows={6}
                                />
                                
                                <div className="text-sm text-muted-foreground">
                                  Available variables: {variables.map(v => `{{${v.name}}}`).join(', ') || 'None'}
                                </div>
                              </div>
                            ))}
                            
                            <Button onClick={addSection} variant="outline" className="w-full">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Section
                            </Button>
                          </div>
                        </CardContent>
                      </AnimatedCard>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
