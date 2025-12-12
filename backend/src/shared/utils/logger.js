import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from '../config/index.js';
import {
  getCorrelationId,
  getUserId,
} from '../middleware/correlation-id.middleware.js';

/**
 * Custom format to inject correlation ID and user ID
 */
const correlationFormat = winston.format(info => {
  info.correlationId = getCorrelationId();
  const userId = getUserId();
  if (userId) {
    info.userId = userId;
  }
  return info;
});

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  correlationFormat(),
  winston.format.json()
);

// Console format (human-readable for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(
    ({
      timestamp,
      level,
      message,
      service,
      correlationId,
      userId,
      ...meta
    }) => {
      let msg = `${timestamp} [${service}] ${level}: ${message}`;

      if (correlationId && correlationId !== 'unknown') {
        msg += ` [${correlationId}]`;
      }

      if (userId) {
        msg += ` [user:${userId}]`;
      }

      // Add metadata if exists
      const metaKeys = Object.keys(meta);
      if (metaKeys.length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
      }

      return msg;
    }
  )
);

// Create logger instance
const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'vami-backend' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.env === 'production' ? logFormat : consoleFormat,
    }),

    // File transports for production
    ...(config.env === 'production'
      ? [
          // Error logs with daily rotation
          new DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '14d',
            format: logFormat,
          }),
          // Combined logs with daily rotation
          new DailyRotateFile({
            filename: 'logs/combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: logFormat,
          }),
        ]
      : []),
  ],
});

/**
 * Stream for Morgan HTTP logging
 */
logger.stream = {
  write: message => logger.info(message.trim()),
};

export default logger;
