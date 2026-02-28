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
  Sparkles,
  Lightbulb,
  AlertTriangle,
  BookOpen,
  Target,
  Zap,
  Info,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { apiClient } from "@/lib/api"
import { toast } from '@/lib/notify'
import PromptAssistantPanel from "../components/PromptAssistantPanel"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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

interface PromptQualityIssue {
  type: "error" | "warning" | "success"
  message: string
}

// Template Pattern Library
const TEMPLATE_PATTERNS = {
  stakeholder: {
    name: "Stakeholder Analysis",
    systemPrompt: `You are a PROJECT DOCUMENT ANALYST extracting stakeholder information from REAL PROJECT DATA.

CRITICAL RULES:
1. ✅ EXTRACT data from the provided project context (stakeholders, requirements, documentation)
2. ❌ DO NOT generate generic educational content about stakeholders
3. ✅ USE actual names, roles, and details from the project
4. ❌ DO NOT create hypothetical or example stakeholders
5. ✅ If insufficient data exists, state "Insufficient project data" and recommend what data is needed
6. ✅ Reference specific project documents and sources

CONTEXT PRIORITY:
- Project stakeholder register
- Requirements documentation  
- Meeting notes and communications
- Organizational charts
- Project charter

OUTPUT FOCUS: Real stakeholders from THIS specific project only.`,
    content: `## Stakeholder Analysis

### Key Stakeholders
[Extract and list ACTUAL stakeholders from the project context]

| Name | Role | Interest | Influence | Engagement Strategy |
|------|------|----------|-----------|---------------------|
| [Real name] | [Real role] | [Extracted] | [Extracted] | [Extracted] |

### Stakeholder Groups
[Identify actual stakeholder groups from context]`,
    contextRequirements: ["project_stakeholders", "project_team", "project_charter"]
  },
  
  charter: {
    name: "Project Charter",
    systemPrompt: `You are a PROJECT DOCUMENT ANALYST creating a project charter from REAL PROJECT DATA.

CRITICAL EXTRACTION RULES:
1. ✅ EXTRACT project information from the provided context (project name, objectives, stakeholders, scope, etc.)
2. ❌ DO NOT generate a generic project charter template or educational content
3. ✅ USE actual project details: real names, dates, objectives, deliverables from the context
4. ❌ DO NOT create placeholder content like "[Project Name]" or "Example deliverables"
5. ✅ If specific data is missing from context, state "Not available in project documentation" for that section
6. ✅ Base ALL charter content on the project documentation provided

CONTEXT SOURCES TO USE:
- Project name, description, and objectives
- Stakeholder information and roles
- Project scope and deliverables  
- Timeline and milestones
- Budget and resources (if available)
- Success criteria and constraints

OUTPUT: A REAL project charter for THIS specific project, not a template.`,
    content: `## Project Charter: [Extract actual project name]

### 1. Project Overview
**Project Name:** [Extract from context]
**Project Manager:** [Extract from stakeholder data]
**Sponsor:** [Extract from stakeholder data]

**Purpose:** [Extract the actual business need/purpose from project documentation]

### 2. Project Objectives  
[Extract and list the ACTUAL project objectives from the context]

### 3. Project Scope
**In Scope:** [Extract actual deliverables and scope items from context]
**Out of Scope:** [Extract explicit out-of-scope items if mentioned]

### 4. Stakeholders
[Extract REAL stakeholders from the provided context]

### 5. Success Criteria
[Extract the actual success criteria and KPIs from documentation]`,
    contextRequirements: ["project_information", "project_stakeholders", "project_scope", "project_objectives"]
  },
  
  requirements: {
    name: "Requirements Document",
    systemPrompt: `You are a PROJECT DOCUMENT ANALYST extracting requirements from REAL PROJECT DATA.

CRITICAL RULES:
1. ✅ EXTRACT actual requirements from project documentation
2. ❌ DO NOT generate example or hypothetical requirements
3. ✅ CATEGORIZE requirements by type (functional, non-functional, business, technical)
4. ❌ DO NOT create generic requirement templates
5. ✅ If requirements are missing, identify gaps and state what's needed
6. ✅ Reference source documents for each requirement

CONTEXT PRIORITY:
- Requirements documents
- User stories and acceptance criteria
- Business cases
- Stakeholder requests
- Technical specifications

OUTPUT FOCUS: Real, traceable requirements from THIS project.`,
    content: `## Requirements Document

### Functional Requirements
[Extract actual functional requirements from context]

### Non-Functional Requirements
[Extract actual non-functional requirements from context]

### Business Requirements
[Extract actual business requirements from context]

**VALIDATION:** All requirements must be traceable to source documentation.`,
    contextRequirements: ["requirements_docs", "user_stories", "business_case"]
  },
  
  risks: {
    name: "Risk Assessment",
    systemPrompt: `You are a PROJECT DOCUMENT ANALYST identifying risks from REAL PROJECT DATA.

CRITICAL RULES:
1. ✅ IDENTIFY risks mentioned in project documentation
2. ❌ DO NOT generate generic risk examples or educational content
3. ✅ EXTRACT risk mitigation strategies from project plans
4. ❌ DO NOT create hypothetical risk scenarios
5. ✅ If risk data is sparse, analyze context for potential risks and clearly label as "inferred"
6. ✅ Reference specific concerns raised by stakeholders

CONTEXT PRIORITY:
- Risk register
- Project plans
- Stakeholder concerns
- Technical assessments
- Lessons learned

OUTPUT FOCUS: Real risks identified for THIS project with documented mitigation.`,
    content: `## Risk Assessment

### Identified Risks
[Extract actual risks from project documentation]

| Risk ID | Description | Probability | Impact | Mitigation Strategy | Owner |
|---------|-------------|-------------|--------|---------------------|-------|
| [Extract from context] | [Real risk] | [Actual] | [Actual] | [Actual] | [Actual] |

### Risk Categories
[Categorize extracted risks]`,
    contextRequirements: ["risk_register", "project_plans", "stakeholder_concerns"]
  }
};

