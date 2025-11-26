# PMBOK 8 Performance Domain Dashboard

## Overview

The PMBOK 8 Domain Dashboard provides comprehensive, real-time analytics across all 5 PMBOK 8 Performance Domains with professional data visualizations, actionable insights, and domain health monitoring.

## Unique Features

### 1. **Domain Health Radar Chart**
- **Visual Overview**: Interactive radar/spider chart showing health scores across all 5 domains simultaneously
- **At-a-Glance Assessment**: Instantly identify which domains need attention
- **Color-Coded**: Each domain has a distinct color for easy recognition

### 2. **Domain-Specific Metrics Cards**
Each domain card displays:
- **Health Score**: 0-100 scale with visual progress indicator
- **Status Badge**: Color-coded status (healthy, needs_attention, blocked, etc.)
- **Domain-Specific KPIs**:
  - **Team**: Agreements count, adherence scores, violations
  - **Development Approach**: Iterations, velocity, story points
  - **Project Work**: Work items, blocked items, progress
  - **Measurement**: CPI, SPI, variance tracking, performance actuals (schedule/cost variance, quality trends)
  - **Uncertainty**: Opportunities, risk responses, effectiveness

### 3. **Actionable Insights Engine**
- **AI-Powered Recommendations**: Automatically generates insights based on domain data
- **Contextual Warnings**: Alerts for violations, blocked items, budget overruns
- **Success Recognition**: Highlights realized opportunities and achievements
- **Domain-Specific Guidance**: Tailored recommendations per performance domain

### 4. **Entity Coverage Visualization**
- **Bar Chart**: Shows entity counts per domain
- **Coverage Indicators**: Visual representation of which domains have data
- **Total Entity Count**: Aggregate view across all PMBOK 8 entities

### 5. **Overall Health Scorecard**
- **Composite Score**: Weighted average across all domains
- **Domain Coverage**: Shows how many of 5 domains have data
- **Trend Indicators**: Visual progress bars and status badges

## Technical Implementation

### Component Architecture
```
PMBOK8DomainDashboard
├── Domain Health Radar Chart (Recharts RadarChart)
├── Domain Metrics Cards (5 cards, one per domain)
├── Entity Coverage Bar Chart (Recharts BarChart)
├── Insights Panel (Dynamic recommendations)
└── Overall Health Scorecard (Aggregated metrics)
```

### Data Sources
- **Primary**: `/api/analytics/pmbok8-domains/:projectId` - Comprehensive domain analytics
- **Secondary**: `/api/project-data-extraction/results/:projectId` - Entity counts and coverage

### Key Metrics Tracked

#### Team Performance Domain
- Total agreements
- Active agreements
- Average adherence score (0-10)
- Total violations
- Agreements with violations

#### Development Approach & Life Cycle Domain
- Total approaches
- Unique frameworks
- Total iterations
- Completed iterations
- Average velocity
- Average story points

#### Project Work Performance Domain
- Total work items
- Completed/in-progress/blocked items
- Total estimated vs actual hours
- Average progress percentage
- Unique assignees
- Capacity utilization

#### Measurement Performance Domain
- Total performance measurements
- On-track/at-risk/off-track counts
- Average variance percentage
- Measured success criteria
- EVM metrics (CPI, SPI, SV, CV)
- Performance actuals coverage (counts, ahead/behind split)
- Average schedule variance (days) and cost variance
- Average progress variance and quality score
- Total recorded defects and rework hours

#### Uncertainty Performance Domain
- Total opportunities
- Realized/exploiting opportunities
- Total expected benefit
- Risk responses (effective/ineffective)
- Average response cost

## Visual Design

### Color Scheme
- **Team**: Blue (#3b82f6)
- **Development Approach**: Purple (#8b5cf6)
- **Project Work**: Green (#10b981)
- **Measurement**: Amber (#f59e0b)
- **Uncertainty**: Red (#ef4444)

### Status Indicators
- **Healthy/Active/On Track/Managed**: Green badges
- **Needs Attention/At Risk**: Yellow badges
- **Blocked/Inactive**: Red badges

### Responsive Design
- Mobile-first approach
- Grid layouts adapt to screen size
- Charts scale responsively
- Touch-friendly interactions

## Usage

### Accessing the Dashboard
1. Navigate to any project
2. Click on the **"🎯 PMBOK 8 Domains"** tab
3. View comprehensive domain analytics

### Overview Tab Integration
- PMBOK 8 summary widget appears automatically when data exists
- Shows domain coverage at a glance
- Quick link to full dashboard

### Refresh Data
- Click the refresh button in the dashboard header
- Data is cached for 5 minutes for performance
- Real-time updates available via WebSocket (future enhancement)

## Insights Examples

### Team Domain
- "5 team agreement violations detected. Review adherence."
- "Average adherence score is 8.5/10. Excellent!"

### Development Approach
- "Low average velocity (15.2). Consider process improvements."
- "3 iterations completed successfully this sprint."

### Project Work
- "2 work items are blocked. Address blockers."
- "85% average progress across all work items."

### Measurement
- "Cost Performance Index (CPI) is 0.87. Budget overrun risk."
- "Schedule Performance Index (SPI) is 1.05. Ahead of schedule!"

### Uncertainty
- "3 opportunities realized. Great work!"
- "5 risk responses implemented with 80% effectiveness."

## Future Enhancements

1. **Historical Trends**: Time-series charts showing domain health over time
2. **Comparative Analysis**: Compare domains across multiple projects
3. **Predictive Analytics**: Forecast domain health based on trends
4. **Export Capabilities**: PDF/Excel export of domain analytics
5. **Drill-Down Views**: Click domain cards to see detailed entity lists
6. **Real-Time Updates**: WebSocket integration for live data updates
7. **Custom Dashboards**: User-configurable domain views
8. **Benchmarking**: Compare against industry standards

## API Endpoints

### Get Domain Analytics
```
GET /api/analytics/pmbok8-domains/:projectId
```

**Response:**
```json
{
  "projectId": "uuid",
  "domains": {
    "team": { ... },
    "developmentApproach": { ... },
    "projectWork": { ... },
    "measurement": { ... },
    "uncertainty": { ... }
  },
  "overallHealth": {
    "domainsCovered": 5,
    "averageScore": 85.5
  },
  "generated_at": "2024-11-20T10:00:00Z"
}
```

### Get Extraction Results (includes PMBOK 8 counts)
```
GET /api/project-data-extraction/results/:projectId
```

**Response:**
```json
{
  "success": true,
  "projectId": "uuid",
  "entityCounts": { ... },
  "totalEntities": 444,
  "pmbok8DomainCounts": {
    "team": 12,
    "developmentApproach": 3,
    "projectWork": 45,
    "measurement": 28,
    "uncertainty": 15
  },
  "pmbok8Total": 103,
  "domainCoverage": {
    "team": true,
    "developmentApproach": true,
    "projectWork": true,
    "measurement": true,
    "uncertainty": true
  }
}
```

## Best Practices

1. **Regular Monitoring**: Check domain health weekly
2. **Action on Insights**: Address warnings promptly
3. **Data Quality**: Ensure complete entity extraction for accurate analytics
4. **Baseline Comparison**: Use domain metrics to track against baselines
5. **Team Review**: Share insights in team meetings

## Related Documentation

- [PMBOK 8 Extraction Guide](../roadmap/pmbok-8-domain-extraction.md)
- [Complete PMBOK 8 Roadmap](../roadmap/PMBOK8_COMPLETE_ROADMAP.md)
- [Project Dashboard Overview](../features/project-dashboard.md)

