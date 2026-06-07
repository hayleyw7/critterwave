import { expect, test } from "@playwright/test";
import { patchSavedSnapshot, readSave, writeSave } from "./helpers-security.js";
import { clearSave, startFreshRun } from "./helpers.js";

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

test.describe("security — XSS-safe rendering", () => {
  test("strips angle brackets from hero names entered at setup", async ({ page }) => {
    await startFreshRun(page, { name: "<Pat>" });
    await expect(page.locator("#hero-name")).toHaveText("PAT");
    await expect(page.locator("#hero-name img")).toHaveCount(0);
  });

  test("battle log dance lines do not inject script elements", async ({ page }) => {
    await startFreshRun(page, { name: "Safe Hero" });
    await page.getByRole("button", { name: "Dance" }).click();
    await expect(page.locator("#battle-text .battle-line.battle-foe").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator("#battle-text script")).toHaveCount(0);
    await expect(page.locator("#battle-text img")).toHaveCount(0);
  });
});

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

test.describe("security — setup persistence hygiene", () => {
  test("persisted setup draft keeps normalized hero name", async ({ page }) => {
    await clearSave(page);
    await page.locator(".emoji-pick").first().click();
    await page.getByLabel("Name").fill("  Draft   Name  ");
    const save = await readSave(page);
    expect(save?.heroName).toBe("Draft Name");
  });
});
