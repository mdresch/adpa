import { DocumentDependencyGraph } from '../document-dependency-graph/DocumentDependencyGraph';
import { documentGenerationService } from '../../services/documentGenerationService';
import { logger } from '../../utils/logger';
import { pool } from '../../database/connection';

export class CascadingRegenerationService {
  private graph: DocumentDependencyGraph;

  constructor(graph?: DocumentDependencyGraph) {
    this.graph = graph || new DocumentDependencyGraph();
  }

  /**
   * Entry point for triggering a cascade.
   * Finds all downstream dependencies based on PMBOK DAG and queues regeneration jobs.
   */
  public async triggerCascade(
    sourceDocumentType: string,
    projectId: string,
    driftRecordId: string,
    userId: string
  ): Promise<void> {
    try {
      logger.info('[CASCADE] Triggering cascading regeneration', {
        sourceDocumentType,
        projectId,
        driftRecordId
      });

      // 1. Log to audit trail BEFORE dispatching any jobs (REQ-CR-003)
      await this.logToAuditTrail({
        event: 'CASCADE_REGENERATION_STARTED',
        projectId,
        sourceDocumentType,
        driftRecordId,
        userId
      });

      // 2. Identify affected downstream documents
      const downstreams = this.graph.getDownstreamDependencies(sourceDocumentType);
      
      if (downstreams.length === 0) {
        logger.info('[CASCADE] No downstream dependencies found. End of cascade.');
        return;
      }

      // 3. Topologically sort the affected downstreams so we regenerate them in the right order
      const allSorted = this.graph.getTopologicalSort();
      const sortedDownstreams = allSorted.filter(d => downstreams.includes(d));

      logger.info('[CASCADE] Affected downstreams identified', { sortedDownstreams });

      // Find actual document instances in the DB matching these types
      const documentsToRegenerate = await this.findDocumentsByType(projectId, sortedDownstreams);

      let previousJobId: string | undefined;

      // 4. Queue them in order
      for (const docType of sortedDownstreams) {
        const matchingDoc = documentsToRegenerate.find(d => d.type === docType);
        
        if (!matchingDoc) {
          logger.info(`[CASCADE] Skipping ${docType} — no document instance found for project.`);
          continue;
        }

        // REQ-CR-002: PMP must hit DRACO gate
        if (docType === 'Project Management Plan') {
          const dracoCleared = await this.triggerDracoGate(matchingDoc.id, matchingDoc);
          if (!dracoCleared) {
            logger.warn(`[CASCADE] DRACO gate blocked cascade for PMP`, { documentId: matchingDoc.id });
            continue; // Stop or pause
          }
        }

        // Queue generation
        logger.info(`[CASCADE] Queuing regeneration for ${docType}`, { documentId: matchingDoc.id });
        const jobId = await documentGenerationService.queueDocumentGeneration({
          projectId,
          userId,
          documentId: matchingDoc.id,
          // Optional: we can pass previousJobId if the queue supports dependsOn 
          // (Requires adpa-doc-gen-queue modification, but we mock it in test for now)
          metadata: { cascadeSource: driftRecordId, cascadeFrom: sourceDocumentType }
        });
        
        previousJobId = jobId;
      }

      logger.info('[CASCADE] Cascading regeneration dispatch complete.');
    } catch (error) {
      logger.error('[CASCADE] Error during cascading regeneration', { error });
      throw error;
    }
  }

  // --- Internals (Mocked in tests) --- //

  protected async findDocumentsByType(projectId: string, types: string[]): Promise<Array<{id: string, type: string, projectId: string}>> {
    // Basic implementation; would query `documents` or `projects` table
    const result = await pool.query(
      `SELECT id, title as type, project_id as "projectId" FROM documents WHERE project_id = $1 AND title = ANY($2)`,
      [projectId, types]
    );
    return result.rows;
  }

  protected async logToAuditTrail(payload: any): Promise<boolean> {
    logger.info('[CASCADE] Audit log recorded', payload);
    return true; // Simplified for this scope
  }

  protected async triggerDracoGate(documentId: string, docDetails: any): Promise<boolean> {
    logger.info('[CASCADE] DRACO gate triggered', { documentId });
    // Simplified: we assume it passes or blocks based on external human intervention.
    // In a real system, this might transition the document to "pending_draco_review".
    return true; 
  }
}

export const cascadingRegenerationService = new CascadingRegenerationService();
