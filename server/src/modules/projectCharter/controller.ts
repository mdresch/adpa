import { Request, Response } from 'express';
import { projectCharterAgentService } from './service';
import { DocxService } from '../../services/docxService';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';

export class ProjectCharterController {
  /**
   * POST /api/v1/project-charter/initiate
   */
  public static async initiate(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const result = await projectCharterAgentService.initiateCharter(req.body, (req as any).user?.id);
      res.status(201).json(result);
    } catch (error: any) {
      log.error('[ProjectCharterController] Initiate error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  /**
   * POST /api/v1/project-charter/extract
   */
  public static async extract(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const result = await projectCharterAgentService.extractEntities(req.body, (req as any).user?.id);
      res.json(result);
    } catch (error: any) {
      log.error('[ProjectCharterController] Extract error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/project-charter/:projectId/export/docx
   */
  public static async exportDocx(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    const { projectId } = req.params;
    
    try {
      // 1. Fetch latest successful workflow for this project
      const result = await pool.query(
        `SELECT charter_data, project_name 
         FROM charter_workflows 
         WHERE project_id = $1 AND status = 'completed'
         ORDER BY completed_at DESC LIMIT 1`,
        [projectId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No completed project charter found for this project' });
      }

      const { charter_data } = result.rows[0];
      const projectName = result.rows[0].project_name || 'Project';

      // 2. Assemble Markdown content (leveraging the service logic)
      // Since assembleCharterContent is private, we'll re-implement or expose it.
      // For this implementation, we use the service instance to get the data and manually assemble or call a helper.
      const markdown = await (projectCharterAgentService as any).assembleCharterContent(charter_data);

      // 3. Generate DOCX
      const docxBuffer = await DocxService.generateDocx(
        markdown, 
        `Project Charter: ${projectName}`,
        {
          Project: projectName,
          Generated: new Date().toLocaleDateString(),
          Version: '1.0'
        }
      );

      // 4. Send response
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="Project_Charter_${projectName.replace(/\s+/g, '_')}.docx"`);
      res.send(docxBuffer);

    } catch (error: any) {
      log.error('[ProjectCharterController] Export error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/project-charter/workflow/:id
   */
  public static async getWorkflow(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const result = await projectCharterAgentService.getWorkflowState(req.params.id);
      if (!result) return res.status(404).json({ error: 'Workflow not found' });
      res.json(result);
    } catch (error: any) {
      log.error('[ProjectCharterController] GetWorkflow error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
}
