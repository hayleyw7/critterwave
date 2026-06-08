import { expect, test } from "@playwright/test";
import { patchSavedSnapshot, readSave, writeSave } from "../helpers/security.js";
import { clearSave, startFreshRun } from "../helpers/index.js";

test.describe("security — save tampering", () => {
  test("clamps tampered wave and hp on restore", async ({ page }) => {
    await startFreshRun(page);
    const save = await readSave(page);
    const snapshot = save?.snapshot as Record<string, unknown> | undefined;
    const player = snapshot?.player as Record<string, unknown> | undefined;
    await patchSavedSnapshot(page, {
      wave: 999,
      player: { ...player, hp: 99999, maxHp: 99999, attack: 999 },
    });
    await page.reload();

    await expect(page.getByLabel("Combat actions")).toBeVisible();
    await expect(page.locator("#battle-text")).toContainText(/restored/i);
    await expect(page.locator("#player-hp-text")).not.toHaveText(/99999/);
  });

  test("drops invalid foe id and starts a fresh run instead of crashing", async ({ page }) => {
    await startFreshRun(page);
    await patchSavedSnapshot(page, {
      foe: {
        id: "totally-fake-foe",
        name: "Fake",
        emoji: "👾",
        hp: 10,
        maxHp: 10,
        attack: 3,
        level: 1,
      },
    });
    await page.reload();

    await expect(page.getByLabel("Combat actions")).toBeVisible();
    await expect(page.locator("#wave-banner")).toHaveText(/1\s*\/\s*\d+/);
    await expect(page.locator("#battle-text")).toContainText(/restored/i);
  });

  test("sanitizes tampered heroName in save metadata on boot", async ({ page }) => {
    await clearSave(page);
    await page.locator(".emoji-pick").first().click();
    const emoji = await page.locator(".emoji-pick.selected").getAttribute("data-emoji");
    expect(emoji).toBeTruthy();

    await writeSave(page, {
      bestWave: 0,
      runsPlayed: 0,
      playerEmoji: emoji,
      heroName: "  Evil   <>  Name  ",
      setupActive: false,
    });
    await page.reload();

    await expect(page.getByLabel("Combat actions")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#hero-name")).toContainText("EVIL NAME");
    await expect(page.locator("#hero-name")).not.toContainText("<>");
  });
});
