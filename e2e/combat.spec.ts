import { expect, test, type Page } from "@playwright/test";
import { patchSaveSnapshot, reloadAfterSavePatch } from "./helpers/save.js";
import { clearSave, clickCombatRun, startFreshRun, STORAGE_KEY } from "./helpers/index.js";

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
    await expect(page.locator("#battle-text .battle-line.battle-foe")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("first dance gives player hype only", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Dance" }).click();
    await expect(page.locator("#battle-text .battle-line.battle-player")).toContainText(/\+1 HYPE$/, {
      timeout: 10_000,
    });
    await expect(page.locator("#battle-text .battle-hype-line")).toHaveCount(0);
    await expect(page.locator("#player-buff")).toHaveText("HYPE 1/5");
    await expect(page.locator("#foe-buff")).toHaveText("HYPE 0/5");
  });

  test("run away keeps wave and shows next foe", async ({ page }) => {
    await startFreshRun(page);
    const waveBefore = await page.locator("#wave-banner").textContent();
    const foeBefore = await page.locator("#foe-name").textContent();
    await clickCombatRun(page);
    await expect(page.locator("#battle-text")).toContainText(
      /run away from/i,
      { timeout: 10_000 }
    );
    await expect(page.locator("#battle-text")).toContainText(/run into/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#wave-banner")).toHaveText(waveBefore ?? "");
    await expect(page.locator("#foe-name")).not.toHaveText(foeBefore ?? "");
  });

test.describe("foe queue — run away", () => {
  test("run keeps wave number and changes foe", async ({ page }) => {
    await startFreshRun(page);
    const waveBefore = await page.locator("#wave-banner").textContent();
    const foeBefore = await page.locator("#foe-name").textContent();

    await clickCombatRun(page);
    await expect(page.locator("#battle-text")).toContainText(/run into/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#wave-banner")).toHaveText(waveBefore ?? "");
    await expect(page.locator("#foe-name")).not.toHaveText(foeBefore ?? "");
  });

  test("run grants one free heal roll when hurt", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 6, maxHp: 20 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
        dismissedDanceHint: true,
      },
    });
    await reloadAfterSavePatch(page);

    await clickCombatRun(page);
    await expect(page.locator("#battle-text")).toContainText(/run into/i, {
      timeout: 15_000,
    });

    const hpText = await page.locator("#player-hp-text").textContent();
    const match = hpText?.match(/^(\d+)\/20$/);
    expect(match).not.toBeNull();
    const hp = Number(match![1]);
    expect(hp).toBeGreaterThan(6);
    expect(hp).toBeLessThanOrEqual(13);
  });

  test("deferred foe id is stored after run", async ({ page }) => {
    await startFreshRun(page);
    const foeBefore = await page.locator("#foe-name").textContent();

    await clickCombatRun(page);
    await expect(page.locator("#battle-text")).toContainText(/run into/i, {
      timeout: 15_000,
    });

    const deferred = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      const data = JSON.parse(raw!) as { snapshot?: { deferredFoeIds?: string[] } };
      return data.snapshot?.deferredFoeIds ?? [];
    }, STORAGE_KEY);

    expect(deferred.length).toBe(1);
    expect(foeBefore?.length).toBeGreaterThan(0);
  });
});


test.describe("combat — foe hype", () => {
  test("foe hype drops by one when player damage lands", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      foeHypeLevel: 3,
      foe: { hp: 40, maxHp: 40 },
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);

    await expect(page.locator("#foe-buff")).toHaveText("HYPE 3/5");
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You hit/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#foe-buff")).toHaveText("HYPE 2/5");
  });
});
