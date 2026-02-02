'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatPercentage } from '@/lib/utils/formatUtils';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface PortfolioFinancialMetrics {
  totalBudget: number;
  totalActualCost: number;
  totalForecastCost: number;
  remainingBudget: number;
  budgetVariance: number;
  budgetVariancePercent: number;
  budgetUtilization: number;
  totalLaborCost: number;
  internalLaborCost: number;
  internalLaborHours: number;
  externalLaborCost: number;
  externalLaborHours: number;
  cloudInfrastructureCost: number;
  aiServicesCost: number;
  softwareToolsCost: number;
  equipmentCost: number;
  materialsCost: number;
  overheadCost: number;
  expectedBenefits: number;
  costPercentageOfBenefits: number;
  roi: number;
  npv: number;
  paybackPeriod: number;
  totalProjects: number;
  completedProjects: number;
  activeProjects: number;
  atRiskProjects: number;
  onTimePercent: number;
  onBudgetPercent: number;
  completionPercent: number;
  calculatedAt: string;
}

interface CostCategoryBreakdown {
  categoryName: string;
  categoryCode: string;
  categoryType: string;
  amount: number;
  percentOfTotal: number;
  percentOfBudget: number;
  projectCount: number;
}

export default function PortfolioFinancialPage() {
  const [metrics, setMetrics] = useState<PortfolioFinancialMetrics | null>(null);
  const [breakdown, setBreakdown] = useState<CostCategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

        // Fetch portfolio financial metrics
        const metricsRes = await fetch(`${apiUrl}/portfolio/financial`);
        if (!metricsRes.ok) {
          throw new Error(`Failed to fetch portfolio metrics: ${metricsRes.status}`);
        }
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.data);

        // Fetch cost breakdown
        const breakdownRes = await fetch(`${apiUrl}/portfolio/cost-breakdown`);
        if (!breakdownRes.ok) {
          throw new Error(`Failed to fetch cost breakdown: ${breakdownRes.status}`);
        }
        const breakdownData = await breakdownRes.json();
        setBreakdown(breakdownData.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching portfolio financial data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading portfolio financial metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Financial Data</h2>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">No portfolio data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Portfolio Financial Metrics</h1>
          <p className="text-gray-600">Aggregated financial data from {metrics.totalProjects} projects</p>
        </div>

        {/* Key Financial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Budget */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600 mb-1">Total Budget</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.totalBudget)}</p>
            <p className="text-xs text-gray-500 mt-2">Portfolio-wide allocation</p>
          </div>

          {/* Total Actual Cost */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600 mb-1">Actual Cost</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.totalActualCost)}</p>
            <p className={`text-xs mt-2 ${metrics.budgetUtilization > 90 ? 'text-red-600' : 'text-green-600'}`}>
              {formatPercentage(metrics.budgetUtilization)} of budget
            </p>
          </div>

          {/* Remaining Budget */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600 mb-1">Remaining Budget</p>
            <p className={`text-2xl font-bold ${metrics.remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(metrics.remainingBudget)}
            </p>
            <p className={`text-xs mt-2 ${metrics.budgetVariancePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.budgetVariancePercent >= 0 ? '+' : ''}{formatPercentage(metrics.budgetVariancePercent)}
            </p>
          </div>

          {/* ROI */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600 mb-1">ROI</p>
            <p className={`text-2xl font-bold ${metrics.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(metrics.roi)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Return on investment</p>
          </div>
        </div>

        {/* Labor & Expense Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Labor Costs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Labor Costs</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b">
                <div>
                  <p className="text-sm font-medium text-gray-700">Internal Labor</p>
                  <p className="text-xs text-gray-500">{Math.round(metrics.internalLaborHours)} hours</p>
                </div>
                <p className="text-lg font-semibold text-slate-900">{formatCurrency(metrics.internalLaborCost)}</p>
              </div>
              <div className="flex justify-between items-center pb-4 border-b">
                <div>
                  <p className="text-sm font-medium text-gray-700">External Labor</p>
                  <p className="text-xs text-gray-500">{Math.round(metrics.externalLaborHours)} hours</p>
                </div>
                <p className="text-lg font-semibold text-slate-900">{formatCurrency(metrics.externalLaborCost)}</p>
              </div>
              <div className="flex justify-between items-center pt-2">
                <p className="font-semibold text-gray-900">Total Labor</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(metrics.totalLaborCost)}</p>
              </div>
            </div>
          </div>

          {/* Expense Categories */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Expense Categories</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>Cloud Infrastructure</span>
                <span className="font-medium">{formatCurrency(metrics.cloudInfrastructureCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>AI Services</span>
                <span className="font-medium">{formatCurrency(metrics.aiServicesCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Software & Tools</span>
                <span className="font-medium">{formatCurrency(metrics.softwareToolsCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Equipment</span>
                <span className="font-medium">{formatCurrency(metrics.equipmentCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Materials & Supplies</span>
                <span className="font-medium">{formatCurrency(metrics.materialsCost)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Overhead</span>
                <span className="font-medium">{formatCurrency(metrics.overheadCost)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Breakdown by Category */}
        {breakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Cost Distribution</h2>
            <div className="space-y-4">
              {breakdown.map((category) => (
                <div key={category.categoryCode}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{category.categoryName}</p>
                      <p className="text-xs text-gray-500">{category.projectCount} projects</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(category.amount)}</p>
                      <p className="text-xs text-gray-500">{formatPercentage(category.percentOfTotal)} of total</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${category.percentOfTotal}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Performance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Project Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Project Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-bold text-slate-900">{metrics.totalProjects}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active</span>
                <span className="font-bold text-blue-600">{metrics.activeProjects}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed</span>
                <span className="font-bold text-green-600">{metrics.completedProjects}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">At Risk</span>
                <span className="font-bold text-red-600">{metrics.atRiskProjects}</span>
              </div>
            </div>
          </div>

          {/* Schedule Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Schedule</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">On-Time Projects</span>
                  <span className="text-sm font-bold text-slate-900">{formatPercentage(metrics.onTimePercent)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${metrics.onTimePercent}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Completion</span>
                  <span className="text-sm font-bold text-slate-900">{formatPercentage(metrics.completionPercent)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${metrics.completionPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Budget Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Budget</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">On-Budget Projects</span>
                  <span className="text-sm font-bold text-slate-900">{formatPercentage(metrics.onBudgetPercent)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${metrics.onBudgetPercent}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Budget Utilization</span>
                  <span className="text-sm font-bold text-slate-900">{formatPercentage(metrics.budgetUtilization)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${metrics.budgetUtilization > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(metrics.budgetUtilization, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Analysis */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Financial Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Expected Benefits</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.expectedBenefits)}</p>
              <p className="text-xs text-gray-500 mt-2">Total portfolio benefits</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Net Present Value (NPV)</p>
              <p className={`text-2xl font-bold ${metrics.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.npv)}
              </p>
              <p className="text-xs text-gray-500 mt-2">Benefits minus costs</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Payback Period</p>
              <p className="text-2xl font-bold text-slate-900">{metrics.paybackPeriod.toFixed(1)} months</p>
              <p className="text-xs text-gray-500 mt-2">Time to break even</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-right text-xs text-gray-500">
          Last updated: {new Date(metrics.calculatedAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
