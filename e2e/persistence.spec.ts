import { expect, test, type Page } from "@playwright/test";
import { clickFooterMenuButton } from "./helpers/app.js";
import { patchSaveSnapshot, reloadAfterSavePatch } from "./helpers/save.js";
import { clearSave, clickCombatRun, startFreshRun, STORAGE_KEY } from "./helpers/index.js";

  test("new run returns to hero setup", async ({ page }) => {
    await startFreshRun(page);
    await clickFooterMenuButton(page, "New Run");
    await page.locator("#confirm-ok").click();
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
  });

  test("new run confirm survives reload", async ({ page }) => {
    await startFreshRun(page);
    await clickFooterMenuButton(page, "New Run");
    await expect(page.locator("#confirm-overlay")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start a new run?" })).toBeVisible();
    await page.reload();
    await expect(page.locator("#confirm-overlay")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start a new run?" })).toBeVisible();
    await page.locator("#confirm-cancel").click();
    await expect(page.locator("#confirm-overlay")).toHaveClass(/hidden/);
    await expect(page.getByLabel("Combat actions")).toBeVisible();
  });

  test("new run confirm dismisses on escape and backdrop tap", async ({ page }) => {
    await startFreshRun(page);
    await clickFooterMenuButton(page, "New Run");
    await expect(page.locator("#confirm-overlay")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#confirm-overlay")).toHaveClass(/hidden/);
    await expect(page.getByLabel("Combat actions")).toBeVisible();

    await clickFooterMenuButton(page, "New Run");
    await page.locator("#confirm-overlay").click({
      position: { x: 8, y: 8 },
      force: true,
    });
    await expect(page.locator("#confirm-overlay")).toHaveClass(/hidden/);
  });

  test("clear data confirm dismisses on backdrop tap (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await startFreshRun(page);
    await clickFooterMenuButton(page, "Clear Data");
    await expect(page.locator("#confirm-overlay")).toBeVisible();
    await page.locator("#confirm-overlay").click({
      position: { x: 12, y: 12 },
    });
    await expect(page.locator("#confirm-overlay")).toHaveClass(/hidden/);
    await expect(page.getByLabel("Combat actions")).toBeVisible();
  });

  test("clear data confirm survives reload", async ({ page }) => {
    await startFreshRun(page);
    await clickFooterMenuButton(page, "Clear Data");
    await expect(page.locator("#confirm-overlay")).toHaveClass(/confirm-danger/);
    await expect(page.getByRole("heading", { name: "Delete everything?" })).toBeVisible();
    await page.reload();
    await expect(page.locator("#confirm-overlay")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delete everything?" })).toBeVisible();
  });

  test("new run setup survives reload", async ({ page }) => {
    await startFreshRun(page);
    await clickFooterMenuButton(page, "New Run");
    await page.locator("#confirm-ok").click();
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
    await expect(page.locator("#character-setup")).toBeVisible();
    await expect(page.locator(".game-shell")).toHaveClass(/setup-active/);
  });

  test("clear data resets to setup", async ({ page }) => {
    await startFreshRun(page);
    await clickFooterMenuButton(page, "Clear Data");
    await page.locator("#confirm-ok").click();
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
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

  test("restore keeps max hype styling without teach flash", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      hypeLevel: 5,
      foeHypeLevel: 5,
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);
    await expect(page.locator("#battle-text")).toContainText(/restored/i);
    await expect(page.locator("#player-hype-wrap")).toHaveClass(/hype-maxed/);
    await expect(page.locator("#foe-hype-wrap")).toHaveClass(/hype-maxed/);
    await expect(page.locator("#player-hype-wrap")).not.toHaveClass(/hype-maxed-flash/);
    await expect(page.locator("#foe-hype-wrap")).not.toHaveClass(/hype-maxed-flash/);
  });

test.describe("combat hints — save persistence", () => {
  test("heal teach popup survives reload", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);
    await expect(page.locator("#cmd-heal-teach")).toBeVisible();
    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "on");
  });

  test("hint dismissals survive reload", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#cmd-attack")).toHaveAttribute("data-combat-hint", "off");

    await page.reload();
    await expect(page.locator("#cmd-attack")).toHaveAttribute("data-combat-hint", "off");
  });

  test("heal press clears dance hint for the current foe in save", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 20, maxHp: 20 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
        showDanceHintThisFoe: true,
      },
    });
    await reloadAfterSavePatch(page);

    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");
  });
});

test.describe("persistence — storage key migration", () => {
  test("migrates legacy v6 save to v1.0 on boot", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        "critterwave-v6",
        JSON.stringify({ bestWave: 8, runsPlayed: 2, colorMode: "dark" })
      );
    });
    await page.reload();

    const keys = await page.evaluate(() => ({
      current: localStorage.getItem("critterwave-v1.0"),
      legacy: localStorage.getItem("critterwave-v6"),
    }));
    expect(keys.current).toContain('"bestWave":8');
    expect(keys.legacy).toBeNull();
    await expect(page.locator("#stat-best-wave")).toHaveText("8");
  });
});
