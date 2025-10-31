# v0.dev Prompt - Portfolio Executive Dashboard

**Purpose**: Generate Portfolio-level executive dashboard for ADPA system  
**Complements**: Program Dashboard (already created)  
**Date**: October 31, 2025  

---

## 🎯 **PROMPT FOR v0.dev**

```
Create a comprehensive Portfolio Executive Dashboard for an enterprise project portfolio management system (ADPA). This is the top-level view (Level 1) that aggregates data from 11 programs and 23 projects.

## TECHNICAL STACK

- Next.js 14 with TypeScript
- Radix UI primitives (Dialog, Card, Tabs, Progress, Badge, Select, Popover)
- Tailwind CSS with modern design tokens
- Recharts for data visualization
- Lucide React icons
- Framer Motion for animations
- shadcn/ui components
- Responsive: Mobile-first design

## DESIGN REQUIREMENTS

### Visual Style:
- Clean, minimal, data-dense (inspired by Linear, Notion, Attlasian)
- Information hierarchy: Critical metrics first, details below
- Color system: Green (#22c55e success), Amber (#f59e0b warning), Red (#ef4444 critical), Blue (#3b82f6 info)
- Typography: Inter font, clear hierarchy
- Whitespace: Generous padding, clear sections
- Animations: Smooth transitions (300ms), subtle hover effects

### Accessibility:
- WCAG 2.1 AA compliant
- Keyboard navigation support
- ARIA labels on interactive elements
- High contrast mode compatible
- Screen reader friendly

---

## LAYOUT STRUCTURE

### Page Layout:
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Portfolio Command Center                           │
│ Breadcrumb: Dashboard / Portfolio                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ === STRATEGIC KPIs (4-column grid) ===                     │
│                                                             │
│ ┌──────────────┬──────────────┬──────────────┬──────────┐ │
│ │ Total Value  │ Programs     │ Total        │ Resource │ │
│ │              │              │ Investment   │ Utiliz.  │ │
│ │   $50M       │     11       │    $25M      │   82%    │ │
│ │ ↑ +12% YoY   │ 5🟢 4🟡 2🔴  │ 📊 Breakdown │🟢Optimal │ │
│ │              │              │              │          │ │
│ │ [Sparkline]  │ [Mini pie]   │ [Bar chart]  │[Progress]│ │
│ └──────────────┴──────────────┴──────────────┴──────────┘ │
│                                                             │
│ === STRATEGIC OBJECTIVES & OKRs ===                        │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ 🎯 Objective: Scale Customer Base (Q4 2025)           │ │
│ │    Owner: CEO | Confidence: 🟢 High | Due: Dec 31     │ │
│ │                                                        │ │
│ │ Key Results:                                           │ │
│ │                                                        │ │
│ │ ○ Reach 10,000 customers                              │ │
│ │   Current: 7,500 | Target: 10,000                     │ │
│ │   [████████████████░░░░] 75%                          │ │
│ │   Status: 🟢 On Track                                 │ │
│ │                                                        │ │
│ │ ○ Achieve 95% Customer Satisfaction (CSAT)            │ │
│ │   Current: 92% | Target: 95%                          │ │
│ │   [████████████████░░░░] 97% of target                │ │
│ │   Status: 🟡 Needs Attention                          │ │
│ │                                                        │ │
│ │ ○ $50M Annual Recurring Revenue (ARR)                 │ │
│ │   Current: $38M | Target: $50M                        │ │
│ │   [███████████████░░░░░] 76%                          │ │
│ │   Status: 🟢 On Track                                 │ │
│ │                                                        │ │
│ │ Overall Progress: 83% | Risk Level: Low               │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ === PRIORITIZATION MATRIX (Interactive) ===                │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Program Portfolio - Strategic Value vs Alignment      │ │
│ │                                                        │ │
│ │  High   │                                              │ │
│ │  Value  │     [Alpha 4.10]                            │ │
│ │    ↑    │                    [Beta 3.45]              │ │
│ │    │    │                                              │ │
│ │    │    │           [Gamma 3.30]                      │ │
│ │    │    │  [Delta 2.55]                               │ │
│ │    │    │                                              │ │
│ │  Low    └──────────────────────────────────────> High │ │
│ │         Low          Strategic Alignment         High │ │
│ │                                                        │ │
│ │ Criteria Weights:                                      │ │
│ │ Strategic Alignment: 30% | Value Contribution: 25%    │ │
│ │ Risk Level: 15% | Resource Availability: 20%          │ │
│ │ Urgency: 10%                                           │ │
│ │                                                        │ │
│ │ Legend: ⬤ Size = Budget | Color = Health (🟢🟡🔴)     │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ === PROGRAMS OVERVIEW (Sortable Table) ===                │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ [🔍 Search programs...] [Filter ▼] [Sort ▼] [Export] │ │
│ ├───────────────────────────────────────────────────────┤ │
│ │ Program Name     │Status│Budget │Projects│Health│Pri.││
│ │──────────────────┼──────┼───────┼────────┼──────┼────││
│ │ Digital Trans.   │ 🟢   │ $5.0M │   8    │ 85%  │4.10││
│ │ Cloud Migration  │ 🟡   │ $3.0M │   5    │ 68%  │3.45││
│ │ Product Launch   │ 🟡   │ $2.5M │   4    │ 72%  │3.30││
│ │ Data Platform    │ 🔴   │ $2.0M │   3    │ 42%  │2.55││
│ │ Mobile App       │ 🟢   │ $1.5M │   2    │ 90%  │3.85││
│ │ + 6 more programs...                                  │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ === FINANCIAL OVERVIEW (2 Charts Side-by-Side) ===        │
│                                                             │
│ ┌──────────────────────┬────────────────────────────────┐ │
│ │ Budget Allocation    │ Investment Timeline            │ │
│ │                      │                                │ │
│ │   [Donut Chart]      │   [Area Chart]                 │ │
│ │                      │   Baseline ──                  │ │
│ │ Digital: $5M (35%)   │   Actual ──                    │ │
│ │ Cloud: $3M (21%)     │   Forecast ··                  │ │
│ │ Product: $2.5M (17%) │                                │ │
│ │ Data: $2M (14%)      │   Q1  Q2  Q3  Q4  Q1  Q2      │ │
│ │ Other: $1.9M (13%)   │   2025 ────────→ 2026         │ │
│ └──────────────────────┴────────────────────────────────┘ │
│                                                             │
│ === RISK & COMPLIANCE ===                                  │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Portfolio Risk Summary                                 │ │
│ │                                                        │ │
│ │ Total Risks: 23  (5 🔴 Critical | 12 🟡 High | 6 🟢 Med)│ │
│ │                                                        │ │
│ │ [Risk Heat Map - 2D Grid]                             │ │
│ │  High │ [5] │ [8] │ [2] │                             │ │
│ │ Impact│ [3] │ [4] │ [1] │                             │ │
│ │  Low  │ [0] │ [0] │ [0] │                             │ │
│ │       └─────┴─────┴─────                              │ │
│ │        Low  Med  High  Probability                    │ │
│ │                                                        │ │
│ │ EU Compliance Status:                                 │ │
│ │ ✅ AI Act Ready | ✅ CSRD Compliant |                 │ │
│ │ ⚠️ NIS2 In Progress | ✅ DORA Certified              │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ [Quick Actions: + New Program | 📊 Export Report |        │
│                 🎯 Scenario Planning | ⚙️ Settings]       │
└─────────────────────────────────────────────────────────────┘
```

