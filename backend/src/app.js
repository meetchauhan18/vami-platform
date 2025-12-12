import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './shared/config/index.js';
import logger from './shared/utils/logger.js';
import errorMiddleware from './shared/middleware/error.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';

const app = express();

// ===== SECURITY MIDDLEWARE =====
// Helmet: Sets various HTTP headers for security
app.use(helmet());

// CORS: Allow cross-origin requests (configure for production)
app.use(
  cors({
    origin: config?.clientUrl || '*', // Change in production
    credentials: true,
  })
);

// ===== REQUEST PARSING =====
// Parse JSON bodies (limit: 10mb for media uploads)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== LOGGING =====
// Morgan: HTTP request logging
const morganFormat = config?.env === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: {
      write: message => logger?.info(message.trim()),
    },
  })
);

// ===== RATE LIMITING =====
const limiter = rateLimit({
  windowMs: config?.rateLimit?.windowMs,
  max: config?.rateLimit?.max,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      statusCode: 429,
    },
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config?.env,
    },
  });
});

// ===== API ROUTES =====
app.use('/api/v1/auth', authRoutes);

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
app.use(errorMiddleware);

export default app;