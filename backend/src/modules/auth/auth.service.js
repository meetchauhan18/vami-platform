import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import User from '../../shared/models/User.model.js';
import config from '../../shared/config/index.js';
import logger from '../../shared/utils/logger.js';

/**
 * Hash password using bcrypt
 */
const hashPassword = async plainPassword => {
  const saltRounds = config?.bcrypt?.rounds; // e.g. 10–12
  return bcrypt.hash(plainPassword, saltRounds);
};

/**
 * Compare password with hash
 */
const verifyPassword = async (plainPassword, passwordHash) => {
  return bcrypt.compare(plainPassword, passwordHash);
};

/**
 * Generate JWT access token
 */
const generateAccessToken = user => {
  return jwt.sign(
    {
      userId: user?._id?.toString(),
      role: user?.role,
    },
    config?.jwt?.accessSecret,
    { expiresIn: config?.jwt?.accessExpiry }
  );
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = user => {
  return jwt.sign(
    {
      userId: user?._id?.toString(),
      tokenType: 'refresh',
    },
    config?.jwt?.refreshSecret,
    { expiresIn: config?.jwt?.refreshExpiry }
  );
};

/**
 * Register a new user
 */
const registerUser = async payload => {
  const { email, username, password, firstName, lastName } = payload;

  // Check duplicates
  const existing = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existing) {
    const conflictField = existing?.email === email ? 'email' : 'username';
    const err = new Error(`${conflictField} already in use`);
    err.statusCode = 409;
    err.code = 'CONFLICT';
    err.details = [{ field: conflictField, message: 'Already taken' }];
    throw err;
  }

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    email,
    username,
    passwordHash,
    profile: {
      firstName,
      lastName,
    },
  });

  logger.info('User registered', { userId: user._id });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return { user, accessToken, refreshToken };
};

/**
 * Login user with email or username
 */
const loginUser = async payload => {
  const { identifier, password } = payload;

  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() },
    ],
  });

  // Generic error (don’t leak which field is wrong)
  const invalidCredsError = new Error('Invalid credentials');
  invalidCredsError.statusCode = 401;
  invalidCredsError.code = 'AUTH_INVALID';

  if (!user) {
    throw invalidCredsError;
  }

  if (user?.status !== 'active') {
    const err = new Error('Account is not active');
    err.statusCode = 403;
    err.code = 'AUTH_FORBIDDEN';
    throw err;
  }

  const passwordValid = await verifyPassword(password, user?.passwordHash);
  if (!passwordValid) {
    throw invalidCredsError;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  logger.info('User logged in', { userId: user?._id });

  return { user, accessToken, refreshToken };
};

export default {
  registerUser,
  loginUser,
};
