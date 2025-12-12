import jwt from 'jsonwebtoken';
import User from '../../shared/models/User.model.js';
import config from '../../shared/config/index.js';

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
 * Verify refresh token and issue new access (and rotated refresh) token
 */
const refreshTokens = async refreshToken => {
  if (!refreshToken) {
    const err = new Error('Refresh token missing');
    err.statusCode = 401;
    err.code = 'AUTH_REQUIRED';
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, config?.jwt?.refreshSecret);
  } catch (e) {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    err.code = 'AUTH_INVALID';
    throw err;
  }

  if (payload.tokenType !== 'refresh') {
    const err = new Error('Invalid token type');
    err.statusCode = 401;
    err.code = 'AUTH_INVALID';
    throw err;
  }

  const user = await User.findById(payload?.userId);
  if (!user || user.status !== 'active') {
    const err = new Error('User not found or inactive');
    err.statusCode = 403;
    err.code = 'AUTH_FORBIDDEN';
    throw err;
  }

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = jwt.sign(
    {
      userId: user?._id?.toString(),
      tokenType: 'refresh',
    },
    config?.jwt?.refreshSecret,
    { expiresIn: config?.jwt?.refreshExpiry }
  );

  return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export default {
  refreshTokens,
};
