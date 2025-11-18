'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Shield, FileText, ExternalLink } from 'lucide-react'
import { MitigationPlanList } from './MitigationPlanList'

interface RiskMitigationPlansViewProps {
  riskId: string
  riskTitle: string
  extractedFromDocumentId?: string | null
  projectId?: string
  projectName?: string
  riskDescription?: string
  riskCategory?: string
  riskProbability?: number
  riskImpact?: number
  riskSeverity?: string
  trigger?: React.ReactNode
}

export function RiskMitigationPlansView({ 
  riskId, 
  riskTitle,
  extractedFromDocumentId,
  projectId,
  projectName,
  riskDescription,
  riskCategory,
  riskProbability,
  riskImpact,
  riskSeverity,
  trigger 
}: RiskMitigationPlansViewProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
        >
          <Shield className="h-4 w-4 mr-2" />
          View Plans
        </Button>
      )}
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Mitigation Plans: {riskTitle}
            </DialogTitle>
            <DialogDescription>
              Manage mitigation plans and track completion for this risk
            </DialogDescription>
          </DialogHeader>
          
          {projectName && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800 mb-4">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Project</p>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{projectName}</p>
              </div>
            </div>
          )}
          
          {extractedFromDocumentId && projectId && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800 mb-4">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Source Document</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">This risk was extracted from a document</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false)
                  router.push(`/projects/${projectId}/documents/${extractedFromDocumentId}`)
                }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Document
              </Button>
            </div>
          )}
          
          <MitigationPlanList 
            riskId={riskId}
            showStats={true}
            riskTitle={riskTitle}
            riskDescription={riskDescription}
            riskCategory={riskCategory}
            riskProbability={riskProbability}
            riskImpact={riskImpact}
            riskSeverity={riskSeverity}
            onPlanUpdate={() => {
              // Could trigger a refresh of parent component if needed
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

