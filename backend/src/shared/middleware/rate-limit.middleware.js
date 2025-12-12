import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../config/redis.js';
import logger from '../utils/logger.js';

/**
 * Create Redis store with fallback to memory
 * Fixed for ioredis v5 compatibility
 */
const createStore = () => {
  try {
    return new RedisStore({
      // @ts-expect-error - Known issue: @types/express-rate-limit incorrect
      sendCommand: (...args) => redis.call(...args),
      prefix: 'rl:',
    });
  } catch (error) {
    logger.warn('Redis unavailable for rate limiting, using memory store', {
      error: error.message,
    });
    return undefined; // Falls back to default memory store
  }
};

/**
 * Global API rate limiter (per IP)
 * 100 requests per minute
 */
export const globalRateLimiter = rateLimit({
  store: createStore(),
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Login rate limiter (per identifier - email/username)
 * 5 attempts per 15 minutes
 */
export const loginRateLimiter = rateLimit({
  store: createStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: (req, res) => {
    // Rate limit by identifier (email/username) instead of IP
    const identifier = req.body?.identifier;
    if (identifier) {
      return identifier.toLowerCase();
    }
    // Fall back to IP with proper IPv6 handling
    return res.locals.ipKeyGenerator?.(req, res) || req.ip;
  },
  skipSuccessfulRequests: true, // Only count failed attempts
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_LOGIN',
      message: 'Too many login attempts, please try again later',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Login rate limit exceeded', {
      identifier: req.body?.identifier,
      ip: req.ip,
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_LOGIN',
        message: 'Too many login attempts, please try again in 15 minutes',
        statusCode: 429,
      },
    });
  },
});

/**
 * Registration rate limiter (per IP)
 * 3 registrations per hour
 */
export const registrationRateLimiter = rateLimit({
  store: createStore(),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_REGISTRATION',
      message: 'Too many registration attempts, please try again later',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive operations
 * 10 requests per hour
 */
export const strictRateLimiter = rateLimit({
  store: createStore(),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests for this operation',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
