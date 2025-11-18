"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, TrendingUp, AlertTriangle, Calendar } from '@/components/ui/icons-shim'
import { toast } from 'sonner'
import { getApiUrl } from '@/lib/api-url'

interface CapacityForecast {
  id: string
  forecastPeriod: string
  humanCapacityFte?: number
  humanDemandFte?: number
  humanUtilization?: number
  financialCapacity?: number
  financialDemand?: number
  financialUtilization?: number
  isBottleneckPeriod?: boolean
  bottleneckSeverity?: string
}

interface CapacityPlanningDashboardProps {
  programId: string
}

export function CapacityPlanningDashboard({ programId }: CapacityPlanningDashboardProps) {
  const [forecasts, setForecasts] = useState<CapacityForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [forecastDate, setForecastDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  useEffect(() => {
    void fetchForecasts()
  }, [programId])

  const fetchForecasts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        getApiUrl(`/programs/${programId}/resources/capacity/forecasts`),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setForecasts(data.data || [])
      }
    } catch (error) {
      console.error('[RESOURCES] Failed to fetch forecasts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateForecast = async () => {
    try {
      setCalculating(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        getApiUrl(`/programs/${programId}/resources/capacity/forecast`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ forecastPeriod: forecastDate })
        }
      )

      if (response.ok) {
        toast.success('Capacity forecast calculated successfully')
        void fetchForecasts()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to calculate forecast')
      }
    } catch (error) {
      console.error('[RESOURCES] Failed to calculate forecast:', error)
      toast.error('Failed to calculate forecast')
    } finally {
      setCalculating(false)
    }
  }

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null
    
    const variants: Record<string, string> = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      critical: 'bg-red-100 text-red-800 border-red-300'
    }
    return variants[severity] || 'bg-gray-100 text-gray-800 border-gray-300'
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
          <h3 className="text-lg font-semibold">Capacity Planning</h3>
          <p className="text-sm text-muted-foreground">
            Forecast capacity vs demand for human and financial resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={forecastDate}
            onChange={(e) => setForecastDate(e.target.value)}
            className="w-40"
          />
          <Button onClick={handleCalculateForecast} disabled={calculating}>
            {calculating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Calculate Forecast
              </>
            )}
          </Button>
        </div>
      </div>

      {forecasts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No capacity forecasts available</p>
            <p className="text-sm text-muted-foreground mb-4">
              Calculate a forecast for a specific period to see capacity vs demand analysis
            </p>
            <Button onClick={handleCalculateForecast} disabled={calculating}>
              Calculate First Forecast
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {forecasts.map((forecast) => (
            <Card 
              key={forecast.id} 
              className={forecast.isBottleneckPeriod ? 'border-orange-300 bg-orange-50/50' : ''}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {new Date(forecast.forecastPeriod).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </CardTitle>
                    {forecast.isBottleneckPeriod && (
                      <CardDescription className="mt-1 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        Bottleneck Period Detected
                        {forecast.bottleneckSeverity && (
                          <Badge className={getSeverityBadge(forecast.bottleneckSeverity)}>
                            {forecast.bottleneckSeverity}
                          </Badge>
                        )}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Human Resources */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Human Resources</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Capacity:</span>
                        <span className="font-medium">{forecast.humanCapacityFte?.toFixed(1) || 'N/A'} FTE</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Demand:</span>
                        <span className="font-medium">{forecast.humanDemandFte?.toFixed(1) || 'N/A'} FTE</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Utilization:</span>
                        <span className="font-medium">
                          {forecast.humanUtilization ? `${Math.round(forecast.humanUtilization)}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Resources */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Financial Resources</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Capacity:</span>
                        <span className="font-medium">
                          {forecast.financialCapacity 
                            ? `$${forecast.financialCapacity.toLocaleString()}` 
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Demand:</span>
                        <span className="font-medium">
                          {forecast.financialDemand 
                            ? `$${forecast.financialDemand.toLocaleString()}` 
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Utilization:</span>
                        <span className="font-medium">
                          {forecast.financialUtilization 
                            ? `${Math.round(forecast.financialUtilization)}%` 
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

