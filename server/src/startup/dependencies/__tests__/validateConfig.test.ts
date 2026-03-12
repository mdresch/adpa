import { validateSecurityConfig } from '../validateConfig';
import { logger } from '../../../utils/logger';

jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

describe('validateSecurityConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw an error in production if NODE_TLS_REJECT_UNAUTHORIZED is "0"', () => {
    process.env.NODE_ENV = 'production';
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    expect(() => validateSecurityConfig()).toThrow('CRITICAL SECURITY WARNING: NODE_TLS_REJECT_UNAUTHORIZED=0 is set in production. This bypasses TLS verification and is highly unsafe. Startup aborted.');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should pass in production if NODE_TLS_REJECT_UNAUTHORIZED is "1"', () => {
    process.env.NODE_ENV = 'production';
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

    expect(() => validateSecurityConfig()).not.toThrow();
  });

  it('should pass in production if NODE_TLS_REJECT_UNAUTHORIZED is undefined', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

    expect(() => validateSecurityConfig()).not.toThrow();
  });

  it('should pass in development if NODE_TLS_REJECT_UNAUTHORIZED is "0"', () => {
    process.env.NODE_ENV = 'development';
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    expect(() => validateSecurityConfig()).not.toThrow();
  });
});
