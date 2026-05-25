import path from "node:path";
import { defineConfig } from "vitest/config";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  // 1. PLUGINS VITALES PARA LA APP Y VERCEL
  plugins: [
    tanstackStart({
      server: {
        preset: 'vercel' // Esto le dice a Vercel que cree las Serverless Functions
      }
    }),
    viteReact(),
  ],

  // 2. TUS ALIAS
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // 3. TU CONFIGURACIÓN DE PRUEBAS (Intacta)
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "supabase/tests/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
