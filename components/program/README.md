# Program Metrics Dashboard

A comprehensive React dashboard component for visualizing program health metrics with interactive charts.

## Overview

The MetricsDashboard component provides executive-level insights into program performance through four key visualizations:

1. **Budget Tracking** - Line chart showing planned vs actual vs forecast budget over time
2. **Project Status Distribution** - Pie chart displaying RAG (Red/Amber/Green) status breakdown
3. **Risk Heatmap** - Scatter/bubble chart plotting risk probability vs impact
4. **Milestone Timeline** - Horizontal bar chart comparing planned vs actual milestone dates

## Features

✅ **Interactive Charts** - Hover tooltips with detailed information  
✅ **Responsive Design** - 2x2 grid on desktop, stacked on mobile  
✅ **Export Functionality** - Download dashboard as high-quality PNG  
✅ **Loading States** - Smooth loading experience  
✅ **Empty States** - Graceful handling when no data is available  
✅ **Real-time Updates** - Dashboard re-renders when metrics change  
✅ **Accessible** - Semantic HTML and ARIA labels  
✅ **Color-coded** - RAG status and risk severity colors  

## Installation

The required dependencies are already installed:

```bash
# Recharts for chart components (already installed)
npm install recharts

# html-to-image for export functionality (already installed)
npm install html-to-image
```

## Usage

### Basic Usage

```tsx
import { MetricsDashboard } from '@/components/program/MetricsDashboard';
import { ProgramMetrics } from '@/components/program/types';

const metrics: ProgramMetrics = {
  budget: {
    planned: 10000000,
    actual: 8500000,
    forecast: 9500000,
    variance: -1500000,
    timeline: [
      { month: 'Jan', planned: 2000000, actual: 2100000 },
      { month: 'Feb', planned: 4000000, actual: 3800000 }
    ]
  },
  status: {
    total: 5,
    breakdown: { green: 3, amber: 1, red: 1 }
  },
  risks: [
    {
      id: '1',
      title: 'Resource shortage',
      description: 'Critical staff shortage in Q2',
      probability: 75,
      impact: 500000,
      severity: 'high'
    }
  ],
  milestones: [
    {
      id: '1',
      name: 'Phase 1 Complete',
      plannedDate: '2024-01-31',
      actualDate: '2024-01-28',
      status: 'completed'
    }
  ]
};

function ProgramPage() {
  return (
    <MetricsDashboard 
      metrics={metrics} 
      programId="my-program-123"
    />
  );
}
```

### With Loading State

```tsx
function ProgramPage() {
  const [metrics, setMetrics] = useState<ProgramMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics().then(data => {
      setMetrics(data);
      setLoading(false);
    });
  }, []);

  return (
    <MetricsDashboard 
      metrics={metrics || emptyMetrics} 
      programId="my-program-123"
      loading={loading}
    />
  );
}
```

## Type Definitions

### ProgramMetrics

```typescript
interface ProgramMetrics {
  budget: BudgetMetrics;
  status: StatusMetrics;
  risks: Risk[];
  milestones: Milestone[];
}
```

### BudgetMetrics

```typescript
interface BudgetMetrics {
  planned: number;      // Total planned budget
  actual: number;       // Actual spent to date
  forecast: number;     // Forecasted final amount
  variance: number;     // Difference from plan
  timeline: BudgetTimelineEntry[];
}

interface BudgetTimelineEntry {
  month: string;        // e.g., "Jan", "Feb"
  planned: number;
  actual: number;
  forecast?: number;    // Optional forecast
}
```

### StatusMetrics

```typescript
interface StatusMetrics {
  total: number;
  breakdown: ProjectStatusBreakdown;
}

interface ProjectStatusBreakdown {
  green: number;   // Number of projects in good health
  amber: number;   // Number of projects at risk
  red: number;     // Number of projects in trouble
}
```

### Risk

```typescript
interface Risk {
  id: string;
  title: string;
  description: string;
  probability: number;        // 0-100%
  impact: number;             // Dollar amount
  severity: 'critical' | 'high' | 'medium' | 'low';
}
```

### Milestone

```typescript
interface Milestone {
  id: string;
  name: string;
  plannedDate: string;       // ISO date string
  actualDate?: string;       // ISO date string (optional)
  status: 'completed' | 'on-track' | 'overdue';
}
```

## Chart Details

### 1. Budget Burn-Down Chart

