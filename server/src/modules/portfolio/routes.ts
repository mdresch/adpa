import { Router } from 'express';
import { ProgramsController } from './ProgramsController';
import { PortfolioController } from './PortfolioController';
import { PortfolioFinancialController } from './PortfolioFinancialController';
import { PortfolioAssessmentController } from './PortfolioAssessmentController';
import { PortfolioDomainController } from './PortfolioDomainController';
import { authenticateToken, requirePermission } from '../../middleware/auth';
import { RouteConfig } from '../../routes/registry';

const router = Router();
const programs = new ProgramsController();
const portfolios = new PortfolioController();
const financial = new PortfolioFinancialController();
const assessment = new PortfolioAssessmentController();
const domains = new PortfolioDomainController();

/**
 * Modular Portfolio Routes
 * Mounted under /api/v1/portfolio
 */

router.get('/programs', authenticateToken, programs.getAll);
router.get('/programs/:id', authenticateToken, programs.getById);
router.post('/programs', authenticateToken, requirePermission('programs.manage'), programs.create);
router.put('/programs/:id', authenticateToken, requirePermission('programs.manage'), programs.update);
router.delete('/programs/:id', authenticateToken, requirePermission('programs.manage'), programs.delete);

// Portfolios
router.get('/', authenticateToken, portfolios.getAll);
router.get('/:id', authenticateToken, portfolios.getById);
router.post('/', authenticateToken, requirePermission('portfolio.manage'), portfolios.create);
router.put('/:id', authenticateToken, requirePermission('portfolio.manage'), portfolios.update);
router.delete('/:id', authenticateToken, requirePermission('portfolio.manage'), portfolios.delete);
router.get('/:id/risks', authenticateToken, portfolios.getRisks);

// Financials
router.get('/financial', authenticateToken, requirePermission('portfolio.view'), financial.getPortfolioMetrics);
router.get('/cost-breakdown', authenticateToken, requirePermission('portfolio.view'), financial.getCostBreakdown);
router.get('/program/:programId/financial', authenticateToken, requirePermission('portfolio.view'), financial.getProgramMetrics);

// Assessments
router.get('/assessment/benchmarks/industries', authenticateToken, requirePermission('portfolio.view'), assessment.getIndustries);
router.get('/assessment/benchmarks/:industry', authenticateToken, requirePermission('portfolio.view'), assessment.getBenchmark);
router.get('/assessment/:projectId', authenticateToken, requirePermission('portfolio.view'), assessment.getAssessment);
router.get('/assessment/:projectId/gaps', authenticateToken, requirePermission('portfolio.view'), assessment.getGaps);
router.get('/assessment/:projectId/history', authenticateToken, requirePermission('portfolio.view'), assessment.getHistory);

// Domains
router.get('/domains', authenticateToken, requirePermission('portfolio.view'), domains.getAll);
router.get('/domains/:id', authenticateToken, requirePermission('portfolio.view'), domains.getById);

const portfolioRoutes: RouteConfig[] = [
  {
    path: '/portfolio',
    router: router,
    version: '1',
    category: 'Portfolio'
  }
];

export default portfolioRoutes;
