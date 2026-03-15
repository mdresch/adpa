import { Request, Response, NextFunction } from 'express';
import { IssueRepository } from './IssueRepository';
import * as issueService from '../../services/issueService';
import { aiService } from '../../services/aiService';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';

export class IssueController {
  private repository = new IssueRepository(pool);
  private logger = childLogger({ component: 'IssueController' });

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: issueService.IssueFilters = {
        project_id: req.query.project_id as string,
        status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status as string[] : [req.query.status as string]) : undefined,
        priority: req.query.priority ? (Array.isArray(req.query.priority) ? req.query.priority as string[] : [req.query.priority as string]) : undefined,
        category: req.query.category ? (Array.isArray(req.query.category) ? req.query.category as string[] : [req.query.category as string]) : undefined,
        assigned_to: req.query.assigned_to as string,
        raised_by: req.query.raised_by as string,
        related_risk_id: req.query.related_risk_id as string,
        search: req.query.search as string
      };

      const userId = (req as any).user.id;
      const issues = await issueService.getIssues(filters, userId);
      res.json({ success: true, data: issues, count: issues.length });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const issue = await issueService.getIssueById(id);
      if (!issue) return res.status(404).json({ success: false, error: 'Issue not found' });
      res.json({ success: true, data: issue });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const issue = await issueService.createIssue(req.body, userId);
      res.status(201).json({ success: true, data: issue });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const issue = await issueService.updateIssue(id, req.body, userId);
      res.json({ success: true, data: issue });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const deleted = await issueService.deleteIssue(id);
      if (!deleted) return res.status(404).json({ success: false, error: 'Issue not found' });
      res.json({ success: true, message: 'Issue deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const stats = await this.repository.findStats(projectId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const history = await issueService.getIssueStatusHistory(id);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  };

  suggestResolution = async (req: Request, res: Response, next: NextFunction) => {
    const { issue_id, issue_title, issue_description, issue_category, issue_priority, issue_impact } = req.body;
    try {
      let issueTitle = issue_title;
      let issueDescription = issue_description;
      let issueCategory = issue_category;
      let issuePriority = issue_priority;
      let issueImpact = issue_impact;

      if (!issueTitle || !issueDescription) {
        const issue = await this.repository.findDetail(issue_id);
        if (issue) {
          issueTitle = issueTitle || issue.title || 'Unknown Issue';
          issueDescription = issueDescription || issue.description || '';
          issueCategory = issueCategory || issue.category || 'other';
          issuePriority = issuePriority || issue.priority || 'medium';
          issueImpact = issueImpact || issue.impact || '';
        }
      }

      const prompt = this.buildResolutionPrompt({ issueTitle, issueDescription, issueCategory, issuePriority, issueImpact });
      const availableProviders = await aiService.getAvailableProviders();
      const activeProviders = availableProviders.filter(p => p.is_active);
      const preferredProvider = activeProviders.length > 0 ? activeProviders[0].type : 'ollama';

      const aiResponse = await aiService.generateWithFallback({
        prompt,
        provider: preferredProvider,
        temperature: 0.7,
        max_tokens: 3000,
        userId: (req as any).user.id
      });

      const suggestions = this.parseAISuggestions(aiResponse.content);

      res.json({
        success: true,
        data: {
          issue_id,
          suggestions,
          generated_at: new Date().toISOString()
        }
      });
    } catch (error: any) {
      this.logger.error("Suggest resolution error:", error);
      res.status(500).json({ success: false, error: 'Failed to generate resolution suggestions', message: error.message });
    }
  };

  materializeRisk = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { riskId } = req.params;
      const userId = (req as any).user.id;
      const issue = await issueService.materializeRiskIntoIssue(riskId, userId, req.body);
      res.json({ success: true, data: issue, message: 'Risk successfully materialized into issue' });
    } catch (error) {
      next(error);
    }
  };

  escalateRisk = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { riskId } = req.params;
      const userId = (req as any).user.id;
      const issue = await issueService.escalateRiskToIssue(riskId, userId, req.body);
      res.status(201).json({ success: true, data: issue, message: 'Risk successfully escalated to issue with RCA' });
    } catch (error) {
      next(error);
    }
  };

  suggestRCA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { risk_category, risk_description } = req.body;
      const suggestions = issueService.suggestRootCauseAnalysis(risk_category, risk_description || '');
      res.json({ success: true, data: suggestions });
    } catch (error) {
      next(error);
    }
  };

  analyzeRCA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const analysis = await issueService.analyzeIssueRootCauseWithAI(id, userId);
      res.json({ success: true, data: analysis });
    } catch (error) {
      next(error);
    }
  };

  getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const recommendations = await issueService.getResolutionRecommendations(id);
      res.json({ success: true, data: { recommendations } });
    } catch (error) {
      next(error);
    }
  };

  getMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const metrics = await issueService.getResolutionMetrics(projectId);
      res.json({ success: true, data: { metrics } });
    } catch (error) {
      next(error);
    }
  };

  private buildResolutionPrompt(data: any) {
    return `You are a project management expert specializing in issue resolution. Analyze the following issue and generate 3-5 comprehensive resolution suggestions.

ISSUE DETAILS:
Title: ${data.issueTitle}
Description: ${data.issueDescription}
Category: ${data.issueCategory || 'Not specified'}
Priority: ${data.issuePriority || 'Unknown'}
Impact: ${data.issueImpact || 'Not specified'}

Generate resolution suggestions in JSON format:
{
  "suggestions": [
    {
      "title": "Short, actionable title for the resolution",
      "description": "Detailed description of the resolution approach (2-3 sentences)",
      "resolution_type": "immediate|short_term|long_term|preventive",
      "priority": "critical|high|medium|low",
      "expected_effectiveness": 85,
      "key_steps": [
        "Step 1 description",
        "Step 2 description",
        "Step 3 description"
      ],
      "estimated_duration_days": 7,
      "resource_requirements": "Brief description of resources needed",
      "success_criteria": "How to measure if this resolution is successful",
      "root_cause_addressed": "What root cause this resolution addresses"
    }
  ]
}

Guidelines:
- Generate 3-5 diverse resolution suggestions
- Prioritize actionable, specific resolutions over generic advice
- Consider the issue category, priority, and impact when suggesting resolutions
- Mix different resolution types (immediate fixes, short-term workarounds, long-term solutions, preventive measures)
- Provide realistic timeframes and resource requirements
- Include measurable success criteria
- Expected effectiveness should be a percentage (0-100)
- Address root causes when possible
- Return ONLY valid JSON, no markdown or explanation`;
  }

  private parseAISuggestions(content: string) {
    try {
      const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      const suggestions = parsed.suggestions || [];
      return suggestions.map((s: any, i: number) => ({
        title: s.title || `Resolution ${i + 1}`,
        description: s.description || '',
        resolution_type: s.resolution_type || 'short_term',
        priority: s.priority || 'medium',
        expected_effectiveness: Math.min(100, Math.max(0, s.expected_effectiveness || 75)),
        key_steps: Array.isArray(s.key_steps) ? s.key_steps : [],
        estimated_duration_days: s.estimated_duration_days || 7,
        resource_requirements: s.resource_requirements || '',
        success_criteria: s.success_criteria || '',
        root_cause_addressed: s.root_cause_addressed || ''
      }));
    } catch (e) {
      this.logger.error("Failed to parse AI suggestions:", e);
      throw new Error("Failed to parse AI suggestions");
    }
  }
}
