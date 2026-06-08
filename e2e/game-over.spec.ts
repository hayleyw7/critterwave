import { expect, test, type Page } from "@playwright/test";
import { patchSaveSnapshot, reloadAfterSavePatch } from "./helpers/save.js";
import { clearSave, clickCombatRun, startFreshRun, STORAGE_KEY } from "./helpers/index.js";

  test("game over screen persists across reload", async ({ page }) => {
    await page.goto("/?debug=lose");

    await expect(page.locator("#game-over")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#game-over-tag")).toHaveText("GAME OVER");

    await page.reload();

    await expect(page.locator("#game-over")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#game-over-tag")).toHaveText("GAME OVER");
    await expect(page.locator("#game-over-summary")).toContainText(/beat/i);
    await expect(page.locator("#game-over-battle-log")).toBeHidden();
    await page.getByText("Battle Log").click();
    await expect(page.locator("#game-over-battle-log")).toContainText("GAME OVER");
    await expect(page.locator("#game-over-battle-log")).toContainText(/WAVE|Turn/);
    await expect(page.locator("#actions")).toHaveClass(/hidden/);
  });

  test("game over log keeps capped dance hype inline", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, { hypeLevel: 5 });
    await reloadAfterSavePatch(page);
    await page.getByRole("button", { name: "Dance" }).click();

    await expect(page.locator("#battle-text .battle-line.battle-player")).toContainText(
      /MAX HYPE$/,
      { timeout: 10_000 }
    );

    await patchSaveSnapshot(page, {
      player: { hp: 0, maxHp: 20 },
    });
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error("missing save");
      const save = JSON.parse(raw);
      save.snapshot.phase = "gameover";
      localStorage.setItem(key, JSON.stringify(save));
    }, STORAGE_KEY);
    await page.reload();
    await expect(page.getByRole("button", { name: "Try Again?" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByText("Battle Log").click();
    await expect(page.locator("#game-over-battle-log")).toContainText(/MAX HYPE/);
    await expect(page.locator("#game-over-battle-log")).not.toContainText(
      "You're max hype!"
    );
    await expect(page.locator("#game-over-battle-log .game-over-log-entry", {
      hasText: /Turn \d+ - Dance/,
    })).toContainText(/MAX HYPE/);
  });

  test("shows turn dash on game over", async ({ page }) => {
    await startFreshRun(page);
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      const save = raw ? JSON.parse(raw) : {};
      localStorage.setItem(key, JSON.stringify({ ...save, bestWave: 0 }));
    }, STORAGE_KEY);
    await patchSaveSnapshot(page, {
      player: { hp: 1, maxHp: 20 },
      foe: { attack: 20 },
      wave: 2,
    });
    await reloadAfterSavePatch(page);
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.getByRole("button", { name: "Try Again?" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#game-over-summary")).toContainText(
      /^NEW RECORD! You beat 1 wave\./
    );
    await expect(page.locator("#turn-label")).toHaveText("-");
    await expect(page.locator("#wave-banner")).toContainText("Wave");
    await expect(page.locator("#game-over-battle-log")).toBeHidden();
    await page.getByText("Battle Log").click();
    await expect(page.locator("#game-over-battle-log")).not.toContainText(
      "What will you do?"
    );
    await expect(page.locator("#game-over-battle-log")).toContainText("WAVE 1");
    await expect(
      page.locator("#game-over-battle-log .game-over-log-meta", { hasText: "WAVE 1" })
    ).toHaveCount(1);
    await expect(page.locator("#game-over-battle-log")).toContainText(
      /LEVEL 1: \d+ HP · ATK \d+/
    );
    await expect(page.locator("#game-over-battle-log")).toContainText(
      /[A-Za-z -]+ · ATK \d+ · HP \d+/
    );
    await expect(page.locator("#game-over-battle-log")).not.toContainText(
      /HP \d+\/\d+/
    );
    await expect(page.locator("#game-over-battle-log")).not.toContainText(
      "Welcome back"
    );
    await expect(page.locator("#game-over-battle-log")).not.toContainText(
      "It's your turn against"
    );
    await expect(page.locator("#game-over-battle-log")).not.toContainText("appears!");
    await expect(page.locator("#game-over-battle-log")).toContainText(
      "Turn 1 - Attack"
    );
    await expect(page.locator("#game-over-battle-log")).not.toContainText(
      /You PWR \d\/5 · ATK \d+/
    );
    await expect(page.locator("#game-over-battle-log")).toContainText("GAME OVER");
    await expect(page.locator("#game-over-battle-log")).toContainText(/hits you/i);
  });

test.describe("wave victory heal", () => {
  test("defeating a foe heals 30% of missing max hp before next appears", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 8, maxHp: 20 },
      foe: { hp: 1, maxHp: 12 },
    });
    await reloadAfterSavePatch(page);

    const waveBefore = await page.locator("#wave-banner").textContent();
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/appears!/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#player-hp-text")).toHaveText("14/20");
    await expect(page.locator(".hero-hp-wrap .hp-bar")).toHaveClass(/hp-first-wave-heal-flash/);
    await expect(page.locator("#wave-banner")).not.toHaveText(waveBefore ?? "");

    await page.waitForTimeout(1500);
    await expect(page.locator(".hero-hp-wrap .hp-bar")).not.toHaveClass(
      /hp-first-wave-heal-flash/
    );
  });
});
