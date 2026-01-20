/**
 * Document Entity Editor Component
 * TASK-717: Allows users to add stakeholders and remove risks from document content
 * 
 * Features:
 * - Add stakeholder to document content (inserts into Markdown)
 * - Remove risk from document content (removes from Markdown)
 * - Integrates with document editor
 */

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { X, User } from "lucide-react"
import { Plus, AlertTriangle } from "@/components/ui/icons-shim"
import { apiClient, Stakeholder } from "@/lib/api"
import { toast } from '@/lib/notify'

interface DocumentEntityEditorProps {
  projectId: string
  documentContent: string
  onContentChange: (newContent: string) => void
  disabled?: boolean
}

interface Risk {
  id: string
  title: string
  description?: string
  category?: string
  probability?: string
  impact?: string
}

/**
 * Extract risks from document content (Markdown format)
 * Improved to find risks in various formats and locations
 */
function extractRisksFromContent(content: string): Risk[] {
  const risks: Risk[] = []
  const lines = content.split('\n')
  
  let inRiskSection = false
  let currentRisk: Partial<Risk> | null = null
  const processedRiskTitles = new Set<string>() // Track to avoid duplicates
  
  // Risk indicators/keywords
  const riskKeywords = [
    'risk', 'threat', 'hazard', 'concern', 'issue', 'challenge',
    'vulnerability', 'exposure', 'uncertainty', 'danger', 'problem'
  ]
  
  // Helper to check if a line contains risk indicators
  const isRiskLine = (line: string): boolean => {
    const lowerLine = line.toLowerCase()
    return riskKeywords.some(keyword => lowerLine.includes(keyword)) ||
           lowerLine.includes('probability') ||
           lowerLine.includes('impact') ||
           lowerLine.includes('mitigation') ||
           lowerLine.includes('contingency')
  }
  
  // Helper to extract risk title from text
  const extractRiskTitle = (text: string): string => {
    // Remove markdown formatting
    let cleaned = text.replace(/\*\*/g, '').replace(/\*/g, '').trim()
    
    // Extract title (before colon, dash, or first sentence)
    let title = cleaned
    if (cleaned.includes(':')) {
      title = cleaned.split(':')[0].trim()
    } else if (cleaned.includes(' - ')) {
      title = cleaned.split(' - ')[0].trim()
    } else if (cleaned.includes('.')) {
      title = cleaned.split('.')[0].trim()
    }
    
    // Clean up title
    title = title.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '').trim()
    
    return title || cleaned.substring(0, 100) // Fallback to first 100 chars
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()
    
    // Detect risk section headers (more flexible)
    if (trimmedLine.match(/^##+\s*(risks?|risk\s+management|threats?|issues?|concerns?)/i)) {
      inRiskSection = true
      continue
    }
    
    // Detect end of risk section (next major heading)
    if (inRiskSection && trimmedLine.match(/^##\s+/) && !trimmedLine.match(/risk|threat|issue|concern/i)) {
      if (currentRisk && currentRisk.title) {
        const titleKey = currentRisk.title.toLowerCase()
        if (!processedRiskTitles.has(titleKey)) {
          risks.push(currentRisk as Risk)
          processedRiskTitles.add(titleKey)
        }
        currentRisk = null
      }
      inRiskSection = false
      continue
    }
    
    // Look for risks in risk section OR in any section if line contains risk indicators
    if (inRiskSection || isRiskLine(trimmedLine)) {
      // Detect risk items (bullet points, numbered lists, or risk-indicating text)
      const isListItem = trimmedLine.match(/^[-*]\s+/) || trimmedLine.match(/^\d+\.\s+/)
      const isRiskIndicating = isRiskLine(trimmedLine) && (trimmedLine.length > 20)
      
      if (isListItem || (isRiskIndicating && !currentRisk)) {
        // Save previous risk if exists
        if (currentRisk && currentRisk.title) {
          const titleKey = currentRisk.title.toLowerCase()
          if (!processedRiskTitles.has(titleKey)) {
            risks.push(currentRisk as Risk)
            processedRiskTitles.add(titleKey)
          }
        }
        
        // Start new risk
        let riskText = trimmedLine.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim()
        
        // Remove markdown links and formatting
        riskText = riskText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
        riskText = riskText.replace(/\*\*/g, '').replace(/\*/g, '').trim()
        
        const riskTitle = extractRiskTitle(riskText)
        const riskDescription = riskText.includes(':') 
          ? riskText.split(':').slice(1).join(':').trim() 
          : (riskText.length > riskTitle.length ? riskText.substring(riskTitle.length).trim() : undefined)
        
        // Extract category, probability, impact if mentioned
        let category: string | undefined
        let probability: string | undefined
        let impact: string | undefined
        
        const lowerText = riskText.toLowerCase()
        if (lowerText.includes('technical') || lowerText.includes('technology')) category = 'technical'
        else if (lowerText.includes('schedule') || lowerText.includes('timeline')) category = 'schedule'
        else if (lowerText.includes('budget') || lowerText.includes('cost')) category = 'budget'
        else if (lowerText.includes('resource') || lowerText.includes('staffing')) category = 'resource'
        else if (lowerText.includes('external') || lowerText.includes('vendor')) category = 'external'
        else if (lowerText.includes('quality')) category = 'quality'
        
        if (lowerText.includes('high probability') || lowerText.includes('likely')) probability = 'high'
        else if (lowerText.includes('medium probability') || lowerText.includes('moderate')) probability = 'medium'
        else if (lowerText.includes('low probability') || lowerText.includes('unlikely')) probability = 'low'
        
        if (lowerText.includes('high impact') || lowerText.includes('severe')) impact = 'high'
        else if (lowerText.includes('medium impact') || lowerText.includes('moderate impact')) impact = 'medium'
        else if (lowerText.includes('low impact') || lowerText.includes('minor')) impact = 'low'
        
        currentRisk = {
          id: `risk-${risks.length + processedRiskTitles.size + 1}`,
          title: riskTitle,
          description: riskDescription,
          category,
          probability,
          impact
        }
      } else if (currentRisk && trimmedLine.length > 0 && !trimmedLine.match(/^##+\s+/)) {
        // Continuation of current risk description (not a new section)
        if (trimmedLine.match(/^[-*]\s+/) === null && trimmedLine.match(/^\d+\.\s+/) === null) {
          const continuation = trimmedLine.replace(/\*\*/g, '').replace(/\*/g, '').trim()
          if (continuation.length > 0) {
            if (currentRisk.description) {
              currentRisk.description += ' ' + continuation
            } else {
              currentRisk.description = continuation
            }
          }
        }
      }
    }
  }
  
  // Add last risk if exists
  if (currentRisk && currentRisk.title) {
    const titleKey = currentRisk.title.toLowerCase()
    if (!processedRiskTitles.has(titleKey)) {
      risks.push(currentRisk as Risk)
      processedRiskTitles.add(titleKey)
    }
  }
  
  return risks
}

/**
 * Check if stakeholder already exists in document content
 */
function stakeholderExistsInContent(content: string, stakeholder: Stakeholder): boolean {
  const lines = content.split('\n')
  let inStakeholderSection = false
  
  const stakeholderName = stakeholder.name || stakeholder.role
  const normalizedName = stakeholderName.toLowerCase().trim()
  const normalizedEmail = stakeholder.email.toLowerCase().trim()
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Detect stakeholder section
    if (line.match(/^##+\s*(stakeholders?|stakeholder\s+management)/i)) {
      inStakeholderSection = true
      continue
    }
    
    // Detect end of stakeholder section
    if (inStakeholderSection && line.match(/^##\s+/) && !line.match(/stakeholder/i)) {
      inStakeholderSection = false
      continue
    }
    
    if (inStakeholderSection) {
      // Check for stakeholder entry format: - **Name** (Role) or - Name (Role)
      if (line.match(/^[-*]\s+\*\*?/)) {
        const entryText = line.replace(/^[-*]\s+\*\*?/, '').replace(/\*\*?/g, '').trim()
        
        // Extract name from entry (format: "Name (Role)" or just "Name")
        const nameMatch = entryText.match(/^(.+?)(?:\s*\(.+?\))?$/)
        if (nameMatch) {
          const entryName = nameMatch[1].trim().toLowerCase()
          // Check exact name match
          if (entryName === normalizedName || entryName === stakeholder.role.toLowerCase()) {
            return true
          }
        }
      }
      
      // Check for email in stakeholder section
      if (line.includes('Email:') || line.includes('email:')) {
        const emailMatch = line.match(/email:\s*([^\s\n]+)/i)
        if (emailMatch && emailMatch[1].toLowerCase().trim() === normalizedEmail) {
          return true
        }
      }
    }
  }
  
  return false
}

/**
 * Insert stakeholder into document content
 */
function insertStakeholderIntoContent(content: string, stakeholder: Stakeholder): string {
  const lines = content.split('\n')
  let stakeholderSectionIndex = -1
  
  // Find stakeholder section
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^##+\s*(stakeholders?|stakeholder\s+management)/i)) {
      stakeholderSectionIndex = i
      break
    }
  }
  
  // If no stakeholder section exists, create one
  if (stakeholderSectionIndex === -1) {
    // Try to find a good place to insert (after project overview or before risks)
    let insertIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^##\s+(risks?|risk\s+management)/i)) {
        insertIndex = i
        break
      }
      if (lines[i].match(/^##\s+(project\s+overview|executive\s+summary)/i)) {
        insertIndex = i + 5 // Insert a few lines after overview
      }
    }
    
    if (insertIndex === -1) {
      insertIndex = Math.min(10, lines.length) // Insert near the top
    }
    
    const stakeholderSection = [
      '',
      '## Stakeholders',
      '',
      `- **${stakeholder.name || stakeholder.role}** (${stakeholder.role})`,
      `  - Email: ${stakeholder.email}`,
      stakeholder.department ? `  - Department: ${stakeholder.department}` : '',
      `  - Influence: ${stakeholder.influence_level || 'medium'}`,
      `  - Interest: ${stakeholder.interest_level || 'medium'}`,
      stakeholder.expectations ? `  - Expectations: ${stakeholder.expectations}` : '',
      ''
    ].filter(Boolean)
    
    lines.splice(insertIndex, 0, ...stakeholderSection)
    return lines.join('\n')
  }
  
  // Insert stakeholder into existing section
  // Find where to insert (after section header, before next section)
  let insertIndex = stakeholderSectionIndex + 1
  
  // Skip empty lines and section description
  while (insertIndex < lines.length && 
         (lines[insertIndex].trim() === '' || 
          lines[insertIndex].trim().startsWith('<!--') ||
          !lines[insertIndex].match(/^[-*]/))) {
    insertIndex++
  }
  
  // Format stakeholder entry
  const stakeholderEntry = [
    `- **${stakeholder.name || stakeholder.role}** (${stakeholder.role})`,
    `  - Email: ${stakeholder.email}`,
    stakeholder.department ? `  - Department: ${stakeholder.department}` : '',
    `  - Influence: ${stakeholder.influence_level || 'medium'}`,
    `  - Interest: ${stakeholder.interest_level || 'medium'}`,
    stakeholder.expectations ? `  - Expectations: ${stakeholder.expectations}` : '',
    ''
  ].filter(Boolean)
  
  lines.splice(insertIndex, 0, ...stakeholderEntry)
  return lines.join('\n')
}