**Type:** Line Chart  
**Data:** Budget timeline entries  
**Features:**
- Three lines: Planned (blue), Actual (green), Forecast (orange, dashed)
- Y-axis in millions for readability
- Interactive tooltips showing exact amounts
- Grid lines for easy reading

### 2. Project Status Distribution

**Type:** Pie Chart  
**Data:** Project status breakdown  
**Features:**
- RAG color scheme: Green (#22c55e), Amber (#eab308), Red (#ef4444)
- Shows count and percentage
- Interactive legend
- Custom tooltips

### 3. Risk Heatmap

**Type:** Scatter/Bubble Chart  
**Data:** Risk list  
**Features:**
- X-axis: Probability (0-100%)
- Y-axis: Impact (in millions)
- Bubble size: Severity
- Color-coded: Critical (red), High (orange), Medium (yellow), Low (green)
- Detailed tooltips with risk description

### 4. Milestone Timeline

**Type:** Horizontal Bar Chart  
**Data:** Milestone list  
**Features:**
- Shows planned vs actual dates
- Color-coded: Completed (green), On-track (blue), Overdue (red)
- Dates formatted as "Mon DD"
- Y-axis labels show milestone names

## Responsive Design

### Desktop (≥768px)
- 2x2 grid layout
- Full-size charts (300px height each)
- All charts visible simultaneously

### Mobile (<768px)
- Single column stack
- Charts maintain full width
- Smooth scrolling
- Touch-friendly interactions

## Export Functionality

Users can export the entire dashboard as a PNG image:

```typescript
// Export button in dashboard header
<Button onClick={exportDashboard}>
  <Download /> Export PNG
</Button>

// Downloaded file naming:
// program-{programId}-metrics-{YYYY-MM-DD}.png
```

Export features:
- High quality (2x pixel ratio)
- White background
- Includes all charts and summary stats
- Success/error toast notifications

## Color Scheme

The dashboard follows the ADPA color scheme:

**RAG Status:**
- Green: `#22c55e`
- Amber: `#eab308`
- Red: `#ef4444`

**Risk Severity:**
- Critical: `#ef4444` (red)
- High: `#f97316` (orange)
- Medium: `#eab308` (yellow)
- Low: `#22c55e` (green)

**Milestone Status:**
- Completed: `#22c55e` (green)
- On-track: `#3b82f6` (blue)
- Overdue: `#ef4444` (red)

## Integration

### Program Detail Page

The dashboard is integrated into the program detail page at `/app/programs/[id]/page.tsx`:

```tsx
import { MetricsDashboard } from '@/components/program/MetricsDashboard';

export default function ProgramDetailPage() {
  // ... fetch metrics
  
  return (
    <Tabs>
      <TabsContent value="overview">
        <MetricsDashboard 
          metrics={metrics} 
          programId={programId}
        />
      </TabsContent>
    </Tabs>
  );
}
```

## Testing

Component tests have been created in `components/program/__tests__/MetricsDashboard.test.tsx`.

**Note:** The `__tests__` directory is currently excluded from version control per the project's `.gitignore` settings. Test files can be committed by overriding this restriction with `git add -f` if needed for CI/CD pipelines.

Test coverage includes:
- Loading state rendering
- Empty state handling
- Chart rendering with data
- Summary statistics calculation
- Export functionality
- Error handling
- Responsive behavior
- Color application based on variance

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Charts use `ResponsiveContainer` for optimal rendering
- Data transformation happens once on mount/update
- Export uses high-quality rendering without performance impact
- Lazy loading recommended for large datasets

## Future Enhancements

Potential improvements:
- [ ] Click-through from charts to detailed views
- [ ] Date range selector for budget timeline
- [ ] Risk filtering by severity
- [ ] Milestone filtering by status
- [ ] PDF export option
- [ ] Print-optimized view
- [ ] Drill-down capabilities
- [ ] Real-time WebSocket updates
- [ ] Customizable chart colors
- [ ] Chart configuration options

## API Integration

When the backend API is ready, update the data fetching:

```typescript
// Example API integration
async function fetchProgramMetrics(programId: string): Promise<ProgramMetrics> {
  const response = await fetch(`/api/programs/${programId}/metrics`);
  if (!response.ok) throw new Error('Failed to fetch metrics');
  return response.json();
}
```

## Dependencies

- `recharts` ^3.2.1 - Chart library
- `html-to-image` - PNG export
- `lucide-react` - Icons
- `sonner` - Toast notifications
- `@/components/ui/*` - Shadcn UI components

## License

Part of the ADPA project. See main repository for license details.
