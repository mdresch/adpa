# Knowledge Base Module

## Overview

The Knowledge Base module stores and manages efficiency improvements, innovations, and best practices discovered through drift detection. It enables organizations to capture, review, and replicate successful approaches across multiple projects.

## Database Schema

### Tables

1. **knowledge_base_entries** - Main table for storing knowledge base entries
   - Stores efficiency improvements, innovations, and best practices
   - Links to drift detection and innovation opportunities
   - Supports full-text search and tagging
   - Tracks usage metrics (views, applications, success rate)

2. **knowledge_base_applications** - Tracks when entries are applied to other projects
   - Records implementation details and adaptations
   - Captures expected vs actual value
   - Stores feedback and lessons learned

3. **knowledge_base_reviews** - Peer reviews and feedback
   - Supports multiple review types (approval, peer, application feedback)
   - Includes ratings and recommendations
   - Tracks suggested changes

## API Endpoints

### Knowledge Base Entries

- `POST /api/knowledge-base/entries` - Create a new entry
- `GET /api/knowledge-base/entries` - Search and filter entries
- `GET /api/knowledge-base/entries/:id` - Get a specific entry
- `PUT /api/knowledge-base/entries/:id` - Update an entry
- `DELETE /api/knowledge-base/entries/:id` - Archive an entry

### Applications

- `POST /api/knowledge-base/applications` - Create an application
- `PUT /api/knowledge-base/applications/:id` - Update an application
- `GET /api/knowledge-base/entries/:id/applications` - Get applications for an entry

### Reviews

- `POST /api/knowledge-base/reviews` - Create a review
- `GET /api/knowledge-base/entries/:id/reviews` - Get reviews for an entry

### Statistics

- `GET /api/knowledge-base/stats` - Get knowledge base statistics

## Integration with Drift Detection

The module provides helper functions to automatically create knowledge base entries from drift detection results:

```typescript
import { 
  createKnowledgeBaseFromDrift,
  createKnowledgeBaseFromInnovation 
} from './modules/knowledgeBase'

// Create entry from positive drift detection
await createKnowledgeBaseFromDrift(driftDetection, userId, {
  baseline_approach: {
    description: 'Original approach',
    cost: 50000,
    timeline: 180
  },
  improved_approach: {
    implementation_details: 'New approach details',
    tools_used: ['Claude Sonnet', 'Next.js'],
    techniques: ['AI-powered generation']
  },
  value_metrics: {
    cost_savings: 25000,
    time_saved: 60,
    efficiency_gain: 50
  },
  similar_project_ids: ['project-uuid-1', 'project-uuid-2']
})

// Create entry from innovation opportunity
await createKnowledgeBaseFromInnovation(innovationOpportunity, userId, {
  value_metrics: {
    cost_savings: 100000
  },
  similar_project_ids: ['project-uuid-3']
})
```

## Workflow Integration

As described in the DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md:

### Phase 3: Workflow Automation

When positive drift is approved or an innovation opportunity is validated:

1. **Auto-generate knowledge base entry** from the drift/innovation data
2. **Document the approach** with replication guide and prerequisites
3. **Identify similar projects** where the approach could be applied
4. **Track applications** when the knowledge is replicated
5. **Measure success** by comparing expected vs actual value
6. **Collect feedback** to improve the knowledge base

## Entry Types

- **efficiency_improvement** - Process or workflow optimizations
- **cost_reduction** - Cost-saving measures
- **timeline_acceleration** - Time-saving approaches
- **quality_improvement** - Quality enhancements
- **innovation** - Novel approaches or inventions
- **best_practice** - Proven methods and standards
- **lessons_learned** - Insights from past experiences
- **process_improvement** - Process optimization
- **technology_innovation** - New technology adoption
- **methodology_advancement** - Methodology improvements

## Categories

- scope_management
- technical_approach
- timeline_management
- cost_management
- resource_management
- quality_management
- risk_management
- stakeholder_management
- integration_management
- ai_optimization
- tool_selection
- architecture
- other

## Entry Lifecycle

1. **Draft** - Initial creation (auto-generated or manual)
2. **Pending Review** - Submitted for peer review
3. **Approved** - Approved by reviewers
4. **Published** - Published to the knowledge base
5. **Archived** - No longer active
6. **Superseded** - Replaced by a newer entry

## Search and Discovery

The knowledge base supports:

- **Full-text search** across titles and descriptions
- **Tag-based filtering** for quick discovery
- **Category filtering** by domain area
- **Novelty scoring** to find innovative approaches
- **Replication potential** to identify widely applicable entries
- **Project-specific filtering** to find relevant entries

## Value Tracking

Each entry tracks:

- **View count** - How many times it's been viewed
- **Application count** - How many times it's been applied
- **Success rate** - Percentage of successful applications
- **Total cost savings** - Cumulative savings across all applications
- **Total time saved** - Cumulative time saved across all applications

## Best Practices

1. **Review auto-generated entries** before publishing
2. **Include detailed replication guides** with prerequisites and steps
3. **Tag entries comprehensively** for better discovery
4. **Document lessons learned** when applying entries
5. **Update entries** based on application feedback
6. **Measure and track value** from replication
7. **Supersede outdated entries** with improved versions

## Future Enhancements

- AI-powered similarity matching to suggest relevant entries
- Automated replication recommendations based on project characteristics
- Integration with project templates for one-click application
- Knowledge graph visualization of related entries
- Automated success prediction based on historical data
- Export to external knowledge management systems
