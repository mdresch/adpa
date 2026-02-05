# Governance Knowledge Graph (GKG) Sync

## Overview

The Governance Knowledge Graph (GKG) sync system provides comprehensive integration between your ADPA project data and Neo4j graph database. This enables advanced governance analytics, relationship mapping, and semantic intelligence across your project portfolio.

## Features

### 🚀 **Bootstrap GKG**
- Seeds reference nodes for GovernanceDomain, MaturityLevel, EntityType, and RelationshipType
- Creates foundational graph structure for governance analytics
- One-time setup per environment

### 🔄 **Project Synchronization**
- **Bulk Sync**: Automatically processes all projects sequentially
- **Individual Sync**: Sync specific projects on-demand
- **Progressive Processing**: Automatic progression through project list
- **Error Handling**: Robust error recovery and reporting

### 📊 **Graph Analytics**
- Governance domain distribution analysis
- Maturity level tracking across projects
- Entity type relationship mapping
- Project graph visualization support

## Installation & Setup

### 1. Install Dependencies
```bash
npm install neo4j-driver
```

### 2. Environment Configuration
Add to your `.env` file:

```env
# Development
NEO4J_URI_DEV=bolt://localhost:7687
NEO4J_USERNAME_DEV=neo4j
NEO4J_PASSWORD_DEV=your-password

# Staging
NEO4J_URI_STAGING=bolt://staging-neo4j:7687
NEO4J_USERNAME_STAGING=neo4j
NEO4J_PASSWORD_STAGING=staging-password

# Production
NEO4J_URI_PROD=bolt://prod-neo4j:7687
NEO4J_USERNAME_PROD=neo4j
NEO4J_PASSWORD_PROD=prod-password
```

### 3. Bootstrap GKG (One-time)
```bash
npm run gkg:bootstrap
```

## Usage

### **CLI Commands**

#### Bootstrap GKG
```bash
npm run gkg:bootstrap
```
Creates reference nodes and foundational graph structure.

#### Sync All Projects
```bash
npm run gkg:sync-all
```
Automatically syncs all projects with sequential processing:
- Processes projects one by one
- 1-second delay between projects
- Comprehensive error reporting
- Progress tracking

#### Sync Specific Project
```bash
npm run gkg:sync-project <project-id>
```
Syncs individual project with full entity and relationship mapping.

#### Get GKG Status
```bash
npm run gkg:status
```
Displays:
- Neo4j connection status
- Governance domain distribution
- Maturity level breakdown
- Top entity types

### **REST API Endpoints**

#### Bootstrap GKG
```http
POST /api/gkg/bootstrap
```

#### Sync All Projects
```http
POST /api/gkg/sync-all
```

#### Sync Specific Project
```http
POST /api/gkg/sync-project/:projectId
```

#### Get GKG Status
```http
GET /api/gkg/status
```

#### Get Project Graph
```http
GET /api/gkg/project/:projectId/graph
```

#### Get Entity Relationships
```http
GET /api/gkg/entity/:entityId/relationships
```

## Graph Schema

### **Node Types**
- **Project**: Project nodes with metadata and maturity levels
- **Document**: Document nodes with content and type information
- **SemanticUnit**: Semantic chunks with entity relationships
- **Entity**: Extracted entities (stakeholders, risks, requirements, etc.)
- **EntityType**: Reference nodes for entity classification
- **GovernanceDomain**: Governance domain classifications
- **MaturityLevel**: Project maturity level references
- **RelationshipType**: Relationship type references

### **Relationship Types**
- **CONTAINS**: Project → Document, Document → SemanticUnit
- **CONTAINS_ENTITY**: SemanticUnit → Entity
- **IS_TYPE**: Entity → EntityType
- **HAS_MATURITY**: Project → MaturityLevel
- **FALLS_UNDER**: Project → GovernanceDomain

### **Entity Tiers**
Based on your Entity Extraction Optimization:

#### **Tier 1 (Core - Always Extract)**
- stakeholders, requirements, risks, milestones, deliverables
- activities, scope_items, success_criteria, constraints

#### **Tier 2 (Important - Conditional)**
- resources, technologies, quality_standards, best_practices
- performance_measurements, earned_value_metrics, opportunities

#### **Tier 3 (Specialized - On-Demand)**
- governance_decisions, approval_workflows, policy_compliance
- financial_variances, funding_tranches, procurement_costs

