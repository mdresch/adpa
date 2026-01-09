'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import type { MitigationPlan } from './MitigationPlanCard'

const mitigationPlanSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters'),
  description: z.string().optional(),
  action_type: z.enum(['mitigation', 'contingency', 'avoidance', 'transfer', 'acceptance']).default('mitigation'),
  owner_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled', 'on_hold']).default('planned'),
  completion_percentage: z.number().min(0).max(100).default(0),
  planned_start_date: z.string().optional().nullable(),
  planned_completion_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  expected_effectiveness: z.number().min(0).max(100).optional().nullable(),
  completion_notes: z.string().optional(),
})

type MitigationPlanFormData = z.infer<typeof mitigationPlanSchema>

interface MitigationPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: MitigationPlan
  riskId: string
  onSuccess?: () => void
  initialValues?: Partial<MitigationPlanFormData> // For pre-filling form when creating from AI suggestions
}

export function MitigationPlanDialog({
  open,
  onOpenChange,
  plan,
  riskId,
  onSuccess,
  initialValues,
}: MitigationPlanDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  
  const form = useForm<MitigationPlanFormData>({
    resolver: zodResolver(mitigationPlanSchema),
    defaultValues: {
      title: initialValues?.title || plan?.title || '',
      description: initialValues?.description || plan?.description || '',
      action_type: initialValues?.action_type || plan?.action_type || 'mitigation',
      owner_id: initialValues?.owner_id || plan?.owner_id || null,
      assigned_to: initialValues?.assigned_to || plan?.assigned_to || null,
      status: initialValues?.status || plan?.status || 'planned',
      completion_percentage: initialValues?.completion_percentage || plan?.completion_percentage || 0,
      planned_start_date: initialValues?.planned_start_date || plan?.planned_start_date || null,
      planned_completion_date: initialValues?.planned_completion_date || plan?.planned_completion_date || null,
      due_date: initialValues?.due_date || plan?.due_date || null,
      priority: initialValues?.priority || plan?.priority || 'medium',
      expected_effectiveness: initialValues?.expected_effectiveness || plan?.expected_effectiveness || null,
      completion_notes: initialValues?.completion_notes || plan?.completion_notes || '',
    },
  })
  
  // Reset form when dialog opens with new initial values
  useEffect(() => {
    if (open && initialValues) {
      form.reset({
        title: initialValues.title || '',
        description: initialValues.description || '',
        action_type: initialValues.action_type || 'mitigation',
        owner_id: initialValues.owner_id || null,
        assigned_to: initialValues.assigned_to || null,
        status: initialValues.status || 'planned',
        completion_percentage: initialValues.completion_percentage || 0,
        planned_start_date: initialValues.planned_start_date || null,
        planned_completion_date: initialValues.planned_completion_date || null,
        due_date: initialValues.due_date || null,
        priority: initialValues.priority || 'medium',
        expected_effectiveness: initialValues.expected_effectiveness || null,
        completion_notes: initialValues.completion_notes || '',
      })
    }
  }, [open, initialValues, form])
  
  // Load users for owner/assignee selection
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await apiClient.get('/users')
        if (response.success && response.data) {
          setUsers(response.data)
        }
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }
    loadUsers()
  }, [])
  
  // Update form when plan changes
  useEffect(() => {
    if (plan) {
      form.reset({
        title: plan.title,
        description: plan.description || '',
        action_type: plan.action_type,
        owner_id: plan.owner_id || null,
        assigned_to: plan.assigned_to || null,
        status: plan.status,
        completion_percentage: plan.completion_percentage,
        planned_start_date: plan.planned_start_date || null,
        planned_completion_date: plan.planned_completion_date || null,
        due_date: plan.due_date || null,
        priority: plan.priority,
        expected_effectiveness: plan.expected_effectiveness || null,
        completion_notes: plan.completion_notes || '',
      })
    } else {
      form.reset({
        title: '',
        description: '',
        action_type: 'mitigation',
        owner_id: null,
        assigned_to: null,
        status: 'planned',
        completion_percentage: 0,
        planned_start_date: null,
        planned_completion_date: null,
        due_date: null,
        priority: 'medium',
        expected_effectiveness: null,
        completion_notes: '',
      })
    }
  }, [plan, form])
  
  const onSubmit = async (data: MitigationPlanFormData) => {
    try {
      setIsSubmitting(true)
      
      const basePayload = {
        ...data,
        // Convert dates to ISO strings
        planned_start_date: data.planned_start_date || undefined,
        planned_completion_date: data.planned_completion_date || undefined,
        due_date: data.due_date || undefined,
        expected_effectiveness: data.expected_effectiveness || undefined,
        // Auto-set completion fields when status is completed
        ...(data.status === 'completed' && {
          completion_percentage: 100,
          actual_completion_date: new Date().toISOString().split('T')[0],
        }),
        // Auto-set actual_start_date when status changes to in_progress
        ...(data.status === 'in_progress' && !plan?.actual_start_date && {
          actual_start_date: new Date().toISOString().split('T')[0],
        }),
      }
      
      if (plan && plan.id && plan.id.trim() !== '') {
        // Update existing plan (has valid UUID)
        // Backend requires 'id' in payload for updates, NOT 'risk_id'
        const updatePayload = {
          ...basePayload,
          id: plan.id
        }
        await apiClient.put(`/mitigation-plans/${plan.id}`, updatePayload)
        toast.success('Mitigation plan updated successfully')
      } else {
        // Create new plan (no plan or empty ID)
        // Backend requires 'risk_id' for creates, NOT 'id'
        const createPayload = {
          ...basePayload,
          risk_id: plan?.risk_id || riskId
        }
        await apiClient.post('/mitigation-plans', createPayload)
        toast.success('Mitigation plan created successfully')
      }
      
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to save mitigation plan:', error)
      toast.error(error.message || 'Failed to save mitigation plan')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const completionPercentage = form.watch('completion_percentage')
  const status = form.watch('status')
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit Mitigation Plan' : 'Create Mitigation Plan'}</DialogTitle>
          <DialogDescription>
            {plan ? 'Update mitigation plan details' : 'Create a new mitigation plan for this risk'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Implement backup system" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the mitigation action..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Action Type, Priority, Status */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="action_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mitigation">Mitigation</SelectItem>
                        <SelectItem value="contingency">Contingency</SelectItem>
                        <SelectItem value="avoidance">Avoidance</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="acceptance">Acceptance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Completion Percentage */}
            <FormField
              control={form.control}
              name="completion_percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completion: {field.value}%</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        {...field}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(parseInt(e.target.value))}
                      />
                      <Progress value={field.value} className="h-2" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Owner and Assignee */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="owner_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <Select
                      onValueChange={(value: string) => field.onChange(value === 'none' ? null : value)}
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select
                      onValueChange={(value: string) => field.onChange(value === 'none' ? null : value)}
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Dates */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="planned_start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Planned Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? (typeof field.value === 'string' ? new Date(field.value) : field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="planned_completion_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Planned Completion Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? (typeof field.value === 'string' ? new Date(field.value) : field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? (typeof field.value === 'string' ? new Date(field.value) : field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Expected Effectiveness */}
            <FormField
              control={form.control}
              name="expected_effectiveness"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Effectiveness (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0-100"
                      {...field}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Completion Notes (shown when status is completed) */}
            {status === 'completed' && (
              <FormField
                control={form.control}
                name="completion_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add notes about completion..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : plan ? 'Update Plan' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

