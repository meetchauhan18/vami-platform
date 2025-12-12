import jwt from 'jsonwebtoken';
import config from '../config.js';
import { errorResponse } from '../utils/response.js';

/**
 * Verifies JWT access token and attaches user info to req.user
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'Authentication required', 401, 'AUTH_REQUIRED');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, config?.jwt?.accessSecret);

    req.user = {
      id: payload?.userId,
      role: payload?.role,
    };

    return next();
  } catch (err) {
    return errorResponse(res, 'Invalid or expired token', 401, 'AUTH_INVALID');
  }
};

/**
 * Role-based authorization (admin, moderator, etc.)
 */
const requireRole = roles => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return errorResponse(res, 'Access denied', 403, 'AUTH_FORBIDDEN');
  }
  return next();
};

export default {
  authMiddleware,
  requireRole,
};
