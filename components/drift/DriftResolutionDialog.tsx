/**
 * Drift Resolution Dialog
 * Shows AI-powered drift resolution preview and allows applying changes
 */

'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertCircle, Loader2, Sparkles, SplitSquareHorizontal, AlignLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { SideBySideDiff } from './SideBySideDiff'

interface DriftPoint {
  entityType: string
  driftType: 'added' | 'removed' | 'modified'
  description: string
  requiresApproval: boolean
}

interface ResolutionPreview {
  resolvedContent: string
  originalContent: string
  driftPoints: DriftPoint[]
  majorChanges: DriftPoint[]
  requiresApproval: boolean
  strategy: 'conservative' | 'balanced' | 'permissive'
  previewHtml?: string
}

interface DriftResolutionDialogProps {
  open: boolean
  onClose: () => void
  resolutionPreview: ResolutionPreview | null
  onApply: () => void
  isApplying?: boolean
  isLoading?: boolean
  onStrategyChange?: (strategy: 'conservative' | 'balanced' | 'permissive') => void
  selectedStrategy?: 'conservative' | 'balanced' | 'permissive'
}

export function DriftResolutionDialog({
  open,
  onClose,
  resolutionPreview,
  onApply,
  isApplying = false,
  isLoading = false,
  onStrategyChange,
  selectedStrategy = 'balanced'
}: DriftResolutionDialogProps) {
  const [diffView, setDiffView] = useState<'unified' | 'split'>('split')

  // Show loading state if no preview yet but dialog is open and loading
  const showLoadingState = !resolutionPreview && isLoading

  const driftPoints = resolutionPreview?.driftPoints || []
  const majorChanges = resolutionPreview?.majorChanges || []
  const requiresApproval = resolutionPreview?.requiresApproval || false
  const resolvedContent = resolutionPreview?.resolvedContent || ''
  const originalContent = resolutionPreview?.originalContent || ''
  const previewHtml = resolutionPreview?.previewHtml

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Resolve Baseline Drift with AI
          </DialogTitle>
          <DialogDescription>
            Review the AI-generated resolution and apply changes to realign with your approved baseline.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {showLoadingState ? (
            <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Analyzing Drift and Preparing Resolution...</h3>
                <p className="text-sm text-muted-foreground">
                  AI is analyzing the document and baseline to generate a resolution preview.
                </p>
                <p className="text-xs text-muted-foreground">
                  This usually takes 3-10 seconds.
                </p>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="summary" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="preview">Preview Changes</TabsTrigger>
                <TabsTrigger value="resolved">Resolved Content</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
              <TabsContent value="summary" className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Drift Points Identified: {driftPoints.length}</h3>
                  <div className="space-y-2">
                    {driftPoints.slice(0, 10).map((drift, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-3 bg-muted rounded-md text-sm"
                      >
                        <div className="mt-0.5">
                          {drift.driftType === 'added' && <span className="text-green-600">+</span>}
                          {drift.driftType === 'removed' && <span className="text-red-600">-</span>}
                          {drift.driftType === 'modified' && <span className="text-yellow-600">~</span>}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{drift.entityType}</p>
                          <p className="text-muted-foreground">{drift.description}</p>
                          {drift.requiresApproval && (
                            <Badge variant="outline" className="mt-1">
                              Requires Approval
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {driftPoints.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        ...and {driftPoints.length - 10} more drift points
                      </p>
                    )}
                  </div>
                </div>

                {majorChanges.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Major Changes Requiring Approval:</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {majorChanges.map((change, index) => (
                          <li key={index} className="text-sm">
                            {change.description}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-sm">
                        These changes will be flagged for change request approval after resolution is applied.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {onStrategyChange && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-sm font-semibold">AI Resolution Strategy:</Label>
                    <RadioGroup value={selectedStrategy} onValueChange={(value) => onStrategyChange(value as any)}>
                      <div className="flex items-start space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="conservative" id="conservative" />
                        <Label htmlFor="conservative" className="flex-1 cursor-pointer">
                          <div className="font-medium">Conservative</div>
                          <div className="text-xs text-muted-foreground">
                            Revert ALL changes to match baseline exactly (strict compliance)
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-start space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer bg-blue-50 border-blue-200">
                        <RadioGroupItem value="balanced" id="balanced" />
                        <Label htmlFor="balanced" className="flex-1 cursor-pointer">
                          <div className="font-medium">Balanced ⭐ Recommended</div>
                          <div className="text-xs text-muted-foreground">
                            Keep valid updates, revert unauthorized changes (intelligent adaptation)
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-start space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="permissive" id="permissive" />
                        <Label htmlFor="permissive" className="flex-1 cursor-pointer">
                          <div className="font-medium">Permissive</div>
                          <div className="text-xs text-muted-foreground">
                            Keep most changes, only revert critical violations (flexible)
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Changes Preview</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={diffView === 'split' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDiffView('split')}
                        className="h-8"
                      >
                        <SplitSquareHorizontal className="h-3 w-3 mr-2" />
                        Side-by-Side
                      </Button>
                      <Button
                        variant={diffView === 'unified' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDiffView('unified')}
                        className="h-8"
                      >
                        <AlignLeft className="h-3 w-3 mr-2" />
                        Unified
                      </Button>
                    </div>
                  </div>
                  {diffView === 'split' ? (
                    <ScrollArea className="h-[400px] border rounded-md">
                      <SideBySideDiff
                        oldContent={originalContent}
                        newContent={resolvedContent}
                        filename="document.md"
                      />
                    </ScrollArea>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      {previewHtml ? (
                        <pre className="text-xs font-mono p-4 bg-muted rounded-md whitespace-pre-wrap">
                          {previewHtml}
                        </pre>
                      ) : (
                        <div className="p-8 text-center text-muted-foreground">
                          <p>Diff preview not available</p>
                          <p className="text-xs mt-2">View the resolved content tab to see the full updated document</p>
                        </div>
                      )}
                    </ScrollArea>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="resolved" className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Resolved Document Content</h3>
                  <ScrollArea className="h-[400px]">
                    <div className="prose prose-sm max-w-none p-4 bg-muted rounded-md">
                      <ReactMarkdown>{resolvedContent}</ReactMarkdown>
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {requiresApproval ? (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                Some changes will require approval
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                No approval required
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isApplying || isLoading}>
              Cancel
            </Button>
            <Button onClick={onApply} disabled={isApplying || isLoading || !resolutionPreview}>
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Apply Resolution
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
