"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useAuth } from "@/contexts/AuthContext"
import { Save, AlertTriangle, CheckCircle, Settings, Zap, Shield, TrendingUp, Users, FileText } from "lucide-react"
import { toast } from '@/lib/notify'
import { apiClient } from "@/lib/api"

interface PortfolioGovernance {
  id: string
  portfolio_name: string
  company_id?: string
  status: 'active' | 'archived' | 'paused'
  core_values?: Record<string, string>
  strategic_objectives?: Record<string, string>
  pmo_type_blend?: {
    supportive: boolean
    controlling: boolean
    directive: boolean
    enterprise: boolean
    strategic: boolean
    departmental: boolean
  }
  approval_authority_matrix?: Record<string, any>
  escalation_triggers?: Record<string, string>
  compliance_requirements?: string[]
  portfolio_health_status?: 'green' | 'amber' | 'red'
  risk_escalation_threshold?: 'critical' | 'high' | 'medium' | 'low'
  kpi_targets?: Record<string, number>
  measurement_cadence?: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  methodology_standard?: string
  template_governance?: Record<string, any>
  training_requirements?: Record<string, string[]>
}

const PMO_TYPES = [
  { id: 'supportive', label: 'Supportive', description: 'Provides guidance and best practices' },
  { id: 'controlling', label: 'Controlling', description: 'Enforces compliance and standards' },
  { id: 'directive', label: 'Directive', description: 'Makes portfolio decisions' },
  { id: 'enterprise', label: 'Enterprise', description: 'Manages enterprise-wide programs' },
  { id: 'strategic', label: 'Strategic', description: 'Aligns with strategic objectives' },
  { id: 'departmental', label: 'Departmental', description: 'Supports department initiatives' },
]

const COMPLIANCE_OPTIONS = [
  'ISO 21500',
  'PMBOK',
  'BABOK',
  'Agile',
  'SAFe',
  'ITIL',
  'SOX',
  'GDPR',
  'HIPAA',
  'Internal Standards',
]

const METHODOLOGY_OPTIONS = [
  'PMBOK 6',
  'PMBOK 7',
  'BABOK 3',
  'DMBOK 2',
  'Agile',
  'Hybrid',
  'Custom',
]

