"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Users, 
  Zap, 
  CheckCircle, 
  Target, 
  BarChart3, 
  AlertCircle, 
  Activity, 
  Eye, 
  Loader2, 
  Plus, 
  Edit, 
  Trash2,
  Filter,
  X,
  UserCheck
} from "lucide-react"

interface Stakeholder {
  id: string
  project_id: string
  name?: string
  role: string
  department?: string
  email: string
  phone?: string
  interest_level: 'high' | 'medium' | 'low'
  influence_level: 'high' | 'medium' | 'low'
  engagement_approach: 'manage_closely' | 'keep_satisfied' | 'keep_informed' | 'monitor'
  communication_frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'as_needed'
  stakeholder_type: 'internal' | 'external'
  stakeholder_category: 'primary' | 'secondary'
  expectations?: string
  potential_impact?: string
  is_team_member?: boolean
  created_at: string
  updated_at: string
}

interface StakeholdersTabProps {
  stakeholders: Stakeholder[]
  stakeholdersLoading: boolean
  onAddStakeholder: () => void
  onEditStakeholder: (stakeholder: Stakeholder) => void
  onDeleteStakeholder: (id: string) => Promise<void>
}

// Helper functions for stakeholder display
const getInterestLevelColor = (level: string) => {
  switch (level) {
    case "high":
      return "destructive"
    case "medium":
      return "secondary"
    case "low":
      return "outline"
    default:
      return "secondary"
  }
}

const getInfluenceLevelColor = (level: string) => {
  switch (level) {
    case "high":
      return "default"
    case "medium":
      return "secondary"
    case "low":
      return "outline"
    default:
      return "secondary"
  }
}

const getEngagementApproachColor = (approach: string) => {
  switch (approach) {
    case "manage_closely":
      return "default"
    case "keep_satisfied":
      return "secondary"
    case "keep_informed":
      return "outline"
    case "monitor":
      return "destructive"
    default:
      return "secondary"
  }
}

const formatEngagementApproach = (approach: string) => {
  switch (approach) {
    case "manage_closely":
      return "Manage Closely"
    case "keep_satisfied":
      return "Keep Satisfied"
    case "keep_informed":
      return "Keep Informed"
    case "monitor":
      return "Monitor"
    default:
      return approach
  }
}

const formatCommunicationFrequency = (frequency: string) => {
  switch (frequency) {
    case "daily":
      return "Daily"
    case "weekly":
      return "Weekly"
    case "bi_weekly":
      return "Bi-weekly"
    case "monthly":
      return "Monthly"
    case "as_needed":
      return "As Needed"
    default:
      return frequency
  }
}

