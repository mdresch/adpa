"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
    Sparkles, 
    Lightbulb, 
    CheckCircle, 
    AlertCircle, 
    Clock,
    Target,
    Zap,
    Brain,
    FileText,
    TrendingUp,
    Users,
    Settings,
    RefreshCw,
    ThumbsUp,
    ThumbsDown
} from "@/components/ui/icons-shim"
import { apiClient } from "@/lib/api"
import { toast } from "@/lib/notify"

interface AIPlaybookAssistantProps {
    open: boolean
    onClose: () => void
    onPlaybookGenerated?: (playbook: any) => void
}

interface AISuggestion {
    id: string
    type: 'title' | 'description' | 'step' | 'scenario' | 'category' | 'improvement'
    content: string
    confidence: number
    reasoning: string
    applied: boolean
}

interface AIAnalysis {
    summary: string
    recommendations: AISuggestion[]
    similarPlaybooks: any[]
    estimatedComplexity: 'low' | 'medium' | 'high'
    estimatedDuration: number
    requiredRoles: string[]
    potentialRisks: string[]
}

export function AIPlaybookAssistant({ open, onClose, onPlaybookGenerated }: AIPlaybookAssistantProps) {
    const [inputContext, setInputContext] = useState("")
    const [analysisType, setAnalysisType] = useState<"create" | "improve" | "optimize">("create")
    const [analyzing, setAnalyzing] = useState(false)
    const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
    const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())
    const [generatedPlaybook, setGeneratedPlaybook] = useState<any>(null)
    const [feedback, setFeedback] = useState<{ [key: string]: 'good' | 'bad' }>({})

    const analysisTypes = [
        { value: "create", label: "Create New", description: "Generate a complete playbook from scratch" },
        { value: "improve", label: "Improve Existing", description: "Enhance an existing playbook" },
        { value: "optimize", label: "Optimize Performance", description: "Optimize for better success rates" }
    ]

    const mockAnalysis: AIAnalysis = {
        summary: "Based on your input, I recommend creating a risk mitigation playbook with 4-6 steps focused on technical issues. The playbook should include stakeholder notifications and documentation requirements.",
        recommendations: [
            {
                id: "1",
                type: "title",
                content: "Technical Risk Mitigation Protocol",
                confidence: 92,
                reasoning: "This title clearly communicates the purpose and scope of the playbook",
                applied: false
            },
            {
                id: "2",
                type: "description",
                content: "A comprehensive playbook for identifying, assessing, and mitigating technical risks in software projects. Includes stakeholder communication, impact analysis, and resolution tracking.",
                confidence: 88,
                reasoning: "Provides clear scope and expected outcomes",
                applied: false
            },
            {
                id: "3",
                type: "step",
                content: "Risk Identification - Analyze the technical issue and categorize by severity and impact",
                confidence: 95,
                reasoning: "First step should focus on proper risk assessment",
                applied: false
            },
            {
                id: "4",
                type: "step",
                content: "Stakeholder Notification - Inform relevant team members and stakeholders about the risk",
                confidence: 90,
                reasoning: "Communication is critical for risk management",
                applied: false
            },
            {
                id: "5",
                type: "step",
                content: "Mitigation Planning - Develop and document specific mitigation strategies",
                confidence: 93,
                reasoning: "Structured approach to risk resolution",
                applied: false
            },
            {
                id: "6",
                type: "step",
                content: "Implementation - Execute mitigation plan with proper change management",
                confidence: 91,
                reasoning: "Ensure controlled implementation of fixes",
                applied: false
            },
            {
                id: "7",
                type: "step",
                content: "Documentation - Record all actions, decisions, and outcomes for future reference",
                confidence: 87,
                reasoning: "Documentation supports continuous improvement",
                applied: false
            },
            {
                id: "8",
                type: "category",
                content: "risk",
                confidence: 96,
                reasoning: "Based on the technical nature of the described issues",
                applied: false
            }
        ],
        similarPlaybooks: [
            { title: "Critical Risk Response", success_rate: 95, executions: 23 },
            { title: "Technical Incident Triage", success_rate: 89, executions: 18 }
        ],
        estimatedComplexity: "medium",
        estimatedDuration: 48,
        requiredRoles: ["technical_lead", "risk_analyst", "project_manager"],
        potentialRisks: ["Stakeholder resistance", "Resource constraints", "Timeline delays"]
    }

    const handleAnalyze = async () => {
        if (!inputContext.trim()) {
            toast.error("Please provide context for the AI to analyze")
            return
        }

        try {
            setAnalyzing(true)
            
            // Simulate AI analysis delay
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            // Mock AI analysis - would call AI service
            setAnalysis(mockAnalysis)
            toast.success("AI analysis completed successfully")
        } catch (error) {
            toast.error("Failed to analyze with AI")
        } finally {
            setAnalyzing(false)
        }
    }

    const handleApplySuggestion = (suggestionId: string) => {
        setSelectedSuggestions(prev => {
            const newSet = new Set(prev)
            if (newSet.has(suggestionId)) {
                newSet.delete(suggestionId)
            } else {
                newSet.add(suggestionId)
            }
            return newSet
        })
    }

    const handleGeneratePlaybook = async () => {
        if (!analysis || selectedSuggestions.size === 0) {
            toast.error("Please select at least one suggestion to include")
            return
        }

        try {
            setAnalyzing(true)
            
            // Build playbook from selected suggestions
            const appliedSuggestions = analysis.recommendations.filter(s => selectedSuggestions.has(s.id))
            
            const playbook = {
                title: appliedSuggestions.find(s => s.type === 'title')?.content || "AI-Generated Playbook",
                description: appliedSuggestions.find(s => s.type === 'description')?.content || "",
                category: appliedSuggestions.find(s => s.type === 'category')?.content || "risk",
                trigger_type: "manual",
                applicable_risk_categories: ["technical"],
                applicable_severity_levels: ["high", "critical"],
                applicable_priority_levels: ["high", "critical"],
                steps: appliedSuggestions
                    .filter(s => s.type === 'step')
                    .map((s, index) => ({
                        id: `step-${index + 1}`,
                        step_order: index + 1,
                        step_title: s.content.split(" - ")[0],
                        step_description: s.content.split(" - ")[1] || s.content,
                        step_type: "action",
                        assigned_role: analysis.requiredRoles[0],
                        sla_hours: Math.round(analysis.estimatedDuration / appliedSuggestions.filter(s => s.type === 'step').length),
                        step_config: {}
                    })),
                is_active: true,
                ai_generated: true,
                ai_confidence: Math.round(appliedSuggestions.reduce((acc, s) => acc + s.confidence, 0) / appliedSuggestions.length)
            }

            setGeneratedPlaybook(playbook)
            toast.success("Playbook generated successfully!")
        } catch (error) {
            toast.error("Failed to generate playbook")
        } finally {
            setAnalyzing(false)
        }
    }

    const handleSavePlaybook = async () => {
        if (!generatedPlaybook) return

        try {
            const response = await apiClient.createPlaybook(generatedPlaybook)
            toast.success("AI-generated playbook saved successfully!")
            onPlaybookGenerated?.(response.playbook)
            onClose()
            resetAssistant()
        } catch (error: any) {
            toast.error(error.message || "Failed to save playbook")
        }
    }

    const handleFeedback = (suggestionId: string, type: 'good' | 'bad') => {
        setFeedback(prev => ({ ...prev, [suggestionId]: type }))
        // In a real implementation, this would send feedback to improve the AI
        toast.info("Thank you for your feedback!")
    }

    const resetAssistant = () => {
        setInputContext("")
        setAnalysisType("create")
        setAnalysis(null)
        setSelectedSuggestions(new Set())
        setGeneratedPlaybook(null)
        setFeedback({})
    }

    const getSuggestionIcon = (type: string) => {
        switch (type) {
            case 'title': return <FileText className="h-4 w-4" />
            case 'description': return <FileText className="h-4 w-4" />
            case 'step': return <Target className="h-4 w-4" />
            case 'scenario': return <Zap className="h-4 w-4" />
            case 'category': return <Settings className="h-4 w-4" />
            case 'improvement': return <TrendingUp className="h-4 w-4" />
            default: return <Lightbulb className="h-4 w-4" />
        }
    }

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 90) return "text-green-600"
        if (confidence >= 75) return "text-yellow-600"
        return "text-red-600"
    }

    const getComplexityColor = (complexity: string) => {
        switch (complexity) {
            case 'low': return "text-green-600"
            case 'medium': return "text-yellow-600"
            case 'high': return "text-red-600"
            default: return "text-gray-600"
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-600" />
                        AI Playbook Assistant
                    </DialogTitle>
                    <DialogDescription>
                        Generate and optimize playbooks using AI-powered recommendations
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Input Section */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="context">Context Description</Label>
                                <Textarea
                                    id="context"
                                    value={inputContext}
                                    onChange={(e) => setInputContext(e.target.value)}
                                    placeholder="Describe the issue type, common scenarios, team structure, or paste existing playbook content..."
                                    rows={4}
                                    className="resize-none"
                                />
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="analysis-type">Analysis Type</Label>
                                    <Select value={analysisType} onValueChange={(value: any) => setAnalysisType(value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {analysisTypes.map(type => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    <div>
                                                        <div className="font-medium">{type.label}</div>
                                                        <div className="text-xs text-muted-foreground">{type.description}</div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button 
                                    onClick={handleAnalyze} 
                                    disabled={analyzing || !inputContext.trim()}
                                    className="w-full"
                                >
                                    {analyzing ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Analyze
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {analysis && (
                        <>
                            <Separator />
                            
                            {/* Analysis Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Brain className="h-5 w-5 text-blue-600" />
                                        AI Analysis Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm">{analysis.summary}</p>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <div className={`text-lg font-bold ${getComplexityColor(analysis.estimatedComplexity)}`}>
                                                {analysis.estimatedComplexity}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Complexity</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold">{analysis.estimatedDuration}h</div>
                                            <div className="text-xs text-muted-foreground">Est. Duration</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold">{analysis.recommendations.length}</div>
                                            <div className="text-xs text-muted-foreground">Suggestions</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold">{analysis.requiredRoles.length}</div>
                                            <div className="text-xs text-muted-foreground">Required Roles</div>
                                        </div>
                                    </div>

                                    {analysis.similarPlaybooks.length > 0 && (
                                        <div>
                                            <Label className="text-sm font-medium">Similar Playbooks</Label>
                                            <div className="space-y-2 mt-2">
                                                {analysis.similarPlaybooks.map((playbook, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                                                        <div>
                                                            <div className="text-sm font-medium">{playbook.title}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {playbook.success_rate}% success rate • {playbook.executions} executions
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline">Reference</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* AI Recommendations */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                                        AI Recommendations
                                    </CardTitle>
                                    <CardDescription>
                                        Select suggestions to include in your playbook
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {analysis.recommendations.map((suggestion) => (
                                        <div 
                                            key={suggestion.id}
                                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                                selectedSuggestions.has(suggestion.id) 
                                                    ? 'border-blue-200 bg-blue-50' 
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                            onClick={() => handleApplySuggestion(suggestion.id)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className="flex-shrink-0 mt-1">
                                                        {getSuggestionIcon(suggestion.type)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="outline" className="text-xs">
                                                                {suggestion.type}
                                                            </Badge>
                                                            <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                                                                {suggestion.confidence}% confidence
                                                            </span>
                                                        </div>
                                                        <p className="text-sm">{suggestion.content}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {suggestion.reasoning}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 ml-4">
                                                    <div className={`w-4 h-4 rounded border-2 ${
                                                        selectedSuggestions.has(suggestion.id)
                                                            ? 'border-blue-500 bg-blue-500'
                                                            : 'border-gray-300'
                                                    }`}>
                                                        {selectedSuggestions.has(suggestion.id) && (
                                                            <CheckCircle className="h-3 w-3 text-white m-auto" />
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleFeedback(suggestion.id, 'good')
                                                            }}
                                                            className={`p-1 ${feedback[suggestion.id] === 'good' ? 'text-green-600' : 'text-gray-400'}`}
                                                        >
                                                            <ThumbsUp className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleFeedback(suggestion.id, 'bad')
                                                            }}
                                                            className={`p-1 ${feedback[suggestion.id] === 'bad' ? 'text-red-600' : 'text-gray-400'}`}
                                                        >
                                                            <ThumbsDown className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Generated Playbook Preview */}
                            {generatedPlaybook && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                            Generated Playbook Preview
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div>
                                                <Label className="text-sm font-medium">Title</Label>
                                                <p className="text-sm">{generatedPlaybook.title}</p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Description</Label>
                                                <p className="text-sm text-muted-foreground">{generatedPlaybook.description}</p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Steps ({generatedPlaybook.steps.length})</Label>
                                                <div className="space-y-2 mt-2">
                                                    {generatedPlaybook.steps.map((step: any, index: number) => (
                                                        <div key={step.id} className="flex items-start gap-3 p-2 border rounded">
                                                            <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                                                                {index + 1}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="text-sm font-medium">{step.step_title}</div>
                                                                <div className="text-xs text-muted-foreground">{step.step_description}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <div>
                                                    <span className="font-medium">AI Confidence:</span>
                                                    <span className={getConfidenceColor(generatedPlaybook.ai_confidence)}>
                                                        {generatedPlaybook.ai_confidence}%
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium">Category:</span>
                                                    <Badge variant="outline">{generatedPlaybook.category}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">
                                    {selectedSuggestions.size} of {analysis.recommendations.length} suggestions selected
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" onClick={resetAssistant}>
                                        Reset
                                    </Button>
                                    {!generatedPlaybook ? (
                                        <Button 
                                            onClick={handleGeneratePlaybook}
                                            disabled={selectedSuggestions.size === 0 || analyzing}
                                        >
                                            {analyzing ? (
                                                <>
                                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-4 w-4 mr-2" />
                                                    Generate Playbook
                                                </>
                                            )}
                                        </Button>
                                    ) : (
                                        <Button onClick={handleSavePlaybook}>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Save Playbook
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
