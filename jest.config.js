/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  roots: [
    "<rootDir>/app",
    "<rootDir>/src",
    "<rootDir>/tests",
    "<rootDir>/scripts",
  ],
  setupFiles: ["<rootDir>/tests/setup/jest.setup.js"],
  testPathIgnorePatterns: ["<rootDir>/tests/integration/"],
};
