import promClient from 'prom-client';

/**
 * Initialize Prometheus metrics
 */
const register = new promClient.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'vami_',
});

/**
 * HTTP request counter
 */
export const httpRequestsTotal = new promClient.Counter({
  name: 'vami_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * HTTP request duration histogram
 */
export const httpRequestDuration = new promClient.Histogram({
  name: 'vami_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

/**
 * Active HTTP connections gauge
 */
export const activeConnections = new promClient.Gauge({
  name: 'vami_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
});

/**
 * Database query duration histogram
 */
export const dbQueryDuration = new promClient.Histogram({
  name: 'vami_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

/**
 * Authentication attempts counter
 */
export const authAttempts = new promClient.Counter({
  name: 'vami_auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['type', 'status'],
  registers: [register],
});

/**
 * Cache operations counter
 */
export const cacheOperations = new promClient.Counter({
  name: 'vami_cache_operations_total',
  help: 'Total cache operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

/**
 * Cache hit rate gauge
 */
export const cacheHitRate = new promClient.Gauge({
  name: 'vami_cache_hit_rate',
  help: 'Cache hit rate (percentage)',
  registers: [register],
});

/**
 * Export metrics in Prometheus format
 */
export const getMetrics = async () => {
  return register.metrics();
};

/**
 * Get content type for metrics
 */
export const getContentType = () => {
  return register.contentType;
};

export default register;