export default function PortfolioGovernancePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [governance, setGovernance] = useState<PortfolioGovernance | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<string>('')
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])

  // Load governance config for selected company
  useEffect(() => {
    if (!selectedCompany) return

    const loadGovernance = async () => {
      try {
        setLoading(true)
        const data = await apiClient.get<{ success: boolean; data: PortfolioGovernance }>(
          `/portfolios?company_id=${selectedCompany}&limit=1`
        )
        if (data.success && data.data && Array.isArray(data.data) && data.data[0]) {
          setGovernance(data.data[0])
        } else {
          setGovernance(null)
        }
      } catch (error) {
        toast.error('Failed to load governance configuration')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    loadGovernance()
  }, [selectedCompany])

  // Load companies on mount
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const data = await apiClient.get<{ success: boolean; data: Array<{ id: string; name: string }> }>(
          '/companies'
        )
        if (data.success && data.data) {
          setCompanies(data.data)
          if (data.data.length > 0) {
            setSelectedCompany(data.data[0].id)
          }
        }
      } catch (error) {
        toast.error('Failed to load companies')
        console.error(error)
      }
    }

    loadCompanies()
  }, [])

  const handleSaveGovernance = async () => {
    if (!governance) {
      toast.error('No governance configuration to save')
      return
    }

    try {
      setSaving(true)
      const payload = {
        company_id: selectedCompany,
        pmo_type_blend: governance.pmo_type_blend,
        approval_authority_matrix: governance.approval_authority_matrix,
        escalation_triggers: governance.escalation_triggers,
        compliance_requirements: governance.compliance_requirements,
        portfolio_health_status: governance.portfolio_health_status,
        risk_escalation_threshold: governance.risk_escalation_threshold,
        core_values: governance.core_values,
        strategic_objectives: governance.strategic_objectives,
        kpi_targets: governance.kpi_targets,
        measurement_cadence: governance.measurement_cadence,
        methodology_standard: governance.methodology_standard,
        template_governance: governance.template_governance,
        training_requirements: governance.training_requirements,
      }

      if (governance.id) {
        await apiClient.put(`/portfolios/${governance.id}`, payload)
        toast.success('Governance configuration updated')
      } else {
        await apiClient.post('/portfolios', {
          ...payload,
          portfolio_name: `${selectedCompany} Portfolio Governance`,
          status: 'active',
        })
        toast.success('Governance configuration created')
      }

      // Reload governance
      const data = await apiClient.get<{ success: boolean; data: PortfolioGovernance }>(
        `/portfolios?company_id=${selectedCompany}&limit=1`
      )
      if (data.success && data.data && Array.isArray(data.data) && data.data[0]) {
        setGovernance(data.data[0])
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save governance configuration')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const togglePMOType = (type: keyof PortfolioGovernance['pmo_type_blend']) => {
    setGovernance(prev => {
      if (!prev) return prev
      return {
        ...prev,
        pmo_type_blend: {
          ...(prev.pmo_type_blend || {
            supportive: false,
            controlling: false,
            directive: false,
            enterprise: false,
            strategic: false,
            departmental: false,
          }),
          [type]: !(prev.pmo_type_blend?.[type] ?? false),
        },
      }
    })
  }

  const toggleCompliance = (standard: string) => {
    setGovernance(prev => {
      if (!prev) return prev
      const current = prev.compliance_requirements || []
      return {
        ...prev,
        compliance_requirements: current.includes(standard)
          ? current.filter(s => s !== standard)
          : [...current, standard],
      }
    })
  }

  const activePMOTypes = governance?.pmo_type_blend
    ? PMO_TYPES.filter(t => governance.pmo_type_blend?.[t.id as keyof typeof governance.pmo_type_blend])
    : []

  const healthColor = {
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
  }

  if (!user) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Portfolio Governance</h1>
                <p className="text-gray-600 mt-2">Configure hybrid PMO model and governance rules</p>
              </div>
              <Button onClick={handleSaveGovernance} disabled={saving} size="lg">
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>

            {/* Company Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Company</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {loading ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500">Loading governance configuration...</p>
                </CardContent>
              </Card>
            ) : governance ? (
              <Tabs defaultValue="pmo-model" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="pmo-model">
                    <Zap className="mr-2 h-4 w-4" />
                    PMO Model
                  </TabsTrigger>
                  <TabsTrigger value="governance">
                    <Shield className="mr-2 h-4 w-4" />
                    Governance
                  </TabsTrigger>
                  <TabsTrigger value="strategic">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Strategy
                  </TabsTrigger>
                  <TabsTrigger value="compliance">
                    <FileText className="mr-2 h-4 w-4" />
                    Compliance
                  </TabsTrigger>
                  <TabsTrigger value="performance">
                    <Users className="mr-2 h-4 w-4" />
                    Performance
                  </TabsTrigger>
                </TabsList>

                {/* PMO Model Configuration */}
                <TabsContent value="pmo-model" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Hybrid PMO Type Configuration</CardTitle>
                      <CardDescription>
                        Select which PMO types apply to this portfolio (select multiple for hybrid approach)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {PMO_TYPES.map(type => (
                          <div key={type.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                            <Checkbox
                              id={type.id}
                              checked={governance.pmo_type_blend?.[type.id as keyof typeof governance.pmo_type_blend] ?? false}
                              onCheckedChange={() => togglePMOType(type.id as keyof PortfolioGovernance['pmo_type_blend'])}
                            />
                            <div className="flex-1">
                              <label htmlFor={type.id} className="font-medium cursor-pointer">
                                {type.label}
                              </label>
                              <p className="text-sm text-gray-600">{type.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {activePMOTypes.length > 0 && (
                        <div className="pt-4 border-t">
                          <p className="text-sm font-medium mb-2">Active PMO Types:</p>
                          <div className="flex flex-wrap gap-2">
                            {activePMOTypes.map(type => (
                              <Badge key={type.id} variant="secondary">
                                {type.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Governance Configuration */}
                <TabsContent value="governance" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Portfolio Health & Risk Management</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="health-status">Portfolio Health Status</Label>
                          <Select
                            value={governance.portfolio_health_status || 'green'}
                            onValueChange={(value: any) =>
                              setGovernance(prev => prev ? { ...prev, portfolio_health_status: value } : prev)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="green">
                                <span className="flex items-center">
                                  <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2" />
                                  Green
                                </span>
                              </SelectItem>
                              <SelectItem value="amber">
                                <span className="flex items-center">
                                  <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-2" />
                                  Amber
                                </span>
                              </SelectItem>
                              <SelectItem value="red">
                                <span className="flex items-center">
                                  <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2" />
                                  Red
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="risk-threshold">Risk Escalation Threshold</Label>
                          <Select
                            value={governance.risk_escalation_threshold || 'high'}
                            onValueChange={(value: any) =>
                              setGovernance(prev => prev ? { ...prev, risk_escalation_threshold: value } : prev)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="critical">Critical</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="escalation-triggers">Escalation Triggers (JSON)</Label>
                        <Textarea
                          id="escalation-triggers"
                          placeholder='{"budget_variance": "10%", "schedule_variance": "15 days"}'
                          value={JSON.stringify(governance.escalation_triggers || {}, null, 2)}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                            try {
                              const triggers = JSON.parse(e.target.value)
                              setGovernance(prev => prev ? { ...prev, escalation_triggers: triggers } : prev)
                            } catch {
                              // Invalid JSON, don't update
                            }
                          }}
                          rows={6}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-2">Define conditions that trigger escalation</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Approval Authority Matrix</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder='{"scope_change": {"approver": "Portfolio Manager", "limit": "$50000"}, "risk_acceptance": {"approver": "Executive Sponsor", "limit": "High"}}'
                        value={JSON.stringify(governance.approval_authority_matrix || {}, null, 2)}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                          try {
                            const matrix = JSON.parse(e.target.value)
                            setGovernance(prev => prev ? { ...prev, approval_authority_matrix: matrix } : prev)
                          } catch {
                            // Invalid JSON, don't update
                          }
                        }}
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-2">Define who approves what decisions</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Strategic Alignment */}
                <TabsContent value="strategic" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Core Values</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder='{"innovation": "Drive cutting-edge solutions", "customer_focus": "Put customer needs first"}'
                        value={JSON.stringify(governance.core_values || {}, null, 2)}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                          try {
                            const values = JSON.parse(e.target.value)
                            setGovernance(prev => prev ? { ...prev, core_values: values } : prev)
                          } catch {
                            // Invalid JSON, don't update
                          }
                        }}
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-2">Define company core values for portfolio alignment</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Strategic Objectives</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder='{"revenue_growth": "Increase revenue by 25% YoY", "market_expansion": "Enter 3 new markets"}'
                        value={JSON.stringify(governance.strategic_objectives || {}, null, 2)}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                          try {
                            const objectives = JSON.parse(e.target.value)
                            setGovernance(prev => prev ? { ...prev, strategic_objectives: objectives } : prev)
                          } catch {
                            // Invalid JSON, don't update
                          }
                        }}
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-2">Define strategic objectives portfolio must support</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Compliance */}
                <TabsContent value="compliance" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Compliance Standards</CardTitle>
                      <CardDescription>Select applicable compliance frameworks and standards</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {COMPLIANCE_OPTIONS.map(standard => (
                          <div key={standard} className="flex items-center space-x-2">
                            <Checkbox
                              id={`compliance-${standard}`}
                              checked={governance.compliance_requirements?.includes(standard) ?? false}
                              onCheckedChange={() => toggleCompliance(standard)}
                            />
                            <label htmlFor={`compliance-${standard}`} className="cursor-pointer text-sm">
                              {standard}
                            </label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Methodology Standard</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={governance.methodology_standard || 'PMBOK 6'}
                        onValueChange={(value: string) =>
                          setGovernance(prev => prev ? { ...prev, methodology_standard: value } : prev)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {METHODOLOGY_OPTIONS.map(method => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Performance */}
                <TabsContent value="performance" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Measurement Cadence</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={governance.measurement_cadence || 'monthly'}
                        onValueChange={(value: any) =>
                          setGovernance(prev => prev ? { ...prev, measurement_cadence: value } : prev)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>KPI Targets</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder='{"schedule_adherence": 95, "budget_variance": 5, "quality_score": 90}'
                        value={JSON.stringify(governance.kpi_targets || {}, null, 2)}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                          try {
                            const targets = JSON.parse(e.target.value)
                            setGovernance(prev => prev ? { ...prev, kpi_targets: targets } : prev)
                          } catch {
                            // Invalid JSON, don't update
                          }
                        }}
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-2">Define target values for key performance indicators</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Training Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder='{"project_manager": ["PMBOK", "Risk Management"], "stakeholder": ["Portfolio Overview", "Benefits Tracking"]}'
                        value={JSON.stringify(governance.training_requirements || {}, null, 2)}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                          try {
                            const training = JSON.parse(e.target.value)
                            setGovernance(prev => prev ? { ...prev, training_requirements: training } : prev)
                          } catch {
                            // Invalid JSON, don't update
                          }
                        }}
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-2">Define training required by role</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
                    <div>
                      <p className="text-lg font-medium">No Governance Configuration Found</p>
                      <p className="text-gray-600 mt-1">Create a new governance configuration for this company</p>
                    </div>
                    <Button onClick={handleSaveGovernance} disabled={saving}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Create Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
