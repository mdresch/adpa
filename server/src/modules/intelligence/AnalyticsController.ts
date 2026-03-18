import { Request, Response } from 'express';
import os from 'os';
import { AnalyticsRepository } from './AnalyticsRepository';
import { pool } from '../../database/connection';
import { cache } from '../../utils/redis';
import { childLogger } from '../../utils/logger';

export class AnalyticsController {
  private repository = new AnalyticsRepository(pool);
  private logger = childLogger({ component: 'AnalyticsController' });

  getDashboard = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const cacheKey = `analytics:dashboard:${userId}`;
      const cached = await cache.get(cacheKey);
      if (cached) return res.json(cached);

      const stats = await this.repository.getDashboardStats(userId);
      
      const result = {
        ...stats,
        generated_at: new Date().toISOString()
      };
      await cache.set(cacheKey, result, 300);
      res.json(result);
    } catch (error) {
      this.logger.error("Get dashboard analytics error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getSystem = async (req: Request, res: Response) => {
    try {
      const { period = "30d" } = req.query;
      const intervalMap = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "1y": "1 year" };
      const interval = intervalMap[period as keyof typeof intervalMap] || "30 days";

      const stats = await this.repository.getSystemWideStats(interval);
      
      const uptimeSeconds = os.uptime();
      const days = Math.floor(uptimeSeconds / (24 * 3600));
      const hours = Math.floor((uptimeSeconds % (24 * 3600)) / 3600);
      const uptimeString = `${days}d ${hours}h`;

      res.json({
        overview: stats,
        system_uptime: uptimeString,
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error("Get system analytics error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  trackEvent = async (req: Request, res: Response) => {
    try {
      const { event_type, properties = {} } = req.body;
      const userId = (req as any).user?.id;
      await this.repository.trackEvent(userId, event_type, properties);
      res.json({ message: "Event tracked successfully" });
    } catch (error) {
      this.logger.error("Track event error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getAIAnalytics = async (req: Request, res: Response) => {
    try {
      const { period = "30d" } = req.query;
      const intervalMap = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "1y": "1 year" };
      const interval = intervalMap[period as keyof typeof intervalMap] || "30 days";

      const [summary, timeline, providerStats, modelStats] = await Promise.all([
        this.repository.getAIGlobalSummary(interval),
        this.repository.getAIUsageTimeline(interval),
        this.repository.getAIProviderStats(interval),
        this.repository.getAIModelStats(interval)
      ]);

      res.json({
        success: true,
        summary,
        timeline,
        providerStats,
        modelStats,
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error("Get AI analytics error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getMetrics = async (req: Request, res: Response) => {
    // Ported from src/routes/metrics.ts
    try {
      res.set('Content-Type', 'text/plain');
      // Mock metrics for now, would use a prometheus registry in production
      res.send('# HELP adpa_info ADPA Version Info\n# TYPE adpa_info gauge\nadpa_info{version="1.0.0"} 1\n');
    } catch (error) {
      res.status(500).send('Error collecting metrics');
    }
  };
}
