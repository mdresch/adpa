"use client"

import React, { useState, useEffect } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, Calendar, Clock, Plane, Stethoscope, GraduationCap, Users, Baby, User } from '@/components/ui/icons-shim'
import { toast } from 'sonner'
import { getApiUrl } from '@/lib/api-url'

interface UnavailabilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string | null
  onSaved: () => void
}

const UNAVAILABILITY_TYPES = [
  { value: 'annual-leave', label: 'Annual Leave', icon: Plane },
  { value: 'sick-leave', label: 'Sick Leave', icon: Stethoscope },
  { value: 'public-holiday', label: 'Public Holiday', icon: Calendar },
  { value: 'training', label: 'Training', icon: GraduationCap },
  { value: 'conference', label: 'Conference', icon: Users },
  { value: 'parental-leave', label: 'Parental Leave', icon: Baby },
  { value: 'personal', label: 'Personal', icon: User },
  { value: 'other', label: 'Other', icon: Calendar },
]

export function UnavailabilityDialog({ 
  open, 
  onOpenChange, 
  userId, 
  onSaved 
}: UnavailabilityDialogProps) {
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    userId: '',
    unavailabilityType: 'annual-leave',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    isFullDay: true,
    startTime: '09:00',
    endTime: '17:00'
  })

  useEffect(() => {
    if (open) {
      void fetchUsers()
      void fetchCurrentUser()
      
      // Reset form with provided userId or empty
      setFormData({
        userId: userId || '',
        unavailabilityType: 'annual-leave',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        isFullDay: true,
        startTime: '09:00',
        endTime: '17:00'
      })
    }
  }, [open, userId])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(getApiUrl('/users'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.data || data || [])
      }
    } catch (error) {
      console.error('[UNAVAILABILITY] Failed to fetch users:', error)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(getApiUrl('/auth/me'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setCurrentUserId(data.id || data.data?.id)
        if (!userId) {
          setFormData(prev => ({ ...prev, userId: data.id || data.data?.id }))
        }
      }
    } catch (error) {
      console.error('[UNAVAILABILITY] Failed to fetch current user:', error)
    }
  }

  const calculateHours = () => {
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    if (formData.isFullDay) {
      return days * 8 // Assume 8 hours per day
    } else {
      // Calculate hours from times
      const [startH, startM] = formData.startTime.split(':').map(Number)
      const [endH, endM] = formData.endTime.split(':').map(Number)
      const hoursPerDay = (endH + endM / 60) - (startH + startM / 60)
      return days * hoursPerDay
    }
  }

  const handleSave = async () => {
    if (!formData.userId) {
      toast.error('Please select a user')
      return
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End date must be after start date')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('auth_token')
      
      const payload = {
        userId: formData.userId,
        unavailabilityType: formData.unavailabilityType,
        description: formData.description || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isFullDay: formData.isFullDay,
        startTime: formData.isFullDay ? undefined : formData.startTime,
        endTime: formData.isFullDay ? undefined : formData.endTime,
        hoursUnavailable: calculateHours()
      }

      const response = await fetch(getApiUrl('/resource-capacity/unavailability'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success('Unavailability request submitted')
        onSaved()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to submit request')
      }
    } catch (error) {
      toast.error('Failed to submit request')
    } finally {
      setSaving(false)
    }
  }

  const selectedType = UNAVAILABILITY_TYPES.find(t => t.value === formData.unavailabilityType)
  const TypeIcon = selectedType?.icon || Calendar

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5" />
            Request Time Off
          </DialogTitle>
          <DialogDescription>
            Submit an unavailability request for approval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Selection (if not preset) */}
          {!userId && (
            <div className="space-y-2">
              <Label>Resource</Label>
              <Select 
                value={formData.userId} 
                onValueChange={(value: string) => setFormData(prev => ({ ...prev, userId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} {user.id === currentUserId ? '(You)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Type */}
          <div className="space-y-2">
            <Label>Type of Leave</Label>
            <Select 
              value={formData.unavailabilityType} 
              onValueChange={(value: string) => setFormData(prev => ({ ...prev, unavailabilityType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNAVAILABILITY_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.endDate}
                min={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Full Day Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Full Day</Label>
              <p className="text-xs text-muted-foreground">
                Toggle off for partial day requests
              </p>
            </div>
            <Switch
              checked={formData.isFullDay}
              onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isFullDay: checked }))}
            />
          </div>

          {/* Time Range (if not full day) */}
          {!formData.isFullDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add any relevant details..."
              rows={3}
            />
          </div>

          {/* Hours Summary */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>Total Hours</span>
            </div>
            <span className="font-semibold">{calculateHours().toFixed(1)}h</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

