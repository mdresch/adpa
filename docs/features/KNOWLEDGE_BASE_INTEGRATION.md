# Knowledge Base Integration

**Status:** ✅ Implemented  
**Related CR:** CR-2026-001 Phase 3  
**Documentation:** DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md

---

## Overview

The Knowledge Base Integration captures lessons learned, efficiency improvements, and best practices from drift detection and project execution. This enables organizational learning and allows successful approaches to be replicated across projects.

## Features

### 1. Automatic Knowledge Capture

When drift is resolved, the system automatically creates knowledge base entries:

- **Positive Drift** → Efficiency improvements, innovations
- **Negative Drift** → Lessons learned, anti-patterns
- **Resolutions** → Successful resolution approaches

### 2. AI-Powered Analysis

Each knowledge base entry includes:

- ✅ Contextual description
- ✅ Approach documentation
- ✅ Results and outcomes
- ✅ Business value scoring
- ✅ Replicability assessment
- ✅ Prerequisites and instructions
- ✅ Applicable contexts

### 3. Smart Recommendations

The system provides AI-generated recommendations:

- Analyzes project context
- Matches relevant knowledge entries
- Scores relevance (0-1)
- Explains reasoning
- Estimates expected impact

### 4. Application Tracking

Track when and where knowledge is applied:

- Application history
- Success rate tracking
- Outcome measurement
- Continuous improvement

## Database Schema

### Core Tables

#### `knowledge_base_entries`
Stores lessons learned and best practices.

**Key Fields:**
- `entry_type`: efficiency_improvement, cost_saving, innovation, etc.
- `category`: positive_drift, negative_drift, innovation, best_practice, anti_pattern
- `business_value_score`: 0-1 normalized value score
- `replicable`: Whether this can be applied to other projects
- `search_vector`: Full-text search support

#### `knowledge_base_applications`
Tracks applications of knowledge entries to projects.

**Key Fields:**
- `knowledge_entry_id`: Reference to the entry
- `applied_to_project_id`: Target project
- `success`: Boolean outcome
- `actual_cost_impact`: Measured $ impact
- `actual_time_impact_days`: Measured time impact

#### `knowledge_base_recommendations`
AI-generated recommendations for projects.

**Key Fields:**
- `relevance_score`: 0-1 relevance to project
- `reasoning`: AI explanation
- `expected_impact`: Predicted outcome
- `status`: pending, accepted, rejected, applied

## API Endpoints

### Search Knowledge Base

```http
GET /api/knowledge-base/entries?query=efficiency&entry_type=efficiency_improvement
```

**Query Parameters:**
- `query`: Full-text search query
- `entry_type`: Filter by type
- `category`: Filter by category
- `tags`: Filter by tags (array)
- `min_business_value`: Minimum business value score (0-1)
- `replicable_only`: Only show replicable entries (boolean)
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "entry_type": "efficiency_improvement",
      "category": "positive_drift",
      "title": "AI Provider Cost Optimization",
      "description": "Team switched from GPT-4 to Claude Sonnet...",
      "approach": "Evaluated alternative AI providers...",
      "results": "50% cost reduction with same quality",
      "business_value_score": 0.85,
      "replicable": true,
      "tags": ["ai", "cost-saving"],
      "application_count": 3,
      "success_rate": 1.0
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### Get Entry Details

```http
GET /api/knowledge-base/entries/:id
```

### Create Knowledge Base Entry

```http
POST /api/knowledge-base/entries
Content-Type: application/json

{
  "entry_type": "efficiency_improvement",
  "category": "positive_drift",
  "title": "Process Automation Success",
  "description": "Automated manual reporting process",
  "approach": "Built custom script using Python...",
  "results": "Saved 10 hours/week",
  "source_project_id": "uuid",
  "cost_impact": 15000,
  "time_impact_days": 30,
  "business_value_score": 0.9,
  "replicable": true,
  "replication_difficulty": "easy",
  "tags": ["automation", "reporting"]
}
```

### Create from Drift Detection

```http
POST /api/knowledge-base/entries/from-drift
Content-Type: application/json

{
  "drift_id": "uuid",
  "project_id": "uuid",
  "overrides": {
    "title": "Custom title if needed"
  }
}
```

This endpoint:
1. Fetches drift detection details
2. Uses AI to generate entry content
3. Categorizes and scores automatically
4. Creates knowledge base entry

### Get Recommendations for Project

```http
GET /api/knowledge-base/recommendations/:projectId?limit=10
```

Returns AI-generated recommendations of knowledge base entries relevant to the project.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "knowledge_entry_id": "uuid",
      "entry": { /* full entry object */ },
      "relevance_score": 0.87,
      "reasoning": "This project has similar technology stack and budget constraints...",
      "expected_impact": "Potential 20% cost reduction",
      "ai_model": "ai-service",
      "ai_confidence": 0.75
    }
  ]
}
```

### Apply to Project

```http
POST /api/knowledge-base/applications
Content-Type: application/json

