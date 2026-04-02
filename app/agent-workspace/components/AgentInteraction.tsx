"use client"

import React, { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Send, 
  Bot, 
  User, 
  Brain, 
  Wrench, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Loader2,
  Terminal,
  Sparkles
} from "lucide-react"
import { apiClient } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Message {
  role: 'user' | 'assistant'
  content: string
  trace?: any[]
}

interface AgentInteractionProps {
  onStartOrchestration?: (runId: string) => void
}

export function AgentInteraction({ onStartOrchestration }: AgentInteractionProps) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOrchestrating, setIsOrchestrating] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleStartOrchestration = async () => {
    if (!input.trim() || isOrchestrating) return
    
    setIsOrchestrating(true)
    try {
      // Assuming we use the first project for demo purposes if none selected
      const projectsRes = await apiClient.getProjects()
      const projectId = projectsRes.projects?.[0]?.id
      
      if (!projectId) {
        toast.error("Please create a project first")
        return
      }

      const response: any = await apiClient.post(`/agents/project/${projectId}/run`, { goal: input })
      if (response.data.runId) {
        toast.success("10-Phase Orchestration Started!")
        onStartOrchestration?.(response.data.runId)
      }
    } catch (error) {
      console.error("Orchestration start failed:", error)
      toast.error("Failed to start orchestration sequence")
    } finally {
      setIsOrchestrating(false)
    }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput("")
    setIsLoading(true)

    try {
      const response: any = await apiClient.post('/agents/chat', { goal: currentInput })
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response,
        trace: response.data.trace?.steps || []
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error("Agent chat failed:", error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error while processing your request. Please try again." 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="h-[750px] flex flex-col border-none shadow-2xl bg-background/40 backdrop-blur-xl overflow-hidden">
      <CardHeader className="border-b bg-muted/30 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">General Purpose Agent</CardTitle>
              <CardDescription className="flex items-center">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Autonomous & Tool-Enabled
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="hidden sm:flex border-primary/20 hover:bg-primary/5 text-primary"
              onClick={handleStartOrchestration}
              disabled={!input.trim() || isOrchestrating}
            >
              {isOrchestrating ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Zap className="h-3 w-3 mr-2" />}
              Full Orchestration
            </Button>
            <Badge variant="outline" className="font-mono text-[10px]">RE-ACT LOOP V1.2</Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0 relative">
        <ScrollArea className="h-full p-6" ref={scrollRef}>
          <div className="space-y-8 max-w-4xl mx-auto">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[500px] text-center space-y-4 opacity-60">
                <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                <div className="space-y-2">
                  <h3 className="text-xl font-bold italic">"How can I assist your project today?"</h3>
                  <p className="text-sm max-w-sm">
                    I can create tasks, search documentation, analyze GitHub repositories, or coordinate with external integrations.
                  </p>
                </div>
              </div>
            )}

            {messages.map((message, i) => (
              <div key={i} className={cn(
                "flex flex-col space-y-4",
                message.role === 'user' ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "flex items-start space-x-3 max-w-[85%]",
                  message.role === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
                )}>
                  <Avatar className={cn(
                    "border-2",
                    message.role === 'user' ? "border-primary/20" : "border-blue-500/20"
                  )}>
                    <AvatarFallback className={message.role === 'user' ? "bg-primary/10" : "bg-blue-500/10"}>
                      {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={cn(
                    "rounded-2xl p-4 shadow-sm",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-background border border-border"
                  )}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>

                {message.trace && message.trace.length > 0 && (
                  <div className="w-full pl-12 space-y-3">
                    <TraceVisualization steps={message.trace} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start space-x-3 max-w-[85%] animate-in fade-in duration-300">
                <Avatar className="border-2 border-blue-500/20">
                  <AvatarFallback className="bg-blue-500/10 italic">
                    <Bot className="h-4 w-4 animate-bounce" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted/30 rounded-2xl p-4 border border-dashed border-primary/30 flex items-center space-x-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Agent is thinking and utilizing tools...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <div className="p-4 border-t bg-muted/20 backdrop-blur-md">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end space-x-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              placeholder="Give the agent a complex goal..."
              className="pr-12 py-6 bg-background/50 border-primary/20 focus-visible:ring-primary h-14"
              disabled={isLoading}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
               <Badge variant="outline" className="text-[10px] text-muted-foreground px-1.5 py-0">Ctrl+Enter</Badge>
            </div>
          </div>
          <Button type="submit" size="icon" className="h-14 w-14 rounded-xl shadow-lg shadow-primary/20" disabled={isLoading || !input.trim()}>
            <Send className="h-6 w-6" />
          </Button>
        </form>
      </div>
    </Card>
  )
}

function TraceVisualization({ steps }: { steps: any[] }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Group steps by iteration (Thought -> Action -> Observation)
  const iterations: any[] = []
  let current: any = {}
  
  steps.forEach(step => {
    if (step.type === 'thought') {
      if (current.thought) iterations.push(current)
      current = { thought: step.content }
    } else if (step.type === 'action') {
      current.action = step.content
    } else if (step.type === 'observation') {
      current.observation = step.content
    }
  })
  if (current.thought) iterations.push(current)

  return (
    <div className="space-y-2">
      <Button 
        variant="ghost" 
        size="sm" 
        className="text-xs h-8 text-muted-foreground hover:text-primary transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <ChevronUp className="h-3 w-3 mr-2" /> : <ChevronDown className="h-3 w-3 mr-2" />}
        {isExpanded ? "Hide Reasoning Process" : `View Execution Trace (${iterations.length} steps)`}
      </Button>

      {isExpanded && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
          {iterations.map((it, idx) => (
            <div key={idx} className="relative pl-6 border-l-2 border-primary/20 space-y-3 pb-4 last:pb-0">
              <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-primary/40 border-2 border-background" />
              
              {it.thought && (
                <div className="space-y-1">
                  <div className="flex items-center text-[11px] font-bold text-primary/70 uppercase tracking-wider">
                    <Brain className="h-3 w-3 mr-1.5" />
                    Internal Thought
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/50 italic leading-relaxed">
                    {it.thought.replace(/Idea:|Thought:/gi, "").trim()}
                  </div>
                </div>
              )}

              {it.action && (
                <div className="space-y-1">
                  <div className="flex items-center text-[11px] font-bold text-amber-600/70 uppercase tracking-wider">
                    <Wrench className="h-3 w-3 mr-1.5" />
                    Executing Action
                  </div>
                  <div className="text-xs font-mono bg-amber-500/5 text-amber-700 dark:text-amber-400 p-2 rounded border border-amber-500/20">
                    <Terminal className="h-3 w-3 inline mr-2 opacity-50" />
                    {it.action}
                  </div>
                </div>
              )}

              {it.observation && (
                <div className="space-y-1">
                  <div className="flex items-center text-[11px] font-bold text-green-600/70 uppercase tracking-wider">
                    <Eye className="h-3 w-3 mr-1.5" />
                    Environment Observation
                  </div>
                  <div className="text-[11px] bg-green-500/5 text-green-700 dark:text-green-400 p-3 rounded-lg border border-green-500/20 max-h-32 overflow-y-auto font-mono scrollbar-custom">
                    {it.observation}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
