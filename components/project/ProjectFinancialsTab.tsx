"use client"

/**
 * Project Financials Tab Component
 * 
 * Allows project managers to:
 * - Update actual costs by category
 * - Enter time worked (hours × rate)
 * - Update percent complete
 * - View cost breakdown
 * - Manage forecasts
 * 
 * Data flows to Program Financial Dashboard automatically
 */

import React, { useState, useEffect } from 'react'
import { getApiBaseUrl } from '@/lib/api-url'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Save, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/utils'

interface ProjectFinancials {
  projectId: string
  budget: number
  actualCost: number
  forecastCost: number
  percentComplete: number
  
  // Cost Breakdown
  internalLaborCost: number
  internalLaborHours: number
  externalLaborCost: number
  externalLaborHours: number
  cloudInfrastructureCost: number
  aiServicesCost: number
  softwareToolsCost: number
  equipmentCost: number
  materialsCost: number
  overheadCost: number
  
  // Calculated
  remainingBudget: number
  budgetUtilization: number
}

interface ProjectFinancialsTabProps {
  projectId: string
}

export default function ProjectFinancialsTab({ projectId }: ProjectFinancialsTabProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [financials, setFinancials] = useState<ProjectFinancials | null>(null)
  const [formData, setFormData] = useState({
    internalLaborCost: 0,
    externalLaborCost: 0,
    cloudInfrastructureCost: 0,
    aiServicesCost: 0,
    softwareToolsCost: 0,
    equipmentCost: 0,
    materialsCost: 0,
    overheadCost: 0,
    percentComplete: 0,
    forecastCost: 0
  })

  useEffect(() => {
    fetchFinancials()
  }, [projectId])

  const fetchFinancials = async () => {
    setLoading(true)
    try {
      const apiUrl = getApiBaseUrl()
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      
      // Get project basic data
      const projectResponse = await fetch(`${apiUrl}/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!projectResponse.ok) throw new Error('Failed to fetch project')
      
      const projectData = await projectResponse.json()
      const project = projectData.project || projectData.data  // Handle both response formats
      
      if (!project) {
        throw new Error('Project data not found in response')
      }
      
      const financialData: ProjectFinancials = {
        projectId: project.id,
        budget: parseFloat(project.budget) || 0,
        actualCost: parseFloat(project.actual_cost) || 0,
        forecastCost: parseFloat(project.forecast_cost) || parseFloat(project.budget) || 0,
        percentComplete: parseFloat(project.percent_complete) || 0,
        
        // Read cost breakdown from project columns directly
        internalLaborCost: parseFloat(project.internal_labor_cost) || 0,
        internalLaborHours: 0,  // Not tracked yet
        externalLaborCost: parseFloat(project.external_labor_cost) || 0,
        externalLaborHours: 0,  // Not tracked yet
        cloudInfrastructureCost: parseFloat(project.cloud_infrastructure_cost) || 0,
        aiServicesCost: parseFloat(project.ai_services_cost) || 0,
        softwareToolsCost: parseFloat(project.software_tools_cost) || 0,
        equipmentCost: parseFloat(project.equipment_cost) || 0,
        materialsCost: parseFloat(project.materials_cost) || 0,
        overheadCost: parseFloat(project.overhead_cost) || 0,
        
        remainingBudget: 0,
        budgetUtilization: 0
      }
      
      financialData.remainingBudget = financialData.budget - financialData.actualCost
      financialData.budgetUtilization = financialData.budget > 0 
        ? (financialData.actualCost / financialData.budget) * 100 
        : 0
      
      setFinancials(financialData)
      setFormData({
        internalLaborCost: financialData.internalLaborCost,
        externalLaborCost: financialData.externalLaborCost,
        cloudInfrastructureCost: financialData.cloudInfrastructureCost,
        aiServicesCost: financialData.aiServicesCost,
        softwareToolsCost: financialData.softwareToolsCost,
        equipmentCost: financialData.equipmentCost,
        materialsCost: financialData.materialsCost,
        overheadCost: financialData.overheadCost,
        percentComplete: financialData.percentComplete,
        forecastCost: financialData.forecastCost
      })
      
    } catch (error) {
      console.error('Failed to fetch financials:', error)
      toast.error('Failed to load project financials')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const apiUrl = getApiBaseUrl()
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      
      // Calculate total actual cost
      const totalActualCost = 
        formData.internalLaborCost +
        formData.externalLaborCost +
        formData.cloudInfrastructureCost +
        formData.aiServicesCost +
        formData.softwareToolsCost +
        formData.equipmentCost +
        formData.materialsCost +
        formData.overheadCost
      
      // Calculate earned value
      const earnedValue = financials 
        ? (financials.budget * formData.percentComplete / 100) 
        : 0
      
      // Update project financial fields
      const updateData = {
        actual_cost: totalActualCost,
        internal_labor_cost: formData.internalLaborCost,
        external_labor_cost: formData.externalLaborCost,
        cloud_infrastructure_cost: formData.cloudInfrastructureCost,
        ai_services_cost: formData.aiServicesCost,
        software_tools_cost: formData.softwareToolsCost,
        equipment_cost: formData.equipmentCost,
        materials_cost: formData.materialsCost,
        overhead_cost: formData.overheadCost,
        forecast_cost: formData.forecastCost,
        percent_complete: formData.percentComplete,
        earned_value: earnedValue
      }
      
      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update project financials')
      }
      
      toast.success('Project financials updated successfully')
      
      // Refresh data
      await fetchFinancials()
      
    } catch (error) {
      console.error('Failed to save financials:', error)
      toast.error('Failed to save project financials')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const updateCostField = (field: string, value: string) => {
    const numericValue = parseFloat(value) || 0
    setFormData(prev => ({ ...prev, [field]: numericValue }))
  }

  const calculateTotalActualCost = (): number => {
    return (
      formData.internalLaborCost +
      formData.externalLaborCost +
      formData.cloudInfrastructureCost +
      formData.aiServicesCost +
      formData.softwareToolsCost +
      formData.equipmentCost +
      formData.materialsCost +
      formData.overheadCost
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!financials) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600">No financial data available</p>
      </div>
    )
  }

  const totalActualCost = calculateTotalActualCost()
  const hasChanges = JSON.stringify(formData) !== JSON.stringify({
    internalLaborCost: financials.internalLaborCost,
    externalLaborCost: financials.externalLaborCost,
    cloudInfrastructureCost: financials.cloudInfrastructureCost,
    aiServicesCost: financials.aiServicesCost,
    softwareToolsCost: financials.softwareToolsCost,
    equipmentCost: financials.equipmentCost,
    materialsCost: financials.materialsCost,
    overheadCost: financials.overheadCost,
    percentComplete: financials.percentComplete,
    forecastCost: financials.forecastCost
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Project Financials</h2>
          <p className="text-sm text-gray-600">Track costs, hours, and progress</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchFinancials}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financials.budget)}</div>
            <p className="text-xs text-gray-500 mt-1">Approved budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Actual Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalActualCost)}
            </div>
            <Progress value={financials.budgetUtilization} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">
              {financials.budgetUtilization.toFixed(1)}% utilized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              financials.remainingBudget > 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(financials.budget - totalActualCost)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {((1 - totalActualCost / financials.budget) * 100).toFixed(1)}% remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(formData.forecastCost)}</div>
            <p className="text-xs text-gray-500 mt-1">Estimated at completion</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="costs" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="costs">Cost Tracking</TabsTrigger>
          <TabsTrigger value="progress">Progress & EV</TabsTrigger>
          <TabsTrigger value="forecast">Forecasting</TabsTrigger>
        </TabsList>

        {/* COST TRACKING TAB */}
        <TabsContent value="costs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actual Costs by Category</CardTitle>
              <CardDescription>
                Enter actual costs incurred to date. Updates will flow to the Program Financial Dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Internal Labor */}
              <div className="space-y-2">
                <Label htmlFor="internalLabor" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  Internal Labor Cost
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="internalLabor"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.internalLaborCost}
                    onChange={(e) => updateCostField('internalLaborCost', e.target.value)}
                    placeholder="0"
                  />
                  <div className="flex items-center text-sm text-gray-600 min-w-[120px]">
                    {formatCurrency(formData.internalLaborCost)}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Employees (calculated from: hours × hourly rate per role)
                </p>
              </div>

              {/* External Labor */}
              <div className="space-y-2">
                <Label htmlFor="externalLabor" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  External Labor Cost
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="externalLabor"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.externalLaborCost}
                    onChange={(e) => updateCostField('externalLaborCost', e.target.value)}
                    placeholder="0"
                  />
                  <div className="flex items-center text-sm text-gray-600 min-w-[120px]">
                    {formatCurrency(formData.externalLaborCost)}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Contractors, consultants (requires invoice approval)
                </p>
              </div>

              {/* Cloud Infrastructure */}
              <div className="space-y-2">
                <Label htmlFor="cloudCost" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-cyan-600" />
                  Cloud Infrastructure
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cloudCost"
                    type="number"
                    min="0"
                    step="100"
                    value={formData.cloudInfrastructureCost}
                    onChange={(e) => updateCostField('cloudInfrastructureCost', e.target.value)}
                    placeholder="0"
                  />
                  <div className="flex items-center text-sm text-gray-600 min-w-[120px]">
                    {formatCurrency(formData.cloudInfrastructureCost)}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  AWS, Azure, hosting costs (from invoices or usage metrics)
                </p>
              </div>

              {/* AI Services */}
              <div className="space-y-2">
                <Label htmlFor="aiCost" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-pink-600" />
                  AI Services
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="aiCost"
                    type="number"
                    min="0"
                    step="100"
                    value={formData.aiServicesCost}
                    onChange={(e) => updateCostField('aiServicesCost', e.target.value)}
                    placeholder="0"
                  />
                  <div className="flex items-center text-sm text-gray-600 min-w-[120px]">
                    {formatCurrency(formData.aiServicesCost)}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  OpenAI, Google AI, Anthropic API costs
                </p>
              </div>

              {/* Software & Tools */}
              <div className="space-y-2">
                <Label htmlFor="softwareCost" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Software & Tools
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="softwareCost"
                    type="number"
                    min="0"
                    step="100"
                    value={formData.softwareToolsCost}
                    onChange={(e) => updateCostField('softwareToolsCost', e.target.value)}
                    placeholder="0"
                  />
                  <div className="flex items-center text-sm text-gray-600 min-w-[120px]">
                    {formatCurrency(formData.softwareToolsCost)}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Supabase, Redis, licenses, subscriptions
                </p>
              </div>

              {/* Equipment */}
              <div className="space-y-2">
                <Label htmlFor="equipmentCost" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-orange-600" />
                  Equipment
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="equipmentCost"
                    type="number"
                    min="0"
                    step="100"
                    value={formData.equipmentCost}
                    onChange={(e) => updateCostField('equipmentCost', e.target.value)}
                    placeholder="0"
                  />
                  <div className="flex items-center text-sm text-gray-600 min-w-[120px]">
                    {formatCurrency(formData.equipmentCost)}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Servers, laptops, hardware purchases
                </p>
              </div>

              {/* Materials */}
              <div className="space-y-2">
                <Label htmlFor="materialsCost" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-indigo-600" />
                  Materials & Supplies
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="materialsCost"
                    type="number"
                    min="0"
                    step="50"
                    value={formData.materialsCost}
                    onChange={(e) => updateCostField('materialsCost', e.target.value)}
                    placeholder="0"
                  />
                  <div className="flex items-center text-sm text-gray-600 min-w-[120px]">
                    {formatCurrency(formData.materialsCost)}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  General supplies and consumables
                </p>
              </div>

              {/* Overhead */}
              <div className="space-y-2">
                <Label htmlFor="overheadCost" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-600" />
                  Overhead
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="overheadCost"
                    type="number"
                    min="0"
                    step="50"
                    value={formData.overheadCost}
                    onChange={(e) => updateCostField('overheadCost', e.target.value)}
                    placeholder="0"
                  />
                  <div className="flex items-center text-sm text-gray-600 min-w-[120px]">
                    {formatCurrency(formData.overheadCost)}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Facilities, admin support, shared services
                </p>
              </div>

              {/* Total */}
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Total Actual Cost:</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {formatCurrency(totalActualCost)}
                  </span>
                </div>
                {financials.budget > 0 && (
                  <div className="mt-2">
                    <Progress value={(totalActualCost / financials.budget) * 100} />
                    <p className="text-xs text-gray-500 mt-1">
                      {((totalActualCost / financials.budget) * 100).toFixed(1)}% of budget
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROGRESS TAB */}
        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Progress & Earned Value</CardTitle>
              <CardDescription>
                Update percent complete to calculate Earned Value for EVM metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Percent Complete</Label>
                  <span className="text-3xl font-bold text-blue-600">
                    {formData.percentComplete.toFixed(0)}%
                  </span>
                </div>
                
                <Slider
                  value={[formData.percentComplete]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, percentComplete: value }))}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                
                <div className="grid grid-cols-11 text-xs text-gray-500">
                  <span>0%</span>
                  <span className="text-center">10%</span>
                  <span className="text-center">20%</span>
                  <span className="text-center">30%</span>
                  <span className="text-center">40%</span>
                  <span className="text-center">50%</span>
                  <span className="text-center">60%</span>
                  <span className="text-center">70%</span>
                  <span className="text-center">80%</span>
                  <span className="text-center">90%</span>
                  <span className="text-right">100%</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Budget:</span>
                  <span className="font-medium">{formatCurrency(financials.budget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Percent Complete:</span>
                  <span className="font-medium">{formData.percentComplete.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Earned Value (EV):</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(financials.budget * formData.percentComplete / 100)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 italic">
                  Formula: EV = Budget × Percent Complete
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">What is Earned Value?</p>
                    <p>
                      Earned Value represents the budgeted cost of work actually completed. 
                      It's used to calculate schedule and cost performance indices (SPI & CPI) 
                      on the Program Financial Dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FORECAST TAB */}
        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost Forecasting</CardTitle>
              <CardDescription>
                Estimate the final cost at project completion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forecastCost">Forecast at Completion</Label>
                <div className="flex gap-2">
                  <Input
                    id="forecastCost"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.forecastCost}
                    onChange={(e) => updateCostField('forecastCost', e.target.value)}
                    placeholder={financials.budget.toString()}
                  />
                  <div className="flex items-center text-sm text-gray-600 min-w-[120px]">
                    {formatCurrency(formData.forecastCost)}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Your estimate of total cost at project completion
                </p>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Original Budget:</span>
                  <span className="font-medium">{formatCurrency(financials.budget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Forecast:</span>
                  <span className="font-medium">{formatCurrency(formData.forecastCost)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Variance:</span>
                  <span className={cn(
                    "font-bold",
                    formData.forecastCost > financials.budget ? "text-red-600" : "text-green-600"
                  )}>
                    {formatCurrency(formData.forecastCost - financials.budget)}
                    {formData.forecastCost > financials.budget && " overrun"}
                  </span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-900">
                    <p className="font-medium mb-1">Manual vs Automatic Forecast</p>
                    <p>
                      You can enter your own forecast, or leave it blank to use the automatic 
                      EVM-based forecast (EAC = Budget / CPI). Manual forecasts are recommended 
                      early in the project or when major changes are expected.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button (sticky at bottom) */}
      {hasChanges && (
        <div className="sticky bottom-0 bg-white border-t shadow-lg p-4 -mx-6 -mb-6">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertCircle className="h-4 w-4" />
              <span>You have unsaved changes</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchFinancials}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save All Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

