import {
  httpRequestsTotal,
  httpRequestDuration,
  activeConnections,
} from '../utils/metrics.js';

/**
 * Prometheus metrics middleware
 * Records HTTP request metrics
 */
export const metricsMiddleware = (req, res, next) => {
  // Increment active connections
  activeConnections.inc();

  // Record start time
  const start = process.hrtime();

  // Cleanup on response finish
  res.on('finish', () => {
    // Decrement active connections
    activeConnections.dec();

    // Calculate duration
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds + nanoseconds / 1e9;

    // Normalize route (remove IDs)
    const route = req.route?.path || req.path || 'unknown';
    const normalizedRoute = route.replace(/\/[0-9a-f]{24}/gi, '/:id');

    // Record metrics
    const labels = {
      method: req.method,
      route: normalizedRoute,
      status_code: res.statusCode,
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });

  next();
};

export default metricsMiddleware;
