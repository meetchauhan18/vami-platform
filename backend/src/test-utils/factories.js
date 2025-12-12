import User from '../shared/models/User.model.js';
import RefreshToken from '../shared/models/RefreshToken.model.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Create test user
 * @param {Object} overrides - Override default values
 * @returns {Promise<Object>}
 */
export const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    email: `test.${Date.now()}@example.com`,
    username: `testuser${Date.now()}`,
    passwordHash: await bcrypt.hash('Password123!@#', 10),
    profile: {
      firstName: 'Test',
      lastName: 'User',
    },
    status: 'active',
    role: 'user',
  };

  return User.create({ ...defaultUser, ...overrides });
};

/**
 * Create test refresh token
 * @param {string} userId
 * @param {Object} overrides
 * @returns {Promise<Object>}
 */
export const createTestRefreshToken = async (userId, overrides = {}) => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const defaultToken = {
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    revokedAt: null,
  };

  const record = await RefreshToken.create({ ...defaultToken, ...overrides });

  return { token, record };
};

/**
 * Mock logger (to avoid console spam in tests)
 */
export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  stream: { write: jest.fn() },
};

/**
 * Mock config
 */
export const mockConfig = {
  env: 'test',
  port: 5000,
  clientUrl: 'http://localhost:3000',
  jwt: {
    accessSecret: 'test-access-secret',
    refreshSecret: 'test-refresh-secret',
    accessExpiry: '24h',
    refreshExpiry: '7d',
    refreshExpiryMs: 7 * 24 * 60 * 60 * 1000,
  },
  bcrypt: {
    rounds: 10,
  },
};
