/**
 * Development Approach Service Tests
 * Purpose: Unit tests for development approach service
 * Domain: Development Approach & Life Cycle Performance Domain
 * Created: January 15, 2026
 */

import { pool } from '../../../database/connection';
import * as developmentApproachService from '../developmentApproachService';
import { DevelopmentApproach } from '../types';
import { validateDevelopmentApproach } from '../validation';

// Mock the database pool
jest.mock('../../../database/connection', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Development Approach Service', () => {
  const mockApproach: DevelopmentApproach = {
    id: 'd4f0a2a0-0b1b-4c4c-8d8d-0e0e0e0e0e0e',
    project_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    approach: 'hybrid',
    methodology: 'safe',
    justification: 'Selected hybrid approach due to mixed requirements stability. This provides the right balance between predictive planning for infrastructure components and agile flexibility for application development, allowing us to meet regulatory requirements while maintaining delivery velocity.',
    uncertainty_level: 'medium',
    requirements_stability: 'evolving',
    stakeholder_engagement_model: 'continuous',
    delivery_cadence: 'incremental',
    organizational_maturity: 'medium',
    team_experience_level: 'mixed',
    regulatory_constraints: true,
    tailoring_decisions: [
      {
        area: 'Change Control',
        standard_process: 'Formal CCB',
        tailored_process: 'Agile backlog management',
        justification: 'Reduce bureaucracy for Agile components'
      }
    ],
    life_cycle_phases: ['Initiation', 'Planning', 'Execution', 'Closure'],
    iteration_length: 2,
    iteration_unit: 'weeks',
    governance_approach: 'standard',
    review_gates: ['PI Planning', 'Sprint Review'],
    source_document_id: 'd4f0a2a0-0b1b-4c4c-8d8d-0e0e0e0e0e0e',
    defined_by: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    approved_by: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    effective_date: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDevelopmentApproach', () => {
    it('should return development approach for a project', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockApproach] });
      
      const result = await developmentApproachService.getDevelopmentApproach('test-project');
      
      expect(result).toEqual(mockApproach);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM development_approach WHERE project_id = $1',
        ['test-project']
      );
    });

    it('should return null if no approach found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
      
      const result = await developmentApproachService.getDevelopmentApproach('test-project');
      
      expect(result).toBeNull();
    });
  });

  describe('upsertDevelopmentApproach', () => {
    it('should create development approach for a project', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockApproach] }) // First call: insert
        .mockResolvedValueOnce({ rows: [{}] }); // Second call: update project
      
      const result = await developmentApproachService.upsertDevelopmentApproach(
        'test-project',
        mockApproach,
        'user-123'
      );
      
      expect(result).toEqual(mockApproach);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should update existing development approach', async () => {
      const updatedApproach = { 
        ...mockApproach, 
        justification: 'Updated justification with more than 50 characters to meet validation requirements.'
      };
      
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [updatedApproach] }) // Update
        .mockResolvedValueOnce({ rows: [{}] }); // Update project
      
      const result = await developmentApproachService.upsertDevelopmentApproach(
        'test-project',
        updatedApproach,
        'user-123'
      );
      
      expect(result).toEqual(updatedApproach);
    });
  });

  describe('deleteDevelopmentApproach', () => {
    it('should delete development approach for a project', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{}] }) // Delete from development_approach
        .mockResolvedValueOnce({ rows: [{}] }); // Update project
      
      await developmentApproachService.deleteDevelopmentApproach('test-project');
      
      expect(pool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('getDevelopmentApproachById', () => {
    it('should return development approach by ID', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockApproach] });
      
      const result = await developmentApproachService.getDevelopmentApproachById('test-id');
      
      expect(result).toEqual(mockApproach);
    });
  });

  describe('listDevelopmentApproaches', () => {
    it('should list development approaches with filters', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockApproach] });
      
      const result = await developmentApproachService.listDevelopmentApproaches({
        approach: 'hybrid',
        limit: 10
      });
      
      expect(result).toEqual([mockApproach]);
    });
  });

  describe('getDevelopmentApproachStatistics', () => {
    it('should return statistics', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ approach: 'hybrid', count: '5' }] }) // by approach
        .mockResolvedValueOnce({ rows: [{ methodology: 'safe', count: '3' }] }) // by methodology
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // total projects
        .mockResolvedValueOnce({ rows: [{ count: '50' }] }); // projects with approach
      
      const stats = await developmentApproachService.getDevelopmentApproachStatistics();
      
      expect(stats).toEqual({
        byApproach: { hybrid: 5 },
        byMethodology: { safe: 3 },
        totalProjects: 100,
        projectsWithApproach: 50
      });
    });
  });
});

describe('Validation', () => {
  it('should validate development approach data', () => {
    const validData: Partial<DevelopmentApproach> = {
      approach: 'hybrid',
      methodology: 'safe',
      justification: 'This is a valid justification with more than 50 characters to meet the validation requirements.',
      delivery_cadence: 'incremental',
      governance_approach: 'standard'
    };
    
    const result = validateDevelopmentApproach(validData);
    
    expect(result).toHaveProperty('approach', 'hybrid');
  });

  it('should throw error for invalid approach', () => {
    const invalidData: Partial<DevelopmentApproach> = {
      approach: 'invalid' as any,
      methodology: 'safe',
      justification: 'This is a valid justification with more than 50 characters to meet the validation requirements.',
      delivery_cadence: 'incremental',
      governance_approach: 'standard'
    };
    
    expect(() => validateDevelopmentApproach(invalidData)).toThrow();
  });
});