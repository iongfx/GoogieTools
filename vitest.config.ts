import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Lightweight Vitest setup for pure utility tests (Node environment).
 * Mirrors the `@/` path alias from tsconfig.json.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
