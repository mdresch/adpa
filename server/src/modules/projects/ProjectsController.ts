import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ProjectRepository } from './ProjectRepository';
import { AuthRepository } from '../auth/AuthRepository';
import { lessonsLearnedService } from '../../services/lessonsLearnedService';
import { childLogger, logger } from '../../utils/logger';
import { asyncLocalStorage } from '../../infrastructure/logger';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ProjectsController (Modular)
 * Handles business logic for Project-related modular routes.
 * Uses the ProjectRepository for data access.
 */
export class ProjectsController {
  private static _projectRepository: ProjectRepository;
  private static get projectRepository() {
    if (!this._projectRepository) this._projectRepository = new ProjectRepository();
    return this._projectRepository;
  }

  private static _authRepository: AuthRepository;
  private static get authRepository() {
    if (!this._authRepository) this._authRepository = new AuthRepository();
    return this._authRepository;
  }

  /**
   * Test endpoint to verify modular route discovery and mounting.
   */
  public static async testModular(req: Request, res: Response) {
    logger.info('🔍 Modular Projects test endpoint called');
    res.json({
      success: true,
      message: 'Modular Projects Route is Live!',
      version: 'v1',
      module: 'Projects',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * GET /api/v1/projects
   * Retrieves all projects for the authenticated user.
   */
  public static async getAll(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const { page = 1, limit = 10, status, framework, search } = req.query;
      const currentPage = Math.max(1, Number(page) || 1);
      const pageSize = Math.max(1, Number(limit) || 10);
      const offset = (currentPage - 1) * pageSize;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;
      const isSuperAdmin = userRole === "super_admin";

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get user's company_id (super_admin can see all projects)
      let userCompanyId: string | null = null;
      if (!isSuperAdmin) {
        try {
          userCompanyId = await ProjectsController.authRepository.getCompanyIdByUserId(userId);
        } catch (err) {
          log.warn('Failed to fetch user company_id, falling back to owner/team filtering');
        }
      }

      const result = await ProjectsController.projectRepository.findAll({
        limit: pageSize,
        offset,
        userId,
        isSuperAdmin,
        userCompanyId,
        status,
        framework,
        search
      });

      let total = Number(result.rows?.[0]?.total_count || 0);
      if (total === 0 && currentPage > 1) {
        const firstPageProbe = await ProjectsController.projectRepository.findAll({
          limit: 1,
          offset: 0,
          userId,
          isSuperAdmin,
          userCompanyId,
          status,
          framework,
          search
        });
        total = Number(firstPageProbe.rows?.[0]?.total_count || 0);
      }
      const pages = Math.ceil(total / pageSize) || 0;

      res.json({
        success: true,
        projects: result.rows,
        page: currentPage,
        limit: pageSize,
        total,
        pagination: {
          page: currentPage,
          limit: pageSize,
          total,
          pages
        }
      });
    } catch (error) {
      log.error("GetAll Projects error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/v1/projects/:id
   * Retrieves a specific project by ID.
   */
  public static async getById(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const { id } = req.params;
      if (!id || id === 'undefined' || !UUID_RE.test(id)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      const result = await ProjectsController.projectRepository.findById(id);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Project not found" });
      }

      const project = result.rows[0];

      // Access control
      const hasAccess =
        userRole === "super_admin" ||
        userRole === "admin" ||
        project.owner_id === userId ||
        (project.team_members && project.team_members.includes(userId));

      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json({ success: true, project });
    } catch (error) {
      log.error("GetById Project error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * POST /api/v1/projects
   * Creates a new project.
   */
  public static async create(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const { name, description, framework, status = "active", priority = "medium", program_id, team_members, start_date, end_date, budget } = req.body;
      const userId = (req as any).user?.id;

      if (!name) {
        return res.status(400).json({ error: "Project name is required" });
      }

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const id = uuidv4();
      const correlationId = asyncLocalStorage.getStore();

      // Handle team members input (simplifying since we have a repository now)
      let finalTeamMembers: string[] = [userId];
      if (Array.isArray(team_members)) {
        finalTeamMembers = Array.from(new Set([...finalTeamMembers, ...team_members]));
      }

      const result = await ProjectsController.projectRepository.create({
        id,
        name,
        description,
        framework,
        status,
        priority,
        program_id: program_id || null,
        owner_id: userId,
        team_members: JSON.stringify(finalTeamMembers),
        correlation_id: correlationId,
        start_date,
        end_date,
        budget: budget !== undefined ? Number(budget) : undefined
      });

      log.info(`Project created: ${name}`, { projectId: id });
      res.status(201).json({ success: true, project: result.rows[0] });
    } catch (error) {
      log.error("Create Project error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * PUT /api/v1/projects/:id
   * Updates an existing project.
   */
  public static async update(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const { id } = req.params;
      const { name, description, framework, status, priority, team_members, start_date, end_date, budget } = req.body;
      const userId = (req as any).user?.id;

      if (!id || !UUID_RE.test(id)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      // Check ownership
      const ownerId = await ProjectsController.projectRepository.getOwnerId(id);
      if (!ownerId) {
        return res.status(404).json({ error: "Project not found" });
      }

      const userRole = (req as any).user?.role;
      if (userRole !== "super_admin" && userRole !== "admin" && ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const correlationId = asyncLocalStorage.getStore();
      const updateData: any = { 
        name, 
        description, 
        framework, 
        status, 
        priority, 
        correlation_id: correlationId,
        start_date: start_date || undefined,
        end_date: end_date || undefined
      };

      if (budget !== undefined && budget !== null && budget !== "") {
        const numericBudget = Number(budget);
        if (isNaN(numericBudget)) {
          return res.status(400).json({ error: "Invalid budget value" });
        }
        updateData.budget = numericBudget;
      }

      if (team_members) {
        updateData.team_members = typeof team_members === 'string' ? team_members : JSON.stringify(team_members);
      }

      log.info(`Updating project ${id}`, { updateData });
      
      // Get current status to check for transition
      const pResult = await ProjectsController.projectRepository.findById(id);
      const oldStatus = pResult && pResult.rows ? pResult.rows[0]?.status : undefined;
      
      const result = await ProjectsController.projectRepository.update(id, updateData);
      const newStatus = result.rows[0]?.status;

      // Trigger lessons learned analysis if status changed to completed
      if (newStatus === 'completed' && oldStatus !== 'completed') {
        log.info(`Project ${id} completed. Triggering lessons learned analysis.`);
        // Run in background
        void lessonsLearnedService.analyzeProjectCompletion(id, userId);
      }

      log.info(`Project updated: ${id}`);
      res.json({ success: true, project: result.rows[0] });
    } catch (error: any) {
      log.error("Update Project error:", { 
        message: error?.message, 
        stack: error?.stack,
        code: error?.code,
        detail: error?.detail
      });
      res.status(500).json({ error: "Internal server error", message: error?.message });
    }
  }

  /**
   * DELETE /api/v1/projects/:id
   * Deletes a project.
   */
  public static async delete(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!id || !UUID_RE.test(id)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const ownerId = await ProjectsController.projectRepository.getOwnerId(id);
      if (!ownerId) {
        return res.status(404).json({ error: "Project not found" });
      }

      const userRole = (req as any).user?.role;
      if (userRole !== "super_admin" && userRole !== "admin" && ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await ProjectsController.projectRepository.delete(id);
      log.info(`Project deleted: ${id}`);
      res.json({ success: true, message: "Project deleted successfully" });
    } catch (error) {
      log.error("Delete Project error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/v1/projects/:id/integrations
   * Retrieves integrations associated with a project.
   */
  public static async getIntegrations(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const { id } = req.params;
      if (!id || !UUID_RE.test(id)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      // TODO: Implement actual integration fetching logic
      log.info(`Fetching integrations for project: ${id} (Stub)`);
      res.json({ success: true, integrations: [] });
    } catch (error) {
      log.error("GetIntegrations error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/v1/projects/:id/drift-detections
   * Retrieves drift detections associated with a project.
   */
  public static async getDriftDetections(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const { id } = req.params;
      if (!id || !UUID_RE.test(id)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      // TODO: Implement actual drift detection fetching logic
      log.info(`Fetching drift detections for project: ${id} (Stub)`);
      res.json({ success: true, driftDetections: [] });
    } catch (error) {
      log.error("GetDriftDetections error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
