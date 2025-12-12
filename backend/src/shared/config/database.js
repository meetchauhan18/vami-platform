import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import config from './index.js';

let retryCount = 0;
const MAX_RETRIES = 5;

export const connectDatabase = async () => {
  try {
    const options = {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true,
    };

    const conn = await mongoose.connect(config.database.uri, options);

    // Reset retry count on successful connection
    retryCount = 0;

    logger.info(`MongoDB Connected: ${conn.connection.host}`, {
      database: conn.connection.name,
      readyState: conn.connection.readyState,
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
      retryCount = 0; // Reset retry count on reconnect
    });

    mongoose.connection.on('error', err => {
      logger.error('MongoDB connection error:', { error: err.message });
    });
  } catch (error) {
    logger.error('MongoDB connection failed:', {
      error: error.message,
      stack: error.stack,
      attempt: retryCount + 1,
      maxRetries: MAX_RETRIES,
    });

    // Exponential backoff with max retries
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30s
      logger.info(`Retrying database connection in ${delay}ms...`, {
        attempt: retryCount,
        maxRetries: MAX_RETRIES,
      });
      setTimeout(connectDatabase, delay);
    } else {
      logger.error('Max database connection retries reached. Exiting.', {
        maxRetries: MAX_RETRIES,
      });
      process.exit(1);
    }
  }
};

export const closeDatabase = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', {
      error: error.message,
    });
  }
};
