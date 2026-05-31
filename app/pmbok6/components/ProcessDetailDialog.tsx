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
import { Progress } from "@/components/ui/progress"
import { FileText, Layers, BookOpen, ShieldCheck, AlertCircle, CheckCircle2, Circle, Award } from "lucide-react"

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

interface ComplianceData {
  status: 'ACTIVE' | 'PARTIAL' | 'PLANNED'
  activationScore: number
  audit: string[]
  deliverables: {
    name: string
    present: boolean
  }[]
}

interface ProcessDetailDialogProps {
  process: Process
  complianceData?: ComplianceData
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProcessDetailDialog({
  process,
  complianceData,
  open,
  onOpenChange,
}: ProcessDetailDialogProps) {
  const statusColors = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    PARTIAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    PLANNED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="font-mono text-sm">
                {process.code}
              </Badge>
              {complianceData && (
                <Badge className={`text-xs font-bold ${statusColors[complianceData.status]}`}>
                  {complianceData.status} {complianceData.activationScore}%
                </Badge>
              )}
            </div>
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight mt-2">{process.name}</DialogTitle>
          <DialogDescription className="text-sm mt-2 line-clamp-3">
            {process.description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-8 py-4">
            {/* Project-Specific Activation Audit */}
            {complianceData && (
              <div className="p-4 rounded-xl border-2 border-primary/10 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Process Activation Audit
                  </h3>
                  <span className="text-xs font-mono font-bold text-primary">{complianceData.activationScore}% Activated</span>
                </div>
                <Progress value={complianceData.activationScore} className="h-1.5 mb-4" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Entity Requirements</p>
                    <div className="space-y-1.5">
                      {complianceData.audit.map((line, idx) => {
                        const isOk = line.includes('OK');
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-white dark:bg-slate-950 border border-slate-100">
                             <span className="font-medium text-slate-600 dark:text-slate-400">{line.split(':')[0]}</span>
                             <Badge variant={isOk ? "default" : "outline"} className={`text-[9px] ${isOk ? 'bg-emerald-500' : 'opacity-50'}`}>
                               {line.split('(')[1].replace(')', '')}
                             </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Deliverable Verification</p>
                    <div className="space-y-1.5">
                      {complianceData.deliverables.map((del, idx) => (
                        <div key={idx} className={`flex items-center gap-2 text-xs p-2 rounded border ${del.present ? 'bg-blue-50/50 border-blue-100' : 'bg-white dark:bg-slate-950 border-slate-100'}`}>
                          {del.present ? <CheckCircle2 className="h-3 w-3 text-blue-500" /> : <Circle className="h-3 w-3 text-slate-300" />}
                          <span className={del.present ? 'font-bold text-blue-700' : 'text-slate-500'}>{del.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Process Group & Knowledge Area */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Layers className="h-3 w-3" />
                  <span>Process Group</span>
                </div>
                <Badge variant="secondary" className="text-xs font-bold px-3 py-1 bg-slate-100">
                  {process.process_group.name}
                </Badge>
                {process.process_group.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {process.process_group.description}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <BookOpen className="h-3 w-3" />
                  <span>Knowledge Area</span>
                </div>
                <Badge variant="secondary" className="text-xs font-bold px-3 py-1 bg-slate-100">
                  {process.knowledge_area.name}
                </Badge>
                {process.knowledge_area.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {process.knowledge_area.description}
                  </p>
                )}
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* ITTOs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Inputs */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Inputs
                </h3>
                <div className="space-y-1.5">
                  {process.inputs?.map((item, i) => (
                    <div key={i} className="text-[11px] leading-tight text-slate-600 dark:text-slate-400 border-l-2 border-slate-100 pl-2 py-0.5">{item}</div>
                  ))}
                </div>
              </div>

              {/* Tools */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3" />
                  Tools & Techniques
                </h3>
                <div className="space-y-1.5">
                  {process.tools_and_techniques?.map((item, i) => (
                    <div key={i} className="text-[11px] leading-tight text-slate-600 dark:text-slate-400 border-l-2 border-slate-100 pl-2 py-0.5">{item}</div>
                  ))}
                </div>
              </div>

              {/* Outputs */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Award className="h-3 w-3" />
                  Outputs
                </h3>
                <div className="space-y-1.5">
                  {process.outputs?.map((item, i) => (
                    <div key={i} className="text-[11px] leading-tight text-slate-600 dark:text-slate-400 border-l-2 border-slate-100 pl-2 py-0.5 font-semibold">{item}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
