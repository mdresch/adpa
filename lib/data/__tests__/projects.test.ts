import { ProjectService } from '../projects';
import { sql } from '@vercel/postgres';
import { CacheService } from '@/lib/kv';

// Mock the dependencies
jest.mock('@vercel/postgres', () => ({
  sql: {
    query: jest.fn(),
  },
}));

jest.mock('@/lib/kv', () => ({
  CacheService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delByPattern: jest.fn(),
  },
}));

describe('ProjectService', () => {
  const mockUserId = 'user-123';
  const mockProjectId = 'project-123';
  const mockMemberId = 'member-456';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjects', () => {
    it('should return cached projects if available', async () => {
      const mockProjects = [{ id: 'project-1', name: 'Test Project' }];
      (CacheService.get as jest.Mock).mockResolvedValue(mockProjects);
      
      const result = await ProjectService.getProjects(mockUserId);
      
      expect(CacheService.get).toHaveBeenCalledWith(`projects:user:${mockUserId}`);
      expect(sql.query).not.toHaveBeenCalled();
      expect(result).toEqual(mockProjects);
    });

    it('should query database and cache results if cache miss', async () => {
      const mockProjects = [{ id: 'project-1', name: 'Test Project' }];
      (CacheService.get as jest.Mock).mockResolvedValue(null);
      (sql.query as jest.Mock).mockResolvedValue({ rows: mockProjects });
      
      const result = await ProjectService.getProjects(mockUserId);
      
      expect(CacheService.get).toHaveBeenCalledWith(`projects:user:${mockUserId}`);
      expect(sql.query).toHaveBeenCalled();
      expect(CacheService.set).toHaveBeenCalledWith(`projects:user:${mockUserId}`, mockProjects, 600);
      expect(result).toEqual(mockProjects);
    });

    it('should apply filters to the query when provided', async () => {
      const mockProjects = [{ id: 'project-1', name: 'Test Project' }];
      const filters = { status: 'active', framework: 'next', search: 'test' };
      (CacheService.get as jest.Mock).mockResolvedValue(null);
      (sql.query as jest.Mock).mockResolvedValue({ rows: mockProjects });
      
      await ProjectService.getProjects(mockUserId, filters);
      
      expect(CacheService.get).toHaveBeenCalledWith(`projects:user:${mockUserId}:status:active:framework:next:search:test`);
      expect(sql.query).toHaveBeenCalled();
      // Verify that the query includes filter conditions
      const queryCall = (sql.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('p.status = $2');
      expect(queryCall[0]).toContain('p.framework = $3');
      expect(queryCall[0]).toContain('(p.name ILIKE $4 OR p.description ILIKE $4)');
    });
  });

  describe('getProjectById', () => {
    it('should return cached project if available', async () => {
      const mockProject = { id: mockProjectId, name: 'Test Project' };
      (CacheService.get as jest.Mock).mockResolvedValue(mockProject);
      
      const result = await ProjectService.getProjectById(mockProjectId, mockUserId);
      
      expect(CacheService.get).toHaveBeenCalledWith(`project:${mockProjectId}`);
      expect(sql.query).not.toHaveBeenCalled();
      expect(result).toEqual(mockProject);
    });

    it('should query database and cache results if cache miss', async () => {
      const mockProject = { id: mockProjectId, name: 'Test Project' };
      (CacheService.get as jest.Mock).mockResolvedValue(null);
      (sql.query as jest.Mock).mockResolvedValue({ rows: [mockProject] });
      
      const result = await ProjectService.getProjectById(mockProjectId, mockUserId);
      
      expect(CacheService.get).toHaveBeenCalledWith(`project:${mockProjectId}`);
      expect(sql.query).toHaveBeenCalled();
      expect(CacheService.set).toHaveBeenCalledWith(`project:${mockProjectId}`, mockProject, 600);
      expect(result).toEqual(mockProject);
    });

    it('should return null if project not found', async () => {
      (CacheService.get as jest.Mock).mockResolvedValue(null);
      (sql.query as jest.Mock).mockResolvedValue({ rows: [] });
      
      const result = await ProjectService.getProjectById(mockProjectId, mockUserId);
      
      expect(result).toBeNull();
    });
  });

  describe('createProject', () => {
    it('should create a project and invalidate cache', async () => {
      const mockProject = { 
        name: 'New Project', 
        framework: 'next',
        description: 'Test description'
      };
      const createdProject = { ...mockProject, id: mockProjectId };
      
      (sql.query as jest.Mock).mockResolvedValue({ rows: [createdProject] });
      
      const result = await ProjectService.createProject(mockProject, mockUserId);
      
      expect(sql.query).toHaveBeenCalled();
      expect(CacheService.delByPattern).toHaveBeenCalledWith(`projects:user:${mockUserId}*`);
      expect(result).toEqual(createdProject);
    });

    it('should throw error if required fields are missing', async () => {
      const mockProject = { description: 'Test description' };
      
      await expect(ProjectService.createProject(mockProject, mockUserId))
        .rejects.toThrow('Project name and framework are required');
      
      expect(sql.query).not.toHaveBeenCalled();
    });
  });

  describe('updateProject', () => {
    const mockProject = { 
      id: mockProjectId, 
      name: 'Test Project',
      owner_id: mockUserId,
      team_members: []
    };

    it('should update a project and invalidate cache', async () => {
      const updates = { name: 'Updated Project' };
      const updatedProject = { ...mockProject, ...updates };
      
      (ProjectService.getProjectById as jest.Mock) = jest.fn().mockResolvedValue(mockProject);
      (sql.query as jest.Mock).mockResolvedValue({ rows: [updatedProject] });
      
      const result = await ProjectService.updateProject(mockProjectId, updates, mockUserId);
      
      expect(sql.query).toHaveBeenCalled();
      expect(CacheService.del).toHaveBeenCalledWith(`project:${mockProjectId}`);
      expect(CacheService.delByPattern).toHaveBeenCalledWith(`projects:user:${mockUserId}*`);
      expect(result).toEqual(updatedProject);
    });
  });

  describe('addTeamMember', () => {
    const mockProject = { 
      id: mockProjectId, 
      name: 'Test Project',
      owner_id: mockUserId,
      team_members: []
    };

    it('should add a team member to a project', async () => {
      const updatedProject = { 
        ...mockProject, 
        team_members: [mockMemberId]
      };
      
      (ProjectService.getProjectById as jest.Mock) = jest.fn().mockResolvedValue(mockProject);
      (ProjectService as any).userExists = jest.fn().mockResolvedValue(true);
      (ProjectService as any).isUserAdmin = jest.fn().mockResolvedValue(false);
      (sql.query as jest.Mock).mockResolvedValue({ rows: [updatedProject] });
      
      const result = await ProjectService.addTeamMember(mockProjectId, mockUserId, mockMemberId);
      
      expect(sql.query).toHaveBeenCalled();
      expect(CacheService.del).toHaveBeenCalledWith(`project:${mockProjectId}`);
      expect(CacheService.delByPattern).toHaveBeenCalledWith(`projects:user:${mockUserId}*`);
      expect(CacheService.delByPattern).toHaveBeenCalledWith(`projects:user:${mockMemberId}*`);
      expect(result).toEqual(updatedProject);
    });
  });

  describe('removeTeamMember', () => {
    const mockProject = { 
      id: mockProjectId, 
      name: 'Test Project',
      owner_id: mockUserId,
      team_members: [mockMemberId]
    };

    it('should remove a team member from a project', async () => {
      const updatedProject = { 
        ...mockProject, 
        team_members: []
      };
      
      (ProjectService.getProjectById as jest.Mock) = jest.fn().mockResolvedValue(mockProject);
      (ProjectService as any).isUserAdmin = jest.fn().mockResolvedValue(false);
      (sql.query as jest.Mock).mockResolvedValue({ rows: [updatedProject] });
      
      const result = await ProjectService.removeTeamMember(mockProjectId, mockUserId, mockMemberId);
      
      expect(sql.query).toHaveBeenCalled();
      expect(CacheService.del).toHaveBeenCalledWith(`project:${mockProjectId}`);
      expect(CacheService.delByPattern).toHaveBeenCalledWith(`projects:user:${mockUserId}*`);
      expect(CacheService.delByPattern).toHaveBeenCalledWith(`projects:user:${mockMemberId}*`);
      expect(result).toEqual(updatedProject);
    });
  });

  describe('getProjectTeamMembers', () => {
    const mockProject = { 
      id: mockProjectId, 
      name: 'Test Project',
      owner_id: mockUserId,
      team_members: [mockMemberId]
    };

    it('should return team members for a project', async () => {
      const mockTeamMembers = [{ id: mockMemberId, name: 'Team Member' }];
      
      (ProjectService.getProjectById as jest.Mock) = jest.fn().mockResolvedValue(mockProject);
      (sql.query as jest.Mock).mockResolvedValue({ rows: mockTeamMembers });
      
      const result = await ProjectService.getProjectTeamMembers(mockProjectId, mockUserId);
      
      expect(sql.query).toHaveBeenCalled();
      expect(result).toEqual(mockTeamMembers);
    });

    it('should return empty array if no team members', async () => {
      const projectWithNoTeam = { ...mockProject, team_members: [] };
      
      (ProjectService.getProjectById as jest.Mock) = jest.fn().mockResolvedValue(projectWithNoTeam);
      
      const result = await ProjectService.getProjectTeamMembers(mockProjectId, mockUserId);
      
      expect(sql.query).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});