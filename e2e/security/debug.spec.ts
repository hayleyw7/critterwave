import { expect, test } from "@playwright/test";
import { patchSavedSnapshot, readSave, writeSave } from "../helpers/security.js";
import { clearSave, startFreshRun } from "../helpers/index.js";

test.describe("security — debug hooks", () => {
  test("debug win works on localhost during e2e", async ({ page }) => {
    await page.goto("/?debug=win");
    await expect(page.locator("#game-over")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#game-over-tag")).toHaveText("YOU WIN!");
    await expect(page.locator("#game-over-summary")).toContainText(/100 waves cleared/i);
    await expect(page.locator(".game-over-log")).not.toHaveAttribute("open", "");
  });

  test("debug win-log auto-plays a full campaign log", async ({ page }) => {
    await page.goto("/?debug=win-log");
    await expect(page.locator("#game-over")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#game-over-tag")).toHaveText("YOU WIN!");
    await page.locator(".game-over-log summary").click();
    await expect(page.locator("#game-over-battle-log")).toBeVisible();
    await expect(page.locator("#game-over-battle-log")).toContainText(/WAVE 1/i);
    await expect(page.locator("#game-over-battle-log")).toContainText(/Turn 1/i);
  });

  test("debug lose-log auto-plays a full loss log", async ({ page }) => {
    await page.goto("/?debug=lose-log");
    await expect(page.locator("#game-over")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#game-over-tag")).toHaveText("GAME OVER");
    await expect(page.locator("#game-over-battle-log")).toBeHidden();
    await page.getByText("Battle Log").click();
    await expect(page.locator("#game-over-battle-log")).toContainText(/WAVE 1/i);
    await expect(page.locator("#game-over-battle-log")).toContainText(/Turn 1/i);
  });

  test("does not expose critterwave.win without debug flow on normal boot", async ({ page }) => {
    await clearSave(page);
    await page.goto("/");
    const exposed = await page.evaluate(() => "critterwave" in window);
    expect(exposed).toBe(false);
  });
});
