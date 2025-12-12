import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoose from 'mongoose';

import config from './shared/config/index.js';
import logger from './shared/utils/logger.js';
import redis from './shared/config/redis.js';
import errorMiddleware from './shared/middleware/error.middleware.js';
import correlationIdMiddleware from './shared/middleware/correlation-id.middleware.js';
import metricsMiddleware from './shared/middleware/metrics.middleware.js';
import {
  timeoutMiddleware,
  haltOnTimedout,
} from './shared/middleware/timeout.middleware.js';
import { globalRateLimiter } from './shared/middleware/rate-limit.middleware.js';
import { getMetrics, getContentType } from './shared/utils/metrics.js';

import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';

const app = express();

// ===== CORRELATION & METRICS =====
// Must be first to track all requests
app.use(correlationIdMiddleware);
app.use(metricsMiddleware);

// ===== SECURITY MIDDLEWARE =====
// Helmet: Sets various HTTP headers for security
app.use(helmet());

// CORS: Allow cross-origin requests (strict in production)
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

// ===== COMPRESSION =====
// Gzip compression for responses
app.use(compression());

// ===== REQUEST PARSING =====
// Parse JSON bodies (reduced limit for security)
app.use(express.json({ limit: '1mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Parse cookies (required for refresh token in httpOnly cookies)
app.use(cookieParser());

// ===== SECURITY - INPUT SANITIZATION =====
// Prevent NoSQL injection
// Temporarily removed due to Express 5 compatibility issues
// TODO: Re-implement with proper Express 5 compatible solution

// ===== LOGGING =====
// Morgan: HTTP request logging
const morganFormat = config.env === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: logger.stream,
  })
);

// ===== REQUEST TIMEOUT =====
app.use(timeoutMiddleware);

// ===== RATE LIMITING =====
// Apply global rate limiting to all routes
app.use(globalRateLimiter);

// ===== HEALTH CHECKS =====

/**
 * Liveness probe - server is running
 * Returns 200 if server is alive
 */
app.get('/health/liveness', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

/**
 * Readiness probe - server is ready to accept traffic
 * Returns 200 if all dependencies (DB, Redis) are healthy
 * Returns 503 if any dependency is unhealthy
 */
app.get('/health/readiness', async (req, res) => {
  const checks = {
    database: 'unknown',
    redis: 'unknown',
  };

  let healthy = true;

  // Check MongoDB
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      checks.database = 'healthy';
    } else {
      checks.database = 'unhealthy';
      healthy = false;
    }
  } catch (error) {
    checks.database = 'unhealthy';
    healthy = false;
    logger.error('Database health check failed', {
      error: error.message,
    });
  }

  // Check Redis
  try {
    await redis.ping();
    checks.redis = 'healthy';
  } catch (error) {
    checks.redis = 'degraded'; // Non-critical, app can function without Redis
    logger.warn('Redis health check failed', {
      error: error.message,
    });
  }

  const statusCode = healthy ? 200 : 503;

  res.status(statusCode).json({
    success: healthy,
    data: {
      status: healthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env,
      checks,
    },
  });
});

/**
 * Legacy health check (deprecated, use /health/readiness)
 */
app.get('/health', async (req, res) => {
  res.redirect(308, '/health/readiness');
});

// ===== PROMETHEUS METRICS ENDPOINT =====
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', getContentType());
    const metrics = await getMetrics();
    res.send(metrics);
  } catch (error) {
    logger.error('Error generating metrics', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to generate metrics',
      },
    });
  }
});

// ===== API ROUTES =====
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// ===== TIMEOUT ERROR HANDLER =====
// Must be before 404 handler
app.use(haltOnTimedout);

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      statusCode: 404,
    },
  });
});

// ===== ERROR HANDLER =====
// Must be the last middleware
app.use(errorMiddleware);

export default app;