/**
 * Remove risk from document content
 */
function removeRiskFromContent(content: string, riskTitle: string): string {
  const lines = content.split('\n')
  const newLines: string[] = []
  let inRiskSection = false
  let skipCurrentRisk = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Detect risk section
    if (line.match(/^##+\s*(risks?|risk\s+management)/i)) {
      inRiskSection = true
      newLines.push(line)
      continue
    }
    
    // Detect end of risk section
    if (inRiskSection && line.match(/^##\s+/) && !line.match(/risk/i)) {
      inRiskSection = false
      skipCurrentRisk = false
      newLines.push(line)
      continue
    }
    
    if (inRiskSection) {
      // Check if this line contains the risk to remove
      if (line.match(/^[-*]\s+/) || line.match(/^\d+\.\s+/)) {
        const riskText = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim()
        const riskTitleFromLine = riskText.split(':')[0].split('-')[0].trim()
        
        // Check if this is the risk to remove (fuzzy match)
        if (riskTitleFromLine.toLowerCase().includes(riskTitle.toLowerCase()) ||
            riskTitle.toLowerCase().includes(riskTitleFromLine.toLowerCase())) {
          skipCurrentRisk = true
          continue // Skip this line
        } else {
          skipCurrentRisk = false
          newLines.push(line)
        }
      } else if (!skipCurrentRisk) {
        // Include continuation lines if not skipping
        newLines.push(line)
      }
      // If skipCurrentRisk is true, skip continuation lines too
    } else {
      newLines.push(line)
    }
  }
  
  return newLines.join('\n')
}

export function DocumentEntityEditor({
  projectId,
  documentContent,
  onContentChange,
  disabled = false
}: DocumentEntityEditorProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [loadingStakeholders, setLoadingStakeholders] = useState(false)
  const [selectedStakeholderId, setSelectedStakeholderId] = useState<string>("")
  const [selectedRiskId, setSelectedRiskId] = useState<string>("")
  const [showAddStakeholderDialog, setShowAddStakeholderDialog] = useState(false)
  const [showRemoveRiskDialog, setShowRemoveRiskDialog] = useState(false)

  // Load stakeholders from project
  useEffect(() => {
    if (projectId && showAddStakeholderDialog) {
      loadStakeholders()
    }
  }, [projectId, showAddStakeholderDialog])

  // Extract risks from current content
  useEffect(() => {
    if (documentContent) {
      const extractedRisks = extractRisksFromContent(documentContent)
      setRisks(extractedRisks)
    }
  }, [documentContent])

  const loadStakeholders = async () => {
    try {
      setLoadingStakeholders(true)
      const response = await apiClient.getProjectStakeholders(projectId)
      setStakeholders(response.stakeholders || [])
    } catch (error) {
      console.error("Failed to load stakeholders:", error)
      toast.error("Failed to load stakeholders")
    } finally {
      setLoadingStakeholders(false)
    }
  }

  const handleAddStakeholder = () => {
    if (!selectedStakeholderId) {
      toast.error("Please select a stakeholder")
      return
    }

    const stakeholder = stakeholders.find(s => s.id === selectedStakeholderId)
    if (!stakeholder) {
      toast.error("Stakeholder not found")
      return
    }

    // Check if stakeholder already exists in content (more accurate check)
    const stakeholderName = stakeholder.name || stakeholder.role
    if (stakeholderExistsInContent(documentContent, stakeholder)) {
      toast.warning(`Stakeholder "${stakeholderName}" already appears in the stakeholders section`)
      return
    }

    const newContent = insertStakeholderIntoContent(documentContent, stakeholder)
    onContentChange(newContent)
    
    toast.success(`Added stakeholder "${stakeholderName}" to document`)
    setShowAddStakeholderDialog(false)
    setSelectedStakeholderId("")
  }

  const handleRemoveRisk = () => {
    if (!selectedRiskId) {
      toast.error("Please select a risk to remove")
      return
    }

    const risk = risks.find(r => r.id === selectedRiskId)
    if (!risk) {
      toast.error("Risk not found")
      return
    }

    const newContent = removeRiskFromContent(documentContent, risk.title)
    onContentChange(newContent)
    
    toast.success(`Removed risk "${risk.title}" from document`)
    setShowRemoveRiskDialog(false)
    setSelectedRiskId("")
    
    // Refresh risks list
    const updatedRisks = extractRisksFromContent(newContent)
    setRisks(updatedRisks)
  }

  return (
    <div className="flex gap-2">
      {/* Add Stakeholder Button */}
      <Dialog open={showAddStakeholderDialog} onOpenChange={setShowAddStakeholderDialog}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="gap-2"
          >
            <User className="h-4 w-4" />
            <Plus className="h-3 w-3 -ml-1" />
            Add Stakeholder
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Stakeholder to Document</DialogTitle>
            <DialogDescription>
              Select a stakeholder from the project to add to the document content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stakeholder-select">Select Stakeholder</Label>
              <Select
                value={selectedStakeholderId}
                onValueChange={setSelectedStakeholderId}
                disabled={loadingStakeholders}
              >
                <SelectTrigger id="stakeholder-select">
                  <SelectValue placeholder={loadingStakeholders ? "Loading..." : "Choose a stakeholder"} />
                </SelectTrigger>
                <SelectContent>
                  {stakeholders.map((stakeholder) => (
                    <SelectItem key={stakeholder.id} value={stakeholder.id}>
                      {stakeholder.name || stakeholder.role} ({stakeholder.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedStakeholderId && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">
                  {stakeholders.find(s => s.id === selectedStakeholderId)?.name || 
                   stakeholders.find(s => s.id === selectedStakeholderId)?.role}
                </p>
                <p className="text-muted-foreground">
                  {stakeholders.find(s => s.id === selectedStakeholderId)?.email}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddStakeholderDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddStakeholder}
                disabled={!selectedStakeholderId}
              >
                Add to Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Risk Button */}
      <Dialog open={showRemoveRiskDialog} onOpenChange={setShowRemoveRiskDialog}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || risks.length === 0}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Remove Risk
            {risks.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                {risks.length}
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Remove Risk from Document</DialogTitle>
            <DialogDescription>
              Select a risk to remove from the document content. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {risks.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                <AlertTriangle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                No risks found in document content
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="risk-select">Select Risk to Remove</Label>
                  <Select
                    value={selectedRiskId}
                    onValueChange={setSelectedRiskId}
                  >
                    <SelectTrigger id="risk-select">
                      <SelectValue placeholder="Choose a risk" />
                    </SelectTrigger>
                    <SelectContent>
                      {risks.map((risk) => (
                        <SelectItem key={risk.id} value={risk.id}>
                          {risk.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedRiskId && (
                  <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm">
                    <p className="font-medium text-destructive">
                      {risks.find(r => r.id === selectedRiskId)?.title}
                    </p>
                    {risks.find(r => r.id === selectedRiskId)?.description && (
                      <p className="text-muted-foreground mt-1">
                        {risks.find(r => r.id === selectedRiskId)?.description}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowRemoveRiskDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRemoveRisk}
                    disabled={!selectedRiskId}
                  >
                    Remove from Document
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

