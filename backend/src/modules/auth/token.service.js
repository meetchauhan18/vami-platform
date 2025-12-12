import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import User from '../../shared/models/User.model.js';
import config from '../../shared/config/index.js';
import { AuthError } from '../../shared/errors/AppError.js';
import refreshTokenRepository from '../../shared/repositories/refresh-token.repository.js';
import logger from '../../shared/utils/logger.js';

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
 * Generate JWT refresh token and store hash
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

  // Hash token before storing
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await refreshTokenRepository.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + config.jwt.refreshExpiryMs),
    deviceInfo,
  });

  return token;
};

/**
 * Verify refresh token and issue new access + rotated refresh token
 * @param {string} refreshToken
 * @returns {Promise<Object>} { user, accessToken, refreshToken }
 */
const refreshTokens = async refreshToken => {
  if (!refreshToken) {
    throw new AuthError('Refresh token missing', 'AUTH_REQUIRED');
  }

  // 1. Verify JWT signature and expiration
  let payload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch (e) {
    throw new AuthError('Invalid or expired refresh token', 'AUTH_INVALID');
  }

  // 2. Check token type
  if (payload.tokenType !== 'refresh') {
    throw new AuthError('Invalid token type', 'AUTH_INVALID');
  }

  // 3. Hash token and check if it's been revoked
  const tokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');
  const tokenRecord = await refreshTokenRepository.findValidByHash(tokenHash);

  if (!tokenRecord) {
    throw new AuthError('Token has been revoked or expired', 'AUTH_INVALID');
  }

  // 4. Fetch user
  const user = await User.findById(payload.userId);
  if (!user || user.status !== 'active') {
    throw new AuthError('User not found or inactive', 'AUTH_FORBIDDEN');
  }

  // 5. Revoke old refresh token (rotation)
  await refreshTokenRepository.revoke(tokenHash);

  // 6. Generate new tokens
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = await generateRefreshToken(
    user,
    tokenRecord.deviceInfo
  );

  logger.info('Tokens refreshed', { userId: user._id });

  return {
    user,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export default {
  refreshTokens,
  generateAccessToken,
  generateRefreshToken,
};
