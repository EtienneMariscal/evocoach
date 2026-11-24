/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Mismos alias que tsconfig.json (el mas especifico primero).
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/e2e/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/app/**', '!**/*.d.ts', '!**/__tests__/**'],
  // Umbrales (>= 90 % en domain/ y core/offline, ver plan 9.1): se añaden con T4.1 y T6.1,
  // cuando existan esas carpetas (Jest falla si un umbral no encuentra ficheros).
};
