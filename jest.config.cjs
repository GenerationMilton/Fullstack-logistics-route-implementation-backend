/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.jest.json",
      },
    ],
  },
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  resetMocks: true,
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/index.ts",
    "!src/types/**",
  ],
  /**
   * SKILL.md Step 9 targets ≥70% once RouteService / repository are covered
   * with DB-backed integration tests. Raise these after expanding coverage.
   */
  coverageThreshold: {
    global: {
      lines: 40,
      branches: 32,
      functions: 35,
      statements: 40,
    },
  },
};
