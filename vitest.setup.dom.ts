/**
 * DOM test setup — runs only for files that match the
 * `environmentMatchGlobs` patterns in vitest.config.ts.
 *
 * Registers @testing-library/jest-dom matchers and cleans up the
 * rendered DOM after every test so suites don't leak state.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
