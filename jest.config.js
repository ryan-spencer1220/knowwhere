/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  // Only run our own tests; ignore build output and the standalone scripts.
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/.expo/"],
};