#### **Tier 4 (Advanced - Expert Mode)**
- risk_appetite, probability_impact_matrix, benefit_realization_plan
- satisfaction_surveys, relationship_health, utilization_records

## Automated Processing Flow

### **Bulk Sync Process**
1. **Project Discovery**: Fetch all projects from database
2. **Sequential Processing**: Process projects one by one
3. **Document Sync**: Sync all documents for each project
4. **Semantic Unit Sync**: Sync semantic units with entities
5. **Relationship Creation**: Build graph relationships
6. **Error Recovery**: Continue processing on individual failures
7. **Progress Reporting**: Comprehensive results and statistics

### **Sync Progression**
```typescript
// Automatic progression through projects
for (const project of projects) {
  await syncProjectToGKG(project);
  await delay(1000); // Prevent overwhelming Neo4j
}
```

## Error Handling & Recovery

### **Robust Error Management**
- Individual project failures don't stop bulk sync
- Comprehensive error reporting with context
- Retry mechanisms for transient failures
- Graceful degradation for missing data

### **Error Reporting**
```typescript
interface SyncResult {
  success: boolean;
  projectsSynced: number;
  documentsSynced: number;
  semanticUnitsSynced: number;
  errors: string[];
  duration: number;
}
```

## Performance Considerations

### **Optimization Features**
- **Batch Processing**: Groups related operations
- **Connection Pooling**: Efficient Neo4j connection management
- **Progressive Delays**: Prevents database overwhelming
- **Transaction Management**: Ensures data consistency

### **Recommended Settings**
```typescript
const config = {
  environment: 'development',
  batchSize: 50,
  retryAttempts: 3,
  syncMode: 'incremental'
};
```

## Monitoring & Analytics

### **Governance Insights**
- Project distribution across governance domains
- Maturity level progression tracking
- Entity relationship density analysis
- Cross-project dependency mapping

### **Status Dashboard**
Real-time monitoring of:
- Sync progress and completion rates
- Error rates and types
- Performance metrics
- Graph growth statistics

## Integration Examples

### **Entity Extraction Integration**
```typescript
// Sync semantic units with extracted entities
const semanticUnits = await getDocumentSemanticUnits(documentId);
for (const unit of semanticUnits) {
  await syncSemanticUnitToGKG(unit, documentId, projectId);
  // Automatically creates entity relationships
}
```

### **Maturity Tracking**
```typescript
// Link projects to maturity levels
await createProjectRelationships({
  id: project.id,
  maturityLevel: project.maturityLevel,
  type: project.type
});
```

## Troubleshooting

### **Common Issues**

#### **Neo4j Connection Failed**
```bash
# Check Neo4j is running
docker ps | grep neo4j

# Verify connection details
npm run gkg:status
```

#### **Sync Failures**
```bash
# Check individual project
npm run gkg:sync-project <problematic-project-id>

# Review error logs
tail -f logs/gkg-sync.log
```

#### **Performance Issues**
- Reduce batch size in configuration
- Increase delays between projects
- Check Neo4j memory settings

### **Debug Mode**
Enable detailed logging:
```typescript
logger.level = 'debug';
```

## API Response Examples

### **Sync All Projects Response**
```json
{
  "success": true,
  "projectsSynced": 15,
  "documentsSynced": 234,
  "semanticUnitsSynced": 1856,
  "errors": [],
  "duration": 45230,
  "timestamp": "2024-02-04T08:15:30.123Z"
}
```

### **GKG Status Response**
```json
{
  "success": true,
  "status": {
    "connected": true,
    "timestamp": "2024-02-04T08:15:30.123Z"
  },
  "statistics": {
    "governanceInsights": [
      {
        "domain": "ProjectManagement",
        "projectCount": 8,
        "avgMaturityLevel": 3.2
      }
    ],
    "maturityDistribution": [
      {
        "maturityLevel": "Structured",
        "level": 2,
        "projectCount": 5
      }
    ],
    "entityTypeDistribution": [
      {
        "entityType": "stakeholder",
        "entityCount": 156
      }
    ]
  }
}
```

## Next Steps

1. **Install Neo4j** and configure environment
2. **Run bootstrap**: `npm run gkg:bootstrap`
3. **Test sync**: `npm run gkg:sync-all`
4. **Monitor status**: `npm run gkg:status`
5. **Integrate** with your entity extraction pipeline
6. **Customize** entity tiers and relationships as needed

The GKG sync system provides a robust foundation for advanced governance analytics and relationship intelligence across your ADPA project portfolio! 🚀
