import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { AnalysisRepository } from './AnalysisRepository';
import { aiService } from '../../services/aiService';
import { ContextAwareAIService } from '../context/integration';
import { openaiConnector } from '../ai/openai';
import { googleConnector } from '../ai/google';
import { mistralConnector } from '../ai/mistral';
import * as queueServiceModule from '../../services/queueService';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';
import { makeKey, getCache, setCache } from '../../utils/cache';
import { listDomainExtractionConfigs } from '@/modules/context';
import { PMBOK_DOMAINS } from '@/types/pmbok';
import { ENTITY_DOMAIN_WEIGHTS, getEntityWeights } from '../../types/entity-domain-weights';
import { createInitialBatchProgressMeta, normalizeBatchingConfig } from '../../services/extraction/batchPlanner';
import { ENTITY_COUNT_TABLES, ENTITY_CAMEL_KEY_TO_TABLE } from './entityTypeTables';
import { PMBOK6_PROCESS_MAP, PMBOK6_DELIVERABLE_MAP } from '../../types/pmbok6-mapping';

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
      const tables = ENTITY_COUNT_TABLES;

      const entityCounts = await this.repository.getProjectEntityCounts(projectId, tables);
      
      // 1. Tier 1: PMBOK 8 Performance Domains
      const pmbok8DomainCounts: Record<string, number> = {
        stakeholders: 0, team: 0, development_approach: 0, planning: 0,
        project_work: 0, delivery: 0, measurement: 0, uncertainty: 0
      };

      // 2. Tier 2: PMBOK 7 Knowledge Areas
      const pmbok7DomainCounts: Record<string, number> = {
        governance: 0, scope: 0, schedule: 0, finance: 0,
        resources: 0, risk: 0, stakeholders_ops: 0
      };

      let totalEntities = 0;

      Object.entries(entityCounts).forEach(([entityType, count]) => {
        totalEntities += count;
        const weights = getEntityWeights(entityType);
        weights.forEach(w => {
          if (pmbok8DomainCounts[w.domain] !== undefined) {
            pmbok8DomainCounts[w.domain] += count * w.weight;
          }
          if (pmbok7DomainCounts[w.domain] !== undefined) {
            pmbok7DomainCounts[w.domain] += count * w.weight;
          }
        });
      });

      const formattedPmbok8 = {
        team: Math.round(pmbok8DomainCounts.team),
        developmentApproach: Math.round(pmbok8DomainCounts.development_approach),
        projectWork: Math.round(pmbok8DomainCounts.project_work),
        measurement: Math.round(pmbok8DomainCounts.measurement),
        uncertainty: Math.round(pmbok8DomainCounts.uncertainty),
        stakeholders: Math.round(pmbok8DomainCounts.stakeholders),
        planning: Math.round(pmbok8DomainCounts.planning),
        delivery: Math.round(pmbok8DomainCounts.delivery)
      };

      const formattedPmbok7 = {
        governance: Math.round(pmbok7DomainCounts.governance),
        scope: Math.round(pmbok7DomainCounts.scope),
        schedule: Math.round(pmbok7DomainCounts.schedule),
        finance: Math.round(pmbok7DomainCounts.finance),
        resources: Math.round(pmbok7DomainCounts.resources),
        risk: Math.round(pmbok7DomainCounts.risk),
        stakeholdersOps: Math.round(pmbok7DomainCounts.stakeholders_ops)
      };

      // 3. Tier 3: PMBOK 6th Edition Process Compliance Auditor
      const processCompliance = PMBOK6_PROCESS_MAP.map(p => {
        let activationScore = 0;
        const auditLines: string[] = [];

        p.requirements.forEach(req => {
          const count = entityCounts[req.entityType] || 0;
          const met = count >= req.minCount;
          if (met) {
            activationScore += req.weight;
          }
          auditLines.push(`${req.entityType}: ${count}/${req.minCount} (${met ? 'OK' : 'MISSING'})`);
        });

        return {
          code: p.code,
          name: p.name,
          status: activationScore >= 1.0 ? 'ACTIVE' : activationScore > 0 ? 'PARTIAL' : 'PLANNED',
          activationScore: Math.min(Math.round(activationScore * 100), 100),
          audit: auditLines,
          deliverables: p.deliverables.map(d => ({
            name: d,
            present: (PMBOK6_DELIVERABLE_MAP[d] || []).some(type => (entityCounts[type] || 0) > 0)
          }))
        };
      });

      const allPossibleDeliverables = [...new Set(PMBOK6_PROCESS_MAP.flatMap(p => p.deliverables))];
      const presentUniqueDeliverables = allPossibleDeliverables.filter(d => 
        (PMBOK6_DELIVERABLE_MAP[d] || []).some(type => (entityCounts[type] || 0) > 0)
      ).length;

      const activeProcesses = processCompliance.filter(p => p.status === 'ACTIVE').length;

      const pmbok6Compliance = {
        processCoverage: Math.round((activeProcesses / 49) * 100),
        deliverableCoverage: Math.round((presentUniqueDeliverables / allPossibleDeliverables.length) * 100),
        activeProcessCount: activeProcesses,
        presentDeliverableCount: presentUniqueDeliverables,
        totalDeliverableCount: allPossibleDeliverables.length,
        processes: processCompliance
      };

      // 4. Calculate High-Integrity Baseline Readiness
      const CHARTER_TEMPLATE_IDS = [
        'ffbcf898-0486-46fa-939f-e5629737de0e', 
        '27788b37-2aa2-473f-accc-5a9e7eec7c48'
      ];
      
      const pmbokThresholds: Record<string, number> = {
        stakeholders: 25, team: 15, developmentApproach: 5, planning: 30,
        projectWork: 20, delivery: 20, measurement: 15, uncertainty: 20
      };

      const domainsMet = Object.entries(pmbokThresholds).filter(([domain, threshold]) => {
        const count = formattedPmbok8[domain as keyof typeof formattedPmbok8] || 0;
        return count >= threshold;
      }).length;

      const coveragePercent = Math.round((domainsMet / 8) * 100);

      const charterDocRes = await this.repository.query(`
        SELECT id FROM documents 
        WHERE project_id = $1 
        AND template_id = ANY($2)
        AND status IN ('published', 'review', 'draft', 'generated')
        AND (word_count IS NULL OR word_count > 100)
        LIMIT 1
      `, [projectId, CHARTER_TEMPLATE_IDS]);

      const hasCharter = charterDocRes.rows.length > 0;

      const baselineReadiness = {
        isReady: hasCharter && coveragePercent >= 60 && totalEntities >= 350,
        coveragePercent,
        hasCharter,
        totalEntities,
        requirements: { minEntities: 350, minCoverage: 60, requiresCharter: true },
        missingReason: !hasCharter ? 'Project Charter missing' : 
                       coveragePercent < 60 ? `Insufficient domain coverage (${coveragePercent}% < 60%)` :
                       totalEntities < 350 ? `Insufficient entity density (${totalEntities} < 350)` : null
      };

      res.json({ 
        success: true, 
        projectId, 
        entityCounts, 
        pmbok8DomainCounts: formattedPmbok8,
        pmbok7DomainCounts: formattedPmbok7,
        pmbok6Compliance,
        totalEntities,
        baselineReadiness
      });
    } catch (error) {
      this.logger.error('Summary fetch failed', { error });
      res.status(500).json({ error: 'Summary fetch failed' });
    }
  };

  /**
   * Full entity counts for extraction UI.
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
   * List entities for a project by type.
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

      res.json({ success: true, projectId, entityType, tableName, entities, total, limit, offset });
    } catch (error: any) {
      const message = error.message || String(error);
      if (message.startsWith('Unknown entity type:')) return res.status(400).json({ error: message });
      this.logger.error('Entity details fetch failed', { error: message });
      res.status(500).json({ error: 'Entity details fetch failed' });
    }
  };

  /**
   * Get all entities associated with a specific document
   */
  getEntitiesByDocument = async (req: Request, res: Response) => {
    try {
      const { docId } = req.params;
      const [entities, document] = await Promise.all([
        this.repository.getEntitiesByDocument(docId),
        this.repository.getDocumentInfo(docId)
      ]);

      if (!document) return res.status(404).json({ error: "Document not found" });

      const groupedEntities: Record<string, any[]> = {};
      const entityCounts: Record<string, number> = {};
      const TABLE_TO_CAMEL: Record<string, string> = {};
      Object.entries(ENTITY_CAMEL_KEY_TO_TABLE).forEach(([camel, snake]) => { TABLE_TO_CAMEL[snake] = camel; });

      const singularToPluralMap: Record<string, string> = {
        // Core entities
        'stakeholder': 'stakeholders',
        'requirement': 'requirements',
        'risk': 'risks',
        'milestone': 'milestones',
        'constraint': 'constraints',
        'deliverable': 'deliverables',
        'activity': 'activities',
        'resource': 'resources',
        'assumption': 'assumptions',
        'dependency': 'dependencies',
        'success_criterion': 'success_criteria',
        'best_practice': 'best_practices',
        'phase': 'phases',
        'technology': 'technologies',
        'quality_standard': 'quality_standards',
        'compliance_security': 'compliance_security',
        'scope_item': 'scope_items',
        
        // PMBOK 8 Performance Domain
        'team_agreement': 'team_agreements',
        'development_approach': 'development_approaches',
        'project_iteration': 'project_iterations',
        'work_item': 'work_items',
        'capacity_plan': 'capacity_plans',
        'performance_measurement': 'performance_measurements',
        'earned_value_metric': 'earned_value_metrics',
        'opportunity': 'opportunities',
        'risk_response': 'risk_responses',
        'performance_actual': 'performance_actuals',
        
        // PMBOK 8 Knowledge Area Domain
        // Governance
        'governance_decision': 'governance_decisions',
        'approval_workflow': 'approval_workflows',
        'steering_committee': 'steering_committees',
        'change_control_board': 'change_control_boards',
        'policy_compliance': 'policy_compliance',
        // Scope
        'scope_baseline': 'scope_baselines',
        'wbs_node': 'wbs_nodes',
        'scope_change_request': 'scope_change_requests',
        'requirements_traceability': 'requirements_traceability',
        'scope_verification': 'scope_verification',
        // Schedule
        'schedule_baseline': 'schedule_baselines',
        'schedule_activity': 'schedule_activities',
        'critical_path_activity': 'critical_path_activities',
        'schedule_variance': 'schedule_variances',
        'schedule_forecast': 'schedule_forecasts',
        // Finance
        'budget_baseline': 'budget_baselines',
        'cost_actual': 'cost_actuals',
        'cost_estimate': 'cost_estimates',
        'funding_tranche': 'funding_tranches',
        'financial_variance': 'financial_variances',
        'procurement_cost': 'procurement_costs',
        // Resources
        'resource_assignment': 'resource_assignments',
        'resource_pool': 'resource_pool',
        'capacity_forecast': 'capacity_forecasts',
        'utilization_record': 'utilization_records',
        'resource_conflict': 'resource_conflicts',
        'onboarding_offboarding': 'onboarding_offboarding',
        // Risk
        'risk_assessment': 'risk_assessments',
        'risk_response_plan': 'risk_response_plans',
        'risk_trigger': 'risk_triggers',
        'risk_review': 'risk_reviews',
        'contingency_reserve': 'contingency_reserves',
        'risk_metric': 'risk_metrics',
        // Stakeholders Ops
        'engagement_action': 'engagement_actions',
        'communication_log': 'communication_logs',
        'satisfaction_survey': 'satisfaction_surveys',
        'stakeholder_issue': 'stakeholder_issues',
        'relationship_health': 'relationship_health',
        
        // Digital Twin
        'dt_asset': 'dt_assets'
      };

      entities.forEach(entity => {
        const typeKey = entity.entity_type.toLowerCase();
        const mappedType = singularToPluralMap[typeKey] || typeKey;
        const camelKey = TABLE_TO_CAMEL[mappedType] || TABLE_TO_CAMEL[mappedType + 's'] || entity.entity_type;

        if (!groupedEntities[camelKey]) {
          groupedEntities[camelKey] = [];
          entityCounts[camelKey] = 0;
        }
        groupedEntities[camelKey].push({
          id: entity.id, name: entity.entity_name, ...entity.entity_data,
          extraction_confidence: entity.extraction_confidence,
          is_verified: entity.is_verified, created_at: entity.created_at,
          source_document_id: entity.document_id,
          status: entity.status,
          context_match: entity.entity_data?.context_match
        });
        entityCounts[camelKey]++;
      });

      const metadata = typeof document.generation_metadata === 'string'
        ? JSON.parse(document.generation_metadata)
        : document.generation_metadata || {};

      res.json({
        success: true, documentId: docId, documentName: document.name, projectId: document.project_id,
        entityCounts, entities: groupedEntities, totalEntities: entities.length,
        contextMatchingScore: metadata.contextMatchingScore || 0,
        appliedContextEntities: metadata.appliedContextEntities || []
      });
    } catch (error) {
      this.logger.error('Failed to get entities by document', error);
      res.status(500).json({ error: 'Failed to fetch document entities' });
    }
  };
}
