import { UserService } from '../users';
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

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return users from cache if available', async () => {
      const mockCachedUsers = {
        users: [{ id: '1', name: 'Test User' }],
        total: 1,
        page: 1,
        limit: 50,
      };
      
      (CacheService.get as jest.Mock).mockResolvedValue(mockCachedUsers);
      
      const result = await UserService.getUsers();
      
      expect(result).toEqual(mockCachedUsers);
      expect(CacheService.get).toHaveBeenCalled();
      expect(sql.query).not.toHaveBeenCalled();
    });

    it('should query database and cache results if cache is empty', async () => {
      (CacheService.get as jest.Mock).mockResolvedValue(null);
      
      const mockCountResult = { rows: [{ total: '2' }] };
      const mockUsersResult = {
        rows: [
          { id: '1', name: 'User 1', password_hash: 'hash1' },
          { id: '2', name: 'User 2', password_hash: 'hash2' },
        ],
      };
      
      (sql.query as jest.Mock).mockImplementation((query) => {
        if (query.includes('COUNT(*)')) {
          return mockCountResult;
        }
        return mockUsersResult;
      });
      
      const result = await UserService.getUsers();
      
      expect(result.users).toHaveLength(2);
      expect(result.users[0]).not.toHaveProperty('password_hash');
      expect(result.total).toBe(2);
      expect(CacheService.set).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      (CacheService.get as jest.Mock).mockResolvedValue(null);
      
      const mockCountResult = { rows: [{ total: '1' }] };
      const mockUsersResult = {
        rows: [
          { id: '1', name: 'Admin User', role: 'admin', password_hash: 'hash' },
        ],
      };
      
      (sql.query as jest.Mock).mockImplementation((query, params) => {
        if (query.includes('COUNT(*)')) {
          return mockCountResult;
        }
        return mockUsersResult;
      });
      
      await UserService.getUsers({ role: 'admin', search: 'Admin' });
      
      expect(sql.query).toHaveBeenCalledTimes(2);
      const queryCall = (sql.query as jest.Mock).mock.calls[1][0];
      const paramsCall = (sql.query as jest.Mock).mock.calls[1][1];
      
      expect(queryCall).toContain('WHERE');
      expect(queryCall).toContain('role =');
      expect(queryCall).toContain('ILIKE');
      expect(paramsCall).toContain('admin');
      expect(paramsCall).toContain('%Admin%');
    });
  });

  describe('getUserById', () => {
    it('should return user from cache if available', async () => {
      const mockCachedUser = { id: '1', name: 'Test User' };
      
      (CacheService.get as jest.Mock).mockResolvedValue(mockCachedUser);
      
      const result = await UserService.getUserById('1');
      
      expect(result).toEqual(mockCachedUser);
      expect(CacheService.get).toHaveBeenCalledWith('user:1');
      expect(sql.query).not.toHaveBeenCalled();
    });

    it('should query database and cache results if cache is empty', async () => {
      (CacheService.get as jest.Mock).mockResolvedValue(null);
      
      const mockUserResult = {
        rows: [{ id: '1', name: 'Test User', password_hash: 'hash' }],
      };
      
      (sql.query as jest.Mock).mockResolvedValue(mockUserResult);
      
      const result = await UserService.getUserById('1');
      
      expect(result).toHaveProperty('id', '1');
      expect(result).not.toHaveProperty('password_hash');
      expect(CacheService.set).toHaveBeenCalled();
    });

    it('should return null if user not found', async () => {
      (CacheService.get as jest.Mock).mockResolvedValue(null);
      
      const mockUserResult = { rows: [] };
      
      (sql.query as jest.Mock).mockResolvedValue(mockUserResult);
      
      const result = await UserService.getUserById('999');
      
      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create a new user and invalidate cache', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      };
      
      (UserService.getUserByEmail as jest.Mock) = jest.fn().mockResolvedValue(null);
      
      const mockResult = {
        rows: [{ id: '1', ...userData, password_hash: 'hash' }],
      };
      
      (sql.query as jest.Mock).mockResolvedValue(mockResult);
      
      const result = await UserService.createUser(userData);
      
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).not.toHaveProperty('password_hash');
      expect(CacheService.delByPattern).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        name: 'Test User',
      };
      
      (UserService.getUserByEmail as jest.Mock) = jest.fn().mockResolvedValue({ id: '2', email: 'existing@example.com' });
      
      await expect(UserService.createUser(userData)).rejects.toThrow('Email already in use');
    });

    it('should validate user data', async () => {
      const userData = {
        email: 'invalid-email',
        name: 'T',
        role: 'invalid-role',
      };
      
      await expect(UserService.createUser(userData)).rejects.toThrow('Invalid user data');
    });
  });

  describe('updateUser', () => {
    it('should update user and invalidate cache', async () => {
      const userId = '1';
      const updates = {
        name: 'Updated Name',
        role: 'admin',
      };
      
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Old Name',
        role: 'user',
      };
      
      (UserService.getUserById as jest.Mock) = jest.fn().mockResolvedValue(existingUser);
      
      const mockResult = {
        rows: [{ id: userId, ...existingUser, ...updates, password_hash: 'hash' }],
      };
      
      (sql.query as jest.Mock).mockResolvedValue(mockResult);
      
      const result = await UserService.updateUser(userId, updates);
      
      expect(result).toHaveProperty('name', 'Updated Name');
      expect(result).toHaveProperty('role', 'admin');
      expect(CacheService.del).toHaveBeenCalledWith(`user:${userId}`);
      expect(CacheService.delByPattern).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      (UserService.getUserById as jest.Mock) = jest.fn().mockResolvedValue(null);
      
      await expect(UserService.updateUser('999', { name: 'New Name' })).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should delete user and invalidate cache', async () => {
      const userId = '1';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        role: 'user',
      };
      
      (UserService.getUserById as jest.Mock) = jest.fn().mockResolvedValue(existingUser);
      
      (sql.query as jest.Mock).mockResolvedValue({ rows: [] });
      
      const result = await UserService.deleteUser(userId);
      
      expect(result).toBe(true);
      expect(CacheService.del).toHaveBeenCalledWith(`user:${userId}`);
      expect(CacheService.del).toHaveBeenCalledWith(`users:email:${existingUser.email}`);
      expect(CacheService.delByPattern).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      (UserService.getUserById as jest.Mock) = jest.fn().mockResolvedValue(null);
      
      await expect(UserService.deleteUser('999')).rejects.toThrow('User not found');
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate user with valid credentials', async () => {
      const mockUserResult = {
        rows: [{
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          password_hash: 'valid_hash',
          role: 'user',
        }],
      };
      
      (sql.query as jest.Mock).mockImplementation((query) => {
        if (query.includes('UPDATE')) {
          return { rows: [] };
        }
        return mockUserResult;
      });
      
      const result = await UserService.authenticateUser('test@example.com', 'password');
      
      expect(result).toHaveProperty('id', '1');
      expect(result).not.toHaveProperty('password_hash');
      expect(sql.query).toHaveBeenCalledTimes(2); // Select and update queries
    });

    it('should throw error with invalid credentials', async () => {
      (sql.query as jest.Mock).mockResolvedValue({ rows: [] });
      
      await expect(UserService.authenticateUser('wrong@example.com', 'password')).rejects.toThrow('Invalid credentials');
    });
  });
});