export function StakeholdersTab({ 
  stakeholders, 
  stakeholdersLoading,
  onAddStakeholder,
  onEditStakeholder,
  onDeleteStakeholder 
}: StakeholdersTabProps) {
  // Filter state
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [teamMemberFilter, setTeamMemberFilter] = useState<string>("all")
  const [interestLevelFilter, setInterestLevelFilter] = useState<string>("all")
  const [influenceLevelFilter, setInfluenceLevelFilter] = useState<string>("all")
  const [communicationFilter, setCommunicationFilter] = useState<string>("all")
  const [engagementFilter, setEngagementFilter] = useState<string>("all")

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set<string>()
    stakeholders.forEach(s => {
      if (s.department) depts.add(s.department)
    })
    return Array.from(depts).sort()
  }, [stakeholders])

  // Filter stakeholders
  const filteredStakeholders = useMemo(() => {
    return stakeholders.filter(stakeholder => {
      if (departmentFilter !== "all" && stakeholder.department !== departmentFilter) return false
      if (typeFilter !== "all" && stakeholder.stakeholder_type !== typeFilter) return false
      if (teamMemberFilter !== "all") {
        const isTeamMember = stakeholder.stakeholder_type === 'internal' && (stakeholder as any).is_team_member === true
        if (teamMemberFilter === "yes" && !isTeamMember) return false
        if (teamMemberFilter === "no" && isTeamMember) return false
      }
      if (interestLevelFilter !== "all" && stakeholder.interest_level !== interestLevelFilter) return false
      if (influenceLevelFilter !== "all" && stakeholder.influence_level !== influenceLevelFilter) return false
      if (communicationFilter !== "all" && stakeholder.communication_frequency !== communicationFilter) return false
      if (engagementFilter !== "all" && stakeholder.engagement_approach !== engagementFilter) return false
      return true
    })
  }, [stakeholders, departmentFilter, typeFilter, teamMemberFilter, interestLevelFilter, influenceLevelFilter, communicationFilter, engagementFilter])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (departmentFilter !== "all") count++
    if (typeFilter !== "all") count++
    if (teamMemberFilter !== "all") count++
    if (interestLevelFilter !== "all") count++
    if (influenceLevelFilter !== "all") count++
    if (communicationFilter !== "all") count++
    if (engagementFilter !== "all") count++
    return count
  }, [departmentFilter, typeFilter, teamMemberFilter, interestLevelFilter, influenceLevelFilter, communicationFilter, engagementFilter])

  // Clear all filters
  const clearFilters = () => {
    setDepartmentFilter("all")
    setTypeFilter("all")
    setTeamMemberFilter("all")
    setInterestLevelFilter("all")
    setInfluenceLevelFilter("all")
    setCommunicationFilter("all")
    setEngagementFilter("all")
  }

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <CardTitle>Filters</CardTitle>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount} active
                </Badge>
              )}
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Department Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Internal/External Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Team Member Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Team Member</label>
              <Select value={teamMemberFilter} onValueChange={setTeamMemberFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Team Members Only</SelectItem>
                  <SelectItem value="no">Non-Team Members</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Interest Level Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Interest Level</label>
              <Select value={interestLevelFilter} onValueChange={setInterestLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Influence Level Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Influence Level</label>
              <Select value={influenceLevelFilter} onValueChange={setInfluenceLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Communication Frequency Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Communication</label>
              <Select value={communicationFilter} onValueChange={setCommunicationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Frequencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Frequencies</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="as_needed">As Needed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Engagement Approach Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Engagement Approach</label>
              <Select value={engagementFilter} onValueChange={setEngagementFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Approaches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Approaches</SelectItem>
                  <SelectItem value="manage_closely">Manage Closely</SelectItem>
                  <SelectItem value="keep_satisfied">Keep Satisfied</SelectItem>
                  <SelectItem value="keep_informed">Keep Informed</SelectItem>
                  <SelectItem value="monitor">Monitor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stakeholder Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Stakeholders</p>
                <p className="text-2xl font-bold">
                  {filteredStakeholders.length}
                  {activeFilterCount > 0 && (
                    <span className="text-sm text-muted-foreground font-normal ml-1">
                      / {stakeholders.length}
                    </span>
                  )}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">
                  {filteredStakeholders.filter(s => s.stakeholder_type === 'internal' && (s as any).is_team_member === true).length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Influence</p>
                <p className="text-2xl font-bold">{filteredStakeholders.filter(s => s.influence_level === 'high').length}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Internal</p>
                <p className="text-2xl font-bold">{filteredStakeholders.filter(s => s.stakeholder_type === 'internal').length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Primary</p>
                <p className="text-2xl font-bold">{filteredStakeholders.filter(s => s.stakeholder_category === 'primary').length}</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stakeholder Management</h2>
          <p className="text-muted-foreground">Analyze and engage with project stakeholders</p>
        </div>
        <Button onClick={onAddStakeholder}>
          <Plus className="h-4 w-4 mr-2" />
          Add Stakeholder
        </Button>
      </div>

      {/* Power/Interest Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Power/Interest Matrix
          </CardTitle>
          <CardDescription>Stakeholder positioning based on influence and interest levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
            {/* High Interest, High Power - Manage Closely */}
            <div className="p-4 border-2 border-red-300 bg-red-50 dark:bg-red-900/10 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold text-red-900 dark:text-red-100">Manage Closely</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-2">High Interest • High Influence</p>
              <div className="space-y-1">
                {filteredStakeholders.filter(s => s.interest_level === 'high' && s.influence_level === 'high').length > 0 ? (
                  filteredStakeholders.filter(s => s.interest_level === 'high' && s.influence_level === 'high').map(s => (
                    <Badge key={s.id} variant="destructive" className="mr-1 mb-1">{s.role}</Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No stakeholders</p>
                )}
              </div>
            </div>

            {/* Low Interest, High Power - Keep Satisfied */}
            <div className="p-4 border-2 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-yellow-600" />
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">Keep Satisfied</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Low Interest • High Influence</p>
              <div className="space-y-1">
                {filteredStakeholders.filter(s => s.interest_level === 'low' && s.influence_level === 'high').length > 0 ? (
                  filteredStakeholders.filter(s => s.interest_level === 'low' && s.influence_level === 'high').map(s => (
                    <Badge key={s.id} variant="secondary" className="mr-1 mb-1">{s.role}</Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No stakeholders</p>
                )}
              </div>
            </div>

            {/* High Interest, Low Power - Keep Informed */}
            <div className="p-4 border-2 border-blue-300 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">Keep Informed</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-2">High Interest • Low Influence</p>
              <div className="space-y-1">
                {filteredStakeholders.filter(s => s.interest_level === 'high' && s.influence_level === 'low').length > 0 ? (
                  filteredStakeholders.filter(s => s.interest_level === 'high' && s.influence_level === 'low').map(s => (
                    <Badge key={s.id} variant="default" className="mr-1 mb-1">{s.role}</Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No stakeholders</p>
                )}
              </div>
            </div>

            {/* Low Interest, Low Power - Monitor */}
            <div className="p-4 border-2 border-gray-300 bg-gray-50 dark:bg-gray-900/10 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-5 w-5 text-gray-600" />
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Monitor</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Low Interest • Low Influence</p>
              <div className="space-y-1">
                {filteredStakeholders.filter(s => s.interest_level === 'low' && s.influence_level === 'low').length > 0 ? (
                  filteredStakeholders.filter(s => s.interest_level === 'low' && s.influence_level === 'low').map(s => (
                    <Badge key={s.id} variant="outline" className="mr-1 mb-1">{s.role}</Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No stakeholders</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state for stakeholders */}
      {stakeholdersLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading stakeholders...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStakeholders.length > 0 ? (
            filteredStakeholders.map((stakeholder) => (
              <Card key={stakeholder.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                      {/* Header with role as primary identifier */}
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{stakeholder.role}</h3>
                          <p className="text-muted-foreground">
                            {stakeholder.name ? `${stakeholder.name} • ` : ''}{stakeholder.department}
                          </p>
                          <div className="flex items-center space-x-2 mt-1 flex-wrap gap-1">
                            <Badge variant={stakeholder.stakeholder_type === 'internal' ? 'default' : 'secondary'}>
                              {stakeholder.stakeholder_type === 'internal' ? 'Internal' : 'External'}
                            </Badge>
                            <Badge variant={stakeholder.stakeholder_category === 'primary' ? 'default' : 'outline'}>
                              {stakeholder.stakeholder_category === 'primary' ? 'Primary' : 'Secondary'}
                            </Badge>
                            {stakeholder.stakeholder_type === 'internal' && (stakeholder as any).is_team_member === true && (
                              <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                Team Member
                              </Badge>
                            )}
                            {!stakeholder.name && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                To Be Recruited
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Email</p>
                          <p className="text-sm">{stakeholder.email}</p>
                        </div>
                        {stakeholder.phone && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Phone</p>
                            <p className="text-sm">{stakeholder.phone}</p>
                          </div>
                        )}
                      </div>

                      {/* PMBOK Parameters */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Interest Level</p>
                          <Badge variant={getInterestLevelColor(stakeholder.interest_level)}>
                            {stakeholder.interest_level.charAt(0).toUpperCase() + stakeholder.interest_level.slice(1)}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Influence Level</p>
                          <Badge variant={getInfluenceLevelColor(stakeholder.influence_level)}>
                            {stakeholder.influence_level.charAt(0).toUpperCase() + stakeholder.influence_level.slice(1)}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Engagement Approach</p>
                          <Badge variant={getEngagementApproachColor(stakeholder.engagement_approach)}>
                            {formatEngagementApproach(stakeholder.engagement_approach)}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Communication</p>
                          <Badge variant="outline">
                            {formatCommunicationFrequency(stakeholder.communication_frequency)}
                          </Badge>
                        </div>
                      </div>

                      {/* Expectations and Impact */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Expectations</p>
                          <p className="text-sm">{stakeholder.expectations || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Potential Impact</p>
                          <p className="text-sm">{stakeholder.potential_impact || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onEditStakeholder(stakeholder)}
                        aria-label={`Edit stakeholder ${stakeholder.role}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onDeleteStakeholder(stakeholder.id)}
                        className="text-destructive hover:text-destructive"
                        aria-label={`Delete stakeholder ${stakeholder.role}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {activeFilterCount > 0 ? "No stakeholders match your filters" : "No stakeholders found"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {activeFilterCount > 0 
                  ? "Try adjusting your filters or clear them to see all stakeholders"
                  : "Start by adding stakeholders or creating placeholders for roles that need to be recruited"
                }
              </p>
              {activeFilterCount > 0 ? (
                <Button onClick={clearFilters} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={onAddStakeholder}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Stakeholder
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

