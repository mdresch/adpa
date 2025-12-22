# Template Analytics API Reference

**Version**: 1.0.0  
**Last Updated**: December 22, 2025

---

## Overview

The Template Analytics API provides administrative endpoints for managing document purpose inference and template entity profile aggregation. All endpoints require admin-level authentication.

---

## Authentication

All endpoints require:
- **Header**: `Authorization: Bearer <admin-token>`
- **Permission**: Admin or Super Admin role

---

## Endpoints

### 1. Rebuild Template Analytics

Rebuilds document purposes for all projects using a template, then updates the template entity profile.

**Endpoint**: `POST /api/template-analytics/analytics/rebuild-template/:templateId`

**Parameters**:
- `templateId` (path, required): UUID of the template to rebuild

**Request Example**:
```bash
curl -X POST \
  'http://localhost:5000/api/template-analytics/analytics/rebuild-template/123e4567-e89b-12d3-a456-426614174000' \
  -H 'Authorization: Bearer <admin-token>'
```

**Response** (200 OK):
```json
{
  "message": "Template analytics rebuilt successfully",
  "templateId": "123e4567-e89b-12d3-a456-426614174000",
  "projectsRebuilt": 3
}
```

**Error Responses**:
- `400 Bad Request`: Invalid template ID format
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error during rebuild

**Use Cases**:
- Recovering from data inconsistencies
- Refreshing analytics after bulk document updates
- Troubleshooting missing template analytics data

---

### 2. Rebuild Document Purposes

Recomputes entity_counts and inferred_*_domain fields for all documents in a project.

**Endpoint**: `POST /api/template-analytics/analytics/rebuild-document-purposes/:projectId`

**Parameters**:
- `projectId` (path, required): UUID of the project to rebuild

**Request Example**:
```bash
curl -X POST \
  'http://localhost:5000/api/template-analytics/analytics/rebuild-document-purposes/123e4567-e89b-12d3-a456-426614174000' \
  -H 'Authorization: Bearer <admin-token>'
```

**Response** (200 OK):
```json
{
  "message": "Document purposes rebuilt successfully for project",
  "projectId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid project ID format
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error during rebuild

**Note**: This is automatically called after extraction jobs complete, but can be manually triggered if needed.

---

### 3. Full Rebuild

Performs a comprehensive rebuild of analytics data. Can be scoped to a specific project or run system-wide.

**Endpoint**: `POST /api/template-analytics/analytics/rebuild-all`

**Request Body** (optional):
```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Request Examples**:

**Project-Scoped Rebuild** (Recommended):
```bash
curl -X POST \
  'http://localhost:5000/api/template-analytics/analytics/rebuild-all' \
  -H 'Authorization: Bearer <admin-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "projectId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

**System-Wide Rebuild** (Use with caution - can be expensive):
```bash
curl -X POST \
  'http://localhost:5000/api/template-analytics/analytics/rebuild-all' \
  -H 'Authorization: Bearer <admin-token>'
