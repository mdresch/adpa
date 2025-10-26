# Beacon 6.2: iBabs Board Report Upload Service

## Owner
Integration Agent #1

## Duration
15-20 minutes with GitHub Copilot

## Dependencies
- Beacon 6.1: iBabs OAuth (must have access token)
- Beacon 1.4: Program metrics (data source for reports)

## Epic
ADPA v3.0 - iBabs Board Portal Integration

## Description
Create service that auto-generates board reports from program data and uploads them to iBabs meeting agendas. Solves iBabs pain point #5: "Board packs take weeks to prepare" - ADPA generates in 2 minutes!

---

## Requirements

### New Service: server/src/services/ibabsUploadService.ts

**Functions:**
- `uploadDocumentToMeeting(meetingId, document, agendaItem)` - Upload report to iBabs
- `generateBoardReport(programId, reportType)` - Generate report (CEO, CFO, Audit)
- `scheduleBoardReportGeneration(meetingDate, programs)` - Auto-schedule 1 week before
- `syncActionItems(meetingId)` - Pull action items from iBabs to ADPA

**Report Types:**
1. **CEO Portfolio Report** (all programs status)
2. **CFO Financial Report** (budget tracking, forecasts)
3. **Audit Committee Report** (SOX compliance, risks)
4. **Program Details** (detailed status for specific program)

**iBabs API Integration:**
```typescript
// Upload document to meeting agenda
POST https://api.ibabs.eu/v1/meetings/{meetingId}/documents
Headers: Authorization: Bearer {access_token}
Body: {
  title: "CEO Portfolio Status - Q1 2026",
  content: <PDF or HTML>,
  agenda_item: "4", // CEO-rapportage
  classification: "confidential",
  access_control: ["board_directors"]
}
```

### Report Generation (AI-Powered)

**Use ADPA's existing AI generation:**
```typescript
import { aiService } from './aiService';
import { generateWithContext } from '../modules/context/integration';

async function generateCEOReport(programs: Program[]) {
  const context = {
    programs,
    portfolioMetrics: await calculatePortfolioMetrics(),
    topRisks: await getTopPortfolioRisks(5)
  };
  
  const report = await generateWithContext({
    template_id: 'board-ceo-report',
    variables: context,
    provider: 'openai',
    model: 'gpt-4-turbo'
  });
  
  return report; // Markdown format
}
```

**Convert to PDF for iBabs:**
```typescript
import { markdownToPdf } from '../utils/pdfGenerator';

const markdownReport = await generateCEOReport(programs);
const pdfBuffer = await markdownToPdf(markdownReport);
return pdfBuffer;
```

---

## Reference Files

**Study integration patterns:**
- `server/src/routes/confluenceRoutes.ts` - Document upload pattern
- `server/src/routes/sharepointRoutes.ts` - Microsoft Graph upload
- `server/src/modules/documentGenerator/` - Document generation patterns
- `server/src/services/ibabsService.ts` - OAuth tokens (Beacon 6.1)

**Use these modules:**
- AI generation: `server/src/modules/context/integration.ts`
- PDF export: `server/src/utils/pdfGenerator.ts` (Puppeteer)
- Markdown processing: `marked` or `markdown-it`

---

## API Endpoints

**Add to ibabsRoutes.ts:**
- `POST /api/ibabs/upload-report` - Manual report upload
- `POST /api/ibabs/schedule-reports` - Schedule auto-generation
- `GET /api/ibabs/meetings` - List upcoming meetings (from iBabs calendar)
- `POST /api/ibabs/sync-actions` - Sync action items from iBabs

---

## Auto-Scheduling Logic

**Schedule reports 1 week before board meeting:**
```typescript
import { scheduleJob } from 'node-schedule';

// Run weekly check for upcoming board meetings
scheduleJob('0 9 * * MON', async () => {
  const upcomingMeetings = await ibabsService.getUpcomingMeetings();
  
  for (const meeting of upcomingMeetings) {
    const daysUntil = getDaysUntilMeeting(meeting.date);
    
    if (daysUntil === 7) { // 1 week before
      await generateAndUploadBoardReports(meeting.id);
      logger.info(`Auto-generated board reports for meeting ${meeting.id}`);
    }
  }
});
```

---

## Testing

**Test cases:**
- Upload document to iBabs (mock API)
- Generate CEO report (all programs)
- Generate CFO report (financial summary)
- Generate Audit report (compliance status)
- Handle iBabs API errors (retry logic)
- Token refresh during upload (if expired)
- Schedule auto-generation (cron job)
- Sync action items from iBabs

**Mock iBabs API:**
- Use nock to mock iBabs endpoints
- Test success and error responses
- Verify retry logic

---

## Success Criteria

- [x] Can upload PDF reports to iBabs meetings
- [x] Board reports auto-generate from program data
- [x] Reports attach to correct agenda items (4, 5, 6, 7)
- [x] Auto-scheduling works (1 week before meeting)
- [x] Token refresh handled automatically
- [x] Error handling and retry logic implemented
- [x] Tests pass (80%+ coverage)
- [x] Follows existing integration patterns

---

## Time Estimate

**Traditional:** 10-12 hours (OAuth + upload + AI generation + scheduling + tests)
**With Copilot:** 20 minutes (AI generates from Confluence/SharePoint patterns)
**Savings:** 97% faster!

---

## Business Value

**THIS IS THE KILLER FEATURE:**
- Solves iBabs pain point #5: "Board packs take weeks to prepare"
- ADPA generates in 2 minutes (vs. 40-120 hours manual)
- ROI: $24,000 saved per board meeting (4x/year = $96K/year)
- This feature ALONE justifies $100K/year ADPA license!

---

**Status:** Ready for AI generation  
**Priority:** CRITICAL (iBabs integration MVP, highest ROI)  
**Parallel:** Can develop with Frontend beacons simultaneously

