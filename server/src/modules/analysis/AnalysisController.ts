import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AnalysisRepository } from './AnalysisRepository';
import { aiService } from '../../services/aiService';
import { ContextAwareAIService } from '../context/integration';
import { openaiConnector } from '../ai/openai';
import { googleConnector } from '../ai/google';
import { mistralConnector } from '../ai/mistral';
import * as queueServiceModule from '../../services/queueService';
function getDefaultContextWindow(modelId: string, providerType: string): number {
  const contextWindows: Record<string, Record<string, number>> = {
    openai: { 'gpt-4': 8192, 'gpt-4-turbo': 128000, 'gpt-4-32k': 32768, 'gpt-3.5-turbo': 4096, 'gpt-3.5-turbo-16k': 16384 },
    google: { 'gemini-pro': 32768, 'gemini-pro-vision': 16384, 'gemini-1.5-pro': 2000000, 'gemini-1.5-flash': 1000000, 'gemini-2.5-flash': 2000000 },
    mistral: { 'mistral-large-latest': 128000, 'mistral-medium-latest': 32000, 'mistral-small-latest': 32000, 'mistral-tiny': 8000 }
  };
  return contextWindows[providerType]?.[modelId] || 4096;
}
function getDefaultMaxTokens(modelId: string, providerType: string): number {
  const maxTokens: Record<string, Record<string, number>> = {
    openai: { 'gpt-4': 4096, 'gpt-4-turbo': 4096, 'gpt-4-32k': 8192, 'gpt-3.5-turbo': 2048, 'gpt-3.5-turbo-16k': 4096 },
    google: { 'gemini-pro': 2048, 'gemini-pro-vision': 4096, 'gemini-1.5-pro': 8192, 'gemini-1.5-flash': 8192, 'gemini-2.5-flash': 8192 },
    mistral: { 'mistral-large-latest': 8192, 'mistral-medium-latest': 4096, 'mistral-small-latest': 2048, 'mistral-tiny': 1024 }
  };
  return maxTokens[providerType]?.[modelId] || 2048;
}
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';
import { makeKey, getCache, setCache } from '../../utils/cache';
import { listDomainExtractionConfigs } from '@/modules/context';
import { PMBOK_DOMAINS } from '@/types/pmbok';
import { ENTITY_DOMAIN_WEIGHTS } from '../../types/entity-domain-weights';
import { createInitialBatchProgressMeta, normalizeBatchingConfig } from '../../services/extraction/batchPlanner';
import { ENTITY_COUNT_TABLES } from './entityTypeTables';

export class AnalysisController {
  private repository = new AnalysisRepository(pool);
  private logger = childLogger({ component: 'AnalysisController' });

  /**
   * AI Generation (Queued)
   */
  generate = async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const { prompt, provider, model, temperature, max_tokens, template_id, variables } = req.body;
      const userId = (req as any).user?.id;

      // Deduplication
      const dedupeKey = makeKey(['ai-gen', userId, template_id, req.body.project_id]);
      const recentJobId = getCache<string>(dedupeKey);
      if (recentJobId) {
        return res.json({ message: "Generation already in progress", jobId: recentJobId, status: "queued", deduplicated: true });
      }

      const jobId = uuidv4();
      setCache(dedupeKey, jobId, 10);

      const jobData = {
        jobId,
        userId,
        prompt,
        provider,
        model,
        temperature,
        max_tokens,
        template_id,
        variables,
        projectId: req.body.project_id,
        documentIds: req.body.document_ids,
        use_context: req.query.use_context === 'true' || !!req.body.project_id || !!req.body.document_ids || !!req.body.template_id
      };

      const qService = queueServiceModule.getQueueService();
      await qService.addJob('ai-generate', jobData, { jobId });

