import logger from '../utils/logger.js';
import { getCorrelationId } from './correlation-id.middleware.js';

/**
 * Centralized error handling middleware
 * Must be the last middleware
 */
const errorMiddleware = (err, req, res, next) => {
  // Get correlation ID for tracking
  const correlationId = getCorrelationId();

  // Default values
  let statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'SERVER_ERROR';
  const isOperational =
    err.isOperational !== undefined ? err.isOperational : false;

  // Log full error for internal observability
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Request error', {
    message: err.message,
    code,
    statusCode,
    isOperational,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    correlationId,
    userId: req.user?.id,
  });

  // For programmer errors (non-operational), don't expose details
  if (!isOperational && statusCode >= 500) {
    statusCode = 500;
  }

  // Build error response
  const response = {
    success: false,
    error: {
      code,
      message:
        statusCode >= 500 && !isOperational
          ? 'Internal server error'
          : err.message || 'An error occurred',
      statusCode,
      details: err.details || [],
      timestamp: new Date().toISOString(),
      correlationId,
    },
  };

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.error.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

export default errorMiddleware;