export default function TemplateBuilderPage() {
  const { user, hasPermission } = useAuth()
  const { isConnected } = useWebSocket()
  
  const [templateName, setTemplateName] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [templateFramework, setTemplateFramework] = useState("")
  const [templateCategory, setTemplateCategory] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [contextRequirements, setContextRequirements] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(false)
  const [variables, setVariables] = useState<TemplateVariable[]>([])
  const [sections, setSections] = useState<TemplateSection[]>([])
  const [activeTab, setActiveTab] = useState("design")
  const [previewMode, setPreviewMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [promptQuality, setPromptQuality] = useState<PromptQualityIssue[]>([])
  const [showPatternDialog, setShowPatternDialog] = useState(false)

  const frameworks = ["PMBOK 7", "BABOK", "TOGAF", "SABSA", "ZACHMAN", "FEAF", "DoDAF", "MODAF", "Custom"]
  const categories = [
    "Planning",
    "Stakeholder Management",
    "Requirements",
    "Risk Management",
    "Business Architecture",
    "Application Architecture",
    "Technology Architecture",
    "Security Architecture",
    "Data Architecture"
  ]

  const availableContextTypes = [
    "project_information",
    "project_stakeholders",
    "project_team",
    "project_charter",
    "project_scope",
    "project_objectives",
    "project_timeline",
    "project_budget",
    "requirements_docs",
    "user_stories",
    "business_case",
    "risk_register",
    "project_plans",
    "stakeholder_concerns",
    "technical_specifications",
    "user_research",
    "stakeholder_analysis"
  ]

  // Analyze prompt quality
  useEffect(() => {
    const issues: PromptQualityIssue[] = []
    
    if (!systemPrompt) {
      issues.push({
        type: "warning",
        message: "No system prompt defined. Add one for better AI guidance."
      })
    } else {
      // Check for extraction keywords
      if (systemPrompt.toLowerCase().includes("extract") || systemPrompt.toLowerCase().includes("identify")) {
        issues.push({
          type: "success",
          message: "✅ Uses extraction verbs (extract, identify) - Good!"
        })
      } else if (systemPrompt.toLowerCase().includes("generate") || systemPrompt.toLowerCase().includes("create")) {
        issues.push({
          type: "warning",
          message: "⚠️ Uses 'generate' or 'create' - may produce generic content instead of extracting project data"
        })
      }
      
      // Check for context references
      if (systemPrompt.toLowerCase().includes("context") || systemPrompt.toLowerCase().includes("project")) {
        issues.push({
          type: "success",
          message: "✅ References context/project data - Good!"
        })
      } else {
        issues.push({
          type: "warning",
          message: "⚠️ Doesn't reference context - AI may ignore provided project data"
        })
      }
      
      // Check for negative rules
      if (systemPrompt.includes("DO NOT") || systemPrompt.includes("DON'T")) {
        issues.push({
          type: "success",
          message: "✅ Includes DO NOT rules - helps prevent unwanted behavior"
        })
      } else {
        issues.push({
          type: "warning",
          message: "💡 Consider adding 'DO NOT' rules (e.g., 'DO NOT generate generic templates')"
        })
      }
      
      // Check for placeholder warnings
      if (systemPrompt.includes("placeholder") || systemPrompt.includes("[")) {
        issues.push({
          type: "error",
          message: "❌ Contains placeholders - remove these from the system prompt"
        })
      }
      
      // Check length
      if (systemPrompt.length < 100) {
        issues.push({
          type: "warning",
          message: "⚠️ System prompt is very short - consider adding more specific instructions"
        })
      } else if (systemPrompt.length > 200) {
        issues.push({
          type: "success",
          message: "✅ Comprehensive system prompt - Good detail!"
        })
      }
    }
    
    // Check context requirements
    if (contextRequirements.length === 0) {
      issues.push({
        type: "warning",
        message: "💡 No context requirements specified - consider adding what data the AI needs"
      })
    } else {
      issues.push({
        type: "success",
        message: `✅ Specified ${contextRequirements.length} context requirement(s)`
      })
    }
    
    setPromptQuality(issues)
  }, [systemPrompt, contextRequirements])

  const applyPattern = (patternKey: keyof typeof TEMPLATE_PATTERNS) => {
    const pattern = TEMPLATE_PATTERNS[patternKey]
    setSystemPrompt(pattern.systemPrompt)
    setContextRequirements(pattern.contextRequirements)
    
    // Create a default section from the pattern
    const newSection: TemplateSection = {
      id: `section_${Date.now()}`,
      title: pattern.name,
      content: pattern.content,
      order: sections.length,
      variables: [],
    }
    setSections([...sections, newSection])
    
    toast.success(`Applied ${pattern.name} pattern!`)
    setShowPatternDialog(false)
  }

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
      newSections.forEach((section, idx) => {
        section.order = idx
      })
      setSections(newSections)
    }
  }

  const toggleContextRequirement = (context: string) => {
    if (contextRequirements.includes(context)) {
      setContextRequirements(contextRequirements.filter(c => c !== context))
    } else {
      setContextRequirements([...contextRequirements, context])
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

    if (!systemPrompt.trim()) {
      toast.error("System prompt is required for AI-guided templates")
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
        system_prompt: systemPrompt,
        prompt_build_up: {
          context_requirements: contextRequirements,
          framework: templateFramework,
          category: templateCategory,
          prompt_version: 2,
          created_with: "ai_guided_template_builder"
        },
        variables: variables,
        content: {
          sections: sections,
          metadata: {
            created_with: "template_builder",
            version: "2.0",
            ai_guided: true
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
      setSystemPrompt("")
      setContextRequirements([])
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
                      <Sparkles className="h-8 w-8 text-purple-500" />
                      AI-Guided Template Builder
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Create extraction-focused templates with AI prompt engineering guidance
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Dialog open={showPatternDialog} onOpenChange={setShowPatternDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Pattern Library
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Template Pattern Library</DialogTitle>
                          <DialogDescription>
                            Pre-built templates with optimal prompt engineering for common document types
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(TEMPLATE_PATTERNS).map(([key, pattern]) => (
                            <Card key={key} className="cursor-pointer hover:border-primary transition-colors">
                              <CardHeader>
                                <CardTitle className="text-lg">{pattern.name}</CardTitle>
                                <CardDescription className="text-xs">
                                  {pattern.contextRequirements.length} context types
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                  {pattern.systemPrompt.substring(0, 100)}...
                                </p>
                                <Button 
                                  onClick={() => applyPattern(key as keyof typeof TEMPLATE_PATTERNS)}
                                  className="w-full"
                                  size="sm"
                                >
                                  <Zap className="h-4 w-4 mr-2" />
                                  Apply Pattern
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
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
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="design">
                        <FileText className="h-4 w-4 mr-2" />
                        Design
                      </TabsTrigger>
                      <TabsTrigger value="ai-prompt">
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Prompt
                      </TabsTrigger>
                      <TabsTrigger value="config">
                        <Settings className="h-4 w-4 mr-2" />
                        Configuration
                      </TabsTrigger>
                    </TabsList>

                    {/* Design Tab */}
                    <TabsContent value="design" className="space-y-6">
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
                                  placeholder="Section content (use [Extract from context] style instructions for AI)"
                                  value={section.content}
                                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSection(section.id, { content: e.target.value })}
                                  rows={8}
                                  className="font-mono text-sm"
                                />
                                
                                <div className="text-sm text-muted-foreground">
                                  💡 Tip: Use extraction instructions like "[Extract actual stakeholder names from context]" instead of placeholders
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
                    </TabsContent>

                    {/* AI Prompt Tab */}
                    <TabsContent value="ai-prompt" className="space-y-6">
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            System Prompt Engineering
                          </CardTitle>
                          <CardDescription>
                            Define how the AI should behave when generating content from this template
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Prompt Quality Feedback */}
                          {promptQuality.length > 0 && (
                            <div className="space-y-2">
                              {promptQuality.map((issue, index) => (
                                <Alert 
                                  key={index}
                                  variant={issue.type === "error" ? "destructive" : "default"}
                                  className={
                                    issue.type === "success" 
                                      ? "border-green-500 bg-green-50" 
                                      : issue.type === "warning"
                                      ? "border-yellow-500 bg-yellow-50"
                                      : ""
                                  }
                                >
                                  {issue.type === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
                                  {issue.type === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                                  {issue.type === "error" && <AlertCircle className="h-4 w-4" />}
                                  <AlertDescription className="text-sm">
                                    {issue.message}
                                  </AlertDescription>
                                </Alert>
                              ))}
                            </div>
                          )}

                          {/* System Prompt Editor */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="systemPrompt">System Prompt</Label>
                              <Badge variant="outline" className="text-xs">
                                {systemPrompt.length} characters
                              </Badge>
                            </div>
                            <Textarea
                              id="systemPrompt"
                              placeholder={`Example:
You are a PROJECT DOCUMENT ANALYST extracting stakeholder information from REAL PROJECT DATA.

CRITICAL RULES:
1. ✅ EXTRACT data from the provided project context
2. ❌ DO NOT generate generic or educational content
3. ✅ USE actual names, roles, and details from the project
4. ❌ DO NOT create hypothetical examples
5. ✅ If data is missing, state "Not available in documentation"

OUTPUT FOCUS: Real data from THIS specific project only.`}
                              value={systemPrompt}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSystemPrompt(e.target.value)}
                              rows={15}
                              className="font-mono text-sm"
                            />
                          </div>

                          {/* AI Prompt Assistant */}
                          <PromptAssistantPanel
                            currentPrompt={systemPrompt}
                            onPromptChange={setSystemPrompt}
                            templateType={templateCategory}
                            methodology={templateFramework}
                            templateVersion={2}
                            context={{
                              projectType: "general",
                              industry: "technology",
                              documentPurpose: "project documentation",
                              targetAudience: "project stakeholders"
                            }}
                          />

                          {/* Context Requirements */}
                          <div className="space-y-3">
                            <Label>Context Requirements</Label>
                            <p className="text-sm text-muted-foreground">
                              Select what project data the AI needs to extract information from
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {availableContextTypes.map((context) => (
                                <div
                                  key={context}
                                  className={`
                                    flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors
                                    ${contextRequirements.includes(context) 
                                      ? 'border-primary bg-primary/10' 
                                      : 'border-border hover:border-primary/50'
                                    }
                                  `}
                                  onClick={() => toggleContextRequirement(context)}
                                >
                                  <div className={`
                                    h-4 w-4 rounded border-2 flex items-center justify-center
                                    ${contextRequirements.includes(context) ? 'border-primary bg-primary' : 'border-muted-foreground'}
                                  `}>
                                    {contextRequirements.includes(context) && (
                                      <CheckCircle className="h-3 w-3 text-white" />
                                    )}
                                  </div>
                                  <span className="text-sm font-mono">{context}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Prompt Engineering Tips */}
                          <Alert>
                            <Lightbulb className="h-4 w-4" />
                            <AlertTitle>Prompt Engineering Best Practices</AlertTitle>
                            <AlertDescription className="mt-2 space-y-2 text-sm">
                              <div className="space-y-1">
                                <p className="font-semibold">✅ DO:</p>
                                <ul className="list-disc list-inside ml-2 space-y-1">
                                  <li>Use extraction verbs: "Extract", "Identify", "Document"</li>
                                  <li>Reference context explicitly: "from the provided documentation"</li>
                                  <li>Add DO NOT rules: "DO NOT generate generic examples"</li>
                                  <li>Specify what to do when data is missing</li>
                                </ul>
                              </div>
                              <div className="space-y-1">
                                <p className="font-semibold">❌ DON'T:</p>
                                <ul className="list-disc list-inside ml-2 space-y-1">
                                  <li>Use "generate" or "create" language (implies invention)</li>
                                  <li>Include placeholder examples in the prompt</li>
                                  <li>Be vague about data sources</li>
                                  <li>Forget to reference the project context</li>
                                </ul>
                              </div>
                            </AlertDescription>
                          </Alert>
                        </CardContent>
                      </AnimatedCard>
                    </TabsContent>

                    {/* Configuration Tab */}
                    <TabsContent value="config" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AnimatedCard>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Settings className="h-5 w-5" />
                              Template Configuration
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="name">Template Name *</Label>
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
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTemplateDescription(e.target.value)}
                                rows={3}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="framework">Framework *</Label>
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

                        <AnimatedCard>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Hash className="h-5 w-5" />
                              Variables (Optional)
                            </CardTitle>
                            <CardDescription>
                              Define dynamic variables for manual data entry
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
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
