import { Router } from 'express';
import { TaskCostController } from './TaskCostController';
import { IssueController } from './IssueController';
import { RiskController } from './RiskController';
import { PlaybookController } from './PlaybookController';
import { authenticateToken, requirePermission } from '../../middleware/auth';
import { RouteConfig } from '../../routes/registry';

const router = Router({ mergeParams: true });
const taskCosts = new TaskCostController();
const issues = new IssueController();
const risks = new RiskController();
const playbooks = new PlaybookController();

/**
 * Modular Execution Routes
 * Mounted under /api/v1/execution
 */

// Task Costs
router.get('/tasks/:taskId/cost', authenticateToken, requirePermission('tasks.view'), taskCosts.getTaskBreakdown);
router.get('/tasks/:taskId/resources/:assignmentId/cost', authenticateToken, requirePermission('tasks.view'), taskCosts.getResourceCost);
router.get('/projects/:projectId/tasks/costs', authenticateToken, requirePermission('tasks.view'), taskCosts.getProjectTasksCosts);
router.post('/tasks/:taskId/resources/:assignmentId/cost-impact', authenticateToken, requirePermission('tasks.manage'), taskCosts.calculateImpact);
router.post('/tasks/:taskId/resources', authenticateToken, requirePermission('tasks.manage'), taskCosts.upsertAssignment);

// Issues
router.get('/issues', authenticateToken, requirePermission('issues.view'), issues.getAll);
router.get('/issues/stats/:projectId', authenticateToken, requirePermission('issues.view'), issues.getStats);
router.get('/issues/project/:projectId/resolution-metrics', authenticateToken, requirePermission('issues.view'), issues.getMetrics);
router.get('/issues/:id', authenticateToken, requirePermission('issues.view'), issues.getById);
router.get('/issues/:id/history', authenticateToken, requirePermission('issues.view'), issues.getHistory);
router.get('/issues/:id/resolution-recommendations', authenticateToken, requirePermission('issues.view'), issues.getRecommendations);
router.post('/issues', authenticateToken, requirePermission('issues.manage'), issues.create);
router.post('/issues/suggest-resolution', authenticateToken, requirePermission('issues.manage'), issues.suggestResolution);
router.post('/issues/suggest-rca', authenticateToken, requirePermission('issues.manage'), issues.suggestRCA);
router.post('/issues/materialize-risk/:riskId', authenticateToken, requirePermission('issues.manage'), issues.materializeRisk);
router.post('/issues/escalate-risk/:riskId', authenticateToken, requirePermission('issues.manage'), issues.escalateRisk);
router.post('/issues/:id/analyze-rca', authenticateToken, requirePermission('issues.manage'), issues.analyzeRCA);
router.put('/issues/:id', authenticateToken, requirePermission('issues.manage'), issues.update);
router.delete('/issues/:id', authenticateToken, requirePermission('issues.manage'), issues.delete);

// Risks
router.get('/risks/registry', authenticateToken, requirePermission('risks.view'), risks.getRegistry);
router.get('/risks/report', authenticateToken, requirePermission('risks.view'), risks.getReport);
router.get('/risks/summary', authenticateToken, requirePermission('risks.view'), risks.getSummary);
router.get('/risks/review-compliance', authenticateToken, requirePermission('risks.view'), risks.getCompliance);

// Playbooks
router.get('/playbooks', authenticateToken, requirePermission('playbooks.view'), playbooks.getAll);
router.get('/playbooks/match', authenticateToken, requirePermission('playbooks.view'), playbooks.match);
router.get('/playbooks/executions', authenticateToken, requirePermission('playbooks.view'), playbooks.getExecutions);
router.get('/playbooks/executions/:id', authenticateToken, requirePermission('playbooks.view'), playbooks.getExecutionById);
router.get('/playbooks/:id', authenticateToken, requirePermission('playbooks.view'), playbooks.getById);
router.post('/playbooks', authenticateToken, requirePermission('playbooks.manage'), playbooks.create);
router.post('/playbooks/:id/execute', authenticateToken, requirePermission('playbooks.manage'), playbooks.execute);
router.post('/playbooks/executions/:id/cancel', authenticateToken, requirePermission('playbooks.manage'), playbooks.cancelExecution);
router.post('/playbooks/executions/:id/steps/:stepId/complete', authenticateToken, requirePermission('playbooks.manage'), playbooks.completeStep);
router.post('/playbooks/executions/:id/steps/:stepId/notes', authenticateToken, requirePermission('playbooks.manage'), playbooks.updateStepNotes);
router.put('/playbooks/:id', authenticateToken, requirePermission('playbooks.manage'), playbooks.update);
router.delete('/playbooks/:id', authenticateToken, requirePermission('playbooks.manage'), playbooks.delete);

const executionRoutes: RouteConfig[] = [
  {
    path: '/execution',
    router: router,
    version: '1',
    category: 'Execution'
  }
];

export default executionRoutes;
