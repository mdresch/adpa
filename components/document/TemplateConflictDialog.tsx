'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { TriangleAlert, FileText, Plus, Eye } from 'lucide-react'

interface ExistingDocument {
  id: string
  name: string
  version: number
  semantic_version: string
  updated_at: string
  baseline_id?: string
  baseline_version?: string
  baseline_date?: string
}

interface TemplateConflictDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingDocument: ExistingDocument
  templateName: string
  onAction: (action: 'new-version' | 'separate' | 'view-existing') => void
}

export function TemplateConflictDialog({
  open,
  onOpenChange,
  existingDocument,
  templateName,
  onAction
}: TemplateConflictDialogProps) {
  const [selectedAction, setSelectedAction] = useState<'new-version' | 'separate' | 'view-existing'>('new-version')
  
  // Parse semantic version (e.g., "1.2.3" → { major: 1, minor: 2, patch: 3 })
  const currentVersion = existingDocument.semantic_version || `${existingDocument.version}.0.0`
  const [major, minor, patch] = currentVersion.split('.').map(Number)
  const nextMinorVersion = `${major}.${minor + 1}.0`
  
  const handleContinue = () => {
    onAction(selectedAction)
    onOpenChange(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-yellow-500" />
            Template Already Used
          </DialogTitle>
          <DialogDescription>
            A "{templateName}" document already exists in this project's library.
          </DialogDescription>
        </DialogHeader>
        
        {/* Existing Document Info */}
        <div className="my-4 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-foreground">{existingDocument.name}</h4>
            <Badge variant="secondary">v{currentVersion}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Last Updated:</span>
              <span className="ml-2 font-medium">
                {new Date(existingDocument.updated_at).toLocaleDateString()}
              </span>
            </div>
            {existingDocument.baseline_id && (
              <div>
                <span className="text-muted-foreground">Last Baselined:</span>
                <span className="ml-2 font-medium">
                  v{existingDocument.baseline_version} ({new Date(existingDocument.baseline_date!).toLocaleDateString()})
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Selection */}
        <div className="mb-4">
          <Label className="mb-3 block">What would you like to do?</Label>
          <RadioGroup value={selectedAction} onValueChange={(value: typeof selectedAction) => setSelectedAction(value)}>
            {/* Option 1: Create New Version (RECOMMENDED) */}
            <div 
              className={`flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors ${
                selectedAction === 'new-version' ? 'border-primary bg-accent' : ''
              }`}
              onClick={() => setSelectedAction('new-version')}
            >
              <RadioGroupItem value="new-version" id="new-version" className="mt-1" />
              <Label htmlFor="new-version" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Create New Version (v{nextMinorVersion})</span>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300">Recommended</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Updates the existing document with new AI-generated content.
                  {existingDocument.baseline_id && (
                    <span className="block mt-1 text-yellow-600">
                      ⚠️ Will trigger drift detection (document is baselined)
                    </span>
                  )}
                </p>
                <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                  <div>• Minor version increment (AI regeneration)</div>
                  <div>• Preserves document history</div>
                  <div>• Maintains baseline linkage</div>
                  <div>• Automatic drift detection</div>
                </div>
              </Label>
            </div>
            
            {/* Option 2: Create Separate Document */}
            <div 
              className={`flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors ${
                selectedAction === 'separate' ? 'border-primary bg-accent' : ''
              }`}
              onClick={() => setSelectedAction('separate')}
            >
              <RadioGroupItem value="separate" id="separate" className="mt-1" />
              <Label htmlFor="separate" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Plus className="h-4 w-4" />
                  <span className="font-semibold">Create Separate Document</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Creates a new independent document (e.g., "Project Charter - Alternative")
                </p>
                <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                  <div>• New document with v1.0.0</div>
                  <div>• No baseline linkage</div>
                  <div>• No drift detection</div>
                  <div>• Use for alternative scenarios</div>
                </div>
              </Label>
            </div>
            
            {/* Option 3: View Existing */}
            <div 
              className={`flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors ${
                selectedAction === 'view-existing' ? 'border-primary bg-accent' : ''
              }`}
              onClick={() => setSelectedAction('view-existing')}
            >
              <RadioGroupItem value="view-existing" id="view-existing" className="mt-1" />
              <Label htmlFor="view-existing" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="h-4 w-4" />
                  <span className="font-semibold">View Existing Document</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Open the current version for review or manual editing
                </p>
                <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                  <div>• Opens document viewer</div>
                  <div>• Can edit manually if needed</div>
                  <div>• No AI generation</div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleContinue}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

