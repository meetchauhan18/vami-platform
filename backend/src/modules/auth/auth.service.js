import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import config from '../../shared/config/index.js';
import logger from '../../shared/utils/logger.js';
import { createBreaker } from '../../shared/utils/circuit-breaker.js';
import { AuthError, ConflictError } from '../../shared/errors/AppError.js';
import { authAttempts } from '../../shared/utils/metrics.js';

import userRepository from '../../shared/repositories/user.repository.js';
import refreshTokenRepository from '../../shared/repositories/refresh-token.repository.js';

/**
 * Hash password using bcrypt
 * @param {string} plainPassword
 * @returns {Promise<string>}
 */
const hashPassword = async plainPassword => {
  const saltRounds = config.bcrypt.rounds;
  return bcrypt.hash(plainPassword, saltRounds);
};

/**
 * Compare password with hash
 * @param {string} plainPassword
 * @param {string} passwordHash
 * @returns {Promise<boolean>}
 */
const verifyPassword = async (plainPassword, passwordHash) => {
  return bcrypt.compare(plainPassword, passwordHash);
};

/**
 * Generate JWT access token
 * @param {Object} user
 * @returns {string}
 */
const generateAccessToken = user => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry }
  );
};

/**
 * Generate JWT refresh token
 * @param {Object} user
 * @param {Object} deviceInfo
 * @returns {Promise<string>}
 */
const generateRefreshToken = async (user, deviceInfo = {}) => {
  const token = jwt.sign(
    {
      userId: user._id.toString(),
      tokenType: 'refresh',
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
  );

  // Hash token before storing (security best practice)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Store token record in database
  await refreshTokenRepository.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + config.jwt.refreshExpiryMs),
    deviceInfo,
  });

  return token;
};

/**
 * Register a new user
 * @param {Object} payload
 * @returns {Promise<Object>} { user, accessToken, refreshToken }
 */
const registerUser = async payload => {
  const { email, username, password, firstName, lastName } = payload;

  // Check duplicates (with circuit breaker)
  const checkDuplicates = createBreaker(
    async () => userRepository.findByEmailOrUsername(email, username),
    'checkDuplicateUser'
  );

  const existing = await checkDuplicates.fire();

  if (existing) {
    const conflictField =
      existing.email === email.toLowerCase() ? 'email' : 'username';
    authAttempts.inc({ type: 'register', status: 'conflict' });
    throw new ConflictError(conflictField);
  }

  const passwordHash = await hashPassword(password);

  const user = await userRepository.create({
    email,
    username,
    passwordHash,
    profile: {
      firstName,
      lastName,
    },
  });

  logger.info('User registered', { userId: user._id });
  authAttempts.inc({ type: 'register', status: 'success' });

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  return { user, accessToken, refreshToken };
};

/**
 * Login user with email or username
 * @param {Object} payload
 * @returns {Promise<Object>} { user, accessToken, refreshToken }
 */
const loginUser = async payload => {
  const { identifier, password } = payload;

  const user = await userRepository.findByEmailOrUsername(
    identifier,
    identifier
  );

  // Generic error (don't leak which field is wrong)
  const invalidCredsError = new AuthError(
    'Invalid credentials',
    'AUTH_INVALID'
  );

  if (!user) {
    authAttempts.inc({ type: 'login', status: 'failed' });
    throw invalidCredsError;
  }

  if (user.status !== 'active') {
    authAttempts.inc({ type: 'login', status: 'forbidden' });
    throw new AuthError('Account is not active', 'AUTH_FORBIDDEN');
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    authAttempts.inc({ type: 'login', status: 'failed' });
    throw invalidCredsError;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  logger.info('User logged in', { userId: user._id });
  authAttempts.inc({ type: 'login', status: 'success' });

  return { user, accessToken, refreshToken };
};

/**
 * Logout user (revoke refresh token)
 * @param {string} refreshToken
 * @returns {Promise<void>}
 */
const logoutUser = async refreshToken => {
  if (!refreshToken) {
    throw new AuthError('Refresh token required', 'AUTH_REQUIRED');
  }

  try {
    // Verify token format is valid
    jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch (e) {
    throw new AuthError('Invalid refresh token', 'AUTH_INVALID');
  }

  // Hash token and revoke
  const tokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');
  await refreshTokenRepository.revoke(tokenHash);

  logger.info('User logged out');
  authAttempts.inc({ type: 'logout', status: 'success' });
};

export default {
  registerUser,
  loginUser,
  logoutUser,
};
