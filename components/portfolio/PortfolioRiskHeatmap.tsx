"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface PortfolioRisk {
  id: string;
  title: string;
  probability: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  impact: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  severity: 'critical' | 'high' | 'medium' | 'low';
  risk_level: 'project' | 'program' | 'portfolio' | 'systemic';
  risk_origin: string;
  program_id?: string;
  program_name?: string;
  financial_impact?: number;
  status: string;
}

interface HeatmapCell {
  probability: string;
  impact: string;
  risks: PortfolioRisk[];
  count: number;
}

const probabilityOrder = ['very_low', 'low', 'medium', 'high', 'very_high'];
const impactOrder = ['very_low', 'low', 'medium', 'high', 'very_high'];

const probabilityLabels = {
  very_low: 'Very Low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  very_high: 'Very High',
};

const impactLabels = {
  very_low: 'Very Low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  very_high: 'Very High',
};

const getCellColor = (probability: string, impact: string): string => {
  const probIndex = probabilityOrder.indexOf(probability);
  const impactIndex = impactOrder.indexOf(impact);
  const riskScore = probIndex * impactIndex;
  
  if (riskScore >= 16) return 'bg-red-600 text-white'; // Very High × Very High
  if (riskScore >= 12) return 'bg-red-500 text-white'; // High × Very High or Very High × High
  if (riskScore >= 9) return 'bg-orange-500 text-white'; // High × High
  if (riskScore >= 6) return 'bg-yellow-500 text-black'; // Medium × High or High × Medium
  if (riskScore >= 4) return 'bg-yellow-300 text-black'; // Medium × Medium
  if (riskScore >= 2) return 'bg-green-300 text-black'; // Low × Medium or Medium × Low
  return 'bg-green-100 text-black'; // Low × Low or Very Low
};

interface PortfolioRiskHeatmapProps {
  programId?: string; // Optional: filter by program
}

export function PortfolioRiskHeatmap({ programId }: PortfolioRiskHeatmapProps) {
  const [risks, setRisks] = useState<PortfolioRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);

  useEffect(() => {
    fetchRisks();
  }, [programId, filterLevel]);

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const endpoint = programId 
        ? `/programs/${programId}/risks`
        : '/portfolio/risks';
      
      const response = await apiClient.get(endpoint);
      if (response.data.success) {
        let fetchedRisks = response.data.data || [];
        
        // Filter by risk level if specified
        if (filterLevel !== 'all') {
          fetchedRisks = fetchedRisks.filter((r: PortfolioRisk) => r.risk_level === filterLevel);
        }
        
        setRisks(fetchedRisks);
      }
    } catch (error: any) {
      console.error('Failed to fetch portfolio risks:', error);
      toast.error('Failed to load risks');
    } finally {
      setLoading(false);
    }
  };

  // Build heatmap data
  const buildHeatmap = (): HeatmapCell[][] => {
    const heatmap: HeatmapCell[][] = [];
    
    // Initialize matrix
    for (let i = 0; i < impactOrder.length; i++) {
      heatmap[i] = [];
      for (let j = 0; j < probabilityOrder.length; j++) {
        heatmap[i][j] = {
          probability: probabilityOrder[j],
          impact: impactOrder[i],
          risks: [],
          count: 0,
        };
      }
    }
    
    // Populate with risks
    risks.forEach(risk => {
      const impactIndex = impactOrder.indexOf(risk.impact);
      const probIndex = probabilityOrder.indexOf(risk.probability);
      
      if (impactIndex >= 0 && probIndex >= 0) {
        heatmap[impactIndex][probIndex].risks.push(risk);
        heatmap[impactIndex][probIndex].count++;
      }
    });
    
    return heatmap;
  };

  const heatmap = buildHeatmap();
  const totalRisks = risks.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Portfolio Risk Heatmap
              </CardTitle>
              <CardDescription>
                Visual representation of risks by probability and impact. Click cells to view details.
              </CardDescription>
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="project">Project Level</SelectItem>
                <SelectItem value="program">Program Level</SelectItem>
                <SelectItem value="portfolio">Portfolio Level</SelectItem>
                <SelectItem value="systemic">Systemic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2 bg-gray-50 dark:bg-gray-900 font-semibold">Impact →</th>
                    {probabilityOrder.map(prob => (
                      <th key={prob} className="border p-2 bg-gray-50 dark:bg-gray-900 font-semibold text-center min-w-[100px]">
                        {probabilityLabels[prob as keyof typeof probabilityLabels]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.map((row, impactIndex) => (
                    <tr key={impactOrder[impactIndex]}>
                      <td className="border p-2 bg-gray-50 dark:bg-gray-900 font-semibold text-right">
                        {impactLabels[impactOrder[impactIndex] as keyof typeof impactLabels]}
                      </td>
                      {row.map((cell, probIndex) => {
                        const cellColor = getCellColor(cell.probability, cell.impact);
                        return (
                          <td
                            key={`${impactIndex}-${probIndex}`}
                            className={`border p-4 text-center cursor-pointer hover:opacity-80 transition-opacity ${cellColor}`}
                            onClick={() => setSelectedCell(cell)}
                          >
                            <div className="font-bold text-lg">{cell.count}</div>
                            <div className="text-xs mt-1">
                              {cell.count === 1 ? 'risk' : 'risks'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-sm">
              <span className="font-semibold">Risk Level:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span>Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span>High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-300 rounded"></div>
                <span>Low</span>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold">{totalRisks}</div>
                <div className="text-sm text-muted-foreground">Total Risks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {risks.filter(r => r.severity === 'critical' || r.severity === 'high').length}
                </div>
                <div className="text-sm text-muted-foreground">High/Critical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {risks.filter(r => r.risk_level === 'portfolio' || r.risk_level === 'systemic').length}
                </div>
                <div className="text-sm text-muted-foreground">Portfolio/Systemic</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {risks.filter(r => r.financial_impact).reduce((sum, r) => sum + (r.financial_impact || 0), 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-muted-foreground">Total Exposure</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cell Detail Dialog */}
      {selectedCell && selectedCell.risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Risks: {probabilityLabels[selectedCell.probability as keyof typeof probabilityLabels]} Probability × {impactLabels[selectedCell.impact as keyof typeof impactLabels]} Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedCell.risks.map(risk => (
                <div key={risk.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold">{risk.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {risk.program_name || 'Portfolio Level'}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{risk.risk_level}</Badge>
                        <Badge variant="secondary">{risk.risk_origin}</Badge>
                        {risk.financial_impact && (
                          <Badge variant="destructive">
                            ${risk.financial_impact.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge className={risk.severity === 'critical' ? 'bg-red-600' : risk.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'}>
                      {risk.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedCell(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

