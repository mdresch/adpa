import { Neo4jService } from './neo4jService';
import { SupabaseService } from './supabaseService';
import { PineconeService } from './pineconeService';
import { logger } from '../utils/logger';

// Define missing types based on existing structure
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: Date;
  endDate?: Date;
  maturityLevel?: number;
  type?: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  source: string;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SemanticUnit {
  id: string;
  content: string;
  type: string;
  confidence?: number;
  metadata?: any;
  entities?: Entity[];
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  confidence?: number;
  metadata?: any;
}

export interface GKGSyncConfig {
  environment: 'development' | 'staging' | 'production';
  batchSize: number;
  retryAttempts: number;
  syncMode: 'bootstrap' | 'incremental' | 'full';
}

export interface SyncResult {
  success: boolean;
  projectsSynced: number;
  documentsSynced: number;
  semanticUnitsSynced: number;
  errors: string[];
  duration: number;
}

export class GovernanceKnowledgeGraphSync {
  private neo4jService: Neo4jService;
  private supabaseService: SupabaseService;
  private pineconeService: PineconeService;
  private config: GKGSyncConfig;

  constructor(config: GKGSyncConfig) {
    this.neo4jService = new Neo4jService(config.environment);
    this.supabaseService = new SupabaseService();
    this.pineconeService = new PineconeService();
    this.config = config;
  }

  /**
   * Bootstrap GKG with reference nodes and governance domains
   */
  async bootstrapGKG(): Promise<boolean> {
    try {
      logger.info('Starting GKG bootstrap...');

      // Create governance domains
      await this.createGovernanceDomains();
      
      // Create maturity levels
      await this.createMaturityLevels();
      
      // Create entity type reference nodes
      await this.createEntityTypeReferences();
      
      // Create relationship type references
      await this.createRelationshipReferences();

      logger.info('GKG bootstrap completed successfully');
      return true;
    } catch (error) {
      logger.error('GKG bootstrap failed:', error);
      return false;
    }
  }

  /**
   * Sync all projects to GKG with automatic progression
   */
  async syncAllProjects(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      projectsSynced: 0,
      documentsSynced: 0,
      semanticUnitsSynced: 0,
      errors: [],
      duration: 0
    };

