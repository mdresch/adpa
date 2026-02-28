# Board Report Templates

AI-powered board report templates for generating executive-level reports for board meetings.

## Overview

This feature provides 4 specialized board report templates designed for iBabs Board Portal Integration:

1. **CEO Portfolio Report** - 2-page executive summary
2. **CFO Financial Report** - 3-page financial overview
3. **Audit Committee Report** - 2-page compliance status
4. **Program Details Report** - 5-page detailed program status

## Templates

### 1. CEO Portfolio Report (Agenda Item 4)
- **Template ID**: `board-ceo-portfolio-report`
- **Framework**: PMBOK 7 + Board Governance
- **Output**: 2-page executive summary
- **Content**:
  - Executive Summary (overall portfolio health)
  - Program Status Table (RAG status for each program)
  - Financial Summary (total budget, spend, forecast)
  - Top 3 Portfolio Risks (consolidated from all programs)
  - Board Decisions Required (escalations needing approval)

### 2. CFO Financial Report (Agenda Item 5)
- **Template ID**: `board-cfo-financial-report`
- **Framework**: Financial Management + PMI
- **Output**: 3-page financial dashboard
- **Content**:
  - Financial Summary (portfolio-level totals, burn rate)
  - Program Budget Table (budget, spent, forecast for each)
  - Variance Analysis (programs over/under budget with explanations)
  - Forecast to Completion (EAC - Estimate at Completion)
  - Funding Requests (additional budget needs, if any)
  - Financial Risks (budget overrun risks, mitigation plans)

### 3. Audit Committee Report (Agenda Item 6)
- **Template ID**: `board-audit-committee-report`
- **Framework**: SOX Compliance + Risk Management
- **Output**: 2-page compliance status
- **Content**:
  - Compliance Summary (SOX, regulatory, security)
  - Active Audit Findings (status, remediation progress)
  - Top 10 Portfolio Risks (probability × impact ranking)
  - External Audit Status (opinion, recommendations)
  - Regulatory Reporting (Fed, OCC, SEC status)
  - Security Events (breaches, incidents, controls)

### 4. Program Details Report (Agenda Item 7)
- **Template ID**: `board-program-details-report`
- **Framework**: PMBOK 7 Program Management
- **Output**: 5-page detailed status
- **Content**:
  - Program Overview (status, budget, timeline)
  - Project-by-Project Status (detailed breakdown)
  - Key Milestones (planned vs forecast dates)
  - Dependencies & Blockers (critical path items)
  - Change Requests (pending CCB approval)
  - Risks & Issues (active management items)
  - Resource Utilization (allocation and availability)
  - Next 90 Days (upcoming activities)

## Usage

### Using the Service

```typescript
import { getBoardReportService } from './services/boardReportService';
import { pool } from './database/connection';

const boardReportService = getBoardReportService(pool);

// Generate CEO Portfolio Report
const ceoReport = await boardReportService.generateCEOPortfolioReport({
  reporting_period: 'Q4 2024',
  portfolio_health: 'Green',
  total_programs: 5,
  total_budget: 10000000,
  executive_summary_text: 'Portfolio performance is strong...',
  programs: [
    {
      name: 'Digital Transformation',
      status: 'Green',
      budget_percent: 45,
      timeline_percent: 50,
      top_risk: 'Resource availability'
    }
  ],
  total_spent: 4500000,
  spent_percent: 45,
  forecast_status: 'On Track',
  contingency_remaining: 500000,
  top_risks: [
    {
      title: 'Market volatility',
      severity: 'High',
      probability: 60,
      impact: 500000,
      mitigation: 'Diversify portfolio',
      owner: 'CRO'
    }
  ],
  decisions_required: []
}, true, 'openai'); // useAI=true, provider='openai'

console.log(ceoReport.content); // Markdown report
```

### Generation Modes

#### AI-Powered Generation
```typescript
const report = await boardReportService.generateReport({
  templateId: 'board-cfo-financial-report',
  data: financialData,
  useAI: true,
  aiProvider: 'openai' // or 'google', 'anthropic'
});
```

#### Template-Based Generation
```typescript
const report = await boardReportService.generateReport({
  templateId: 'board-cfo-financial-report',
  data: financialData,
  useAI: false // Uses Handlebars template only
});
```

## Database Migration

The templates are installed via migration:

```bash
cd server
psql $DATABASE_URL -f migrations/092_insert_board_report_templates.sql
```

Or using Supabase CLI:
```bash
supabase migration new board_report_templates
# Copy content from 092_insert_board_report_templates.sql
supabase db push
```

## API Integration

The templates can be accessed through the existing document template API:

```bash
# List all board report templates
GET /api/document-templates?category=board-reporting

# Generate a report
POST /api/board-reports/generate
{
  "templateId": "board-ceo-portfolio-report",
  "data": { ... },
  "useAI": true,
  "aiProvider": "openai"
}
```

## Business Value

**ROI Calculation** (based on 2024 consulting rates and historical time tracking):
- Manual board pack preparation: 120 hours × $200/hour = $24,000 per meeting
  - Assumptions: Senior analyst time, data gathering, formatting, review cycles
- ADPA auto-generation: 2 minutes = $17 per meeting
  - Assumptions: One-time data entry, automated AI generation
- **Savings**: $23,983 per meeting × 4 quarterly meetings/year = **$95,932/year**
- **Note**: Actual savings may vary based on organization size, data availability, and customization needs

This feature alone can justify the ADPA license cost!

## Testing

Run the test suite:

```bash
cd server
npm test -- boardReportService.test.ts
```

## Dependencies

- **Handlebars**: Template compilation
- **AI Service**: OpenAI/Google AI integration
- **PostgreSQL**: Template storage
- **Winston**: Logging

## Configuration

Templates are stored in the `document_templates` table with:
- Template content (JSON with sections)
- Variable definitions (JSON schema)
- System prompts (for AI generation)
- Usage tracking

## Best Practices

1. **Data Validation**: Always validate input data matches variable requirements
2. **AI Provider Selection**: Use appropriate AI provider based on complexity
3. **Template Customization**: Clone templates for organization-specific needs
4. **Usage Tracking**: Monitor template usage for optimization
5. **Version Control**: Keep templates versioned in migrations

## Future Enhancements

- [ ] PDF export integration with iBabs
- [ ] Real-time collaboration on reports
- [ ] Historical comparison reports
- [ ] Custom template builder UI
- [ ] Multi-language support
- [ ] Advanced charting and visualizations

## Support

For issues or questions:
- Check the test suite for usage examples
- Review migration file for template structure
- See boardReportService.ts for API details

---

**Status**: Production Ready ✅  
**Version**: 1.0  
**Last Updated**: 2025-10-25
