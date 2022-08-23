module.exports = {
  moduleFileExtensions: ['js', 'ts'],
  testRegex: '.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverage: true,
  coverageDirectory: './coverage',
  collectCoverageFrom: ['src/**/*.ts'],
  testEnvironment: 'node',
  setupFiles: ['./__tests__/setup.ts'],
};
