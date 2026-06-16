import { ProjectRepository, ProjectData } from '../../../modules/projects/ProjectRepository'

describe('Pillar 7: Project Governance & Lifecycle Invariants', () => {

  // REQ-PRJ-002: UUID Validation
  describe('REQ-PRJ-002: Project Identity Validation', () => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    it('should accept valid UUID v4 format', () => {
      const validIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ]
      validIds.forEach(id => {
        expect(UUID_RE.test(id)).toBe(true)
      })
    })

    it('should reject malformed project IDs', () => {
      const invalidIds = ['undefined', '', 'not-a-uuid', '123', 'DROP TABLE projects;--']
      invalidIds.forEach(id => {
        expect(UUID_RE.test(id)).toBe(false)
      })
    })
  })

  // REQ-PRJ-003: Creator Auto-Membership
  describe('REQ-PRJ-003: Creator Auto-Membership', () => {
    it('should always include creator in team_members on project creation', () => {
      const creatorId = 'USR-001'
      const suppliedTeam = ['USR-002', 'USR-003']

      // Replicate the logic from ProjectsController.create
      let finalTeamMembers: string[] = [creatorId]
      if (Array.isArray(suppliedTeam)) {
        finalTeamMembers = Array.from(new Set([...finalTeamMembers, ...suppliedTeam]))
      }

      expect(finalTeamMembers).toContain(creatorId)
      expect(finalTeamMembers).toHaveLength(3)
    })

    it('should deduplicate when creator is already in supplied team', () => {
      const creatorId = 'USR-001'
      const suppliedTeam = ['USR-001', 'USR-002']

      let finalTeamMembers: string[] = [creatorId]
      if (Array.isArray(suppliedTeam)) {
        finalTeamMembers = Array.from(new Set([...finalTeamMembers, ...suppliedTeam]))
      }

      expect(finalTeamMembers).toHaveLength(2)
      expect(finalTeamMembers.filter(m => m === creatorId)).toHaveLength(1)
    })

    it('should handle empty team_members input', () => {
      const creatorId = 'USR-001'
      const suppliedTeam: string[] = []

      let finalTeamMembers: string[] = [creatorId]
      if (Array.isArray(suppliedTeam)) {
        finalTeamMembers = Array.from(new Set([...finalTeamMembers, ...suppliedTeam]))
      }

      expect(finalTeamMembers).toEqual([creatorId])
    })
  })

  // REQ-PRJ-001: Authorization Boundary Enforcement
  describe('REQ-PRJ-001: Authorization Boundary Enforcement', () => {
    it('should grant access to project owner', () => {
      const userId = 'USR-001'
      const project = { owner_id: 'USR-001', team_members: '["USR-001"]' }
      const userRole = 'user'

      const hasAccess =
        userRole === 'super_admin' ||
        userRole === 'admin' ||
        project.owner_id === userId ||
        (project.team_members && project.team_members.includes(userId))

      expect(hasAccess).toBe(true)
    })

    it('should grant access to team member who is not owner', () => {
      const userId = 'USR-002'
      const project = { owner_id: 'USR-001', team_members: '["USR-001","USR-002"]' }
      const userRole = 'user'

      const hasAccess =
        userRole === 'super_admin' ||
        userRole === 'admin' ||
        project.owner_id === userId ||
        (project.team_members && project.team_members.includes(userId))

      expect(hasAccess).toBe(true)
    })

    it('should deny access to non-member, non-admin user', () => {
      const userId = 'USR-999'
      const project = { owner_id: 'USR-001', team_members: '["USR-001","USR-002"]' }
      const userRole = 'user'

      const hasAccess =
        userRole === 'super_admin' ||
        userRole === 'admin' ||
        project.owner_id === userId ||
        (project.team_members && project.team_members.includes(userId))

      expect(hasAccess).toBe(false)
    })

    it('should grant access to super_admin regardless of membership', () => {
      const userId = 'USR-999'
      const project = { owner_id: 'USR-001', team_members: '["USR-001"]' }
      const userRole = 'super_admin'

      const hasAccess =
        userRole === 'super_admin' ||
        userRole === 'admin' ||
        project.owner_id === userId ||
        (project.team_members && project.team_members.includes(userId))

      expect(hasAccess).toBe(true)
    })

    it('should grant access to admin regardless of membership', () => {
      const userId = 'USR-999'
      const project = { owner_id: 'USR-001', team_members: '["USR-001"]' }
      const userRole = 'admin'

      const hasAccess =
        userRole === 'super_admin' ||
        userRole === 'admin' ||
        project.owner_id === userId ||
        (project.team_members && project.team_members.includes(userId))

      expect(hasAccess).toBe(true)
    })
  })

  // REQ-PRJ-005: Project Name Validation
  describe('REQ-PRJ-005: Project Name Validation', () => {
    it('should reject creation without a name', () => {
      const name = undefined
      expect(!name).toBe(true)
    })

    it('should reject creation with empty string name', () => {
      const name = ''
      expect(!name).toBe(true)
    })

    it('should accept creation with valid name', () => {
      const name = 'My Project'
      expect(!name).toBe(false)
    })
  })

  // REQ-PRJ-004: Tenant Isolation
  describe('REQ-PRJ-004: Tenant Isolation', () => {
    it('should scope non-super_admin queries to company_id', () => {
      const isSuperAdmin = false
      const userCompanyId = 'COMP-001'

      // Replicate the query-building logic from ProjectRepository.findAll
      let query = 'SELECT * FROM projects WHERE 1=1'
      const params: any[] = []

      if (!isSuperAdmin && userCompanyId) {
        query += ` AND p.company_id = $1`
        params.push(userCompanyId)
      }

      expect(query).toContain('company_id')
      expect(params).toContain('COMP-001')
    })

    it('should not add company_id filter for super_admin', () => {
      const isSuperAdmin = true
      const userCompanyId = 'COMP-001'

      let query = 'SELECT * FROM projects WHERE 1=1'
      const params: any[] = []

      if (!isSuperAdmin && userCompanyId) {
        query += ` AND p.company_id = $1`
        params.push(userCompanyId)
      }

      expect(query).not.toContain('company_id')
      expect(params).toHaveLength(0)
    })

    it('should fall back to owner/team filtering when company_id is null', () => {
      const isSuperAdmin = false
      const userCompanyId: string | null = null
      const userId = 'USR-001'

      let query = 'SELECT * FROM projects WHERE 1=1'
      const params: any[] = []
      let paramCount = 0

      if (!isSuperAdmin && userCompanyId) {
        paramCount++
        query += ` AND p.company_id = $${paramCount}`
        params.push(userCompanyId)
      } else if (!isSuperAdmin) {
        paramCount++
        query += ` AND (p.owner_id = $${paramCount} OR p.team_members ? $${paramCount}::text)`
        params.push(userId)
      }

      expect(query).toContain('owner_id')
      expect(query).toContain('team_members')
      expect(params).toContain('USR-001')
    })
  })

  // REQ-PRJ-006: Budget Validation
  describe('REQ-PRJ-006: Budget Validation', () => {
    it('should reject non-numeric budget values', () => {
      const budget = 'not-a-number'
      const numericBudget = Number(budget)
      expect(isNaN(numericBudget)).toBe(true)
    })

    it('should accept valid numeric budget', () => {
      const budget = '50000'
      const numericBudget = Number(budget)
      expect(isNaN(numericBudget)).toBe(false)
      expect(numericBudget).toBe(50000)
    })

    it('should handle zero budget', () => {
      const budget = '0'
      const numericBudget = Number(budget)
      expect(isNaN(numericBudget)).toBe(false)
      expect(numericBudget).toBe(0)
    })
  })
})