```

**Response** (200 OK):

**Project-Scoped**:
```json
{
  "message": "Document purposes and template entity profiles rebuilt successfully for project",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "templatesUpdated": 2
}
```

**System-Wide**:
```json
{
  "message": "Template entity profiles rebuilt successfully for all templates",
  "note": "To rebuild document purposes, specify a projectId in the request body"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid project ID format (if provided)
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error during rebuild

**Performance Notes**:
- Project-scoped rebuilds are recommended for better performance
- System-wide rebuilds can take significant time for large datasets
- Consider running during off-peak hours

---

### 4. Diagnostic Endpoint

Provides comprehensive diagnostic information about a template's analytics state.

**Endpoint**: `GET /api/template-analytics/analytics/diagnostic/:templateId`

**Parameters**:
- `templateId` (path, required): UUID of the template to diagnose

**Request Example**:
```bash
curl -X GET \
  'http://localhost:5000/api/template-analytics/analytics/diagnostic/123e4567-e89b-12d3-a456-426614174000' \
  -H 'Authorization: Bearer <admin-token>'
```

**Response** (200 OK):
```json
{
  "templateId": "123e4567-e89b-12d3-a456-426614174000",
  "documents": {
    "total_documents": "15",
    "with_template_id": "15",
    "with_entity_counts": "12",
    "with_both": "12"
  },
  "viewData": {
    "template_id": "123e4567-e89b-12d3-a456-426614174000",
    "total_documents": 15,
    "total_entities": 450,
    "avg_entity_counts": {
      "stakeholders": 4.2,
      "requirements": 8.6,
      "risks": 6.4
    }
  },
  "profileData": {
    "template_id": "123e4567-e89b-12d3-a456-426614174000",
    "total_documents": 15,
    "total_entities": 450,
    "primary_knowledge_domain": "scope_management",
    "secondary_knowledge_domains": ["risk_management"],
    "knowledge_domain_coverage": {
      "scope_management": 0.34,
      "risk_management": 0.24
    }
  },
  "sampleDocuments": [
    {
      "id": "doc-uuid-1",
      "name": "Project Charter",
      "template_id": "123e4567-e89b-12d3-a456-426614174000",
      "entity_counts_status": "has_data",
      "entity_counts": {
        "stakeholders": 5,
        "requirements": 12,
        "total": 17
      }
    }
  ],
  "recommendations": {
    "needsExtraction": false,
    "needsRebuild": false,
    "needsDocumentPurposeRebuild": false
  }
}
```

**Recommendations Field**:
- `needsExtraction`: `true` if documents exist but have no entity_counts
- `needsRebuild`: `true` if view data is missing but documents have entity_counts
- `needsDocumentPurposeRebuild`: `true` if documents have template_id but no entity_counts

**Error Responses**:
- `400 Bad Request`: Invalid template ID format
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error during diagnostic

---

## Error Handling

All endpoints follow consistent error response patterns:

```json
{
  "error": "Error message description"
}
```

**Common Error Codes**:
- `400`: Bad Request - Invalid parameters or format
- `401`: Unauthorized - Missing or invalid authentication
- `403`: Forbidden - Insufficient permissions
- `500`: Internal Server Error - Server-side error

---

## Rate Limiting

Currently, no rate limiting is applied to these endpoints. However, consider:
- Rebuild operations can be resource-intensive
- Avoid concurrent rebuilds for the same template/project
- Use diagnostic endpoint before triggering rebuilds

---

## Best Practices

1. **Use Diagnostic First**: Always check the diagnostic endpoint before rebuilding
2. **Project-Scoped Rebuilds**: Prefer project-scoped rebuilds over system-wide
3. **Monitor Logs**: Check server logs during rebuild operations
4. **Off-Peak Operations**: Run system-wide rebuilds during low-traffic periods
5. **Verify Results**: Use diagnostic endpoint after rebuilds to verify success

---

## Integration Examples

### Frontend Integration

```typescript
// Rebuild template analytics
const rebuildTemplateAnalytics = async (templateId: string) => {
  try {
    const response = await fetch(
      `/api/template-analytics/analytics/rebuild-template/${templateId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error('Rebuild failed')
    }
    
    const data = await response.json()
    console.log(`Rebuilt analytics for ${data.projectsRebuilt} projects`)
  } catch (error) {
    console.error('Failed to rebuild template analytics:', error)
  }
}
```

### Backend Integration

```typescript
// Trigger rebuild after bulk document operations
import { pool } from '../database/connection'
import TemplateAnalyticsService from '../services/templateAnalyticsService'

async function rebuildAfterBulkUpdate(projectId: string) {
  // Your bulk update logic here...
  
  // Rebuild analytics
  await DocumentPurposeService.rebuildForProject(projectId)
  
  // Update affected templates
  const templates = await pool.query(
    'SELECT DISTINCT template_id FROM documents WHERE project_id = $1',
    [projectId]
  )
  
  for (const row of templates.rows) {
    await TemplateAnalyticsService.updateTemplateEntityProfile(row.template_id)
  }
}
```

---

## Troubleshooting

See [Template Analytics Troubleshooting Guide](./TEMPLATE_ANALYTICS_TROUBLESHOOTING.md) for common issues and solutions.

---

## Related Documentation

- [Template Analytics Implementation](./TEMPLATE_ANALYTICS_IMPLEMENTATION_COMPLETE.md)
- [Template Analytics Quick Start](./TEMPLATE_ANALYTICS_QUICK_START.md)
- [Template Analytics Troubleshooting](./TEMPLATE_ANALYTICS_TROUBLESHOOTING.md)

