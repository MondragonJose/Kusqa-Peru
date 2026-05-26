/**
 * Post-build script: converts dist/ output to .vercel/output/ (Vercel Build Output API v3).
 *
 * Why this exists:
 *   TanStack Start v1 uses Vite Environments — it does NOT use Nitro/NITRO_PRESET.
 *   The build always emits to dist/client/ and dist/server/ regardless of environment vars.
 *   Vercel needs .vercel/output/ to know what to serve as static and what to run as a function.
 *
 * Output structure:
 *   .vercel/output/static/assets/     ← client JS/CSS (served by CDN)
 *   .vercel/output/functions/index.func/
 *     server.js                        ← SSR handler (export default { fetch })
 *     assets/                          ← server chunks + manifests
 *     .vc-config.json                  ← { runtime: "edge", entrypoint: "server.js" }
 *   .vercel/output/config.json         ← routing: /assets/** → static, /** → Edge Function
 */

import { cpSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";

const OUTPUT = ".vercel/output";
const FUNC = `${OUTPUT}/functions/index.func`;

// Clean previous output
if (existsSync(OUTPUT)) rmSync(OUTPUT, { recursive: true, force: true });

// Create directories
mkdirSync(`${OUTPUT}/static`, { recursive: true });
mkdirSync(FUNC, { recursive: true });

// 1. Static assets (client JS/CSS) — served directly by Vercel's CDN
cpSync("dist/client/assets", `${OUTPUT}/static/assets`, { recursive: true });

// 2. Edge Function — server.js + all server-side chunks
cpSync("dist/server/server.js", `${FUNC}/server.js`);
cpSync("dist/server/assets", `${FUNC}/assets`, { recursive: true });

// 3. Edge Function config
writeFileSync(
  `${FUNC}/.vc-config.json`,
  JSON.stringify({ runtime: "edge", entrypoint: "server.js" }, null, 2),
);

// 4. Vercel routing config (Build Output API v3)
writeFileSync(
  `${OUTPUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Static assets: serve from CDN with immutable caching
        {
          src: "^/assets/(.*)$",
          headers: { "cache-control": "public, max-age=31536000, immutable" },
          continue: true,
        },
        // Serve from .vercel/output/static/ if file exists
        { handle: "filesystem" },
        // Everything else → SSR Edge Function
        { src: "^/(.*)", dest: "/index" },
      ],
    },
    null,
    2,
  ),
);

console.log("✓ .vercel/output/ generated (Build Output API v3)");
