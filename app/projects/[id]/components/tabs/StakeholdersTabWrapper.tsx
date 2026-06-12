"use client"

import React, { useState, useEffect } from "react"
import { StakeholdersTab } from "../StakeholdersTab"
import { apiClient, Stakeholder } from "@/lib/api"
import { toast } from '@/lib/notify'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function StakeholdersTabWrapper({ projectId }: { projectId: string }) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [stakeholdersLoading, setStakeholdersLoading] = useState(true)
  const [stakeholderDialogOpen, setStakeholderDialogOpen] = useState(false)
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null)
  const [savingStakeholder, setSavingStakeholder] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [linkingUser, setLinkingUser] = useState(false)

  const [stakeholderForm, setStakeholderForm] = useState<{
    name: string
    role: string
    department: string
    email: string
    phone: string
    interest_level: 'high' | 'medium' | 'low'
    influence_level: 'high' | 'medium' | 'low'
    engagement_approach: 'manage_closely' | 'keep_satisfied' | 'keep_informed' | 'monitor'
    communication_frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'as_needed'
    stakeholder_type: 'internal' | 'external'
    stakeholder_category: 'primary' | 'secondary'
    expectations: string
    potential_impact: string
    is_team_member: boolean
  }>({
    name: "",
    role: "",
    department: "",
    email: "",
    phone: "",
    interest_level: "medium",
    influence_level: "medium",
    engagement_approach: "keep_informed",
    communication_frequency: "weekly",
    stakeholder_type: "internal",
    stakeholder_category: "primary",
    expectations: "",
    potential_impact: "",
    is_team_member: false
  })

  const fetchStakeholders = async () => {
    try {
      setStakeholdersLoading(true)
      const data: any = await apiClient.getProjectStakeholders(projectId)
      setStakeholders(Array.isArray(data.stakeholders) ? data.stakeholders : [])
    } catch (error) {
      console.error("Failed to fetch stakeholders:", error)
      setStakeholders([])
    } finally {
      setStakeholdersLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const data: any = await apiClient.getUsers()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    if (projectId) fetchStakeholders()
  }, [projectId])

  const handleAddStakeholder = () => {
    setEditingStakeholder(null)
    setStakeholderForm({
      name: "",
      role: "",
      department: "",
      email: "",
      phone: "",
      interest_level: "medium",
      influence_level: "medium",
      engagement_approach: "keep_informed",
      communication_frequency: "weekly",
      stakeholder_type: "internal",
      stakeholder_category: "primary",
      expectations: "",
      potential_impact: "",
      is_team_member: false
    })
    setStakeholderDialogOpen(true)
    fetchUsers()
  }

  const handleCloseStakeholderDialog = (open: boolean) => {
    setStakeholderDialogOpen(open)
    if (!open) {
      setEditingStakeholder(null)
    }
  }

  const handleEditStakeholder = (stakeholder: Stakeholder) => {
    setEditingStakeholder(stakeholder)
    setSelectedUserId((stakeholder as any).user_id || "")
    setStakeholderForm({
      name: stakeholder.name ?? "",
      role: stakeholder.role ?? "",
      department: stakeholder.department ?? "",
      email: stakeholder.email ?? "",
      phone: stakeholder.phone ?? "",
      interest_level: stakeholder.interest_level ?? "medium",
      influence_level: stakeholder.influence_level ?? "medium",
      engagement_approach: stakeholder.engagement_approach ?? "keep_informed",
      communication_frequency: stakeholder.communication_frequency ?? "weekly",
      stakeholder_type: stakeholder.stakeholder_type ?? "internal",
      stakeholder_category: stakeholder.stakeholder_category ?? "primary",
      expectations: stakeholder.expectations ?? "",
      potential_impact: stakeholder.potential_impact ?? "",
      is_team_member: (stakeholder as any).is_team_member ?? false
    })
    setStakeholderDialogOpen(true)
    fetchUsers()
  }

  const handleSaveStakeholder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stakeholderForm.role || !stakeholderForm.email) {
      toast.error("Role and email are required fields")
      return
    }
    try {
      setSavingStakeholder(true)
      let savedStakeholder: Stakeholder

      if (editingStakeholder) {
        const response: any = await apiClient.updateStakeholder(editingStakeholder.id, stakeholderForm)
        savedStakeholder = response.stakeholder
        toast.success("Stakeholder updated successfully!")
      } else {
        const response: any = await apiClient.createStakeholder({
          project_id: projectId,
          ...stakeholderForm
        })
        savedStakeholder = response.stakeholder
        toast.success("Stakeholder added successfully!")
      }

      if (stakeholderForm.is_team_member) {
        const stakeholderId = savedStakeholder.id || editingStakeholder?.id
        const hasUserId = (savedStakeholder as any).user_id || (editingStakeholder as any)?.user_id

        if (!hasUserId) {
          try {
            const usersResponse: any = await apiClient.getUsers()
            const usersList = usersResponse.users || []
            const matchingUser = usersList.find((u: any) =>
              u.email?.toLowerCase() === stakeholderForm.email.toLowerCase()
            )

            if (matchingUser && stakeholderId) {
              await apiClient.linkStakeholderToUser(stakeholderId, matchingUser.id)
              toast.success("Stakeholder linked to user account automatically")
            } else {
              toast.warning(`No user found with email ${stakeholderForm.email}. Please create a user account first.`)
            }
          } catch (linkError) {
            console.error("Failed to link:", linkError)
            toast.warning(`Could not automatically link to user with email ${stakeholderForm.email}.`)
          }
        }
      }

      handleCloseStakeholderDialog(false)
      fetchStakeholders()
    } catch (error) {
      console.error("Failed to save stakeholder:", error)
      toast.error("Failed to save stakeholder")
    } finally {
      setSavingStakeholder(false)
    }
  }

  const handleLinkUser = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user account")
      return
    }
    if (!editingStakeholder) {
      toast.error("Please save the stakeholder first")
      return
    }
    try {
      setLinkingUser(true)
      await apiClient.linkStakeholderToUser(editingStakeholder.id, selectedUserId)
      toast.success("Stakeholder linked to user account successfully!")
      await fetchStakeholders()
      const updated = stakeholders.find(s => s.id === editingStakeholder.id)
      if (updated) setEditingStakeholder(updated)
    } catch (error: any) {
      console.error("Failed to link:", error)
      toast.error(error.response?.data?.error || "Failed to link to user account")
    } finally {
      setLinkingUser(false)
    }
  }

  const handleDeleteStakeholder = async (stakeholderId: string) => {
    if (!confirm("Are you sure you want to delete this stakeholder? This action cannot be undone.")) return
    try {
      await apiClient.deleteStakeholder(stakeholderId)
      toast.success("Stakeholder deleted successfully!")
      fetchStakeholders()
    } catch (error) {
      console.error("Failed to delete stakeholder:", error)
      toast.error("Failed to delete stakeholder")
    }
  }

  return (
    <>
      <StakeholdersTab
        stakeholders={stakeholders}
        stakeholdersLoading={stakeholdersLoading}
        projectId={projectId}
        onAddStakeholder={handleAddStakeholder}
        onEditStakeholder={handleEditStakeholder}
        onDeleteStakeholder={handleDeleteStakeholder}
      />

      <Dialog open={stakeholderDialogOpen} onOpenChange={handleCloseStakeholderDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveStakeholder}>
            <DialogHeader>
              <DialogTitle>
                {editingStakeholder ? 'Edit Stakeholder' : 'Add New Stakeholder'}
              </DialogTitle>
              <DialogDescription>
                {editingStakeholder
                  ? 'Update stakeholder information and PMBOK parameters.'
                  : 'Add a new stakeholder with their PMBOK management parameters.'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stakeholder-role" className="text-sm font-semibold">Role *</Label>
                  <Input
                    id="stakeholder-role"
                    placeholder="Enter role/title"
                    className="mt-2"
                    value={stakeholderForm.role}
                    onChange={(e) => setStakeholderForm(prev => ({ ...prev, role: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stakeholder-name" className="text-sm font-semibold">Name (Optional)</Label>
                  <Input
                    id="stakeholder-name"
                    placeholder="Enter stakeholder name"
                    className="mt-2"
                    value={stakeholderForm.name ?? ""}
                    onChange={(e) => setStakeholderForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stakeholder-email" className="text-sm font-semibold">Email *</Label>
                  <Input
                    id="stakeholder-email"
                    type="email"
                    className="mt-2"
                    value={stakeholderForm.email}
                    onChange={(e) => setStakeholderForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stakeholder-type" className="text-sm font-semibold">Stakeholder Type</Label>
                  <select
                    id="stakeholder-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                    value={stakeholderForm.stakeholder_type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const newType = e.target.value as 'internal' | 'external'
                      setStakeholderForm(prev => ({
                        ...prev,
                        stakeholder_type: newType,
                        is_team_member: newType === 'external' ? false : prev.is_team_member
                      }))
                    }}
                  >
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                  </select>
                </div>
              </div>

              {stakeholderForm.stakeholder_type === 'internal' && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is-team-member"
                      checked={stakeholderForm.is_team_member}
                      onChange={(e) => setStakeholderForm(prev => ({ ...prev, is_team_member: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="is-team-member" className="text-sm font-medium cursor-pointer">
                      Mark as Team Member
                    </Label>
                  </div>
                  {stakeholderForm.is_team_member && !(editingStakeholder as any)?.user_id && (
                    <div className="ml-6 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-2">
                      <p>⚠️ Team members must have a user account. System will attempt to link by email.</p>
                      {editingStakeholder && (
                        <div className="space-y-2 pt-2 border-t border-amber-300">
                          <p className="font-medium">Link to User Account Manually:</p>
                          <div className="flex gap-2">
                            <select
                              value={selectedUserId}
                              onChange={(e) => setSelectedUserId(e.target.value)}
                              className="flex-1 h-8 rounded-md border border-amber-300 bg-white px-2 text-xs"
                            >
                              <option value="">Select a user account...</option>
                              {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name || user.email}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleLinkUser}
                              disabled={!selectedUserId || linkingUser}
                            >
                              {linkingUser ? "Linking..." : "Link User"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleCloseStakeholderDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingStakeholder}>
                {savingStakeholder && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {savingStakeholder ? "Saving..." : (editingStakeholder ? "Update" : "Add")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
