import redis from '../../shared/config/redis.js';
import userRepository from '../../shared/repositories/user.repository.js';
import logger from '../../shared/utils/logger.js';
import { createBreaker } from '../../shared/utils/circuit-breaker.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import {
  cacheOperations,
  dbQueryDuration,
} from '../../shared/utils/metrics.js';

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'user:';

/**
 * Get user by ID with Redis caching
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const getUserById = async userId => {
  const cacheKey = `${CACHE_PREFIX}${userId}`;

  // Try cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      cacheOperations.inc({ operation: 'get', status: 'hit' });
      logger.debug('Cache hit for user', { userId });
      return JSON.parse(cached);
    }
    cacheOperations.inc({ operation: 'get', status: 'miss' });
  } catch (error) {
    logger.warn('Redis cache read error', { error: error.message });
    cacheOperations.inc({ operation: 'get', status: 'error' });
  }

  // Cache miss - fetch from DB with circuit breaker
  const fetchUser = createBreaker(
    async () => userRepository.findById(userId),
    'getUserById'
  );

  const end = dbQueryDuration.startTimer({
    operation: 'findById',
    collection: 'users',
  });
  const user = await fetchUser.fire();
  end();

  if (!user || user.status === 'deleted') {
    throw new NotFoundError('User');
  }

  // Store in cache
  try {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(user));
    cacheOperations.inc({ operation: 'set', status: 'success' });
  } catch (error) {
    logger.warn('Redis cache write error', { error: error.message });
    cacheOperations.inc({ operation: 'set', status: 'error' });
  }

  logger.info('User retrieved from DB', { userId: user._id });

  return user;
};

/**
 * Update user profile with cache invalidation
 * @param {string} userId
 * @param {Object} profileData
 * @returns {Promise<Object>}
 */
const updateUserProfile = async (userId, profileData) => {
  const user = await userRepository.findById(userId);

  if (!user || user.status === 'deleted') {
    throw new NotFoundError('User');
  }

  // Apply partial updates to profile
  if (profileData) {
    user.profile = {
      ...user.profile.toObject(),
      ...profileData,
    };
  }

  await user.save();

  // Invalidate cache
  const cacheKey = `${CACHE_PREFIX}${userId}`;
  try {
    await redis.del(cacheKey);
    cacheOperations.inc({ operation: 'delete', status: 'success' });
    logger.debug('Cache invalidated for user', { userId });
  } catch (error) {
    logger.warn('Redis cache delete error', { error: error.message });
    cacheOperations.inc({ operation: 'delete', status: 'error' });
  }

  logger.info('User profile updated', { userId: user._id });

  return user;
};

export default {
  getUserById,
  updateUserProfile,
};
