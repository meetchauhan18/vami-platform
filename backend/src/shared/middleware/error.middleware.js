import logger from '../utils/logger.js';

/**
 * Centralized error handling middleware
 * Must be the last middleware
 */
const errorMiddleware = (err, req, res, next) => {
  const statusCode = err?.statusCode || 500;
  const code = err?.code || 'SERVER_ERROR';

  // Log full error for internal observability
  logger.error('Unhandled error', {
    message: err?.message,
    code,
    statusCode,
    stack: err?.stack,
    path: req?.originalUrl,
    method: req?.method,
  });

  // Never expose stack trace in production
  const response = {
    success: false,
    error: {
      code,
      message:
        statusCode >= 500
          ? 'Internal server error'
          : err?.message || 'An error occurred',
      statusCode,
      details: err?.details || [],
      timestamp: new Date().toISOString(),
    },
  };

  return res.status(statusCode).json(response);
};

export default errorMiddleware;
