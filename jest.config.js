/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  roots: [
    "<rootDir>/app",
    "<rootDir>/src",
    "<rootDir>/tests",
    "<rootDir>/scripts",
  ],
  testPathIgnorePatterns: ["<rootDir>/tests/integration/"],
};
