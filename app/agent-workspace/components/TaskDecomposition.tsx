"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Loader2, Wand2, CheckCircle2, AlertCircle, Trash2, Plus, Layers } from "lucide-react"
import { apiClient } from "@/lib/api"
import { toast } from "@/lib/notify"

export function TaskDecomposition() {
  const [goalTitle, setGoalTitle] = useState("")
  const [goalDescription, setGoalDescription] = useState("")
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [autoDecompose, setAutoDecompose] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastCreatedGoal, setLastCreatedGoal] = useState<any>(null)
  const [decomposedTasks, setDecomposedTasks] = useState<any[]>([])

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await apiClient.getProjects()
        // Assuming response structure based on common patterns in the app
        setProjects(response.projects || [])
        if (response.projects?.length > 0) {
          setSelectedProjectId(response.projects[0].id)
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error)
      }
    }
    fetchProjects()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goalTitle || !selectedProjectId) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Create the goal
      const goalResponse: any = await apiClient.post("/goals", {
        title: goalTitle,
        description: goalDescription,
        projectId: selectedProjectId
      })

      const newGoal = goalResponse.data
      setLastCreatedGoal(newGoal)
      toast.success("Goal created successfully")

      // 2. Decompose if requested
      if (autoDecompose) {
        toast.info("AI is decomposing your goal into tasks...")
        const decomposeResponse: any = await apiClient.post(`/goals/${newGoal.id}/decompose`)
        setDecomposedTasks(decomposeResponse.data || [])
        toast.success(`Generated ${decomposeResponse.data?.length || 0} sub-tasks`)
      }
    } catch (error: any) {
      console.error("Task decomposition failed:", error)
      toast.error(error.message || "Failed to process goal")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="border-none shadow-xl bg-background/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-primary" />
            <span>Define New Objective</span>
          </CardTitle>
          <CardDescription>
            High-level goals are automatically structuralized into actionable project tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="project">Project Context</Label>
              <select
                id="project"
                value={selectedProjectId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProjectId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background/50 focus:ring-2 focus:ring-primary outline-none transition-all"
                required
              >
                <option value="" disabled>Select a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Goal Title</Label>
              <Input
                id="title"
                placeholder="e.g., Implement OAuth2 Authentication"
                value={goalTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoalTitle(e.target.value)}
                className="bg-background/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Detailed Context (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe the desired outcome and any specific requirements..."
                value={goalDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGoalDescription(e.target.value)}
                className="min-h-[120px] bg-background/50"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="space-y-0.5">
                <Label className="text-base">AI Strategy Planning</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically decompose this goal into milestones and tasks.
                </p>
              </div>
              <Switch
                checked={autoDecompose}
                onCheckedChange={setAutoDecompose}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-5 w-5" />
                  Initialize Objective
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {isSubmitting && !decomposedTasks.length && (
          <Card className="border-dashed h-full flex items-center justify-center bg-muted/30">
            <div className="text-center space-y-4 p-12">
              <div className="relative inline-block">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20"></div>
                <div className="relative h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Architecting Your Project...</h3>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  Our Reasoning Model is analyzing your goal and mapping out required resources and steps.
                </p>
              </div>
            </div>
          </Card>
        )}

        {decomposedTasks.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Planned Roadmap</h3>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                Generated by AI
              </Badge>
            </div>
            {decomposedTasks.map((task, index) => (
              <Card key={index} className="border-l-4 border-l-primary hover:bg-muted/30 transition-colors">
                <CardContent className="p-4 flex items-start space-x-4">
                  <div className="mt-1">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-semibold leading-none">{task.name}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                    <div className="flex items-center space-x-2 pt-2">
                      <Badge variant="secondary" className="text-[10px] uppercase">Task</Badge>
                      {task.priority && (
                        <Badge variant="outline" className="text-[10px] uppercase">{task.priority}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive" onClick={() => setDecomposedTasks([])}>
              <Trash2 className="h-4 w-4 mr-2" />
              Reset Roadmap
            </Button>
          </div>
        )}

        {!isSubmitting && !decomposedTasks.length && (
          <Card className="h-full flex items-center justify-center border-none bg-slate-200/20 dark:bg-slate-800/20">
            <div className="text-center p-12 opacity-40">
              <Layers className="h-16 w-16 mx-auto mb-4" />
              <p className="text-sm">Your generated plan will appear here.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
