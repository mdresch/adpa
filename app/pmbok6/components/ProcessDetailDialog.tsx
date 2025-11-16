"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Layers, BookOpen } from "lucide-react"

interface Process {
  id: string
  code: string
  name: string
  description: string
  inputs: string[] | null
  tools_and_techniques: string[] | null
  outputs: string[] | null
  pmbok_section: string | null
  process_group: {
    id: string
    code: string
    name: string
    description?: string
  }
  knowledge_area: {
    id: string
    code: string
    name: string
    description?: string
  }
}

interface ProcessDetailDialogProps {
  process: Process
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProcessDetailDialog({
  process,
  open,
  onOpenChange,
}: ProcessDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center space-x-2 mb-2">
            <Badge variant="outline" className="font-mono">
              {process.code}
            </Badge>
            {process.pmbok_section && (
              <Badge variant="secondary">{process.pmbok_section}</Badge>
            )}
          </div>
          <DialogTitle className="text-2xl">{process.name}</DialogTitle>
          <DialogDescription className="text-base">
            {process.description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Process Group & Knowledge Area */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <Layers className="h-4 w-4" />
                  <span>Process Group</span>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {process.process_group.name}
                </Badge>
                {process.process_group.description && (
                  <p className="text-sm text-muted-foreground">
                    {process.process_group.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <BookOpen className="h-4 w-4" />
                  <span>Knowledge Area</span>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {process.knowledge_area.name}
                </Badge>
                {process.knowledge_area.description && (
                  <p className="text-sm text-muted-foreground">
                    {process.knowledge_area.description}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Inputs */}
            {process.inputs && process.inputs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Inputs</span>
                </h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  {process.inputs.map((input, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {input}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tools & Techniques */}
            {process.tools_and_techniques && process.tools_and_techniques.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Tools & Techniques</span>
                </h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  {process.tools_and_techniques.map((tool, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {tool}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Outputs */}
            {process.outputs && process.outputs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Outputs</span>
                </h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  {process.outputs.map((output, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {output}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

