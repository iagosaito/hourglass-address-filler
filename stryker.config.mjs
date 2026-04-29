export default {
  testRunner: "command",
  commandRunner: {
    command: "node --test tests/core/utils/stringUtils.test.js tests/core/utils/state.test.js",
  },
  mutate: ["src/core/utils/stringUtils.js", "src/core/utils/state.js"],
  coverageAnalysis: "off",
  reporters: ["clear-text", "progress"],
  tempDirName: ".stryker-tmp",
};
