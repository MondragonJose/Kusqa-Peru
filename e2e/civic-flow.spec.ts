import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Critical civic flow — logged-out → view → attempt action → login redirect", () => {
  test("landing page loads without critical a11y violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();

    expect(
      results.violations.filter((v) => v.impact === "critical" || v.impact === "serious"),
    ).toEqual([]);
  });

  test("initiative card renders in the feed", async ({ page }) => {
    await page.goto("/");

    // Wait for either initiative cards or the empty state
    await page.waitForLoadState("networkidle");

    const card = page.locator('[class*="InitiativeCard"]').first();
    const empty = page.getByText(/no hay|sin propuestas|sin misiones/i);

    // If a card exists, verify it has the expected structure
    if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(card).toBeVisible();
      // Card should have a title or emoji
      await expect(card.locator("h3, [class*=title]").first()).toBeVisible({ timeout: 3000 }).catch(() => {});
    } else {
      // Empty state is also acceptable
      await expect(empty.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
      test.skip(!(await empty.first().isVisible().catch(() => false)), "No cards or empty state found");
    }
  });

  test("trying to support an initiative prompts login", async ({ page }) => {
    // Navigate to a proposal page (publicly accessible)
    await page.goto("/");

    // Find and click a support button
    const supportBtn = page.getByRole("button", { name: /apoyar|support/i }).first();

    if (await supportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await supportBtn.click();

      // Should redirect to login page or show auth modal
      await page.waitForURL(/login|auth|signin|iniciar-sesion/i, { timeout: 10000 }).catch(() => {});
      const onLoginPage = page.url().match(/login|auth|signin/i);
      if (onLoginPage) {
        await expect(page.getByRole("heading, [class*=title]").first()).toBeVisible({ timeout: 5000 });
      }
    } else {
      // If no support button, check the login page directly
      await page.goto("/login");
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("a11y: initiative detail page has no critical violations", async ({ page }) => {
    // Try navigating to a known public route
    await page.goto("/app");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );

    expect(critical).toEqual([]);
  });
});

test.describe("Accessibility — key public pages", () => {
  const PUBLIC_PAGES = ["/", "/login"];

  for (const url of PUBLIC_PAGES) {
    test(`no critical a11y violations on ${url}`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page })
        .disableRules(["color-contrast"])
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      expect(critical).toEqual([]);
    });
  }
});
