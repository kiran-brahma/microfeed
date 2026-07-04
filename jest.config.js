module.exports = {
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"],
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/.claude/",
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/.claude/",
  ],
};
