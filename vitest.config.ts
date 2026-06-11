import path from "node:path";
import { defineConfig } from "vitest/config";
import viteReact from "@vitejs/plugin-react";
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [viteReact()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  test: {
    projects: [{
      extends: true,
      test: {
        environment: "node",
        include: ["src/**/*.test.ts", "src/**/*.test.tsx", "supabase/tests/**/*.test.ts"],
        environmentMatchGlobs: [
        // Route integration tests need a DOM. Repository + realtime tests
        // stay in node (faster, no jsdom overhead).
        ["src/routes/**/*.test.tsx", "happy-dom"], ["src/features/**/*.test.tsx", "happy-dom"], ["src/components/**/*.test.tsx", "happy-dom"], ["src/test/**/*.test.tsx", "happy-dom"]],
        setupFiles: ["./vitest.setup.ts", "./vitest.setup.dom.ts"]
      }
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: 'playwright',
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});