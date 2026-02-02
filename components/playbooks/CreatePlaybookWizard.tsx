"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { 
    ChevronRight, 
    ChevronLeft, 
    Plus, 
    Trash2, 
    GripVertical,
    Clock,
    Users,
    AlertTriangle,
    CheckCircle,
    Target,
    Zap,
    Lightbulb,
    FileText,
    Settings
} from "@/components/ui/icons-shim"
import { apiClient } from "@/lib/api"
import { toast } from "@/lib/notify"

interface PlaybookStep {
    id: string
    step_order: number
    step_title: string
    step_description: string
    step_type: 'action' | 'approval' | 'notification' | 'escalation' | 'documentation' | 'wait'
    assigned_role?: string
    sla_hours?: number
    step_config: Record<string, any>
}

interface PlaybookScenario {
    id: string
    scenario_condition: Record<string, any>
    trigger_type: 'auto' | 'manual'
    priority: number
    description?: string
}

interface CreatePlaybookWizardProps {
    open: boolean
    onClose: () => void
    onSuccess?: (playbook: any) => void
}

export function CreatePlaybookWizard({ open, onClose, onSuccess }: CreatePlaybookWizardProps) {
    const [currentStep, setCurrentStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [useTemplate, setUseTemplate] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState("")
    const [aiAssist, setAiAssist] = useState(false)
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([])

    // Basic Info
    const [basicInfo, setBasicInfo] = useState({
        title: "",
        description: "",
        category: "risk" as const,
        trigger_type: "manual" as const,
        is_active: true
    })

    // Applicability
    const [applicability, setApplicability] = useState({
        applicable_risk_categories: [] as string[],
        applicable_severity_levels: [] as string[],
        applicable_priority_levels: [] as string[],
        project_ids: [] as string[]
    })

    // Scenarios
    const [scenarios, setScenarios] = useState<PlaybookScenario[]>([])

    // Steps
    const [steps, setSteps] = useState<PlaybookStep[]>([
        {
            id: "step-1",
            step_order: 1,
            step_title: "Initial Assessment",
            step_description: "Assess the issue and gather initial information",
            step_type: "action",
            assigned_role: "analyst",
            sla_hours: 4,
            step_config: {}
        }
    ])

    const totalSteps = 5

    const stepTitles = [
        "Basic Information",
        "Applicability Rules", 
        "Trigger Scenarios",
        "Response Steps",
        "Review & Create"
    ]

    const templates = [
        { id: "risk-mitigation", name: "Risk Mitigation", category: "risk", description: "Standard risk response playbook" },
        { id: "incident-response", name: "Incident Response", category: "incident", description: "IT incident management" },
        { id: "escalation", name: "Escalation Protocol", category: "escalation", description: "Issue escalation procedures" },
        { id: "resolution", name: "Resolution Template", category: "resolution", description: "General issue resolution" }
    ]

    const riskCategories = [
        "technical", "resource", "schedule", "communication", 
        "quality", "external", "scope", "budget", "other"
    ]

    const severityLevels = ["critical", "high", "medium", "low"]
    const priorityLevels = ["critical", "high", "medium", "low"]

    const stepTypes = [
        { value: "action", label: "Action", icon: Target },
        { value: "approval", label: "Approval", icon: CheckCircle },
        { value: "notification", label: "Notification", icon: Users },
        { value: "escalation", label: "Escalation", icon: AlertTriangle },
        { value: "documentation", label: "Documentation", icon: FileText },
        { value: "wait", label: "Wait", icon: Clock }
    ]

    const handleNext = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleCreatePlaybook = async () => {
        try {
            setLoading(true)
            
            const playbookData = {
                ...basicInfo,
                ...applicability,
                scenarios,
                steps
            }

            const response = await apiClient.createPlaybook(playbookData)
            toast.success("Playbook created successfully!")
            onSuccess?.(response.playbook)
            onClose()
            resetWizard()
        } catch (error: any) {
            toast.error(error.message || "Failed to create playbook")
        } finally {
            setLoading(false)
        }
    }

    const resetWizard = () => {
        setCurrentStep(1)
        setBasicInfo({
            title: "",
            description: "",
            category: "risk",
            trigger_type: "manual",
            is_active: true
        })
        setApplicability({
            applicable_risk_categories: [],
            applicable_severity_levels: [],
            applicable_priority_levels: [],
            project_ids: []
        })
        setScenarios([])
        setSteps([{
            id: "step-1",
            step_order: 1,
            step_title: "Initial Assessment",
            step_description: "Assess the issue and gather initial information",
            step_type: "action",
            assigned_role: "analyst",
            sla_hours: 4,
            step_config: {}
        }])
        setUseTemplate(false)
        setSelectedTemplate("")
        setAiAssist(false)
    }

    const addStep = () => {
        const newStep: PlaybookStep = {
            id: `step-${steps.length + 1}`,
            step_order: steps.length + 1,
            step_title: "",
            step_description: "",
            step_type: "action",
            assigned_role: "",
            sla_hours: 24,
            step_config: {}
        }
        setSteps([...steps, newStep])
    }

    const removeStep = (stepId: string) => {
        setSteps(steps.filter(s => s.id !== stepId).map((s, index) => ({ ...s, step_order: index + 1 })))
    }

    const updateStep = (stepId: string, updates: Partial<PlaybookStep>) => {
        setSteps(steps.map(s => s.id === stepId ? { ...s, ...updates } : s))
    }

    const addScenario = () => {
        const newScenario: PlaybookScenario = {
            id: `scenario-${scenarios.length + 1}`,
            scenario_condition: {},
            trigger_type: "manual",
            priority: 1,
            description: ""
        }
        setScenarios([...scenarios, newScenario])
    }

    const removeScenario = (scenarioId: string) => {
        setScenarios(scenarios.filter(s => s.id !== scenarioId))
    }

    const updateScenario = (scenarioId: string, updates: Partial<PlaybookScenario>) => {
        setScenarios(scenarios.map(s => s.id === scenarioId ? { ...s, ...updates } : s))
    }

    const loadTemplate = async (templateId: string) => {
        try {
            // Mock template loading - would fetch from API
            const template = templates.find(t => t.id === templateId)
            if (template) {
                setBasicInfo(prev => ({
                    ...prev,
                    category: template.category as any,
                    title: template.name,
                    description: template.description
                }))
                
                // Load template steps
                if (templateId === "risk-mitigation") {
                    setSteps([
                        {
                            id: "step-1",
                            step_order: 1,
                            step_title: "Risk Assessment",
                            step_description: "Analyze the risk and determine impact",
                            step_type: "action",
                            assigned_role: "risk_analyst",
                            sla_hours: 8,
                            step_config: {}
                        },
                        {
                            id: "step-2",
                            step_order: 2,
                            step_title: "Mitigation Planning",
                            step_description: "Develop and document mitigation strategies",
                            step_type: "action",
                            assigned_role: "risk_analyst",
                            sla_hours: 16,
                            step_config: {}
                        },
                        {
                            id: "step-3",
                            step_order: 3,
                            step_title: "Implementation",
                            step_description: "Execute mitigation plan",
                            step_type: "action",
                            assigned_role: "project_manager",
                            sla_hours: 24,
                            step_config: {}
                        }
                    ])
                }
            }
        } catch (error) {
            toast.error("Failed to load template")
        }
    }

    const generateAISuggestions = async () => {
        try {
            setLoading(true)
            // Mock AI suggestions - would call AI service
            const suggestions = [
                {
                    title: "Add approval step for high-impact changes",
                    description: "Consider adding a management approval step for changes with high business impact",
                    type: "step"
                },
                {
                    title: "Include stakeholder notification",
                    description: "Add notifications to key stakeholders when playbook is triggered",
                    type: "step"
                },
                {
                    title: "Add documentation requirement",
                    description: "Include a step to document all actions taken during resolution",
                    type: "step"
                }
            ]
            setAiSuggestions(suggestions)
        } catch (error) {
            toast.error("Failed to generate AI suggestions")
        } finally {
            setLoading(false)
        }
    }

    const applyAISuggestion = (suggestion: any) => {
        if (suggestion.type === "step") {
            addStep()
            const newStepId = `step-${steps.length + 1}`
            updateStep(newStepId, {
                step_title: suggestion.title,
                step_description: suggestion.description,
                step_type: "action"
            })
        }
        setAiSuggestions(aiSuggestions.filter(s => s !== suggestion))
    }

    const isStepValid = () => {
        switch (currentStep) {
            case 1:
                return basicInfo.title.trim() !== "" && basicInfo.category
            case 2:
                return true // Applicability rules are optional
            case 3:
                return true // Scenarios are optional
            case 4:
                return steps.every(s => s.step_title.trim() !== "")
            case 5:
                return true // Review step
            default:
                return false
        }
    }

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Switch
                                    id="use-template"
                                    checked={useTemplate}
                                    onCheckedChange={setUseTemplate}
                                />
                                <Label htmlFor="use-template" className="text-base font-medium">
                                    Start from template
                                </Label>
                            </div>
                            
                            {useTemplate && (
                                <div className="space-y-2">
                                    <Label htmlFor="template">Select Template</Label>
                                    <Select value={selectedTemplate} onValueChange={(value) => {
                                        setSelectedTemplate(value)
                                        loadTemplate(value)
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map(template => (
                                                <SelectItem key={template.id} value={template.id}>
                                                    <div>
                                                        <div className="font-medium">{template.name}</div>
                                                        <div className="text-sm text-muted-foreground">{template.description}</div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    value={basicInfo.title}
                                    onChange={(e) => setBasicInfo(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Enter playbook title"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={basicInfo.description}
                                    onChange={(e) => setBasicInfo(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Describe when and how this playbook should be used"
                                    rows={3}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category *</Label>
                                    <Select
                                        value={basicInfo.category}
                                        onValueChange={(value) => setBasicInfo(prev => ({ ...prev, category: value as any }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="risk">Risk</SelectItem>
                                            <SelectItem value="incident">Incident</SelectItem>
                                            <SelectItem value="escalation">Escalation</SelectItem>
                                            <SelectItem value="resolution">Resolution</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="trigger-type">Trigger Type</Label>
                                    <Select
                                        value={basicInfo.trigger_type}
                                        onValueChange={(value) => setBasicInfo(prev => ({ ...prev, trigger_type: value as any }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select trigger type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual">Manual</SelectItem>
                                            <SelectItem value="auto">Auto</SelectItem>
                                            <SelectItem value="threshold">Threshold</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="is-active"
                                    checked={basicInfo.is_active}
                                    onCheckedChange={(checked) => setBasicInfo(prev => ({ ...prev, is_active: checked }))}
                                />
                                <Label htmlFor="is-active">Active</Label>
                            </div>
                        </div>
                    </div>
                )

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <Label className="text-base font-medium">Risk Categories</Label>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Select which risk categories this playbook applies to
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    {riskCategories.map(category => (
                                        <div key={category} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={`risk-${category}`}
                                                checked={applicability.applicable_risk_categories.includes(category)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setApplicability(prev => ({
                                                            ...prev,
                                                            applicable_risk_categories: [...prev.applicable_risk_categories, category]
                                                        }))
                                                    } else {
                                                        setApplicability(prev => ({
                                                            ...prev,
                                                            applicable_risk_categories: prev.applicable_risk_categories.filter(c => c !== category)
                                                        }))
                                                    }
                                                }}
                                                className="rounded"
                                            />
                                            <Label htmlFor={`risk-${category}`} className="text-sm capitalize">
                                                {category}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="text-base font-medium">Severity Levels</Label>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Which severity levels should trigger this playbook?
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {severityLevels.map(severity => (
                                        <div key={severity} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={`severity-${severity}`}
                                                checked={applicability.applicable_severity_levels.includes(severity)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setApplicability(prev => ({
                                                            ...prev,
                                                            applicable_severity_levels: [...prev.applicable_severity_levels, severity]
                                                        }))
                                                    } else {
                                                        setApplicability(prev => ({
                                                            ...prev,
                                                            applicable_severity_levels: prev.applicable_severity_levels.filter(s => s !== severity)
                                                        }))
                                                    }
                                                }}
                                                className="rounded"
                                            />
                                            <Label htmlFor={`severity-${severity}`} className="text-sm capitalize">
                                                {severity}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="text-base font-medium">Priority Levels</Label>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Which priority levels should trigger this playbook?
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {priorityLevels.map(priority => (
                                        <div key={priority} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={`priority-${priority}`}
                                                checked={applicability.applicable_priority_levels.includes(priority)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setApplicability(prev => ({
                                                            ...prev,
                                                            applicable_priority_levels: [...prev.applicable_priority_levels, priority]
                                                        }))
                                                    } else {
                                                        setApplicability(prev => ({
                                                            ...prev,
                                                            applicable_priority_levels: prev.applicable_priority_levels.filter(p => p !== priority)
                                                        }))
                                                    }
                                                }}
                                                className="rounded"
                                            />
                                            <Label htmlFor={`priority-${priority}`} className="text-sm capitalize">
                                                {priority}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="text-base font-medium">Project Scope</Label>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Leave empty to apply to all projects, or specify project IDs
                                </p>
                                <Input
                                    placeholder="Enter project IDs (comma-separated)"
                                    value={applicability.project_ids.join(", ")}
                                    onChange={(e) => setApplicability(prev => ({
                                        ...prev,
                                        project_ids: e.target.value.split(",").map(id => id.trim()).filter(Boolean)
                                    }))}
                                />
                            </div>
                        </div>
                    </div>
                )

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-base font-medium">Trigger Scenarios</Label>
                                <p className="text-sm text-muted-foreground">
                                    Define specific conditions that trigger this playbook
                                </p>
                            </div>
                            <Button onClick={addScenario} variant="outline" size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Scenario
                            </Button>
                        </div>

                        {scenarios.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium">No scenarios defined</h3>
                                <p className="text-muted-foreground mb-4">
                                    Scenarios are optional. Skip this step if you want to use basic applicability rules.
                                </p>
                                <Button onClick={addScenario} variant="outline">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add First Scenario
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {scenarios.map((scenario, index) => (
                                    <Card key={scenario.id}>
                                        <CardContent className="pt-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">Scenario {index + 1}</span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeScenario(scenario.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Trigger Type</Label>
                                                        <Select
                                                            value={scenario.trigger_type}
                                                            onValueChange={(value) => updateScenario(scenario.id, { trigger_type: value as any })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="manual">Manual</SelectItem>
                                                                <SelectItem value="auto">Auto</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <Label>Priority</Label>
                                                        <Input
                                                            type="number"
                                                            value={scenario.priority}
                                                            onChange={(e) => updateScenario(scenario.id, { priority: parseInt(e.target.value) || 1 })}
                                                            min="1"
                                                            max="10"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <Label>Description</Label>
                                                    <Textarea
                                                        value={scenario.description || ""}
                                                        onChange={(e) => updateScenario(scenario.id, { description: e.target.value })}
                                                        placeholder="Describe when this scenario should trigger"
                                                        rows={2}
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-base font-medium">Response Steps</Label>
                                <p className="text-sm text-muted-foreground">
                                    Define the sequence of actions for this playbook
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAiAssist(!aiAssist)}
                                    className={aiAssist ? "bg-blue-50 border-blue-200" : ""}
                                >
                                    <Lightbulb className="h-4 w-4 mr-2" />
                                    AI Assist
                                </Button>
                                <Button onClick={addStep} variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Step
                                </Button>
                            </div>
                        </div>

                        {aiAssist && (
                            <Card className="border-blue-200 bg-blue-50">
                                <CardContent className="pt-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="text-base font-medium flex items-center gap-2">
                                                    <Zap className="h-4 w-4 text-blue-600" />
                                                    AI Suggestions
                                                </Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Get AI-powered recommendations for your playbook steps
                                                </p>
                                            </div>
                                            <Button onClick={generateAISuggestions} disabled={loading} size="sm">
                                                {loading ? "Generating..." : "Generate Suggestions"}
                                            </Button>
                                        </div>
                                        
                                        {aiSuggestions.length > 0 && (
                                            <div className="space-y-2">
                                                {aiSuggestions.map((suggestion, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                                        <div>
                                                            <p className="font-medium text-sm">{suggestion.title}</p>
                                                            <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => applyAISuggestion(suggestion)}
                                                        >
                                                            Apply
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div className="space-y-4">
                            {steps.map((step, index) => (
                                <Card key={step.id}>
                                    <CardContent className="pt-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">Step {index + 1}</span>
                                                    <Badge variant="outline">{step.step_type}</Badge>
                                                </div>
                                                {steps.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeStep(step.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Step Title *</Label>
                                                    <Input
                                                        value={step.step_title}
                                                        onChange={(e) => updateStep(step.id, { step_title: e.target.value })}
                                                        placeholder="Enter step title"
                                                    />
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <Label>Step Type</Label>
                                                    <Select
                                                        value={step.step_type}
                                                        onValueChange={(value) => updateStep(step.id, { step_type: value as any })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {stepTypes.map(type => (
                                                                <SelectItem key={type.value} value={type.value}>
                                                                    <div className="flex items-center gap-2">
                                                                        <type.icon className="h-4 w-4" />
                                                                        {type.label}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label>Description</Label>
                                                <Textarea
                                                    value={step.step_description}
                                                    onChange={(e) => updateStep(step.id, { step_description: e.target.value })}
                                                    placeholder="Describe what should be done in this step"
                                                    rows={2}
                                                />
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Assigned Role</Label>
                                                    <Input
                                                        value={step.assigned_role || ""}
                                                        onChange={(e) => updateStep(step.id, { assigned_role: e.target.value })}
                                                        placeholder="e.g., analyst, manager"
                                                    />
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <Label>SLA (hours)</Label>
                                                    <Input
                                                        type="number"
                                                        value={step.sla_hours || ""}
                                                        onChange={(e) => updateStep(step.id, { sla_hours: parseInt(e.target.value) || undefined })}
                                                        placeholder="Optional"
                                                    />
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <Label>Configuration</Label>
                                                    <Input
                                                        value={JSON.stringify(step.step_config)}
                                                        onChange={(e) => {
                                                            try {
                                                                updateStep(step.id, { step_config: JSON.parse(e.target.value) })
                                                            } catch {
                                                                // Invalid JSON, ignore
                                                            }
                                                        }}
                                                        placeholder="JSON config (optional)"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )

            case 5:
                return (
                    <div className="space-y-6">
                        <div>
                            <Label className="text-base font-medium">Review & Create</Label>
                            <p className="text-sm text-muted-foreground">
                                Review your playbook configuration before creating
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">{basicInfo.title}</CardTitle>
                                    <CardDescription>{basicInfo.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium">Category:</span> {basicInfo.category}
                                        </div>
                                        <div>
                                            <span className="font-medium">Trigger Type:</span> {basicInfo.trigger_type}
                                        </div>
                                        <div>
                                            <span className="font-medium">Status:</span> {basicInfo.is_active ? "Active" : "Inactive"}
                                        </div>
                                        <div>
                                            <span className="font-medium">Steps:</span> {steps.length}
                                        </div>
                                    </div>
                                    
                                    {applicability.applicable_risk_categories.length > 0 && (
                                        <div>
                                            <span className="font-medium text-sm">Risk Categories:</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {applicability.applicable_risk_categories.map(cat => (
                                                    <Badge key={cat} variant="secondary" className="text-xs">
                                                        {cat}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {applicability.applicable_severity_levels.length > 0 && (
                                        <div>
                                            <span className="font-medium text-sm">Severity Levels:</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {applicability.applicable_severity_levels.map(level => (
                                                    <Badge key={level} variant="secondary" className="text-xs">
                                                        {level}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Response Steps Preview</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {steps.map((step, index) => (
                                            <div key={step.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-medium text-sm">{step.step_title}</h4>
                                                        <Badge variant="outline" className="text-xs">
                                                            {step.step_type}
                                                        </Badge>
                                                        {step.assigned_role && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                {step.assigned_role}
                                                            </Badge>
                                                        )}
                                                        {step.sla_hours && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {step.sla_hours}h SLA
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {step.step_description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Playbook</DialogTitle>
                    <DialogDescription>
                        Build a comprehensive playbook for issue resolution
                    </DialogDescription>
                </DialogHeader>

                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-6">
                    {stepTitles.map((title, index) => (
                        <div key={index} className="flex items-center">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                                index + 1 === currentStep
                                    ? "bg-primary text-primary-foreground"
                                    : index + 1 < currentStep
                                    ? "bg-green-500 text-white"
                                    : "bg-gray-200 text-gray-600"
                            }`}>
                                {index + 1 < currentStep ? "✓" : index + 1}
                            </div>
                            <div className={`ml-2 text-sm ${
                                index + 1 === currentStep ? "text-primary font-medium" : "text-muted-foreground"
                            }`}>
                                {title}
                            </div>
                            {index < stepTitles.length - 1 && (
                                <div className={`mx-4 h-px w-8 ${
                                    index + 1 < currentStep ? "bg-green-500" : "bg-gray-200"
                                }`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="min-h-[400px]">
                    {renderStepContent()}
                </div>

                {/* Navigation */}
                <DialogFooter>
                    <div className="flex items-center justify-between w-full">
                        <Button
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={currentStep === 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Previous
                        </Button>
                        
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            {currentStep === totalSteps ? (
                                <Button onClick={handleCreatePlaybook} disabled={!isStepValid() || loading}>
                                    {loading ? "Creating..." : "Create Playbook"}
                                </Button>
                            ) : (
                                <Button onClick={handleNext} disabled={!isStepValid()}>
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
