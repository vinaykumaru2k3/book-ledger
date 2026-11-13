// Security-rule tests: need the Firestore emulator, so they run apart from `npm test`
// (`npm run test:rules` starts the emulator around them).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/rules/**/*.rules.js"],
    environment: "node",
    testTimeout: 20000,
    fileParallelism: false,
  },
});
