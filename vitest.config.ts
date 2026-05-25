import path from "node:path";
import { defineConfig } from "vitest/config";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite"; // <-- 1. Agregamos el import de Nitro

export default defineConfig({
  plugins: [
    tanstackStart(),
    nitro(), // <-- 2. Activamos Nitro antes de React
    viteReact(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "supabase/tests/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
