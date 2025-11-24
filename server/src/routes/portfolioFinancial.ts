/**
 * Portfolio Financial Metrics API Routes
 * 
 * Endpoints:
 * GET /api/portfolio/financial - Portfolio-level financial metrics
 * GET /api/portfolio/cost-breakdown - Cost breakdown by category
 * GET /api/portfolio/program/:programId/financial - Program-level financial metrics
 */

import { Router, Request, Response } from 'express';
import {
  getPortfolioFinancialMetrics,
  getPortfolioCostBreakdown,
  getProgramFinancialMetrics,
} from '../services/portfolioFinancialService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/portfolio/financial
 * Get portfolio-level financial metrics including budget, costs, ROI, etc.
 */
router.get('/financial', async (req: Request, res: Response) => {
  try {
    const metrics = await getPortfolioFinancialMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    logger.error('GET /portfolio/financial error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve portfolio financial metrics',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/portfolio/cost-breakdown
 * Get cost breakdown by category (labor, cloud, materials, etc.)
 */
router.get('/cost-breakdown', async (req: Request, res: Response) => {
  try {
    const breakdown = await getPortfolioCostBreakdown();
    res.json({
      success: true,
      data: breakdown,
    });
  } catch (err) {
    logger.error('GET /portfolio/cost-breakdown error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve portfolio cost breakdown',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/portfolio/program/:programId/financial
 * Get financial metrics for a specific program
 */
router.get('/program/:programId/financial', async (req: Request, res: Response) => {
  try {
    const { programId } = req.params;

    if (!programId) {
      return res.status(400).json({
        success: false,
        error: 'Missing programId parameter',
      });
    }

    const metrics = await getProgramFinancialMetrics(programId);
    res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    logger.error(`GET /portfolio/program/${req.params.programId}/financial error:`, err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve program financial metrics',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

export default router;