{
  "entry_id": "uuid",
  "project_id": "uuid",
  "context": "Applying cost optimization approach from KB-123"
}
```

### Update Application Outcome

```http
PUT /api/knowledge-base/applications/:id/outcome
Content-Type: application/json

{
  "success": true,
  "actual_cost_impact": 5000,
  "actual_time_impact_days": 15,
  "actual_quality_impact_percentage": 10,
  "notes": "Worked excellently, exceeded expectations"
}
```

### Get Statistics

```http
GET /api/knowledge-base/stats
```

Returns aggregate statistics about the knowledge base.

## Integration with Drift Detection

### Automatic Knowledge Capture

When drift is resolved via `driftResolutionService.applyResolution()`:

1. Drift is marked as resolved
2. Document is updated
3. Change request created (if needed)
4. **Knowledge base entry auto-created**

The knowledge base entry captures:
- What drifted and why
- How it was resolved
- Outcomes and learnings
- Whether it's replicable

### Example Flow

```
1. Drift Detected → Budget overrun
2. Resolution Applied → Scope reduced
3. Knowledge Entry Created:
   - Title: "Budget Control: Scope Reduction Strategy"
   - Category: negative_drift / lesson_learned
   - Approach: "When budget exceeded by 20%, reduced non-critical scope..."
   - Results: "Project completed on time and budget"
   - Replicable: Yes
   - Prerequisites: ["Clear scope priorities", "Stakeholder buy-in"]
```

## Usage Examples

### For Project Managers

**Find relevant lessons:**
```javascript
const response = await fetch('/api/knowledge-base/entries?query=budget overrun&replicable_only=true')
const { data } = await response.json()
// Browse proven approaches for budget management
```

**Get recommendations:**
```javascript
const recs = await fetch(`/api/knowledge-base/recommendations/${projectId}`)
const { data } = await recs.json()
// See AI-suggested knowledge entries for your project
```

**Apply a solution:**
```javascript
await fetch('/api/knowledge-base/applications', {
  method: 'POST',
  body: JSON.stringify({
    entry_id: 'kb-123',
    project_id: myProjectId,
    context: 'Applying automated reporting approach'
  })
})
```

**Report outcome:**
```javascript
await fetch(`/api/knowledge-base/applications/${appId}/outcome`, {
  method: 'PUT',
  body: JSON.stringify({
    success: true,
    actual_cost_impact: 8000,
    notes: 'Saved more than expected!'
  })
})
```

### For Administrators

**Search for high-value entries:**
```javascript
const response = await fetch('/api/knowledge-base/entries?min_business_value=0.8&limit=10')
// Find the most valuable knowledge entries
```

**View statistics:**
```javascript
const stats = await fetch('/api/knowledge-base/stats')
// See knowledge base metrics
```

## Best Practices

### When Creating Entries

1. **Be Specific**: Include concrete details, not generic advice
2. **Include Context**: Explain when and why the approach was used
3. **Document Prerequisites**: What's needed before applying
4. **Measure Outcomes**: Include actual metrics when possible
5. **Tag Appropriately**: Use consistent tags for discoverability

### When Applying Knowledge

1. **Verify Context**: Ensure your situation matches the applicable contexts
2. **Check Prerequisites**: Confirm you have what's needed
3. **Adapt as Needed**: Don't blindly copy, adjust for your project
4. **Track Outcomes**: Report actual results to improve success rates
5. **Share Learnings**: Create new entries if you discover improvements

### For Administrators

1. **Validate Entries**: Review AI-generated entries for accuracy
2. **Archive Outdated**: Mark obsolete entries as archived
3. **Monitor Success Rates**: Identify which entries work best
4. **Encourage Contribution**: Make it easy for teams to share knowledge
5. **Curate Categories**: Organize entries logically

## Migration

Run the migration to create knowledge base tables:

```bash
# Using Supabase CLI
supabase migration up server/migrations/220_knowledge_base_integration.sql

# Or using psql
psql $DATABASE_URL -f server/migrations/220_knowledge_base_integration.sql
```

## Testing

Run knowledge base tests:

```bash
cd server
npm test -- knowledge-base.test.ts
```

## Future Enhancements

Planned improvements:

- [ ] Export knowledge base as PDF report
- [ ] Knowledge base dashboard with analytics
- [ ] Email notifications for relevant recommendations
- [ ] Integration with external knowledge systems
- [ ] Advanced AI similarity matching
- [ ] Multi-language support
- [ ] Knowledge graph visualization

## Related Documentation

- [DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md](../roadmap/DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md) - Parent workflow
- [Drift Detection Service](../../server/src/services/driftDetectionService.ts)
- [Drift Resolution Service](../../server/src/services/driftResolutionService.ts)
- [Knowledge Base Service](../../server/src/services/knowledgeBaseService.ts)

---

**Implemented:** November 2025  
**Developer:** Copilot Agent  
**Status:** ✅ Ready for Testing
