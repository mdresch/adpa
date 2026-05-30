"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, ChevronRight } from "lucide-react"

interface Process {
  id: string
  code: string
  name: string
  description: string
  pmbok_section: string | null
  process_group: {
    code: string
    name: string
  }
  knowledge_area: {
    code: string
    name: string
  }
}

interface ProcessCardProps {
  process: Process
  status?: 'ACTIVE' | 'PARTIAL' | 'PLANNED'
  score?: number
  onClick: () => void
}

export function ProcessCard({ process, status = 'PLANNED', score = 0, onClick }: ProcessCardProps) {
  const statusColors = {
    ACTIVE: 'border-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-950/10',
    PARTIAL: 'border-amber-500/50 bg-amber-50/10 dark:bg-amber-950/10',
    PLANNED: 'border-slate-200 dark:border-slate-800'
  }

  const badgeColors = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    PARTIAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    PLANNED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
  }

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all border-2 ${statusColors[status]}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="outline" className="font-mono text-xs">
                {process.code}
              </Badge>
              <Badge className={`text-[10px] font-bold ${badgeColors[status]}`}>
                {status} {score > 0 && `${score}%`}
              </Badge>
            </div>
            <CardTitle className="text-base">{process.name}</CardTitle>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {process.process_group.name}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {process.knowledge_area.name}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