## COMPONENT STRUCTURE

Create as `app/portfolio/page.tsx`:

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  DollarSign, 
  Users,
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle,
  Target
} from 'lucide-react'

// Use these exact interfaces
interface PortfolioMetrics {
  totalValue: number
  valueChange: number
  programCount: { total: number; green: number; amber: number; red: number }
  totalInvestment: number
  resourceUtilization: number
}

interface OKR {
  id: string
  objective: string
  keyResults: KeyResult[]
  confidence: 'high' | 'medium' | 'low'
  owner: string
  dueDate: string
  progress: number
}

interface KeyResult {
  id: string
  name: string
  current: number
  target: number
  unit: string
  status: 'green' | 'amber' | 'red'
}

interface ProgramSummary {
  id: string
  name: string
  description: string
  status: 'green' | 'amber' | 'red'
  budget: number
  projectCount: number
  health: number
  priorityScore: number
  owner: string
}
```

## SAMPLE DATA TO USE

```typescript
const portfolioMetrics: PortfolioMetrics = {
  totalValue: 50000000,
  valueChange: 12,
  programCount: { total: 11, green: 5, amber: 4, red: 2 },
  totalInvestment: 25000000,
  resourceUtilization: 82
}

const okrs: OKR[] = [
  {
    id: '1',
    objective: 'Scale Customer Base',
    keyResults: [
      { id: '1a', name: 'Reach 10,000 customers', current: 7500, target: 10000, unit: 'customers', status: 'green' },
      { id: '1b', name: 'Achieve 95% CSAT', current: 92, target: 95, unit: '%', status: 'amber' },
      { id: '1c', name: '$50M Annual Recurring Revenue', current: 38, target: 50, unit: '$M', status: 'green' }
    ],
    confidence: 'high',
    owner: 'CEO',
    dueDate: '2025-12-31',
    progress: 83
  }
]

