/**
 * Chart Component
 * Renders data as interactive charts (bar, line, pie, area)
 */

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { TrendingUp } from "lucide-react"

interface ChartComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

export function ChartComponent({ props, data }: ChartComponentProps) {
  const title = (props.title as string) || "Chart"
  const chartType = (props.chartType as string) || "bar"

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <TrendingUp className="h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm text-slate-600">
              {chartType.charAt(0).toUpperCase() + chartType.slice(1)} chart with {data.length} data points
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Integration with Recharts or D3 coming soon for rich visualizations
            </p>
          </div>
        </div>

        {data.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-slate-700">Raw Data Preview:</p>
            <div className="max-h-48 overflow-y-auto">
              <pre className="rounded bg-slate-900 p-3 text-xs text-slate-100">
                {JSON.stringify(data.slice(0, 3), null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
