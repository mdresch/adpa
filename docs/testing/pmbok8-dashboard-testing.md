# PMBOK 8 Domain Dashboard - Testing Guide

## Quick Start Testing

### Prerequisites
1. ✅ Backend server running (`cd server && npm run dev`)
2. ✅ Frontend running (`pnpm dev`)
3. ✅ Database migration applied (`npm run migrate:specific 324`)
4. ✅ At least one project with extracted entities

### Testing Steps

#### 1. **Access the Dashboard**
- Navigate to: `http://localhost:3000/projects/[your-project-id]/dashboard`
- Or click on any project from the projects list, then click "Dashboard"

#### 2. **Navigate to PMBOK 8 Tab**
- Click on the **"🎯 PMBOK 8 Domains"** tab in the project dashboard
- You should see the PMBOK 8 Domain Dashboard load

#### 3. **Verify Components Load**
Expected components:
- ✅ Header with "PMBOK 8 Performance Domains" title
- ✅ Refresh button (top right)
- ✅ Overall Health Scorecard (3 cards)
- ✅ Domain Health Radar Chart
- ✅ Domain Metrics Cards (5 cards)
- ✅ Entity Coverage Bar Chart
- ✅ Actionable Insights Panel (if insights available)

#### 4. **Test Data Loading**
**If you have PMBOK 8 data:**
- Dashboard should show domain metrics
- Radar chart should display domain scores
- Domain cards should show health scores
- Insights panel should show recommendations

**If you don't have PMBOK 8 data yet:**
- Dashboard should show "No PMBOK 8 Data Available" message
- Should prompt to extract project entities first

#### 5. **Test Refresh Functionality**
- Click the "Refresh" button
- Should show loading spinner
- Data should reload after ~1-2 seconds

#### 6. **Test Overview Tab Integration**
- Go back to "Overview" tab
- If PMBOK 8 data exists, you should see:
  - PMBOK 8 Performance Domains summary card
  - 5 domain coverage indicators
  - "View Details" button that navigates to PMBOK 8 tab

---

## API Endpoint Testing

### Test Extraction Results Endpoint
```bash
# Get PMBOK 8 entity counts
curl -X GET "http://localhost:5000/api/project-data-extraction/results/[project-id]" \
  -H "Authorization: Bearer [your-token]"
```

**Expected Response:**
```json
{
  "success": true,
  "projectId": "uuid",
  "entityCounts": {
    "stakeholders": 10,
    "teamAgreements": 5,
    "developmentApproaches": 2,
    ...
  },
  "pmbok8DomainCounts": {
    "team": 5,
    "developmentApproach": 2,
    "projectWork": 15,
    "measurement": 8,
    "uncertainty": 3
  },
  "domainCoverage": {
    "team": true,
    "developmentApproach": true,
    ...
  }
}
```

### Test Domain Analytics Endpoint
```bash
# Get comprehensive domain analytics
curl -X GET "http://localhost:5000/api/analytics/pmbok8-domains/[project-id]" \
  -H "Authorization: Bearer [your-token]"
```

**Expected Response:**
```json
{
  "projectId": "uuid",
  "domains": {
    "team": {
      "total_agreements": 5,
      "avg_adherence_score": 8.5,
      "health": { "score": 85, "status": "healthy" }
    },
    ...
  },
  "overallHealth": {
    "domainsCovered": 5,
    "averageScore": 82.5
  }
}
```

---

## Testing Scenarios

### Scenario 1: Empty State (No Data)
**Steps:**
1. Navigate to a project with no extracted entities
2. Click PMBOK 8 Domains tab

**Expected:**
- "No PMBOK 8 Data Available" message
- Prompt to extract entities
- Refresh button still works

### Scenario 2: Partial Data
**Steps:**
1. Navigate to a project with some PMBOK 8 entities
2. Click PMBOK 8 Domains tab

**Expected:**
- Dashboard shows available data
- Domains without data show "No data available"
- Coverage indicators show which domains have data

### Scenario 3: Full Data
**Steps:**
1. Navigate to a project with complete PMBOK 8 extraction
2. Click PMBOK 8 Domains tab

**Expected:**
- All 5 domain cards show metrics
- Radar chart displays all domains
- Insights panel shows recommendations
- Overall health score calculated

### Scenario 4: Error Handling
**Steps:**
1. Stop backend server
2. Navigate to PMBOK 8 tab
3. Try to refresh

**Expected:**
- Error message displayed
- Dashboard doesn't crash
- User-friendly error handling

---

## Browser Console Checks

Open browser DevTools (F12) and check:

### Network Tab
- ✅ `GET /api/project-data-extraction/results/[id]` - 200 OK
- ✅ `GET /api/analytics/pmbok8-domains/[id]` - 200 OK
- ✅ No CORS errors
- ✅ No 404 errors

### Console Tab
- ✅ No React errors
- ✅ No TypeScript errors
- ✅ API calls logged (if in dev mode)
- ✅ No warnings about missing keys

---

## Visual Checks

### Responsive Design
- ✅ **Mobile** (< 768px): Cards stack vertically
- ✅ **Tablet** (768-1024px): 2-column grid
- ✅ **Desktop** (> 1024px): 3-column grid

### Dark Mode
- ✅ Switch to dark mode
- ✅ All colors adapt correctly
- ✅ Charts remain readable
- ✅ Text contrast is good

### Loading States
- ✅ Skeleton loaders show while loading
- ✅ Refresh button shows spinner
- ✅ Smooth transitions

---

## Common Issues & Solutions

### Issue: "No PMBOK 8 Data Available"
**Solution:**
1. Run entity extraction first: Go to "AI Extract" tab
2. Click "Extract Data" button
3. Wait for extraction to complete
4. Return to PMBOK 8 Domains tab

### Issue: Dashboard shows loading forever
**Solution:**
1. Check backend is running: `curl http://localhost:5000/health`
2. Check browser console for errors
3. Verify authentication token is valid
4. Check network tab for failed requests

### Issue: Radar chart not displaying
**Solution:**
1. Verify you have data in at least one domain
2. Check browser console for Recharts errors
3. Ensure all domain health scores are numbers (not null)

### Issue: Insights panel empty
**Solution:**
- This is normal if all metrics are healthy
- Insights only show when there are warnings or recommendations
- Try extracting more data or creating test scenarios

---

## Performance Testing

### Load Time
- ✅ Initial load: < 2 seconds
- ✅ Refresh: < 1 second (cached)
- ✅ Chart rendering: < 500ms

### Memory Usage
- ✅ No memory leaks on tab switching
- ✅ Charts properly unmount
- ✅ Event listeners cleaned up

---

## Accessibility Testing

- ✅ Keyboard navigation works
- ✅ Screen reader friendly
- ✅ Color contrast meets WCAG AA
- ✅ Focus indicators visible
- ✅ ARIA labels present

---

## Next Steps After Testing

1. **If everything works:** ✅ Ready for production!
2. **If issues found:** Check browser console and backend logs
3. **If data missing:** Run entity extraction first
4. **If performance issues:** Check Redis cache, database queries

---

## Test Data Setup (Optional)

To test with sample data, you can manually insert test records:

```sql
-- Example: Insert test team agreement
INSERT INTO team_agreements (
  project_id, title, description, category, status, adherence_score
) VALUES (
  '[your-project-id]',
  'Daily Standup Agreement',
  'Team agrees to daily 15-minute standups',
  'meeting_norms',
  'active',
  9.0
);
```

Repeat for other entity types to populate test data.

