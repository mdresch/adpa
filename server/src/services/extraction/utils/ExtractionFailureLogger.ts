import { pool } from '../../../database/connection'
import { logger } from '../../../utils/logger'
import type { ExtractionContext } from '../base/ExtractionContext'

export interface ExtractionFailure {
    projectId: string;
    entityType: string;
    errorMessage: string;
    stackTrace?: any;
    aiProvider?: string;
    aiModel?: string;
    aiResponseRaw?: string;
    correlationId?: string;
}

/**
 * Utility to log extraction failures to the dead-letter table.
 * Phase 1.2 of Extraction Service Refactoring.
 */
export class ExtractionFailureLogger {
    /**
     * Records an extraction failure in the database for later analysis and recovery.
     */
    static async logFailure(failure: ExtractionFailure): Promise<void> {
        try {
            const query = `
        INSERT INTO extraction_failures (
          project_id,
          entity_type,
          error_message,
          stack_trace,
          ai_provider,
          ai_model,
          ai_response_raw,
          correlation_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

            const values = [
                failure.projectId,
                failure.entityType,
                failure.errorMessage,
                failure.stackTrace ? JSON.stringify(failure.stackTrace) : null,
                failure.aiProvider,
                failure.aiModel,
                failure.aiResponseRaw,
                failure.correlationId
            ];

            await pool.query(query, values);

            logger.info(`[DEAD-LETTER] Recorded extraction failure for ${failure.entityType}`, {
                projectId: failure.projectId,
                correlationId: failure.correlationId
            });
        } catch (err) {
            // Fail-safe: don't let logging failures crash the extraction process
            logger.error('[DEAD-LETTER] Failed to record extraction failure in database', {
                error: err instanceof Error ? err.message : String(err),
                entityType: failure.entityType,
                correlationId: failure.correlationId
            });
        }
    }

    /**
     * Records a failure using an ExtractionContext for convenience.
     */
    static async logContextFailure(
        context: ExtractionContext,
        entityType: string,
        error: Error | string,
        aiResponseRaw?: string
    ): Promise<void> {
        const errorMessage = typeof error === 'string' ? error : error.message;
        const stackTrace = error instanceof Error ? { stack: error.stack } : undefined;

        await this.logFailure({
            projectId: context.projectId,
            entityType,
            errorMessage,
            stackTrace,
            aiProvider: context.provider,
            aiModel: context.model,
            aiResponseRaw,
            correlationId: context.correlationId
        });
    }
}