const programs: ProgramSummary[] = [
  { id: '1', name: 'Digital Transformation', description: 'Enterprise-wide digital transformation initiative', status: 'green', budget: 5000000, projectCount: 8, health: 85, priorityScore: 4.10, owner: 'Jane Smith' },
  { id: '2', name: 'Cloud Migration', description: 'Migrate on-premise systems to AWS cloud', status: 'amber', budget: 3000000, projectCount: 5, health: 68, priorityScore: 3.45, owner: 'John Doe' },
  { id: '3', name: 'Product Launch', description: 'New product line launch and marketing', status: 'amber', budget: 2500000, projectCount: 4, health: 72, priorityScore: 3.30, owner: 'Sarah Lee' },
  { id: '4', name: 'Data Analytics Platform', description: 'Build enterprise analytics capability', status: 'red', budget: 2000000, projectCount: 3, health: 42, priorityScore: 2.55, owner: 'Mike Chen' },
  { id: '5', name: 'Mobile App Redesign', description: 'Complete mobile experience overhaul', status: 'green', budget: 1500000, projectCount: 2, health: 90, priorityScore: 3.85, owner: 'Emily Zhang' }
]

const complianceStatus = [
  { name: 'EU AI Act', status: 'compliant', dueDate: 'Aug 2, 2026' },
  { name: 'CSRD/ESRS', status: 'compliant', dueDate: 'In Force' },
  { name: 'NIS2', status: 'in-progress', dueDate: 'Oct 17, 2024' },
  { name: 'DORA', status: 'compliant', dueDate: 'Jan 17, 2025' }
]
```

## KEY COMPONENTS NEEDED

### 1. Strategic KPI Cards (4 cards)

Each card should have:
- Large metric value (e.g., "$50M")
- Label (e.g., "Total Portfolio Value")
- Trend indicator with percentage (e.g., "↑ +12%")
- Mini chart/visualization (sparkline, mini donut, bar)
- Status color (green/amber/red background tint)
- Hover effect: Lift shadow, scale slightly
- Click: Navigate to detail view

Design: Modern gradient background, large typography, icon in top-right

### 2. OKR Progress Section

Features:
- Objective title with emoji target icon
- Owner badge, confidence level, due date
- Progress percentage for entire objective
- Each Key Result:
  - Name with checkbox icon
  - Current value, target value, unit
  - Progress bar (Recharts or custom)
  - Status badge (green/amber/red)
  - Small trend arrow
- Collapsible: Click to expand/collapse details
- Smooth animations on expand

Design: Card with subtle border, clear hierarchy, progress bars with gradients

### 3. Prioritization Matrix (Interactive Scatter Plot)

Features:
- X-axis: Strategic Alignment (0-5)
- Y-axis: Value Contribution (0-5)
- Bubbles represent programs
- Bubble size: Budget (larger = more budget)
- Bubble color: Health status (green 85%+, amber 60-85%, red <60%)
- Hover bubble: Show tooltip with full details (name, budget, score, health)
- Click bubble: Navigate to program dashboard
- Grid lines for easy reading
- Legend explaining bubble size and colors
- Show criteria weights below chart

Design: Modern scatter plot with smooth bubbles, subtle grid, interactive tooltips

### 4. Programs Overview Table

Features:
- Columns: Name, Status (badge), Budget, Projects (count), Health (%), Priority Score
- Sortable: Click column header to sort
- Filterable: Quick filters above table (Status, Budget range, Health)
- Search: Real-time filter by name/description
- Row hover: Highlight with subtle background
- Row click: Navigate to program detail page
- Status column: Color-coded badges (🟢🟡🔴)
- Pagination: 10 per page with "Load more" or page numbers
- Bulk actions: Select multiple, export, archive

Design: Clean table with zebra striping (subtle), sticky header on scroll

### 5. Financial Overview Charts (2 charts side-by-side)

**Left: Budget Allocation Donut Chart**
- Segments for each program
- Center shows total ($25M)
- Hover segment: Highlight + tooltip with details
- Legend on right with percentages
- Interactive: Click segment to filter table below

**Right: Investment Timeline Area Chart**
- X-axis: Time (Q1 2025 → Q2 2026)
- Y-axis: Cumulative spend ($)
- 3 lines:
  - Baseline (dashed gray)
  - Actual (solid blue)
  - Forecast (solid green with confidence band)
- Confidence band: Light green shading
- Hover: Show exact values
- Markers for major milestones

Design: Modern charts with subtle shadows, interactive tooltips, smooth animations

### 6. Risk & Compliance Dashboard

Features:
- Risk summary card with total count breakdown
- Risk heat map (2D grid):
  - X-axis: Probability (Low/Med/High)
  - Y-axis: Impact (Low/Med/High)
  - Cell color intensity: Number of risks
  - Click cell: Show list of risks
- Compliance status badges:
  - ✅ Green: Compliant
  - ⚠️ Amber: In Progress
  - 🔴 Red: Non-Compliant
- Each regulation: Name, status, due date
- "View Compliance Report" button

Design: Card with sections, heat map uses gradient colors, badges with icons

### 7. Quick Actions (Bottom-right floating)

Buttons:
- "+ New Program" (primary blue button)
- "📊 Export Report" (outline)
- "🎯 Scenario Planning" (outline)
- "⚙️ Settings" (ghost)

Design: Floating action buttons with shadow, hover effects

---

## INTERACTIONS & BEHAVIORS

### On Page Load:
1. Fetch portfolio metrics
2. Animate KPI cards (count up animation)
3. Load OKRs with staggered animation
4. Render prioritization matrix with smooth bubble appearance
5. Load programs table (show first 10)
6. Render charts with smooth transitions

### User Interactions:
- **Click KPI Card**: Navigate to detail dashboard
- **Click Bubble in Matrix**: Navigate to program dashboard
- **Click Table Row**: Navigate to program dashboard
- **Search Programs**: Real-time filter table
- **Sort Table**: Ascending/descending toggle
- **Filter Status**: Show only green/amber/red programs
- **Export Report**: Download portfolio summary as PDF
- **New Program**: Open creation dialog

### Real-time Updates:
- Show loading skeletons while fetching data
- Toast notifications for actions
- Optimistic updates (update UI before API response)
- Error states with retry buttons
- Empty states: "No programs yet" with create button

---

## RESPONSIVE BREAKPOINTS

### Mobile (< 768px):
- Stack KPI cards vertically (1 column)
- OKR section: Full width, collapsible
- Matrix: Hide, replace with sorted list
- Table: Convert to cards (stacked)
- Charts: Full width, stacked vertically
- Hide complex visualizations, show simplified metrics

### Tablet (768px - 1024px):
- KPI cards: 2x2 grid
- OKR section: Full width
- Matrix: Smaller, simplified
- Table: Horizontal scroll
- Charts: Side-by-side if space allows

### Desktop (> 1024px):
- Full layout as described
- KPI cards: 4 columns
- All features visible
- No scrolling needed above fold (for key metrics)

---

## CODE STRUCTURE

Organize as:

```typescript
export default function PortfolioDashboard() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <PortfolioHeader />
      
      {/* Strategic KPIs */}
      <section className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard metric={...} />
          {/* Repeat for 4 KPIs */}
        </div>
      </section>
      
      {/* OKRs */}
      <section className="px-6 pb-6">
        <OKRSection okrs={okrs} />
      </section>
      
      {/* Prioritization Matrix */}
      <section className="px-6 pb-6">
        <PrioritizationMatrix programs={programs} />
      </section>
      
      {/* Programs Table */}
      <section className="px-6 pb-6">
        <ProgramsTable programs={programs} />
      </section>
      
      {/* Financial Charts */}
      <section className="px-6 pb-6">
        <div className="grid md:grid-cols-2 gap-6">
          <BudgetDonutChart data={budgetData} />
          <InvestmentTimelineChart data={timelineData} />
        </div>
      </section>
      
      {/* Risk & Compliance */}
      <section className="px-6 pb-6">
        <RiskComplianceCard risks={risks} compliance={compliance} />
      </section>
      
      {/* Quick Actions */}
      <QuickActions />
    </div>
  )
}

