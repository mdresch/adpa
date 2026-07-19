import { Request, Response } from 'express';
import { UserDepartmentRepository } from './UserDepartmentRepository';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';
import { syncDepartmentMembershipChange, MembershipChangeDeps } from './departmentMembershipService';
import { createClaimsSyncQueueAdapter } from './claimsSyncQueueAdapter';
import { departmentClaimsSyncQueue } from '../../services/queue/queueClient';

/**
 * Composition root for department membership writes (ADR-005 Phase 0). Every
 * create/setActive call re-derives the membership-change deps and invokes
 * syncDepartmentMembershipChange, which persists a department_claims_sync_jobs
 * row and enqueues it — never calls Firebase Admin inline from this request path.
 */
export class UserDepartmentsController {
  private repository = new UserDepartmentRepository(pool);
  private logger = childLogger({ component: 'UserDepartmentsController' });

  private get syncDeps(): MembershipChangeDeps {
    return {
      db: { query: (sql: string, params?: any[]) => pool.query(sql, params) },
      queue: createClaimsSyncQueueAdapter(departmentClaimsSyncQueue)
    };
  }

  listByPortfolio = async (req: Request, res: Response) => {
    try {
      const { portfolioId } = req.params;
      const memberships = await this.repository.listByPortfolio(portfolioId);
      res.json({ memberships });
    } catch (error) {
      this.logger.error('List by portfolio error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  listByUser = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const requester = (req as any).user;
      const requesterRole = requester?.role?.toLowerCase();
      const isSelf = requester?.id === userId;
      const isAdmin = requesterRole === 'admin' || requesterRole === 'super_admin';
      if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const memberships = await this.repository.listByUser(userId);
      res.json({ memberships });
    } catch (error) {
      this.logger.error('List by user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { portfolioId, department, departmentRole } = req.body;
      if (!portfolioId || !department) {
        return res.status(400).json({ error: 'portfolioId and department are required' });
      }

      const membership = await this.repository.create({ userId, portfolioId, department, departmentRole });
      await syncDepartmentMembershipChange(this.syncDeps, { userId, wasActive: false, isActive: true });

      res.status(201).json({ membership });
    } catch (error) {
      this.logger.error('Create membership error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      const isConstraintViolation = /duplicate key|violates foreign key|violates check/i.test(message);
      res.status(isConstraintViolation ? 400 : 500).json({ error: isConstraintViolation ? message : 'Internal server error' });
    }
  };

  setActive = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive (boolean) is required' });
      }

      const { wasActive, row } = await this.repository.setActive(id, isActive);
      await syncDepartmentMembershipChange(this.syncDeps, { userId: row.userId, wasActive, isActive });

      res.json({ membership: row });
    } catch (error) {
      this.logger.error('Set active error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
