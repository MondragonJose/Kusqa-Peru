import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart(),
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  ssr: {
    // Bundle SSR runtime dependencies that are not available in Vercel function
    // These are the transitive deps of @tanstack/start-server-core and router-core
    // that Vite would otherwise externalize but aren't copied to Vercel runtime
    noExternal: [
      // h3 (Vercel http adapter)
      "h3",
      "h3-v2",
      "rou3",      // h3 dependency
      "srvx",      // h3 dependency
      // TanStack router/start
      "seroval",   // router-core dependency for SSR serialization
    ],
  },
});