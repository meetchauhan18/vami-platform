import { createNamespace } from 'cls-hooked';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create async context namespace for request context
 */
const namespace = createNamespace('request-context');

/**
 * Get correlation ID from current async context
 * @returns {string}
 */
export const getCorrelationId = () => {
  return namespace.get('correlationId') || 'unknown';
};

/**
 * Get user ID from current async context
 * @returns {string|null}
 */
export const getUserId = () => {
  return namespace.get('userId') || null;
};

/**
 * Set value in async context
 * @param {string} key
 * @param {any} value
 */
export const setContextValue = (key, value) => {
  namespace.set(key, value);
};

/**
 * Correlation ID middleware
 * Generates or extracts correlation ID and stores in async context
 */
export const correlationIdMiddleware = (req, res, next) => {
  namespace.run(() => {
    // Extract from header or generate new
    const correlationId =
      req.headers['x-correlation-id'] ||
      req.headers['x-request-id'] ||
      uuidv4();

    // Store in async context
    namespace.set('correlationId', correlationId);

    // Attach to response header
    res.setHeader('X-Correlation-ID', correlationId);

    // Also attach to request for convenience
    req.correlationId = correlationId;

    next();
  });
};

export default correlationIdMiddleware;
