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
};
