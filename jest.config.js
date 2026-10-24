/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  roots: ["<rootDir>/app", "<rootDir>/src", "<rootDir>/tests"],
  testPathIgnorePatterns: ["<rootDir>/tests/integration/"],
};