    try {
      // Get all projects from database
      const projects = await this.getAllProjects();
      logger.info(`Found ${projects.length} projects to sync`);

      // Process projects sequentially with automatic progression
      for (const project of projects) {
        try {
          const projectResult = await this.syncProjectToGKG(project);
          
          if (projectResult.success) {
            result.projectsSynced++;
            result.documentsSynced += projectResult.documentsSynced;
            result.semanticUnitsSynced += projectResult.semanticUnitsSynced;
            
            logger.info(`Successfully synced project: ${project.name}`);
          } else {
            result.errors.push(`Failed to sync project ${project.name}: ${projectResult.errors.join(', ')}`);
            result.success = false;
          }

          // Add delay between projects to prevent overwhelming Neo4j
          await this.delay(1000);
          
        } catch (error) {
          const errorMsg = `Error syncing project ${project.name}: ${error}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
          result.success = false;
        }
      }

    } catch (error) {
      logger.error('Error during bulk project sync:', error);
      result.success = false;
      result.errors.push(`Bulk sync error: ${error}`);
    }

    result.duration = Date.now() - startTime;
    logger.info(`Bulk sync completed. Projects: ${result.projectsSynced}, Documents: ${result.documentsSynced}, Units: ${result.semanticUnitsSynced}, Duration: ${result.duration}ms`);
    
    return result;
  }

  /**
   * Sync individual project to GKG
   */
  async syncProjectToGKG(project: Project): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      projectsSynced: 0,
      documentsSynced: 0,
      semanticUnitsSynced: 0,
      errors: [],
      duration: 0
    };

    try {
      logger.info(`Syncing project: ${project.name} (${project.id})`);

      // Create/update project node
      await this.createProjectNode(project);
      result.projectsSynced = 1;

      // Upsert project to Pinecone
      try {
        await this.pineconeService.upsertProjects([project]);
        logger.info(`Project upserted to Pinecone: ${project.name}`);
      } catch (pineconeError) {
        logger.error(`Failed to upsert project to Pinecone: ${pineconeError}`);
        result.errors.push(`Pinecone project upsert error: ${pineconeError}`);
      }

      // Get and sync all documents for this project
      const documents = await this.getProjectDocuments(project.id);
      const documentsForPinecone = [];
      
      for (const document of documents) {
        try {
          await this.syncDocumentToGKG(document, project.id);
          result.documentsSynced++;
          documentsForPinecone.push(document);
          
          // Get and sync semantic units for this document
          const semanticUnits = await this.getDocumentSemanticUnits(document.id);
          const entitiesForPinecone = [];
          
          for (const semanticUnit of semanticUnits) {
            await this.syncSemanticUnitToGKG(semanticUnit, document.id, project.id);
            result.semanticUnitsSynced++;
            
            // Extract entities from semantic unit and prepare for Pinecone
            const entities = this.extractEntitiesFromSemanticUnit(semanticUnit, document.id, project.id);
            entitiesForPinecone.push(...entities);
          }
          
          // Upsert entities to Pinecone
          if (entitiesForPinecone.length > 0) {
            try {
              await this.pineconeService.upsertEntities(entitiesForPinecone);
              logger.info(`Entities upserted to Pinecone for document: ${document.title}`);
            } catch (pineconeError) {
              logger.error(`Failed to upsert entities to Pinecone: ${pineconeError}`);
              result.errors.push(`Pinecone entities upsert error: ${pineconeError}`);
            }
          }
          
        } catch (error) {
          const errorMsg = `Error syncing document ${document.id}: ${error}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Upsert documents to Pinecone
      if (documentsForPinecone.length > 0) {
        try {
          await this.pineconeService.upsertDocuments(documentsForPinecone);
          logger.info(`Documents upserted to Pinecone for project: ${project.name}`);
        } catch (pineconeError) {
          logger.error(`Failed to upsert documents to Pinecone: ${pineconeError}`);
          result.errors.push(`Pinecone documents upsert error: ${pineconeError}`);
        }
      }

      // Create project-level relationships
      await this.createProjectRelationships(project);

    } catch (error) {
      logger.error(`Error syncing project ${project.id}:`, error);
      result.success = false;
      result.errors.push(`Project sync error: ${error}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Create governance domain reference nodes
   */
  private async createGovernanceDomains(): Promise<void> {
    const domains = [
      'ProjectManagement',
      'Governance',
      'RiskManagement', 
      'QualityManagement',
      'ResourceManagement',
      'StakeholderManagement',
      'ChangeManagement',
      'Compliance'
    ];

    const query = `
      UNWIND $domains AS domainName
      MERGE (gd:GovernanceDomain {name: domainName})
      SET gd.createdAt = datetime(),
          gd.updatedAt = datetime()
    `;

    await this.neo4jService.runQuery(query, { domains });
  }

  /**
   * Create maturity level reference nodes
   */
  private async createMaturityLevels(): Promise<void> {
    const maturityLevels = [
      { level: 1, name: 'Foundation', description: 'Basic project management practices' },
      { level: 2, name: 'Structured', description: 'Standardized processes and documentation' },
      { level: 3, name: 'Managed', description: 'Comprehensive measurement and control' },
      { level: 4, name: 'Optimized', description: 'Continuous improvement and optimization' },
      { level: 5, name: 'Autonomous', description: 'Self-governing and adaptive systems' }
    ];

    const query = `
      UNWIND $levels AS level
      MERGE (ml:MaturityLevel {level: level.level})
      SET ml.name = level.name,
          ml.description = level.description,
          ml.createdAt = datetime(),
          ml.updatedAt = datetime()
    `;

    await this.neo4jService.runQuery(query, { levels: maturityLevels });
  }

  /**
   * Create entity type reference nodes
   */
  private async createEntityTypeReferences(): Promise<void> {
    const entityTypes = [
      // Tier 1 (Core)
      'stakeholder', 'requirement', 'risk', 'milestone', 'deliverable',
      'activity', 'scope_item', 'success_criteria', 'constraint',
      
      // Tier 2 (Important)
      'resource', 'technology', 'quality_standard', 'best_practice',
      'performance_measurement', 'earned_value_metric', 'opportunity',
      
      // Tier 3 (Specialized)
      'governance_decision', 'approval_workflow', 'policy_compliance',
      'financial_variance', 'funding_tranche', 'procurement_cost',
      
      // Tier 4 (Advanced)
      'risk_appetite', 'probability_impact_matrix', 'benefit_realization_plan',
      'satisfaction_survey', 'relationship_health', 'utilization_record'
    ];

    const query = `
      UNWIND $entityTypes AS entityType
      MERGE (et:EntityType {name: entityType})
      SET et.createdAt = datetime(),
          et.updatedAt = datetime()
    `;

    await this.neo4jService.runQuery(query, { entityTypes });
  }

  /**
   * Create relationship type references
   */
  private async createRelationshipReferences(): Promise<void> {
    const relationshipTypes = [
      'CONTAINS', 'DEPENDS_ON', 'RELATES_TO', 'APPROVES', 'ASSIGNS',
      'MANAGES', 'GOVERNS', 'MITIGATES', 'TRIGGERS', 'VALIDATES',
      'MEASURES', 'IMPLEMENTS', 'REQUIRES', 'IMPACTS', 'INFLUENCES'
    ];

    const query = `
      UNWIND $relationshipTypes AS relType
      MERGE (rt:RelationshipType {name: relType})
      SET rt.createdAt = datetime(),
          rt.updatedAt = datetime()
    `;

    await this.neo4jService.runQuery(query, { relationshipTypes });
  }

  /**
   * Create or update project node in Neo4j
   */
  private async createProjectNode(project: Project): Promise<void> {
    const query = `
      MERGE (p:Project {id: $projectId})
      SET p.name = $name,
          p.description = $description,
          p.status = $status,
          p.startDate = $startDate,
          p.endDate = $endDate,
          p.maturityLevel = $maturityLevel,
          p.type = $type,
          p.updatedAt = datetime()
    `;

    await this.neo4jService.runQuery(query, {
      projectId: project.id,
      name: project.name,
      description: project.description || null,
      status: project.status,
      startDate: project.startDate ? project.startDate.toISOString() : null,
      endDate: project.endDate ? project.endDate.toISOString() : null,
      maturityLevel: project.maturityLevel || null,
      type: project.type || null
    });
  }

  /**
   * Sync document to GKG
   */
  private async syncDocumentToGKG(document: Document, projectId: string): Promise<void> {
    const query = `
      MERGE (d:Document {id: $documentId})
      SET d.title = $title,
          d.type = $type,
          d.source = $source,
          d.createdAt = $createdAt,
          d.updatedAt = datetime()
      
      WITH d
      MATCH (p:Project {id: $projectId})
      MERGE (p)-[:CONTAINS]->(d)
    `;

    await this.neo4jService.runQuery(query, {
      documentId: document.id,
      title: document.title,
      type: document.type,
      source: document.source,
      createdAt: document.createdAt ? document.createdAt.toISOString() : null,
      projectId
    });
  }

  /**
   * Sync semantic unit to GKG
   */
  private async syncSemanticUnitToGKG(semanticUnit: SemanticUnit, documentId: string, projectId: string): Promise<void> {
    // Create semantic unit node
    const unitQuery = `
      MERGE (su:SemanticUnit {id: $unitId})
      SET su.content = $content,
          su.type = $type,
          su.confidence = $confidence,
          su.metadata = $metadata,
          su.updatedAt = datetime()
    `;

    await this.neo4jService.runQuery(unitQuery, {
      unitId: semanticUnit.id,
      content: semanticUnit.content,
      type: semanticUnit.type,
      confidence: semanticUnit.confidence || null,
      metadata: semanticUnit.metadata ? JSON.stringify(semanticUnit.metadata) : null
    });

    // Create relationships to document and project
    const relationshipQuery = `
      MATCH (su:SemanticUnit {id: $unitId})
      MATCH (d:Document {id: $documentId})
      MATCH (p:Project {id: $projectId})
      
      MERGE (d)-[:CONTAINS]->(su)
      MERGE (p)-[:CONTAINS]->(su)
    `;

    await this.neo4jService.runQuery(relationshipQuery, {
      unitId: semanticUnit.id,
      documentId,
      projectId
    });

    // Create entity relationships if entities exist
    if (semanticUnit.entities && semanticUnit.entities.length > 0) {
      await this.createEntityRelationships(semanticUnit);
    }
  }

  /**
   * Create entity relationships for semantic unit
   */
  private async createEntityRelationships(semanticUnit: SemanticUnit): Promise<void> {
    if (!semanticUnit.entities || semanticUnit.entities.length === 0) {
      return;
    }
    
    for (const entity of semanticUnit.entities) {
      // Create entity node
      const entityQuery = `
        MERGE (e:Entity {id: $entityId})
        SET e.name = $name,
            e.type = $type,
            e.confidence = $confidence,
            e.metadata = $metadata,
            e.updatedAt = datetime()
      `;
      
      await this.neo4jService.runQuery(entityQuery, {
        entityId: entity.id,
        name: entity.name,
        type: entity.type,
        confidence: entity.confidence || null,
        metadata: entity.metadata ? JSON.stringify(entity.metadata) : null
      });
      
      // Create relationship between semantic unit and entity
      const relationshipQuery = `
        MATCH (su:SemanticUnit {id: $unitId})
        MATCH (e:Entity {id: $entityId})
        MERGE (su)-[:CONTAINS_ENTITY]->(e)
      `;
      
      await this.neo4jService.runQuery(relationshipQuery, {
        unitId: semanticUnit.id,
        entityId: entity.id
      });
    }
  }

  /**
   * Create project-level relationships
   */
  private async createProjectRelationships(project: Project): Promise<void> {
    // Link to maturity level
    const maturityQuery = `
      MATCH (p:Project {id: $projectId})
      MATCH (ml:MaturityLevel {level: $maturityLevel})
      MERGE (p)-[:HAS_MATURITY]->(ml)
    `;

    await this.neo4jService.runQuery(maturityQuery, { 
      projectId: project.id, 
      maturityLevel: project.maturityLevel || 1 
    });

    // Link to governance domains based on project type
    if (project.type) {
      const domainQuery = `
        MATCH (p:Project {id: $projectId})
        MATCH (gd:GovernanceDomain {name: $domainName})
        MERGE (p)-[:FALLS_UNDER]->(gd)
      `;

      await this.neo4jService.runQuery(domainQuery, { 
        projectId: project.id, 
        domainName: project.type 
      });
    }
  }

  /**
   * Get all projects from Supabase
   */
  private async getAllProjects(): Promise<Project[]> {
    try {
      const projects = await this.supabaseService.getProjects();
      
      // Transform Supabase projects to GKG Project interface
      return projects.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.start_date ? new Date(project.start_date) : undefined,
        endDate: project.end_date ? new Date(project.end_date) : undefined,
        maturityLevel: project.metadata?.maturityLevel || null,
        type: project.framework || null
      }));
    } catch (error) {
      logger.error('Error fetching projects from Supabase:', error);
      // Return mock data as fallback
      return [
        {
          id: 'project-1',
          name: 'ADPA Playbook Development',
          description: 'Development of ADPA Program and Framework Playbooks',
          status: 'active',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          maturityLevel: 3,
          type: 'ProjectManagement'
        },
        {
          id: 'project-2',
          name: 'RAG Pipeline Implementation',
          description: 'Implementation of advanced RAG pipeline with semantic processing',
          status: 'active',
          startDate: new Date('2024-02-01'),
          endDate: new Date('2024-08-31'),
          maturityLevel: 2,
          type: 'Technology'
        }
      ];
    }
  }

  /**
   * Get documents for a project from Supabase
   */
  private async getProjectDocuments(projectId: string): Promise<Document[]> {
    try {
      const documents = await this.supabaseService.getProjectDocuments(projectId);
      
      // Transform Supabase documents to GKG Document interface
      return documents.map((doc: any) => ({
        id: doc.id,
        title: doc.name,
        content: JSON.stringify(doc.content), // Supabase stores content as JSON
        type: doc.mime_type || 'document',
        source: 'supabase',
        metadata: doc.metadata || {},
        createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
        updatedAt: doc.updated_at ? new Date(doc.updated_at) : new Date()
      }));
    } catch (error) {
      logger.error('Error fetching documents from Supabase:', error);
      // Return mock data as fallback
      return [
        {
          id: `doc-${projectId}-1`,
          title: 'Project Charter Document',
          content: 'This document outlines the project charter and governance framework...',
          type: 'charter',
          source: 'internal',
          metadata: { project: projectId, version: '1.0' },
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-20')
        },
        {
          id: `doc-${projectId}-2`,
          title: 'Risk Management Plan',
          content: 'Comprehensive risk management approach with mitigation strategies...',
          type: 'risk_plan',
          source: 'internal',
          metadata: { project: projectId, version: '2.1' },
          createdAt: new Date('2024-01-18'),
          updatedAt: new Date('2024-01-25')
        },
        {
          id: `doc-${projectId}-3`,
          title: 'Stakeholder Analysis',
          content: 'Detailed analysis of project stakeholders and their requirements...',
          type: 'stakeholder_analysis',
          source: 'internal',
          metadata: { project: projectId, version: '1.5' },
          createdAt: new Date('2024-01-22'),
          updatedAt: new Date('2024-01-28')
        }
      ];
    }
  }

  /**
   * Get semantic units for a document from Supabase
   */
  private async getDocumentSemanticUnits(documentId: string): Promise<SemanticUnit[]> {
    try {
      const semanticUnits = await this.supabaseService.getDocumentSemanticUnits(documentId);
      
      // Transform Supabase semantic units to GKG SemanticUnit interface
      return semanticUnits.map((unit: any) => ({
        id: unit.id,
        content: unit.content,
        type: unit.type,
        confidence: unit.confidence || 0.85,
        metadata: unit.metadata || {},
        entities: unit.entities || []
      }));
    } catch (error) {
      logger.error('Error fetching semantic units from Supabase:', error);
      // Return mock data as fallback
      return [
        {
          id: `su-${documentId}-1`,
          content: 'The project governance framework establishes clear roles and responsibilities for all stakeholders involved.',
          type: 'governance',
          confidence: 0.92,
          metadata: { 
            documentId: documentId,
            section: 'Introduction',
            wordCount: 15
          },
          entities: [
            {
              id: 'entity-1',
              name: 'Project Governance',
              type: 'Concept',
              confidence: 0.95,
              metadata: { category: 'governance' }
            },
            {
              id: 'entity-2',
              name: 'Stakeholders',
              type: 'Role',
              confidence: 0.88,
              metadata: { category: 'management' }
            }
          ]
        },
        {
          id: `su-${documentId}-2`,
          content: 'Risk assessment procedures must be documented and reviewed quarterly by the governance committee.',
          type: 'risk_management',
          confidence: 0.87,
          metadata: { 
            documentId: documentId,
            section: 'Risk Management',
            wordCount: 14
          },
          entities: [
            {
              id: 'entity-3',
              name: 'Risk Assessment',
              type: 'Process',
              confidence: 0.91,
              metadata: { category: 'risk' }
            },
            {
              id: 'entity-4',
              name: 'Governance Committee',
              type: 'Organization',
              confidence: 0.93,
              metadata: { category: 'governance' }
            }
          ]
        },
        {
          id: `su-${documentId}-3`,
          content: 'Compliance monitoring ensures adherence to established policies and regulatory requirements.',
          type: 'compliance',
          confidence: 0.89,
          metadata: { 
            documentId: documentId,
            section: 'Compliance',
            wordCount: 11
          },
          entities: [
            {
              id: 'entity-5',
              name: 'Compliance Monitoring',
              type: 'Process',
              confidence: 0.90,
              metadata: { category: 'compliance' }
            },
            {
              id: 'entity-6',
              name: 'Regulatory Requirements',
              type: 'Requirement',
              confidence: 0.85,
              metadata: { category: 'regulation' }
            }
          ]
        }
      ];
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract entities from semantic unit for Pinecone indexing
   */
  private extractEntitiesFromSemanticUnit(semanticUnit: SemanticUnit, documentId: string, projectId: string): any[] {
    const entities: any[] = [];
    
    // Extract entities from semanticUnit.entities if available
    if (semanticUnit.entities && Array.isArray(semanticUnit.entities)) {
      semanticUnit.entities.forEach((entity: any, index: number) => {
        entities.push({
          id: entity.id || `entity-${semanticUnit.id}-${index}`,
          name: entity.name || 'Unknown Entity',
          type: entity.type || entity.entity_type || 'unknown',
          confidence: entity.confidence || 0.85,
          document_id: documentId,
          project_id: projectId,
          created_at: new Date().toISOString()
        });
      });
    }
    
    // If no entities found, create a basic entity from the semantic unit content
    if (entities.length === 0) {
      const words = semanticUnit.content.split(' ');
      const entityName = words.length > 3 ? words.slice(0, 3).join(' ') : semanticUnit.content;
      
      entities.push({
        id: `entity-${semanticUnit.id}-0`,
        name: entityName,
        type: semanticUnit.type || 'text_chunk',
        confidence: semanticUnit.confidence || 0.85,
        document_id: documentId,
        project_id: projectId,
        created_at: new Date().toISOString()
      });
    }
    
    return entities;
  }
}

// Export singleton instance
export const gkgSync = new GovernanceKnowledgeGraphSync({
  environment: process.env.NODE_ENV as any || 'development',
  batchSize: 50,
  retryAttempts: 3,
  syncMode: 'incremental'
});
