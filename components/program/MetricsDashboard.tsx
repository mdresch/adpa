"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LineChart, Line, PieChart, Pie, ScatterChart, Scatter,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, Area
} from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from '@/lib/notify';
import { ProgramMetrics, BudgetTimelineEntry, Risk, Milestone } from './types';

interface MetricsDashboardProps {
  metrics: ProgramMetrics;
  programId: string;
  loading?: boolean;
}

// RAG status colors
const RAG_COLORS = {
  green: '#22c55e',
  amber: '#eab308',
  red: '#ef4444'
};

// Risk severity colors
const RISK_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e'
};

// Milestone status colors
const MILESTONE_COLORS = {
  completed: '#22c55e',
  'on-track': '#3b82f6',
  overdue: '#ef4444'
};

export function MetricsDashboard({ metrics, programId, loading = false }: MetricsDashboardProps) {
  const [exporting, setExporting] = useState(false);

  // Ensure risks is an array (backend returns array of risk objects)
  const risksArray = Array.isArray(metrics.risks) ? metrics.risks : []

  // Transform budget data for line chart
  const budgetData = (metrics.budget?.timeline || []).map((entry: BudgetTimelineEntry) => ({
    month: entry.month,
    planned: entry.planned / 1000000, // Convert to millions for readability
    actual: entry.actual / 1000000,
    forecast: entry.forecast ? entry.forecast / 1000000 : undefined
  }));

  // Transform status data for pie chart
  const statusData = [
    { name: 'Green', value: metrics.status?.breakdown?.green || 0, fill: RAG_COLORS.green },
    { name: 'Amber', value: metrics.status?.breakdown?.amber || 0, fill: RAG_COLORS.amber },
    { name: 'Red', value: metrics.status?.breakdown?.red || 0, fill: RAG_COLORS.red }
  ].filter(item => item.value > 0); // Only show segments with data

  // Transform risk data for scatter chart
  const riskData = risksArray.map((risk: Risk) => ({
    x: risk.probability,
    y: risk.impact / 1000000, // Convert to millions
    z: risk.severity === 'critical' ? 400 : risk.severity === 'high' ? 300 : risk.severity === 'medium' ? 200 : 100,
    name: risk.title,
    description: risk.description,
    severity: risk.severity,
    projectName: risk.projectName,
    fill: RISK_COLORS[risk.severity]
  }));

  // Transform milestone data for horizontal bar chart
  const milestoneData = (metrics.milestones || []).map((milestone: Milestone) => {
    const planned = new Date(milestone.plannedDate).getTime();
    const actual = milestone.actualDate ? new Date(milestone.actualDate).getTime() : new Date().getTime();
    const today = new Date().getTime();
    
    return {
      name: milestone.name,
      planned: planned,
      actual: milestone.status === 'completed' ? actual : today,
      status: milestone.status,
      fill: MILESTONE_COLORS[milestone.status]
    };
  });

  // Export dashboard as PNG
  const exportDashboard = async () => {
    setExporting(true);
    try {
      const element = document.getElementById('metrics-dashboard');
      if (!element) {
        throw new Error('Dashboard element not found');
      }

      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      link.download = `program-${programId}-metrics-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();

      toast.success('Dashboard exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export dashboard');
    } finally {
      setExporting(false);
    }
  };

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const total = metrics.status?.total || 0;
      const percentage = ((payload[0].value / total) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm">
            {payload[0].value} projects ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for risk scatter
  const CustomRiskTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="font-semibold">{data.name}</p>
          {data.projectName && (
            <p className="text-xs text-blue-600 font-medium mt-1">Project: {data.projectName}</p>
          )}
          <p className="text-sm text-gray-600">{data.description}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p>Probability: {data.x}%</p>
            <p>Impact: ${data.y.toFixed(2)}M</p>
            <p>Severity: <span className="capitalize">{data.severity}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading metrics...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if ((metrics.status?.total || 0) === 0 && risksArray.length === 0 && (metrics.milestones?.length || 0) === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">No Data Available</p>
          <p className="text-muted-foreground">
            Program metrics will appear here once projects are added
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Program Metrics Dashboard</h2>
          <p className="text-muted-foreground">Real-time program health and performance metrics</p>
        </div>
        <Button 
          onClick={exportDashboard} 
          disabled={exporting}
          variant="outline"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export PNG
            </>
          )}
        </Button>
      </div>

      {/* Charts Grid */}
      <div id="metrics-dashboard" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Budget Burn-Down Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={budgetData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis 
                  label={{ value: 'Budget ($M)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number) => `$${value.toFixed(2)}M`}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="planned" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Planned Budget"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Actual Spent"
                  dot={{ r: 4 }}
                />
                {budgetData.some(d => d.forecast !== undefined) && (
                  <Line 
                    type="monotone" 
                    dataKey="forecast" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Forecast"
                    dot={{ r: 4 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">No project status data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            {riskData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Probability"
                    unit="%"
                    domain={[0, 100]}
                    label={{ value: 'Probability (%)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Impact"
                    label={{ value: 'Impact ($M)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<CustomRiskTooltip />} />
                  <Legend />
                  <Scatter 
                    name="Risks" 
                    data={riskData} 
                    fill="#8884d8"
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">No risk data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Milestone Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Milestone Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {milestoneData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={milestoneData} 
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category"
                    width={90}
                  />
                  <Tooltip 
                    formatter={(value: number) => new Date(value).toLocaleDateString()}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="planned" 
                    fill="#3b82f6" 
                    name="Planned"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar 
                    dataKey="actual" 
                    name="Actual/Current"
                    radius={[0, 4, 4, 0]}
                  >
                    {milestoneData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">No milestone data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Projects</div>
            <div className="text-2xl font-bold">{metrics.status?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Budget Variance</div>
            <div className={`text-2xl font-bold ${(metrics.budget?.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(() => {
                const variance = metrics.budget?.variance || 0
                const planned = metrics.budget?.planned || 0
                if (planned === 0) return 'N/A'
                const variancePercent = ((variance / planned) * 100)
                return `${variance >= 0 ? '+' : ''}${variancePercent.toFixed(1)}%`
              })()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Active Risks</div>
            <div className="text-2xl font-bold">{risksArray.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Milestones</div>
            <div className="text-2xl font-bold">
              {(metrics.milestones || []).filter(m => m.status === 'completed').length}/{(metrics.milestones || []).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
