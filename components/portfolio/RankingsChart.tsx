'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Ranking {
  project_id: string;
  project_name: string;
  total_score: number;
  rank: number;
  criteria_scored: number;
  last_scored_at: string;
  status: string;
  budget: number;
}

interface RankingsChartProps {
  rankings: Ranking[];
  title?: string;
  maxItems?: number;
}

export function RankingsChart({
  rankings,
  title = 'Top Portfolio Rankings',
  maxItems = 10,
}: RankingsChartProps) {
  const chartData = rankings.slice(0, maxItems).map((ranking) => ({
    name: ranking.project_name,
    score: ranking.total_score,
    rank: ranking.rank,
  }));

  if (chartData.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center border rounded-lg bg-muted/20">
        <p className="text-muted-foreground">No rankings data available</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">
          Showing top {Math.min(maxItems, chartData.length)} projects by score
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-card">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 100,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={120}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              label={{
                value: 'Total Score',
                angle: -90,
                position: 'insideLeft',
              }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value) => [
                value.toFixed(2),
                'Score',
              ]}
              labelFormatter={(label) => `Project: ${label}`}
            />
            <Legend />
            <Bar
              dataKey="score"
              fill="hsl(var(--primary))"
              name="Total Score"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="border rounded-lg p-3 bg-muted/20">
          <p className="text-muted-foreground">Highest Score</p>
          <p className="text-lg font-semibold">
            {chartData[0]?.score.toFixed(2) || 'N/A'}
          </p>
        </div>
        <div className="border rounded-lg p-3 bg-muted/20">
          <p className="text-muted-foreground">Average Score</p>
          <p className="text-lg font-semibold">
            {(
              chartData.reduce((sum, item) => sum + item.score, 0) /
              chartData.length
            ).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
