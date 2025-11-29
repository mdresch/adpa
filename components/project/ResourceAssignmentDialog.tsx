"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, AlertCircle } from "@/components/ui/icons-shim"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"

interface ResourceAssignment {
  id: string
  user_id: string
  user_name: string
  user_email: string
  role_id: string
  role_name: string
  role_type?: string
  seniority_level?: string
  hourly_rate: number
  estimated_hours?: number
  start_date?: string
  end_date?: string
}

interface ResourceAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  projectId: string
  onSuccess: () => void
}

export function ResourceAssignmentDialog({
  open,
  onOpenChange,
  taskId,
  projectId,
  onSuccess,
}: ResourceAssignmentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("")
  const [plannedHours, setPlannedHours] = useState<string>("")
  const [allocationPercentage, setAllocationPercentage] = useState<string>("100")
  const [scheduledStartDate, setScheduledStartDate] = useState<string>("")
  const [scheduledEndDate, setScheduledEndDate] = useState<string>("")

  useEffect(() => {
    if (open && projectId) {
      void fetchProjectAssignments()
    }
  }, [open, projectId])

  const fetchProjectAssignments = async () => {
    try {
      setLoadingAssignments(true)
      const response = await apiClient.get<{ success: boolean; data: ResourceAssignment[] }>(
        `/cost-management/projects/${projectId}/assignments`
      )
      setAssignments(response.data || [])
    } catch (error) {
      console.error("Failed to fetch project assignments:", error)
      toast.error("Failed to load available resources")
    } finally {
      setLoadingAssignments(false)
    }
  }

  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAssignmentId) {
      toast.error("Please select a resource")
      return
    }

    const hours = parseFloat(plannedHours)
    if (isNaN(hours) || hours <= 0) {
      toast.error("Please enter a valid number of planned hours")
      return
    }

    const allocation = parseFloat(allocationPercentage)
    if (isNaN(allocation) || allocation < 0 || allocation > 100) {
      toast.error("Allocation percentage must be between 0 and 100")
      return
    }

    try {
      setLoading(true)
      await apiClient.post(`/tasks/${taskId}/assign`, {
        resourceAssignmentId: selectedAssignmentId,
        plannedHours: hours,
        allocationPercentage: allocation,
        scheduledStartDate: scheduledStartDate || undefined,
        scheduledEndDate: scheduledEndDate || undefined,
      })

      toast.success("Resource assigned successfully")
      onSuccess()
      onOpenChange(false)
      
      // Reset form
      setSelectedAssignmentId("")
      setPlannedHours("")
      setAllocationPercentage("100")
      setScheduledStartDate("")
      setScheduledEndDate("")
    } catch (error: any) {
      console.error("Failed to assign resource:", error)
      toast.error(error.response?.data?.error || "Failed to assign resource")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Resource to Task</DialogTitle>
          <DialogDescription>
            Select a resource from the project and specify the planned hours and allocation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resource">Resource *</Label>
            {loadingAssignments ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading available resources...
              </div>
            ) : assignments.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                No resources assigned to this project. Please assign resources to the project first.
              </div>
            ) : (
              <Select
                value={selectedAssignmentId}
                onValueChange={setSelectedAssignmentId}
                required
              >
                <SelectTrigger id="resource">
                  <SelectValue placeholder="Select a resource" />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{assignment.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {assignment.role_name}
                          {assignment.hourly_rate && ` • $${assignment.hourly_rate}/hr`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedAssignment && (
            <div className="rounded-lg border p-3 bg-muted/50">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hourly Rate:</span>
                  <span className="font-medium">${selectedAssignment.hourly_rate?.toFixed(2) || "0.00"}</span>
                </div>
                {selectedAssignment.estimated_hours && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Hours:</span>
                    <span className="font-medium">{selectedAssignment.estimated_hours}h</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plannedHours">Planned Hours *</Label>
              <Input
                id="plannedHours"
                type="number"
                step="0.1"
                min="0.1"
                value={plannedHours}
                onChange={(e) => setPlannedHours(e.target.value)}
                placeholder="e.g., 40"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allocation">Allocation % *</Label>
              <Input
                id="allocation"
                type="number"
                step="1"
                min="0"
                max="100"
                value={allocationPercentage}
                onChange={(e) => setAllocationPercentage(e.target.value)}
                placeholder="100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Scheduled Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={scheduledStartDate}
                onChange={(e) => setScheduledStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Scheduled End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={scheduledEndDate}
                onChange={(e) => setScheduledEndDate(e.target.value)}
              />
            </div>
          </div>

          {selectedAssignment && plannedHours && (
            <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-950">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Cost:</span>
                  <span className="font-medium">
                    ${(parseFloat(plannedHours) * (selectedAssignment.hourly_rate || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedAssignmentId || assignments.length === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Resource
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

