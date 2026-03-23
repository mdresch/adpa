import { sql } from '@vercel/postgres';
import { CacheService } from '@/lib/kv';

// Define types for better type safety
export interface Project {
  id: string;
  name: string;
  description?: string;
  framework: string;
  status: string;
  priority: string;
  start_date?: Date;
  end_date?: Date;
  budget?: number;
  owner_id: string;
  created_by: string;
  team_members: string[];
  settings: Record<string, any>;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectFilters {
  status?: string;
  framework?: string;
  priority?: string;
  search?: string;
}

export class ProjectService {
  private static CACHE_TTL = 600; // 10 minutes in seconds

  /**
   * Get projects for a user with optional filters
   */
  static async getProjects(userId: string, filters?: ProjectFilters): Promise<Project[]> {
    // Create a cache key that includes filters if provided
    let cacheKey = `projects:user:${userId}`;
    if (filters) {
      const filterString = Object.entries(filters)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}:${value}`)
        .join(':');
      
      if (filterString) {
        cacheKey += `:${filterString}`;
      }
    }

    // Try cache first
    const cached = await CacheService.get<Project[]>(cacheKey);
    if (cached) return cached;

    // Build the query based on filters
    let query = `
      SELECT p.*, u.name as owner_name
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE (p.owner_id = $1 OR $1 = ANY(SELECT jsonb_array_elements_text(p.team_members)))
    `;
    
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (filters) {
      if (filters.status) {
        query += ` AND p.status = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }
      
      if (filters.framework) {
        query += ` AND p.framework = $${paramIndex}`;
        queryParams.push(filters.framework);
        paramIndex++;
      }
      
      if (filters.priority) {
        query += ` AND p.priority = $${paramIndex}`;
        queryParams.push(filters.priority);
        paramIndex++;
      }
      
      if (filters.search) {
        query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }
    }
    
    query += ` ORDER BY p.updated_at DESC`;

    // Execute the query
    const { rows } = await sql.query(query, queryParams);

    // Cache for 10 minutes
    await CacheService.set(cacheKey, rows, this.CACHE_TTL);

