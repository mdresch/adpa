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
  onClick: () => void
}

export function ProcessCard({ process, onClick }: ProcessCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="outline" className="font-mono text-xs">
                {process.code}
              </Badge>
              {process.pmbok_section && (
                <Badge variant="secondary" className="text-xs">
                  {process.pmbok_section}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{process.name}</CardTitle>
            <CardDescription className="mt-2 line-clamp-2">
              {process.description}
            </CardDescription>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {process.process_group.name}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {process.knowledge_area.name}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

