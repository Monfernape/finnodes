import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` path alias in tsconfig.json.
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.ts",
      "utils/**/*.test.ts",
      "components/**/*.test.ts",
    ],
  },
});
