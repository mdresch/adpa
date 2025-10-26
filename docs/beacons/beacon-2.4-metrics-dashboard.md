# Beacon 2.4: Program Metrics Dashboard (Frontend Charts)

## Owner
Frontend Agent #2

## Duration
20 minutes with GitHub Copilot

## Dependencies
- Beacon 1.4: Program metrics API (provides data)
- Beacon 2.2: Program detail page (where dashboard is displayed)

## Epic
ADPA v3.0 - Program Management UI

## Description
Create visual dashboard with charts and graphs showing program health metrics. Uses Recharts library to display budget burn-down, project status distribution, risk heatmap, and milestone timeline.

---

## Requirements

### New Component: components/program/MetricsDashboard.tsx

**Charts to Display:**

1. **Budget Burn-Down Chart (Line Chart)**
   - X-axis: Timeline (months)
   - Y-axis: Budget ($)
   - Lines: Planned budget, Actual spent, Forecast
   - Shaded area: Budget variance

2. **Project Status Distribution (Pie Chart)**
   - Segments: Green, Amber, Red projects
   - Colors: Match RAG status colors
   - Labels: Count and percentage
   - Interactive: Click segment to filter project list

3. **Risk Heatmap (Scatter/Bubble Chart)**
   - X-axis: Probability (0-100%)
   - Y-axis: Impact ($)
   - Bubbles: Risks (size = severity)
   - Colors: Critical (red), High (orange), Medium (yellow), Low (green)
   - Tooltip: Risk title and description

4. **Milestone Timeline (Horizontal Bar Chart)**
   - Y-axis: Milestone names
   - X-axis: Dates
   - Bars: Planned vs Actual completion
   - Colors: Completed (green), On-track (blue), Overdue (red)

**Layout:**
- 2x2 grid on desktop
- Stack vertically on mobile
- Each chart in Card component
- Export button (download as PNG or PDF)

---

## Reference Files

**Study Recharts usage:**
- `app/ai-analytics/page.tsx` - Uses Recharts for AI analytics
- `app/analytics/page.tsx` - Another Recharts example
- Any existing dashboard pages with charts

**Component patterns:**
- `components/ui/card.tsx` - Wrap each chart
- Use Recharts components: LineChart, PieChart, ScatterChart, BarChart

---

## Component Structure

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, Line, PieChart, Pie, ScatterChart, Scatter,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer 
} from 'recharts';

interface MetricsDashboardProps {
  metrics: ProgramMetrics;
  programId: string;
}

export function MetricsDashboard({ metrics, programId }: MetricsDashboardProps) {
  // Transform metrics data for charts
  const budgetData = transformBudgetData(metrics.budget);
  const statusData = transformStatusData(metrics.status.breakdown);
  const riskData = transformRiskData(metrics.risks);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Budget Burn-Down Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={budgetData}>
              {/* Chart config */}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Project Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Project Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              {/* Chart config */}
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Risk Heatmap */}
      {/* Milestone Timeline */}
    </div>
  );
}
```

---

## Data Transformation

**Budget data for line chart:**
```typescript
const budgetData = [
  { month: 'Sep', planned: 2000000, actual: 2100000 },
  { month: 'Oct', planned: 4000000, actual: 3800000 },
  { month: 'Nov', planned: 6000000, actual: 6000000 },
  // ... etc
];
```

**Status data for pie chart:**
```typescript
const statusData = [
  { name: 'Green', value: 2, fill: '#22c55e' },
  { name: 'Amber', value: 1, fill: '#eab308' },
  { name: 'Red', value: 0, fill: '#ef4444' }
];
```

---

## Responsive Design

**Desktop (≥768px):**
- 2x2 grid (4 charts visible)
- Full-size charts (300px height each)

**Mobile (<768px):**
- Single column (stack vertically)
- Smaller charts (200px height)
- Swipeable carousel (optional enhancement)

---

## Export Functionality

**Download charts as images:**
```typescript
import { toPng } from 'html-to-image';

const exportDashboard = async () => {
  const element = document.getElementById('metrics-dashboard');
  const dataUrl = await toPng(element);
  const link = document.createElement('a');
  link.download = `program-${programId}-metrics.png`;
  link.href = dataUrl;
  link.click();
};
```

---

## Success Criteria

- [x] All 4 charts render correctly
- [x] Data displays accurately from API
- [x] Charts are interactive (hover tooltips, click actions)
- [x] Responsive design works on mobile
- [x] Export to PNG works
- [x] Real-time updates (chart re-renders when metrics change)
- [x] Loading states while data fetches
- [x] Empty states if no data
- [x] Follows ADPA color scheme
- [x] Accessible (chart alternatives for screen readers)

---

## Output Files

1. `components/program/MetricsDashboard.tsx` - Main dashboard component
2. `components/program/__tests__/MetricsDashboard.test.tsx` - Component tests
3. Update `app/programs/[id]/page.tsx` - Import and use dashboard in Overview tab

---

## Time Estimate

**Traditional:** 6-8 hours (4 charts + responsive + export + styling)
**With Copilot:** 20 minutes (AI generates Recharts config, human tweaks)
**Savings:** 96% faster!

---

**Status:** Ready for AI generation  
**Priority:** HIGH (executive dashboard visualization)  
**Parallel:** Can develop with other frontend/backend beacons

