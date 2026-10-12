import { defineConfig } from "vitest/config";

// Each app and package is a Vitest project with its own config (or the defaults).
export default defineConfig({
  test: {
    projects: ["apps/*", "packages/*"],
    passWithNoTests: true,
  },
});
