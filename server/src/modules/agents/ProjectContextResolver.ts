import { ProjectRepository } from '../projects/ProjectRepository'
import { CompanyRepository } from '../identity/CompanyRepository'
import { ResolvedContext, OrganizationPolicy } from './OrganizationalContext'
import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'

/**
 * Resolver to fetch and merge organization and project context.
 */
export class ProjectContextResolver {
  private projectRepo: ProjectRepository
  private companyRepo: CompanyRepository

  constructor() {
    this.projectRepo = new ProjectRepository(pool)
    this.companyRepo = new CompanyRepository(pool)
  }

  /**
   * Resolves the full context for a given project ID.
   */
  async resolve(projectId: string): Promise<ResolvedContext> {
    logger.info(`Resolving organizational context for project: ${projectId}`)
    
    try {
      // 1. Fetch Project
      const projectRes = await this.projectRepo.findById(projectId)
      const project = projectRes.rows[0]
      if (!project) throw new Error(`Project ${projectId} not found`)

      // 2. Fetch Company
      let company: any = null
      if (project.company_id) {
        company = await this.companyRepo.findById(project.company_id)
      }

      // 3. Fetch Policies (from metadata or dedicated tables)
      // For Phase 7, we'll extract policies from company/project metadata
      const companyPolicies: OrganizationPolicy[] = company?.metadata?.policies || []
      const projectPolicies: OrganizationPolicy[] = project.metadata?.policies || []

      return {
        companyId: project.company_id,
        projectId: project.id,
        companyName: company?.name,
        projectName: project.name,
        framework: project.framework,
        policies: [...companyPolicies, ...projectPolicies],
        metadata: {
          ...company?.metadata,
          ...project.metadata
        }
      }
    } catch (e: any) {
      logger.error(`Failed to resolve project context: ${e.message}`)
      return {
        projectId,
        policies: [],
        metadata: {}
      }
    }
  }
}
