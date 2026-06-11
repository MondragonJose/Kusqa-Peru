// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";

export default tseslint.config({ ignores: ["dist", ".output", ".vinxi", "node_modules"] }, {
  extends: [js.configs.recommended, ...tseslint.configs.recommended],
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser,
  },
  plugins: {
    "react-hooks": reactHooks,
    "react-refresh": reactRefresh,
    boundaries,
  },
  rules: {
    ...reactHooks.configs.recommended.rules,
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "server-only",
            message:
              "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
          },
        ],
      },
    ],
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        args: "all",
        argsIgnorePattern: "^_",
        caughtErrors: "all",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true,
        reportUsedIgnorePattern: false,
      },
    ],
    // ── Module boundaries (eslint-plugin-boundaries) ──────────────
    // WARN level: cross-feature imports are recorded but not blocking.
    // Target: resolve all violations and flip to "error".
    "boundaries/dependencies": [
      "warn",
      {
        default: "disallow",
        rules: [
          // Features can only import from domain, services, components, core, and shared layers.
          // They MUST NOT import from other features.
          {
            from: [{ type: "feature" }],
            allow: [
              { to: { type: "domain" } },
              { to: { type: "services" } },
              { to: { type: "components" } },
              { to: { type: "core" } },
              { to: { type: "hooks" } },
              { to: { type: "lib" } },
              { to: { type: "types" } },
              { to: { type: "utils" } },
              { to: { type: "constants" } },
              { to: { type: "design" } },
              { to: { type: "test" } },
            ],
          },
          // Domain is pure: no React, no Supabase, no services, no features.
          {
            from: [{ type: "domain" }],
            allow: [
              { to: { type: "domain" } },
              { to: { type: "types" } },
              { to: { type: "utils" } },
              { to: { type: "constants" } },
            ],
          },
          // Services can access domain but not features or components.
          {
            from: [{ type: "services" }],
            allow: [
              { to: { type: "domain" } },
              { to: { type: "services" } },
              { to: { type: "types" } },
              { to: { type: "lib" } },
              { to: { type: "utils" } },
              { to: { type: "constants" } },
            ],
          },
          // Components (generic UI) can access domain but not features.
          {
            from: [{ type: "components" }],
            allow: [
              { to: { type: "domain" } },
              { to: { type: "components" } },
              { to: { type: "types" } },
              { to: { type: "lib" } },
              { to: { type: "utils" } },
              { to: { type: "constants" } },
              { to: { type: "design" } },
            ],
          },
          // Routes are the app entry point — can import anything.
          {
            from: [{ type: "route" }],
            allow: [
              { to: { type: "feature" } },
              { to: { type: "domain" } },
              { to: { type: "services" } },
              { to: { type: "components" } },
              { to: { type: "core" } },
              { to: { type: "hooks" } },
              { to: { type: "lib" } },
              { to: { type: "types" } },
              { to: { type: "utils" } },
              { to: { type: "constants" } },
              { to: { type: "design" } },
              { to: { type: "test" } },
            ],
          },
          // Everything can import core (shared tokens).
          {
            from: [
              { type: "core" },
              { type: "hooks" },
              { type: "lib" },
              { type: "types" },
              { type: "utils" },
              { type: "constants" },
              { type: "design" },
              { type: "test" },
            ],
            allow: [
              { to: { type: "domain" } },
              { to: { type: "core" } },
              { to: { type: "hooks" } },
              { to: { type: "lib" } },
              { to: { type: "types" } },
              { to: { type: "utils" } },
              { to: { type: "constants" } },
              { to: { type: "design" } },
              { to: { type: "test" } },
            ],
          },
        ],
      },
    ],
  },
  settings: {
    "boundaries/elements": [
      { type: "feature", pattern: "src/features/*/**/*", mode: "file" },
      { type: "domain", pattern: "src/domain/**/*", mode: "file" },
      { type: "services", pattern: "src/services/**/*", mode: "file" },
      { type: "components", pattern: "src/components/**/*", mode: "file" },
      { type: "route", pattern: "src/routes/**/*", mode: "file" },
      { type: "core", pattern: "src/core/**/*", mode: "file" },
      { type: "hooks", pattern: "src/hooks/**/*", mode: "file" },
      { type: "lib", pattern: "src/lib/**/*", mode: "file" },
      { type: "types", pattern: "src/types/**/*", mode: "file" },
      { type: "utils", pattern: "src/utils/**/*", mode: "file" },
      { type: "constants", pattern: "src/constants/**/*", mode: "file" },
      { type: "design", pattern: "src/design/**/*", mode: "file" },
      { type: "test", pattern: "src/test/**/*", mode: "file" },
    ],
    "boundaries/include": ["src/**/*.{ts,tsx}"],
    "boundaries/ignore": ["src/**/__tests__/**", "src/**/*.test.*", "src/**/*.spec.*"],
  },
}, {
  files: [
    "src/domain/civicJourney.ts",
    "src/domain/civicJourneyNarrative.ts",
    "src/domain/civicJourneyExport.ts",
  ],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "server-only",
            message:
              "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
          },
        ],
        patterns: [
          { group: ["react"], message: "Domain layer must not import React." },
          { group: ["@supabase/*"], message: "Domain layer must not import Supabase." },
          { group: ["@/services/*"], message: "Domain layer must not import services." },
        ],
      },
    ],
  },
}, eslintPluginPrettier, storybook.configs["flat/recommended"]);
