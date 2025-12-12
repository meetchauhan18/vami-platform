import timeout from 'connect-timeout';
import logger from '../utils/logger.js';

/**
 * Request timeout middleware
 * Enforces 30-second timeout on all requests
 */
export const timeoutMiddleware = timeout('30s');

/**
 * Timeout error handler
 * Must be placed after routes
 */
export const haltOnTimedout = (req, res, next) => {
  if (!req.timedout) {
    next();
  } else {
    logger.warn('Request timed out', {
      method: req.method,
      url: req.originalUrl,
      correlationId: req.correlationId,
    });

    res.status(408).json({
      success: false,
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'Request took too long to process',
        statusCode: 408,
      },
    });
  }
};