    return rows as Project[];
  }

  /**
   * Get a project by ID with access control
   */
  static async getProjectById(id: string, userId: string): Promise<Project | null> {
    const cacheKey = `project:${id}`;
    
    // Try cache first
    const cached = await CacheService.get<Project>(cacheKey);
    if (cached) return cached;

    // Query with access control
    const { rows } = await sql`
      SELECT p.*, u.name as owner_name
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = ${id} AND (
        p.owner_id = ${userId} OR 
        ${userId} = ANY(SELECT jsonb_array_elements_text(p.team_members)) OR
        EXISTS (SELECT 1 FROM users WHERE id = ${userId} AND role = 'admin')
      )
    `;

    if (rows.length === 0) {
      return null;
    }

    // Cache for 10 minutes
    await CacheService.set(cacheKey, rows[0], this.CACHE_TTL);

    return rows[0] as Project;
  }

  /**
   * Create a new project
   */
  static async createProject(projectData: Partial<Project>, userId: string): Promise<Project> {
    const { 
      name, 
      description, 
      framework, 
      status = 'active',
      priority = 'medium',
      start_date,
      end_date,
      budget,
      settings = {},
      metadata = {}
    } = projectData;

    // Validate required fields
    if (!name || !framework) {
      throw new Error('Project name and framework are required');
    }

    // Insert the new project
    const { rows } = await sql`
      INSERT INTO projects (
        name, description, framework, status, priority, 
        start_date, end_date, budget, owner_id, created_by,
        settings, metadata
      )
      VALUES (
        ${name}, ${description || null}, ${framework}, ${status}, ${priority},
        ${start_date ? (start_date instanceof Date ? start_date.toISOString() : start_date) : null}, ${end_date ? (end_date instanceof Date ? end_date.toISOString() : end_date) : null}, ${budget || null}, ${userId}, ${userId},
        ${JSON.stringify(settings)}, ${JSON.stringify(metadata)}
      )
      RETURNING *
    `;

    // Invalidate user's project cache
    await CacheService.delByPattern(`projects:user:${userId}*`);

    return rows[0] as Project;
  }

  /**
   * Update an existing project with access control
   */
  static async updateProject(id: string, updates: Partial<Project>, userId: string): Promise<Project | null> {
    // First check if user has access to this project
    const project = await this.getProjectById(id, userId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }

    // Check if user has permission to update
    const isOwner = project.owner_id === userId;
    const isAdmin = await this.isUserAdmin(userId);
    const isTeamMember = Array.isArray(project.team_members) && project.team_members.includes(userId);

    if (!isOwner && !isAdmin && !isTeamMember) {
      throw new Error('You do not have permission to update this project');
    }

    // Build the update query dynamically
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Only update fields that are provided
    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    
    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    
    if (updates.framework !== undefined) {
      updateFields.push(`framework = $${paramIndex++}`);
      values.push(updates.framework);
    }
    
    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    
    if (updates.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex++}`);
      values.push(updates.priority);
    }
    
    if (updates.start_date !== undefined) {
      updateFields.push(`start_date = $${paramIndex++}`);
      values.push(updates.start_date);
    }
    
    if (updates.end_date !== undefined) {
      updateFields.push(`end_date = $${paramIndex++}`);
      values.push(updates.end_date);
    }
    
    if (updates.budget !== undefined) {
      updateFields.push(`budget = $${paramIndex++}`);
      values.push(updates.budget);
    }
    
    if (updates.settings !== undefined) {
      updateFields.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(updates.settings));
    }
    
    if (updates.metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    // Add the project ID and user ID to the values array
    values.push(id);
    values.push(userId);

    // If no fields to update, return the original project
    if (updateFields.length === 0) {
      return project;
    }

    // Execute the update query
    const query = `
      UPDATE projects
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex++} AND (
        owner_id = $${paramIndex++} OR 
        EXISTS (SELECT 1 FROM users WHERE id = $${paramIndex - 1} AND role = 'admin')
      )
      RETURNING *
    `;

    const { rows } = await sql.query(query, values);

    if (rows.length === 0) {
      return null;
    }

    // Invalidate caches
    await CacheService.del(`project:${id}`);
    await CacheService.delByPattern(`projects:user:${userId}*`);

    return rows[0] as Project;
  }

  /**
   * Add a team member to a project
   */
  static async addTeamMember(projectId: string, userId: string, memberId: string): Promise<Project | null> {
    // Check if user has access to modify the project
    const project = await this.getProjectById(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }

    // Check if user has permission to add team members
    const isOwner = project.owner_id === userId;
    const isAdmin = await this.isUserAdmin(userId);

    if (!isOwner && !isAdmin) {
      throw new Error('Only project owners or admins can add team members');
    }

    // Check if the member exists
    const memberExists = await this.userExists(memberId);
    if (!memberExists) {
      throw new Error('User to be added does not exist');
    }

    // Check if member is already in the team
    const teamMembers = Array.isArray(project.team_members) ? project.team_members : [];
    if (teamMembers.includes(memberId)) {
      return project; // Member already in team, no change needed
    }

    // Add the new member to the team
    const updatedTeamMembers = [...teamMembers, memberId];

    // Update the project
    const { rows } = await sql`
      UPDATE projects
      SET team_members = ${JSON.stringify(updatedTeamMembers)}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${projectId}
      RETURNING *
    `;

    if (rows.length === 0) {
      return null;
    }

    // Invalidate caches
    await CacheService.del(`project:${projectId}`);
    await CacheService.delByPattern(`projects:user:${userId}*`);
    await CacheService.delByPattern(`projects:user:${memberId}*`);

    return rows[0] as Project;
  }

  /**
   * Remove a team member from a project
   */
  static async removeTeamMember(projectId: string, userId: string, memberId: string): Promise<Project | null> {
    // Check if user has access to modify the project
    const project = await this.getProjectById(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }

    // Check if user has permission to remove team members
    const isOwner = project.owner_id === userId;
    const isAdmin = await this.isUserAdmin(userId);

    if (!isOwner && !isAdmin) {
      throw new Error('Only project owners or admins can remove team members');
    }

    // Check if member is in the team
    const teamMembers = Array.isArray(project.team_members) ? project.team_members : [];
    if (!teamMembers.includes(memberId)) {
      return project; // Member not in team, no change needed
    }

    // Remove the member from the team
    const updatedTeamMembers = teamMembers.filter(id => id !== memberId);

    // Update the project
    const { rows } = await sql`
      UPDATE projects
      SET team_members = ${JSON.stringify(updatedTeamMembers)}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${projectId}
      RETURNING *
    `;

    if (rows.length === 0) {
      return null;
    }

    // Invalidate caches
    await CacheService.del(`project:${projectId}`);
    await CacheService.delByPattern(`projects:user:${userId}*`);
    await CacheService.delByPattern(`projects:user:${memberId}*`);

    return rows[0] as Project;
  }

  /**
   * Get team members for a project
   */
  static async getProjectTeamMembers(projectId: string, userId: string): Promise<any[]> {
    // Check if user has access to the project
    const project = await this.getProjectById(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }

    const teamMembers = Array.isArray(project.team_members) ? project.team_members : [];
    if (teamMembers.length === 0) {
      return [];
    }

    // Get user details for all team members
    const placeholders = teamMembers.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
      SELECT id, name, email, role, avatar_url
      FROM users
      WHERE id IN (${placeholders})
    `;

    const { rows } = await sql.query(query, teamMembers);
    
    return rows;
  }

  /**
   * Check if a user is an admin
   */
  private static async isUserAdmin(userId: string): Promise<boolean> {
    const { rows } = await sql`
      SELECT role FROM users WHERE id = ${userId}
    `;
    
    return rows.length > 0 && rows[0].role === 'admin';
  }

  /**
   * Check if a user exists
   */
  private static async userExists(userId: string): Promise<boolean> {
    const { rows } = await sql`
      SELECT id FROM users WHERE id = ${userId}
    `;
    
    return rows.length > 0;
  }
}