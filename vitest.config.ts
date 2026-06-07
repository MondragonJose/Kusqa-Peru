import path from "node:path";
import { defineConfig } from "vitest/config";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [viteReact()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "supabase/tests/**/*.test.ts"],
    environmentMatchGlobs: [
      // Route integration tests need a DOM. Repository + realtime tests
      // stay in node (faster, no jsdom overhead).
      ["src/routes/**/*.test.tsx", "happy-dom"],
      ["src/features/**/*.test.tsx", "happy-dom"],
      ["src/components/**/*.test.tsx", "happy-dom"],
      ["src/test/**/*.test.tsx", "happy-dom"],
    ],
    setupFiles: [
      "./vitest.setup.ts",
      "./vitest.setup.dom.ts",
    ],
  },
});
