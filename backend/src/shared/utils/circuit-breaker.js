import CircuitBreaker from 'opossum';
import logger from './logger.js';

/**
 * Create a circuit breaker for a function
 * @param {Function} fn - Function to wrap
 * @param {string} name - Name for logging
 * @param {Object} options - Circuit breaker options
 * @returns {CircuitBreaker}
 */
export const createBreaker = (fn, name, options = {}) => {
  const defaultOptions = {
    timeout: 5000, // 5 seconds
    errorThresholdPercentage: 50, // Open circuit at 50% error rate
    resetTimeout: 30000, // Try again after 30 seconds
    rollingCountTimeout: 10000, // 10 second window for stats
    rollingCountBuckets: 10,
    name,
  };

  const breaker = new CircuitBreaker(fn, { ...defaultOptions, ...options });

  // Event: Circuit opened (too many failures)
  breaker.on('open', () => {
    logger.warn(`Circuit breaker OPEN: ${name}`, {
      stats: breaker.stats,
    });
  });

  // Event: Circuit half-opened (trying to recover)
  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker HALF_OPEN: ${name}`, {
      stats: breaker.stats,
    });
  });

  // Event: Circuit closed (recovered)
  breaker.on('close', () => {
    logger.info(`Circuit breaker CLOSED: ${name}`, {
      stats: breaker.stats,
    });
  });

  // Event: Fallback executed
  breaker.on('fallback', result => {
    logger.debug(`Circuit breaker FALLBACK: ${name}`, {
      result: typeof result,
    });
  });

  // Event: Timeout
  breaker.on('timeout', () => {
    logger.warn(`Circuit breaker TIMEOUT: ${name}`, {
      timeout: breaker.options.timeout,
    });
  });

  // Event: Failure
  breaker.on('failure', error => {
    logger.error(`Circuit breaker FAILURE: ${name}`, {
      error: error.message,
      stats: breaker.stats,
    });
  });

  return breaker;
};

/**
 * Create a circuit breaker with fallback
 * @param {Function} fn - Primary function
 * @param {Function} fallback - Fallback function
 * @param {string} name - Name for logging
 * @param {Object} options - Options
 * @returns {CircuitBreaker}
 */
export const createBreakerWithFallback = (fn, fallback, name, options = {}) => {
  const breaker = createBreaker(fn, name, options);
  breaker.fallback(fallback);
  return breaker;
};
