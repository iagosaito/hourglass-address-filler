export default {
  testRunner: "command",
  commandRunner: {
    command: "node --test tests/core/utils/stringUtils.test.js",
  },
  mutate: ["src/core/utils/stringUtils.js"],
  coverageAnalysis: "off",
  reporters: ["clear-text", "progress"],
  tempDirName: ".stryker-tmp",
};
