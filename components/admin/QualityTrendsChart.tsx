'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'

interface QualityTrend {
  date: string
  avg_quality: number
  document_count: number
  templates_analyzed: number
}

interface QualityTrendsChartProps {
  data: QualityTrend[]
}

export function QualityTrendsChart({ data }: QualityTrendsChartProps) {
  // Transform data for chart
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    quality: item.avg_quality,
    documents: item.document_count
  }))

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorQuality" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorDocuments" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="date" 
            className="text-xs text-muted-foreground"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis 
            yAxisId="left"
            className="text-xs text-muted-foreground"
            tick={{ fill: 'currentColor' }}
            label={{ value: 'Quality Score (%)', angle: -90, position: 'insideLeft' }}
            domain={[0, 100]}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            className="text-xs text-muted-foreground"
            tick={{ fill: 'currentColor' }}
            label={{ value: 'Document Count', angle: 90, position: 'insideRight' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              padding: '12px'
            }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
          />
          <Legend />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="quality"
            stroke="#8b5cf6"
            fillOpacity={1}
            fill="url(#colorQuality)"
            name="Quality Score (%)"
            strokeWidth={2}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="documents"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            name="Documents Generated"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

