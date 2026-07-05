module.exports = {
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"],
  },
  moduleNameMapper: {
    "\\.html$": "<rootDir>/test-utils/html-mock.js",
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/.claude/",
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/.claude/",
  ],
  // Default stays "node" so the backend suite is unaffected. React component
  // test files opt into jsdom individually via a per-file docblock:
  //   /** @jest-environment jsdom */
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
};
