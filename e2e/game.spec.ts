import { expect, test } from "@playwright/test";
import { clearSave, startFreshRun, STORAGE_KEY } from "./helpers.js";

test.describe("Critterwave — happy paths", () => {
  test("hero setup starts a run", async ({ page }) => {
    await startFreshRun(page);
    await expect(page.locator("#hero-name")).toContainText(/test critter/i);
    await expect(page.locator("#wave-banner")).toHaveText(/1\s*\/\s*\d+/);
    await expect(page.locator("#battle-text")).toContainText(/appears!/i);
    await expect(page.locator("#player-hp-text")).toHaveText("20/20");
  });

  test("attack resolves combat text", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You hit/i, {
      timeout: 10_000,
    });
  });

  test("heal restores hp in battle log", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
  });

  test("dance shows player opener and foe reaction", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Dance" }).click();
    await expect(page.locator("#battle-text")).toContainText(/^You /i, {
      timeout: 10_000,
    });
    await expect(page.locator(".battle-line.battle-foe")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("run away advances wave text", async ({ page }) => {
    await startFreshRun(page);
    const waveBefore = await page.locator("#wave-banner").textContent();
    await page.getByRole("button", { name: "Run" }).click();
    await expect(page.locator("#battle-text")).toContainText(
      /run away from/i,
      { timeout: 10_000 }
    );
    await expect(page.locator("#battle-text")).toContainText(/run into/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#wave-banner")).not.toHaveText(waveBefore ?? "");
  });

  test("new game returns to hero setup", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "New game" }).click();
    await page.locator("#confirm-ok").click();
    await expect(
      page.getByRole("heading", { name: "What critter are you?" })
    ).toBeVisible();
  });
});

test.describe("Critterwave — sad paths", () => {
  test("cannot start without a name", async ({ page }) => {
    await clearSave(page);
    await page.locator(".emoji-pick").first().click();
    await page.getByLabel("Name").fill("");
    await page.getByRole("button", { name: "Fight!" }).click();
    await expect(page.locator("#character-setup")).toBeVisible();
    await expect(page.locator(".game-shell")).toHaveClass(/setup-active/);
    await expect(page.locator("#hero-name-input")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    await expect(page.locator("#hero-name-input")).toHaveClass(
      /setup-name-input--highlight/
    );
    await expect(page.locator("#battle-text")).not.toContainText(/appears!/i);
  });

  test("clear data resets to setup", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Clear data" }).click();
    await page.locator("#confirm-ok").click();
    await expect(
      page.getByRole("heading", { name: "What critter are you?" })
    ).toBeVisible();

    const save = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    expect(save).toBeTruthy();
    const parsed = JSON.parse(save!) as { bestWave?: number; runsPlayed?: number };
    expect(parsed.bestWave).toBe(0);
    expect(parsed.runsPlayed).toBe(0);
  });

  test("restores mid-run save after reload", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You hit/i, {
      timeout: 10_000,
    });
    const waveBefore = await page.locator("#wave-banner").textContent();

    await page.reload();
    await expect(page.getByLabel("Combat actions")).toBeVisible();
    await expect(page.locator("#battle-text")).toContainText(/restored/i);
    await expect(page.locator("#wave-banner")).toHaveText(waveBefore ?? "");
  });
});
