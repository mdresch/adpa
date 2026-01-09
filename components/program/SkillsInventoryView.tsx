"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Award, Users, AlertCircle } from '@/components/ui/icons-shim'
import { toast } from 'sonner'
import { getApiUrl } from '@/lib/api-url'

interface Skill {
  id: string
  userId: string
  skillName: string
  skillCategory: string
  proficiencyLevel: string
  proficiencyScore?: number
  isCertified: boolean
  certificationName?: string
  yearsExperience: number
}

interface SkillsGap {
  skillName: string
  requiredCount: number
  availableExperts: number
  availableResources: number
  gapStatus: 'met' | 'partial' | 'gap'
}

interface SkillsInventoryViewProps {
  programId: string
}

export function SkillsInventoryView({ programId }: SkillsInventoryViewProps) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [gaps, setGaps] = useState<SkillsGap[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'inventory' | 'gaps'>('inventory')
  const [formData, setFormData] = useState({
    userId: '',
    skillName: '',
    skillCategory: 'technical',
    proficiencyLevel: 'intermediate',
    proficiencyScore: '',
    isCertified: false,
    certificationName: '',
    yearsExperience: '0'
  })

  useEffect(() => {
    void fetchSkills()
    void fetchGaps()
  }, [programId])

  const fetchSkills = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        getApiUrl(`/programs/${programId}/resources/skills`),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setSkills(data.data || [])
      }
    } catch (error) {
      console.error('[RESOURCES] Failed to fetch skills:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGaps = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        getApiUrl(`/programs/${programId}/resources/skills/gap`),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setGaps(data.data || [])
      }
    } catch (error) {
      console.error('[RESOURCES] Failed to fetch skills gap:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const payload = {
        userId: formData.userId,
        skillName: formData.skillName,
        skillCategory: formData.skillCategory,
        proficiencyLevel: formData.proficiencyLevel,
        proficiencyScore: formData.proficiencyScore ? parseInt(formData.proficiencyScore) : undefined,
        isCertified: formData.isCertified,
        certificationName: formData.certificationName || undefined,
        yearsExperience: parseInt(formData.yearsExperience)
      }

      const response = await fetch(
        getApiUrl(`/programs/${programId}/resources/skills`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )

      if (response.ok) {
        toast.success('Skill added successfully')
        setShowDialog(false)
        setFormData({
          userId: '',
          skillName: '',
          skillCategory: 'technical',
          proficiencyLevel: 'intermediate',
          proficiencyScore: '',
          isCertified: false,
          certificationName: '',
          yearsExperience: '0'
        })
        void fetchSkills()
        void fetchGaps()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to add skill')
      }
    } catch (error) {
      console.error('[RESOURCES] Failed to add skill:', error)
      toast.error('Failed to add skill')
    }
  }

  const getProficiencyBadge = (level: string) => {
    const variants: Record<string, string> = {
      beginner: 'bg-blue-100 text-blue-800 border-blue-300',
      intermediate: 'bg-green-100 text-green-800 border-green-300',
      advanced: 'bg-orange-100 text-orange-800 border-orange-300',
      expert: 'bg-purple-100 text-purple-800 border-purple-300'
    }
    return variants[level] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getGapBadge = (status: string) => {
    const variants: Record<string, string> = {
      met: 'bg-green-100 text-green-800 border-green-300',
      partial: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      gap: 'bg-red-100 text-red-800 border-red-300'
    }
    return variants[status] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Skills Inventory</h3>
          <p className="text-sm text-muted-foreground">
            Track team skills and identify gaps
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'inventory' ? 'default' : 'outline'}
            onClick={() => setActiveTab('inventory')}
          >
            Inventory
          </Button>
          <Button
            variant={activeTab === 'gaps' ? 'default' : 'outline'}
            onClick={() => setActiveTab('gaps')}
          >
            Skills Gap
          </Button>
          <Button onClick={() => setShowDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Skill
          </Button>
        </div>
      </div>

      {activeTab === 'inventory' && (
        <>
          {skills.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No skills recorded yet</p>
                <Button onClick={() => setShowDialog(true)} variant="outline">
                  Add First Skill
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <Card key={skill.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{skill.skillName}</CardTitle>
                        <CardDescription className="mt-1">{skill.skillCategory}</CardDescription>
                      </div>
                      {skill.isCertified && (
                        <Award className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Proficiency:</span>
                        <Badge className={getProficiencyBadge(skill.proficiencyLevel)}>
                          {skill.proficiencyLevel}
                        </Badge>
                      </div>
                      {skill.proficiencyScore && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Score:</span>
                          <span className="text-sm font-medium">{skill.proficiencyScore}/100</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Experience:</span>
                        <span className="text-sm font-medium">{skill.yearsExperience} years</span>
                      </div>
                      {skill.certificationName && (
                        <div className="flex items-center gap-1 text-sm">
                          <Award className="h-4 w-4 text-yellow-600" />
                          <span className="text-muted-foreground">{skill.certificationName}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'gaps' && (
        <>
          {gaps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No skills gap analysis available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add skills and resource plans to see gap analysis
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {gaps.map((gap, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{gap.skillName}</CardTitle>
                      <Badge className={getGapBadge(gap.gapStatus)}>
                        {gap.gapStatus}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Required</p>
                        <p className="font-medium text-lg">{gap.requiredCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Available (Expert)</p>
                        <p className="font-medium text-lg">{gap.availableExperts}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Available (Total)</p>
                        <p className="font-medium text-lg">{gap.availableResources}</p>
                      </div>
                    </div>
                    {gap.gapStatus === 'gap' && (
                      <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <p className="text-sm text-red-800">
                          Skill gap detected. Consider training or hiring.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Skill Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Skill to Inventory</DialogTitle>
            <DialogDescription>
              Record a team member's skill for this program
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="userId">User ID *</Label>
              <Input
                id="userId"
                value={formData.userId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, userId: e.target.value })}
                placeholder="user-uuid"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="skillName">Skill Name *</Label>
                <Input
                  id="skillName"
                  value={formData.skillName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, skillName: e.target.value })}
                  placeholder="JavaScript"
                />
              </div>
              <div>
                <Label htmlFor="skillCategory">Category *</Label>
                <Select
                  value={formData.skillCategory}
                  onValueChange={(value: string) => setFormData({ ...formData, skillCategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="leadership">Leadership</SelectItem>
                    <SelectItem value="domain">Domain</SelectItem>
                    <SelectItem value="tool">Tool</SelectItem>
                    <SelectItem value="soft">Soft Skills</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="proficiencyLevel">Proficiency Level *</Label>
                <Select
                  value={formData.proficiencyLevel}
                  onValueChange={(value: string) => setFormData({ ...formData, proficiencyLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="yearsExperience">Years Experience</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  min="0"
                  value={formData.yearsExperience}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, yearsExperience: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="proficiencyScore">Proficiency Score (1-100)</Label>
              <Input
                id="proficiencyScore"
                type="number"
                min="1"
                max="100"
                value={formData.proficiencyScore}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, proficiencyScore: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="certificationName">Certification Name (Optional)</Label>
              <Input
                id="certificationName"
                value={formData.certificationName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, certificationName: e.target.value })}
                placeholder="AWS Certified Solutions Architect"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Add Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

