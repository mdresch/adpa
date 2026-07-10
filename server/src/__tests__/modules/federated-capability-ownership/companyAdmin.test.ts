import { Pool } from 'pg';
import { CompanyRepository } from '../../../modules/identity/CompanyRepository';
import { AuthRepository } from '../../../modules/auth/AuthRepository';

function fakePool(rows: any[] = [{ id: 'company-1' }]) {
  return { query: jest.fn().mockResolvedValue({ rows }) } as unknown as Pool;
}

describe('federated-capability-ownership: company creation captures created_by', () => {
  // REQ-DEPT-006: CompanyRepository.create captures created_by
  describe('REQ-DEPT-006: CompanyRepository.create captures created_by', () => {
    it('includes created_by in the INSERT statement and passes the creating user id as a param', async () => {
      const pool = fakePool();
      const repo = new CompanyRepository(pool);

      await repo.create({ id: 'company-1', name: 'Acme', created_by: 'user-123' });

      const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/created_by/i);
      expect(params).toContain('user-123');
    });
  });

  // REQ-DEPT-008: fix require('uuid') ESM crash discovered while writing REQ-DEPT-006.
  // uuid@14 is ESM-only and breaks under run-governed-features.mjs's --experimental-vm-modules
  // flag regardless of require-vs-import syntax, so this uses crypto.randomUUID() instead.
  describe("REQ-DEPT-008: create() does not crash when id is omitted", () => {
    it('generates a valid UUID v4 id via crypto.randomUUID(), not the uuid package', async () => {
      const pool = fakePool();
      const repo = new CompanyRepository(pool);

      await repo.create({ name: 'Acme', created_by: 'user-123' });

      const [, params] = (pool.query as jest.Mock).mock.calls[0];
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(UUID_RE.test(params[0])).toBe(true);
    });
  });

  // REQ-DEPT-007: AuthRepository.createCompany captures created_by
  describe('REQ-DEPT-007: AuthRepository.createCompany captures created_by', () => {
    it('includes created_by in the INSERT statement and passes the creating user id as a param', async () => {
      const pool = fakePool([{ id: 'company-1' }]);
      const repo = new AuthRepository(pool);

      await repo.createCompany({ id: 'company-1', name: 'Acme', created_by: 'user-123' });

      const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/created_by/i);
      expect(params).toContain('user-123');
    });
  });

  // REQ-DEPT-009: createUser accepts a caller-supplied id, so it can be reused as a new
  // company's created_by — companies.created_by references users(id) while users.company_id
  // references companies(id), a circular FK no single insert order alone can satisfy.
  describe('REQ-DEPT-009: AuthRepository.createUser persists a caller-supplied id', () => {
    it('uses the supplied id instead of generating a new one', async () => {
      const pool = fakePool([{ id: 'user-123' }]);
      const repo = new AuthRepository(pool);

      await repo.createUser({
        id: 'user-123',
        email: 'a@b.com',
        password_hash: 'hash',
        name: 'A',
        role: 'admin',
        permissions: '{}'
      });

      const [, params] = (pool.query as jest.Mock).mock.calls[0];
      expect(params).toContain('user-123');
    });

    it('still generates a valid id when the caller omits one', async () => {
      const pool = fakePool([{ id: 'generated' }]);
      const repo = new AuthRepository(pool);

      await repo.createUser({
        email: 'a@b.com',
        password_hash: 'hash',
        name: 'A',
        role: 'user',
        permissions: '{}'
      });

      const [, params] = (pool.query as jest.Mock).mock.calls[0];
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(UUID_RE.test(params[0])).toBe(true);
    });
  });

  // REQ-DEPT-010: setCompanyCreatedBy back-fills created_by once the user row exists
  describe('REQ-DEPT-010: AuthRepository.setCompanyCreatedBy back-fills created_by', () => {
    it('issues an UPDATE setting created_by for the given company id', async () => {
      const pool = fakePool();
      const repo = new AuthRepository(pool);

      await repo.setCompanyCreatedBy('company-1', 'user-123');

      const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/UPDATE companies/i);
      expect(sql).toMatch(/created_by/i);
      expect(params).toEqual(['user-123', 'company-1']);
    });
  });
});
