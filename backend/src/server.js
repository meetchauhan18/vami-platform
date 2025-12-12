import app from './app.js';
import config from './shared/config/index.js';
import logger from './shared/utils/logger.js';
import { connectDatabase, closeDatabase } from './shared/config/database.js';
import { closeRedis } from './shared/config/redis.js';

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start Express server
    const server = app.listen(config.port, () => {
      logger.info(`Server started in ${config.env} mode`, {
        port: config.port,
        nodeVersion: process.version,
      });
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async signal => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Stop accepting new requests
      server.close(async () => {
        logger.info('HTTP server closed');

        // Close database connection
        await closeDatabase();

        // Close Redis connection
        await closeRedis();

        logger.info('Graceful shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
      logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack,
      });
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection:', {
        reason,
        promise,
      });
      gracefulShutdown('unhandledRejection');
    });
  } catch (error) {
    logger.error('Failed to start server:', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Start the application
startServer();
