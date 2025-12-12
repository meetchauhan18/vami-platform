export default {
  // Test environment
  testEnvironment: 'node',

  // Coverage directory
  coverageDirectory: 'coverage',

  // Coverage thresholds (enforce 80% minimum)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Test match patterns
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],

  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.routes.js', // Routes are tested via integration tests
    '!src/server.js', // Entry point, tested manually
    '!src/__tests__/**',
    '!src/test-utils/**',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.js'],

  // Module paths
  modulePaths: ['<rootDir>/src'],

  // Transform files (if using ES modules)
  transform: {},

  // Verbose output
  verbose: true,

  // Detect open handles (helps find async issues)
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: true,

  // Timeout for tests (30 seconds)
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
