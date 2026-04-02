/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular',
  // Zone test env is injected by @angular-builders/jest when running via `ng test`.
  // When invoking jest directly, add: setupFilesAfterEnv: ['<rootDir>/setup-jest.ts']
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  coverageDirectory: './coverage',
  transform: {
    '^.+\\.(ts|js|mjs|html|svg)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/generated/**',
  ],
  testEnvironment: 'jsdom',
};