// Create separate components
function KPICard({ metric }: { metric: KPIMetric }) { ... }
function OKRSection({ okrs }: { okrs: OKR[] }) { ... }
function PrioritizationMatrix({ programs }: { programs: ProgramSummary[] }) { ... }
function ProgramsTable({ programs }: { programs: ProgramSummary[] }) { ... }
// etc.
```

---

## CHARTS CONFIGURATION

### Donut Chart (Recharts):
```typescript
<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie
      data={budgetData}
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={80}
      fill="#8884d8"
      paddingAngle={5}
      dataKey="value"
    >
      {budgetData.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
      ))}
    </Pie>
    <Tooltip />
    <Legend />
  </PieChart>
</ResponsiveContainer>
```

### Area Chart (Recharts):
```typescript
<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={timelineData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="quarter" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Area type="monotone" dataKey="baseline" stroke="#94a3b8" fill="none" strokeDasharray="5 5" />
    <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="#3b82f680" />
    <Area type="monotone" dataKey="forecast" stroke="#22c55e" fill="#22c55e40" />
  </AreaChart>
</ResponsiveContainer>
```

### Scatter Plot for Matrix (Recharts):
```typescript
<ResponsiveContainer width="100%" height={400}>
  <ScatterChart>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="strategicAlignment" domain={[0, 5]} label="Strategic Alignment" />
    <YAxis dataKey="valueContribution" domain={[0, 5]} label="Value Contribution" />
    <Tooltip content={<CustomTooltip />} />
    <Scatter 
      name="Programs" 
      data={matrixData} 
      fill="#3b82f6"
    >
      {matrixData.map((entry, index) => (
        <Cell 
          key={`cell-${index}`} 
          fill={getHealthColor(entry.health)}
          r={getBubbleSize(entry.budget)}
        />
      ))}
    </Scatter>
  </ScatterChart>
</ResponsiveContainer>
```

---

## DELIVERABLES

Please generate:
1. ✅ Complete Portfolio Dashboard component
2. ✅ All sub-components (KPICard, OKRSection, Matrix, Table, Charts)
3. ✅ TypeScript interfaces
4. ✅ Sample data constants
5. ✅ Utility functions (getHealthColor, formatCurrency, etc.)
6. ✅ Responsive styles
7. ✅ Interactive features (search, sort, filter)
8. ✅ Loading states and skeletons
9. ✅ Error states
10. ✅ Empty states

Make it beautiful, modern, and production-ready!
```

---

**Copy this entire prompt into v0.dev** for the Portfolio Dashboard! 🎨

Would you like me to also create the **Project Dashboard prompt** to complete the three-tier system?
