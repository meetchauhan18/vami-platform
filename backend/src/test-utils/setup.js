import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

/**
 * Setup before all tests
 */
beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect mongoose
  await mongoose.connect(mongoUri);
});

/**
 * Cleanup after all tests
 */
afterAll(async () => {
  // Close mongoose connection
  await mongoose.disconnect();

  // Stop MongoDB server
  if (mongoServer) {
    await mongoServer.stop();
  }
});

/**
 * Clear all collections between tests
 */
afterEach(async () => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
