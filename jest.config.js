module.exports = {
  testEnvironment: 'node',
  transform: {},
  transformIgnorePatterns: [
    'node_modules/(?!(@faker-js)/)'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/helpers/'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'server.js',
    'database.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  testTimeout: 10000,
  verbose: true
};