      res.json({ message: "Generation started", jobId, status: "queued" });
    } catch (error) {
      log.error("AI generation failed", error);
      res.status(500).json({ error: "AI generation failed" });
    }
  };

  /**
   * Get AI Providers
   */
  getProviders = async (req: Request, res: Response) => {
    try {
      const providers = await aiService.getAvailableProviders();
      res.json({ providers });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  };

  /**
   * Toggle Provider Status
   */
  toggleProvider = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const status = await this.repository.toggleProviderStatus(id);
      if (!status) return res.status(404).json({ error: "Provider not found" });
      
      res.json({ success: true, is_active: status.is_active });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle provider" });
    }
  };

  /**
   * Get AI History
   */
  getHistory = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const history = await this.repository.getUserHistory(userId, Number(limit), offset);
      const total = await this.repository.getHistoryCount(userId);

      res.json({
        history,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  };

  /**
   * Extract Data from Project
   */
  extract = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, aiProvider, aiModel, documentIds, domains, batchingEnabled, maxBatchTokens, maxDocsPerBatch } = req.body;
      const userId = (req as any).user?.id;

      const normalizedDomains = domains || [...PMBOK_DOMAINS];
      const normalizedBatching = normalizeBatchingConfig({ batchingEnabled, maxBatchTokens, maxDocsPerBatch });
      const progressMeta = createInitialBatchProgressMeta({ totalDocuments: documentIds?.length || 0, config: normalizedBatching });

      const extractionJobData = {
        projectId, aiProvider, aiModel, documentIds, domains: normalizedDomains, ...normalizedBatching, progressMeta
      };

      const job = await this.repository.createJob({
        type: 'project-data-extraction',
        status: 'pending',
        data: extractionJobData,
        created_by: userId,
        project_id: projectId
      });

      const qService = queueServiceModule.getQueueService();
      await qService.addJob('extract-project-data', {
        jobId: job.id, projectId, userId, aiProvider, aiModel, documentIds, domains: normalizedDomains, ...normalizedBatching
      } as any);

      res.json({ success: true, jobId: job.id, message: 'Extraction started' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Enhanced Generation (Real-time with failover)
   */
  enhancedGenerate = async (req: Request, res: Response) => {
    try {
      const { prompt, provider, model, temperature, max_tokens, template_id, variables } = req.body;
      const startTime = Date.now();

      const providerResult = await this.repository.getProviderByName(provider);
      if (!providerResult || !providerResult.is_active) {
        return res.status(404).json({ error: "Provider not found or inactive" });
      }

      try {
        const result = await ContextAwareAIService.generateWithContext({
          prompt, provider, model, temperature, max_tokens, template_id, variables,
          user_id: (req as any).user?.id,
          project_id: req.body.project_id,
          document_ids: req.body.document_ids,
          include_integrations: req.body.include_integrations,
          custom_context: req.body.custom_context,
        });

        const duration = Date.now() - startTime;
        await this.repository.logAudit((req as any).user?.id, "ai_generate_enhanced", "ai_provider", providerResult.id, {
          model: result.model, usage: result.usage, duration_ms: duration, template_id
        });

        res.json({
          ...result,
          metadata: { 
            duration_ms: duration, 
            actual_provider: result.provider, 
            failover_used: provider !== result.provider 
          }
        });
      } catch (error: any) {
        await this.repository.logAudit((req as any).user?.id, "ai_generate_enhanced_failed", "ai_provider", providerResult.id, {
          error: error.message, duration_ms: Date.now() - startTime, template_id
        });
        throw error;
      }
    } catch (error: any) {
      res.status(500).json({ error: "AI generation failed", details: error.message });
    }
  };

  /**
   * Get Provider Models
   */
  getProviderModels = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const provider = await this.repository.getProviderById(id);
      if (!provider) return res.status(404).json({ error: "Provider not found" });

      let models: any[] = [];
      switch (provider.provider_type) {
        case 'openai': models = await openaiConnector.getAvailableModels(provider.name); break;
        case 'google': models = await googleConnector.getAvailableModels(provider.name); break;
        case 'mistral': models = await mistralConnector.getAvailableModels(provider.name); break;
        case 'azure': models = [{ id: 'gpt-4', name: 'GPT-4' }, { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo' }]; break;
        case 'ollama': models = [{ id: 'llama3.1:latest', name: 'Llama 3.1 Latest' }, { id: 'mistral:latest', name: 'Mistral Latest' }]; break;
      }

      const modelsWithMetadata = models.map((model: any) => {
        if (typeof model === 'string') {
          return { id: model, name: model, contextWindow: getDefaultContextWindow(model, provider.provider_type), maxTokens: getDefaultMaxTokens(model, provider.provider_type), temperature: 0.7, type: 'chat' };
        }
        return model;
      });

      res.json({ success: true, models: modelsWithMetadata, provider: { id: provider.id, name: provider.name, type: provider.provider_type } });
    } catch (error) {
      res.status(500).json({ error: "Failed to get provider models" });
    }
  };

  /**
   * Admin Config
   */
  configureProvider = async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const { api_key, configuration, is_active } = req.body;
      const encryptedApiKey = Buffer.from(api_key).toString("base64");

      const provider = await this.repository.getProviderByName(name);
      if (!provider) return res.status(404).json({ error: "Provider not found" });

      const updated = await this.repository.upsertProvider({
        id: provider.id,
        name,
        provider_type: provider.provider_type,
        api_key_encrypted: encryptedApiKey,
        configuration: { ...provider.configuration, ...configuration },
        is_active
      });

      await aiService.initializeProviders();
      res.json({ message: "Provider configured", provider: updated });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  };

  /**
   * Create Provider
   */
  createProvider = async (req: Request, res: Response) => {
    try {
      const { name, provider_type, api_key, configuration, is_active } = req.body;
      if (await this.repository.getProviderByName(name)) return res.status(400).json({ error: "Provider name exists" });

      const encryptedApiKey = Buffer.from(api_key).toString("base64");
      const provider = await this.repository.upsertProvider({
        name, provider_type, api_key_encrypted: encryptedApiKey, configuration, is_active
      });

      await aiService.initializeProviders();
      res.status(201).json({ message: "Provider created", provider });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  };

  /**
   * Delete Provider
   */
  deleteProvider = async (req: Request, res: Response) => {
    try {
      if (await this.repository.deleteProvider(req.params.name)) {
        await aiService.initializeProviders();
        return res.json({ message: "Provider deleted" });
      }
      res.status(404).json({ error: "Provider not found" });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  };

  /**
   * Get Extraction Status
   */
  getJobStatus = async (req: Request, res: Response) => {
    try {
      const job = await this.repository.getJobById(req.params.jobId);
      if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

      res.json({ success: true, job });
    } catch (error) {
      res.status(500).json({ error: 'Status check failed' });
    }
  };

  /**
   * Trigger Baseline Extraction
   */
  triggerBaseline = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.body;
      const userId = (req as any).user?.id;

      const job = await this.repository.createJob({
        type: 'baseline-extract',
        status: 'pending',
        data: { project_id: projectId },
        created_by: userId,
        project_id: projectId
      });

      const qService = queueServiceModule.getQueueService();
      await qService.addJob('baseline-extract', { jobId: job.id, userId, project_id: projectId } as any);

      res.json({ success: true, jobId: job.id, message: 'Baseline extraction triggered' });
    } catch (error) {
      res.status(500).json({ error: 'Baseline trigger failed' });
    }
  };

  /**
   * Get Extraction Summary
   */
  getSummary = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const tables = [
        { key: 'stakeholders', name: 'stakeholders' },
        { key: 'requirements', name: 'requirements' },
        { key: 'risks', name: 'risks' },
        { key: 'milestones', name: 'milestones' },
        { key: 'activities', name: 'activities' },
        { key: 'deliverables', name: 'deliverables' },
        { key: 'constraints', name: 'constraints' },
        { key: 'success_criteria', name: 'success_criteria' },
        { key: 'best_practices', name: 'best_practices' },
        { key: 'team_agreements', name: 'team_agreements' },
        { key: 'development_approaches', name: 'development_approaches' },
        { key: 'work_items', name: 'work_items' },
        { key: 'performance_actuals', name: 'performance_actuals' }
      ];

      const entityCounts = await this.repository.getProjectEntityCounts(projectId, tables);
      
      // Calculate PMBOK 8 Domain Counts based on weights
      const pmbok8DomainCounts: Record<string, number> = {
        stakeholders: 0,
        team: 0,
        development_approach: 0,
        planning: 0,
        project_work: 0,
        delivery: 0,
        measurement: 0,
        uncertainty: 0
      };

      let totalEntities = 0;

      Object.entries(entityCounts).forEach(([entityType, count]) => {
        totalEntities += count;
        const weights = ENTITY_DOMAIN_WEIGHTS[entityType] || [];
        weights.forEach(w => {
          if (pmbok8DomainCounts[w.domain] !== undefined) {
            pmbok8DomainCounts[w.domain] += count * w.weight;
          }
        });
      });

      // Map snake_case domains to camelCase expected by frontend
      const formattedDomainCounts = {
        team: Math.round(pmbok8DomainCounts.team),
        developmentApproach: Math.round(pmbok8DomainCounts.development_approach),
        projectWork: Math.round(pmbok8DomainCounts.project_work),
        measurement: Math.round(pmbok8DomainCounts.measurement),
        uncertainty: Math.round(pmbok8DomainCounts.uncertainty),
        stakeholders: Math.round(pmbok8DomainCounts.stakeholders),
        planning: Math.round(pmbok8DomainCounts.planning),
        delivery: Math.round(pmbok8DomainCounts.delivery)
      };

      res.json({ 
        success: true, 
        projectId, 
        entityCounts, 
        pmbok8DomainCounts: formattedDomainCounts,
        totalEntities
      });
    } catch (error) {
      this.logger.error('Summary fetch failed', { error });
      res.status(500).json({ error: 'Summary fetch failed' });
    }
  };

  /**
   * Full entity counts for extraction UI (same tables as summary, without domain rollups).
   */
  getExtractionResults = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const entityCounts = await this.repository.getProjectEntityCounts(projectId, ENTITY_COUNT_TABLES);
      res.json({ success: true, projectId, entityCounts });
    } catch (error) {
      this.logger.error('Extraction results fetch failed', { error });
      res.status(500).json({ error: 'Extraction results fetch failed' });
    }
  };

  /**
   * List entities for a project by type (used by ProjectDataExtraction entity detail dialog).
   */
  getEntitiesByType = async (req: Request, res: Response) => {
    try {
      const { projectId, entityType } = req.params;
      const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '100'), 10) || 100, 1), 500);
      const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);

      const { entities, total, tableName } = await this.repository.getProjectEntitiesByType(
        projectId,
        entityType,
        { limit, offset }
      );

      res.json({
        success: true,
        projectId,
        entityType,
        tableName,
        entities,
        total,
        limit,
        offset,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.startsWith('Unknown entity type:')) {
        return res.status(400).json({ error: message });
      }
      this.logger.error('Entity details fetch failed', { error: message });
      res.status(500).json({ error: 'Entity details fetch failed' });
    }
  };
}
