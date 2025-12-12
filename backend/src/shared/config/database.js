import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import config from './index.js';


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

    logger.info(`MongoDB Connected: ${conn.connection.host}`, {
      database: conn.connection.name,
      readyState: conn.connection.readyState,
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

    mongoose.connection.on('error', err => {
      logger.error('MongoDB connection error:', { error: err.message });
    });

  } catch (error) {
    logger.error('MongoDB connection failed:', {
      error: error.message,
      stack: error.stack,
    });
    
    logger.info('Retrying database connection in 5 seconds...');
    setTimeout(connectDatabase, 5000);
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

