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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Loader2, Clock, Target, Calendar, Building2 } from '@/components/ui/icons-shim'
import { toast } from 'sonner'
import { getApiUrl } from '@/lib/api-url'

interface CapacitySettings {
  id?: string
  userId: string
  userName?: string
  userEmail?: string
  contractedHoursPerWeek: number
  contractedHoursPerDay: number
  contractedDaysPerWeek: number
  workStartTime: string
  workEndTime: string
  timezone: string
  targetUtilizationPercent: number
  maxAllocationPercent: number
  minAllocationPercent: number
  annualLeaveDays: number
  publicHolidaysCalendar: string
  resourceType: string
  costCenter?: string
  department?: string
  effectiveFrom: string
  effectiveUntil?: string
  isActive: boolean
}

interface CapacitySettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string | null
  onSaved: () => void
}

export function CapacitySettingsDialog({ 
  open, 
  onOpenChange, 
  userId, 
  onSaved 
}: CapacitySettingsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const [settings, setSettings] = useState<Partial<CapacitySettings>>({
    contractedHoursPerWeek: 40,
    contractedHoursPerDay: 8,
    contractedDaysPerWeek: 5,
    workStartTime: '09:00',
    workEndTime: '17:00',
    timezone: 'UTC',
    targetUtilizationPercent: 80,
    maxAllocationPercent: 100,
    minAllocationPercent: 0,
    annualLeaveDays: 25,
    publicHolidaysCalendar: 'US',
    resourceType: 'full-time',
    effectiveFrom: new Date().toISOString().split('T')[0],
    isActive: true
  })

  useEffect(() => {
    if (open) {
      // Reset settings state when dialog opens to avoid stale data
      setSettings({
        contractedHoursPerWeek: 40,
        contractedHoursPerDay: 8,
        contractedDaysPerWeek: 5,
        workStartTime: '09:00',
        workEndTime: '17:00',
        timezone: 'UTC',
        targetUtilizationPercent: 80,
        maxAllocationPercent: 100,
        minAllocationPercent: 0,
        annualLeaveDays: 25,
        publicHolidaysCalendar: 'US',
        resourceType: 'full-time',
        effectiveFrom: new Date().toISOString().split('T')[0],
        isActive: true
      })
      void fetchUsers()
      if (userId) {
        void fetchSettings(userId)
      }
    }
  }, [open, userId])

  // Update settings with user info when users list is loaded
  useEffect(() => {
    if (userId && users.length > 0 && settings.userId === userId && !settings.userName) {
      const user = users.find(u => u.id === userId)
      if (user) {
        setSettings(prev => ({
          ...prev,
          userName: user.name || '',
          userEmail: user.email || ''
        }))
      }
    }
  }, [users, userId, settings.userId, settings.userName])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(getApiUrl('/users'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        // Handle different possible response formats:
        // - { users: [...] } from /users endpoint
        // - { data: [...] } from other endpoints
        // - [...] direct array
        const usersList = Array.isArray(data.users) ? data.users : 
                          Array.isArray(data.data) ? data.data : 
                          Array.isArray(data) ? data : []
        setUsers(usersList)
      }
    } catch (error) {
      console.error('[CAPACITY] Failed to fetch users:', error)
      setUsers([]) // Ensure users is always an array on error
    }
  }

  const fetchSettings = async (id: string) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch(getApiUrl(`/resource-capacity/settings/${id}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        console.log('[CAPACITY] Fetched settings response:', { userId: id, data })
        if (data.data) {
          // Existing settings found - normalize formats
          const normalized = {
            ...data.data,
            // Convert time from "HH:MM:SS" to "HH:MM"
            workStartTime: data.data.workStartTime ? data.data.workStartTime.split(':').slice(0, 2).join(':') : '09:00',
            workEndTime: data.data.workEndTime ? data.data.workEndTime.split(':').slice(0, 2).join(':') : '17:00',
            // Convert ISO date to YYYY-MM-DD format
            effectiveFrom: data.data.effectiveFrom ? new Date(data.data.effectiveFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            effectiveUntil: data.data.effectiveUntil ? new Date(data.data.effectiveUntil).toISOString().split('T')[0] : null
          }
          console.log('[CAPACITY] Normalized settings:', normalized)
          setSettings(normalized)
        } else {
          // No settings found - set defaults with user ID
          console.log('[CAPACITY] No settings found for user, using defaults:', id)
          // Find the user from the users list to get name/email
          const user = users.find(u => u.id === id)
          setSettings({
            userId: id,
            userName: user?.name || '',
            userEmail: user?.email || '',
            contractedHoursPerWeek: 40,
            contractedHoursPerDay: 8,
            contractedDaysPerWeek: 5,
            workStartTime: '09:00',
            workEndTime: '17:00',
            timezone: 'UTC',
            targetUtilizationPercent: 80,
            maxAllocationPercent: 100,
            minAllocationPercent: 0,
            annualLeaveDays: 25,
            publicHolidaysCalendar: 'US',
            resourceType: 'full-time',
            effectiveFrom: new Date().toISOString().split('T')[0],
            isActive: true
          })
        }
      } else {
        // API error - still set the user ID with defaults
        console.warn('[CAPACITY] Failed to fetch settings, status:', response.status)
        const user = users.find(u => u.id === id)
        setSettings({
          userId: id,
          userName: user?.name || '',
          userEmail: user?.email || '',
          contractedHoursPerWeek: 40,
          contractedHoursPerDay: 8,
          contractedDaysPerWeek: 5,
          workStartTime: '09:00',
          workEndTime: '17:00',
          timezone: 'UTC',
          targetUtilizationPercent: 80,
          maxAllocationPercent: 100,
          minAllocationPercent: 0,
          annualLeaveDays: 25,
          publicHolidaysCalendar: 'US',
          resourceType: 'full-time',
          effectiveFrom: new Date().toISOString().split('T')[0],
          isActive: true
        })
      }
    } catch (error) {
      console.error('[CAPACITY] Failed to fetch settings:', error)
      // On error, still set the user ID with defaults
      const user = users.find(u => u.id === id)
      setSettings({
        userId: id,
        userName: user?.name || '',
        userEmail: user?.email || '',
        contractedHoursPerWeek: 40,
        contractedHoursPerDay: 8,
        contractedDaysPerWeek: 5,
        workStartTime: '09:00',
        workEndTime: '17:00',
        timezone: 'UTC',
        targetUtilizationPercent: 80,
        maxAllocationPercent: 100,
        minAllocationPercent: 0,
        annualLeaveDays: 25,
        publicHolidaysCalendar: 'US',
        resourceType: 'full-time',
        effectiveFrom: new Date().toISOString().split('T')[0],
        isActive: true
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings.userId) {
      toast.error('Please select a user')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('auth_token')
      
      // Prepare payload: convert time format and remove disallowed fields
      const payload: any = {
        // Include id if it exists (for updating existing settings)
        ...(settings.id && { id: settings.id }),
        userId: settings.userId,
        contractedHoursPerWeek: Number(settings.contractedHoursPerWeek) || 40,
        contractedHoursPerDay: Number(settings.contractedHoursPerDay) || 8,
        contractedDaysPerWeek: Number(settings.contractedDaysPerWeek) || 5,
        // Convert time from "HH:MM:SS" or "HH:MM" to "HH:MM"
        workStartTime: (settings.workStartTime || '09:00').split(':').slice(0, 2).join(':'),
        workEndTime: (settings.workEndTime || '17:00').split(':').slice(0, 2).join(':'),
        timezone: settings.timezone || 'UTC',
        targetUtilizationPercent: Number(settings.targetUtilizationPercent) || 80,
        maxAllocationPercent: Number(settings.maxAllocationPercent) || 100,
        minAllocationPercent: Number(settings.minAllocationPercent) || 0,
        annualLeaveDays: Number(settings.annualLeaveDays) || 25,
        publicHolidaysCalendar: settings.publicHolidaysCalendar || 'US',
        resourceType: settings.resourceType || 'full-time',
        costCenter: settings.costCenter || null,
        department: settings.department || null,
        // Ensure date is in YYYY-MM-DD format (not ISO string)
        effectiveFrom: settings.effectiveFrom 
          ? (settings.effectiveFrom.includes('T') 
              ? new Date(settings.effectiveFrom).toISOString().split('T')[0]
              : settings.effectiveFrom)
          : new Date().toISOString().split('T')[0],
        effectiveUntil: settings.effectiveUntil 
          ? (settings.effectiveUntil.includes('T')
              ? new Date(settings.effectiveUntil).toISOString().split('T')[0]
              : settings.effectiveUntil)
          : null,
        isActive: settings.isActive !== false
      }
      
      const response = await fetch(getApiUrl('/resource-capacity/settings'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.data) {
          // Update local state with saved data (normalized)
          const savedData = result.data
          const normalized = {
            ...savedData,
            // Convert time from "HH:MM:SS" to "HH:MM"
            workStartTime: savedData.workStartTime ? savedData.workStartTime.split(':').slice(0, 2).join(':') : '09:00',
            workEndTime: savedData.workEndTime ? savedData.workEndTime.split(':').slice(0, 2).join(':') : '17:00',
            // Convert ISO date to YYYY-MM-DD format
            effectiveFrom: savedData.effectiveFrom ? new Date(savedData.effectiveFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            effectiveUntil: savedData.effectiveUntil ? new Date(savedData.effectiveUntil).toISOString().split('T')[0] : null
          }
          setSettings(normalized)
        }
        toast.success('Capacity settings saved')
        onSaved()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save settings')
      }
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleUserChange = (newUserId: string) => {
    setSettings(prev => ({ ...prev, userId: newUserId }))
    void fetchSettings(newUserId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resource Capacity Settings</DialogTitle>
          <DialogDescription>
            Configure working hours, utilization targets, and availability for a resource
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* User Selection */}
            <div className="space-y-2">
              <Label>Resource</Label>
              <Select 
                value={settings.userId || ''} 
                onValueChange={handleUserChange}
                disabled={!!userId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(users) && users.length > 0 ? (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || 'Unknown'} ({user.email})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__placeholder" disabled>
                      No users available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Resource Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Resource Type</Label>
                <Select 
                  value={settings.resourceType || 'full-time'} 
                  onValueChange={(value) => setSettings(prev => ({ ...prev, resourceType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={settings.department || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="e.g., Engineering"
                />
              </div>
            </div>

            {/* Working Hours */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Working Hours
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Hours/Week</Label>
                  <Input
                    type="number"
                    min={0}
                    max={168}
                    value={settings.contractedHoursPerWeek || 40}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      contractedHoursPerWeek: Number(e.target.value),
                      contractedHoursPerDay: Number(e.target.value) / (prev.contractedDaysPerWeek || 5)
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Days/Week</Label>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={settings.contractedDaysPerWeek || 5}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      contractedDaysPerWeek: Number(e.target.value),
                      contractedHoursPerDay: (prev.contractedHoursPerWeek || 40) / Number(e.target.value)
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hours/Day</Label>
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    value={Number(settings.contractedHoursPerDay || 8).toFixed(1)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Work Start</Label>
                  <Input
                    type="time"
                    value={settings.workStartTime || '09:00'}
                    onChange={(e) => setSettings(prev => ({ ...prev, workStartTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Work End</Label>
                  <Input
                    type="time"
                    value={settings.workEndTime || '17:00'}
                    onChange={(e) => setSettings(prev => ({ ...prev, workEndTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select 
                    value={settings.timezone || 'UTC'} 
                    onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern (US)</SelectItem>
                      <SelectItem value="America/Chicago">Central (US)</SelectItem>
                      <SelectItem value="America/Denver">Mountain (US)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific (US)</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Europe/Amsterdam">Amsterdam</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      <SelectItem value="Asia/Singapore">Singapore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Utilization Targets */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Utilization Targets
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Target Utilization</Label>
                    <span className="text-sm font-medium">{settings.targetUtilizationPercent || 80}%</span>
                  </div>
                  <Slider
                    value={[settings.targetUtilizationPercent || 80]}
                    onValueChange={([value]) => setSettings(prev => ({ ...prev, targetUtilizationPercent: value }))}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ideal allocation percentage for this resource (typically 80%)
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Maximum Allocation</Label>
                    <span className="text-sm font-medium">{settings.maxAllocationPercent || 100}%</span>
                  </div>
                  <Slider
                    value={[settings.maxAllocationPercent || 100]}
                    onValueChange={([value]) => setSettings(prev => ({ ...prev, maxAllocationPercent: value }))}
                    min={0}
                    max={150}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum allowed allocation before triggering over-allocation warnings
                  </p>
                </div>
              </div>
            </div>

            {/* Leave Settings */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Leave Settings
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Annual Leave Days</Label>
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    value={settings.annualLeaveDays || 25}
                    onChange={(e) => setSettings(prev => ({ ...prev, annualLeaveDays: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Holiday Calendar</Label>
                  <Select 
                    value={settings.publicHolidaysCalendar || 'US'} 
                    onValueChange={(value) => setSettings(prev => ({ ...prev, publicHolidaysCalendar: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="NL">Netherlands</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Effective Period */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Effective Period
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Effective From</Label>
                  <Input
                    type="date"
                    value={settings.effectiveFrom || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSettings(prev => ({ ...prev, effectiveFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Effective Until (optional)</Label>
                  <Input
                    type="date"
                    value={settings.effectiveUntil || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, effectiveUntil: e.target.value || undefined }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cost Center (optional)</Label>
                <Input
                  value={settings.costCenter || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, costCenter: e.target.value }))}
                  placeholder="e.g., CC-12345"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

