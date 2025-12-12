import Redis from 'ioredis';
import logger from '../utils/logger.js';
import config from './index.js';

/**
 * Redis client configuration
 */
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  retryStrategy: times => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
};

/**
 * Create Redis client
 */
const redis = new Redis(redisConfig);

/**
 * Redis event handlers
 */
redis.on('connect', () => {
  logger.info('Redis client connecting...', {
    host: redisConfig.host,
    port: redisConfig.port,
  });
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('error', err => {
  logger.error('Redis error', {
    error: err.message,
    stack: err.stack,
  });
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', delay => {
  logger.info('Redis reconnecting', { delay });
});

/**
 * Graceful shutdown
 */
export const closeRedis = async () => {
  try {
    await redis.quit();
    logger.info('Redis connection closed gracefully');
  } catch (error) {
    logger.error('Error closing Redis connection', {
      error: error.message,
    });
  }
};

export default redis;
