import { expect, test } from "@playwright/test";
import { patchSaveSnapshot, reloadAfterSavePatch } from "./helpers-save.js";
import { clickCombatRun, startFreshRun, STORAGE_KEY } from "./helpers.js";

test.describe("combat hints — button glow", () => {
  test("setup shows attack goal; attack outline until first strike", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
    await expect(page.locator("#setup-subtitle")).toContainText(
      /Defeat all 100 waves to win!/i
    );

    await startFreshRun(page);
    await expect(page.locator("#cmd-attack")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#cmd-attack")).toHaveClass(/cmd-hint-flash/);
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You hit/i, { timeout: 10_000 });
    await expect(page.locator("#cmd-attack")).toHaveAttribute("data-combat-hint", "off");
    await expect(page.locator("#cmd-attack")).not.toHaveClass(/cmd-hint-flash/);
  });

  test("heal glows at low hp but not dance on same fight", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);

    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#cmd-heal-teach")).toBeVisible();
    await expect(page.locator("#cmd-heal-teach")).toContainText(
      /Restore HP — foe will hit back\./i
    );
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");

    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "off");
    await expect(page.locator("#cmd-heal-teach")).toBeHidden();
  });

  test("run teach popup survives the attack click that triggers lethal hint", async ({
    page,
  }) => {
    await startFreshRun(page);
    const foeAttackText = await page.locator("#foe-attack").textContent();
    const foeAttack = Number.parseInt(foeAttackText ?? "", 10);
    expect(Number.isFinite(foeAttack)).toBe(true);

    await patchSaveSnapshot(page, {
      player: { hp: foeAttack + 1, maxHp: 20 },
      foe: { hp: 999, maxHp: 999 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
        dismissedDanceHint: true,
      },
    });
    await reloadAfterSavePatch(page);

    await expect(page.locator("#cmd-run")).toHaveAttribute("data-combat-hint", "off");
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/hits you for/i, {
      timeout: 10_000,
    });

    await expect(page.locator("#cmd-run")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#cmd-run-teach")).toBeVisible();
    await expect(page.locator("#cmd-run-teach")).toContainText(
      /Run away — heal a little, face the next foe, and lose all HYPE\./i
    );
  });

  test("run glows at lethal hp and hides heal hint", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 3, maxHp: 20 },
      foe: { attack: 5 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedDanceHint: true,
      },
    });
    await reloadAfterSavePatch(page);

    await expect(page.locator("#cmd-run")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#cmd-run-teach")).toBeVisible();
    await expect(page.locator("#cmd-run-teach")).toContainText(
      /Run away — heal a little, face the next foe, and lose all HYPE\./i
    );
    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "off");

    await clickCombatRun(page);
    await expect(page.locator("#battle-text")).toContainText(/run into/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#cmd-run")).toHaveAttribute("data-combat-hint", "off");
    await expect(page.locator("#cmd-run-teach")).toBeHidden();

    await patchSaveSnapshot(page, { player: { hp: 20, maxHp: 20 } });
    await reloadAfterSavePatch(page);
    await expect(page.locator("#cmd-run")).toHaveAttribute("data-combat-hint", "off");
  });

  test("teach popups can be temporarily closed while keeping the hint glow", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);

    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#cmd-heal")).toHaveClass(/cmd-hint-flash/);
    await expect(page.locator("#cmd-heal-teach")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.locator("#cmd-heal-teach")).toBeHidden();
    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#cmd-heal")).toHaveClass(/cmd-hint-flash/);
  });

  test("clicking outside a teach popup closes only the popup", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 3, maxHp: 20 },
      foe: { attack: 5 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedDanceHint: true,
      },
    });
    await reloadAfterSavePatch(page);

    await expect(page.locator("#cmd-run")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#cmd-run")).toHaveClass(/cmd-hint-flash/);
    await expect(page.locator("#cmd-run-teach")).toBeVisible();

    await page.locator("#battle-text").click();

    await expect(page.locator("#cmd-run-teach")).toBeHidden();
    await expect(page.locator("#cmd-run")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#cmd-run")).toHaveClass(/cmd-hint-flash/);
  });

  test("heal hint stays off after heal was used this run", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);

    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "off");

    await patchSaveSnapshot(page, { player: { hp: 8, maxHp: 20 } });
    await reloadAfterSavePatch(page);
    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "off");
  });

  test("heal hint returns when low again after run grants a free heal", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);

    await clickCombatRun(page);
    await expect(page.locator("#battle-text")).toContainText(/run into/i, {
      timeout: 15_000,
    });

    await patchSaveSnapshot(page, { player: { hp: 8, maxHp: 20 } });
    await reloadAfterSavePatch(page);
    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "on");
  });

  test("heal hint returns when low again after topping up from a low-hp kill", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      foe: { hp: 1, maxHp: 10 },
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);

    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You (hit|defeat|vanquish|crush)/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#battle-text")).toContainText(/appears!/i, {
      timeout: 15_000,
    });

    await patchSaveSnapshot(page, { player: { hp: 8, maxHp: 20 } });
    await reloadAfterSavePatch(page);
    await expect(page.locator("#cmd-heal")).toHaveAttribute("data-combat-hint", "on");
  });
  test("dance glows on wave 2 at full hp until first hype after wasted heal", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 20, maxHp: 20 },
      foe: { hp: 1, maxHp: 10 },
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);

    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#battle-text")).toContainText(/hits you for/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");

    await expect(async () => {
      await page.getByRole("button", { name: "Attack" }).click();
      await expect(page.locator("#battle-text")).toContainText(/You (hit|defeat|vanquish|crush)/i);
    }).toPass({ timeout: 10_000 });
    await expect(page.locator("#battle-text")).toContainText(/appears!/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#cmd-dance-teach")).toBeVisible();
    await expect(page.locator("#cmd-dance-teach")).toContainText(
      /Dance may add HYPE — makes hits stronger, for you and\/or the foe\./i
    );
    await expect(page.locator("#battle-text")).not.toContainText(
      /Dance may add HYPE — makes hits stronger, for you and\/or the foe\./i
    );
  });
});

test.describe("combat hints — dance after heal", () => {
  test("dance does not glow during heal fight", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);

    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");
  });

  test("dance glows at full hp when save restored mid-run", async ({ page }) => {
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
    await expect(page.getByText(/Welcome back — your run was restored/i)).toBeVisible();
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#cmd-dance-teach")).toBeVisible();
    await expect(page.locator("#cmd-dance-teach")).toContainText(
      /Dance may add HYPE — makes hits stronger, for you and\/or the foe\./i
    );
    await expect(page.locator("#battle-text")).not.toContainText(
      /Dance may add HYPE — makes hits stronger, for you and\/or the foe\./i
    );
  });

  test("dance keeps glowing across mobs until first hype", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 20, maxHp: 20 },
      foe: { hp: 1, maxHp: 12 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
        showDanceHintThisFoe: true,
      },
    });
    await reloadAfterSavePatch(page);
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "on");

    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You (hit|defeat|vanquish|crush)/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");

    await expect(page.locator("#battle-text")).toContainText(/appears!/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "on");
  });

  test("dance returns at the start of each new foe until used once", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 12, maxHp: 20 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
      },
    });
    await reloadAfterSavePatch(page);
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");

    await clickCombatRun(page);
    await expect(page.locator("#battle-text")).toContainText(/run into/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");

    await patchSaveSnapshot(page, { foe: { hp: 1, maxHp: 12 } });
    await reloadAfterSavePatch(page);
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/appears!/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "on");
  });

  test("run hides dance while lethal then dance returns when safe", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 1, maxHp: 20 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
      },
    });
    await reloadAfterSavePatch(page);

    await expect(page.locator("#cmd-run")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");

    await patchSaveSnapshot(page, { player: { hp: 20, maxHp: 20 } });
    await reloadAfterSavePatch(page);
    await expect(page.locator("#cmd-run")).toHaveAttribute("data-combat-hint", "off");
    await patchSaveSnapshot(page, {
      combatHints: { showDanceHintThisFoe: true },
    });
    await reloadAfterSavePatch(page);
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "on");
  });
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

test.describe("combat hints — setup", () => {
  test("empty name shows highlight and teach pulse on fight click", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await reloadAfterSavePatch(page);

    await page.locator(".emoji-pick").first().click();
    await page.getByLabel("Name").fill("");
    await page.getByRole("button", { name: "Fight!" }).click();

    await expect(page.locator("#hero-name-input")).toHaveClass(/setup-name-input--highlight/);
    await expect(page.locator("#hero-name-input")).toHaveClass(/setup-name-teach-flash/);
  });
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

test.describe("combat hints — teach flashes", () => {
  test("first attack blinks foe hp bar once", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You hit/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#foe-panel .hp-bar")).toHaveClass(/hp-first-attack-flash/);

    await page.waitForTimeout(1500);
    await expect(page.locator("#foe-panel .hp-bar")).not.toHaveClass(/hp-first-attack-flash/);
  });

  test("first heal blinks player hp bar once", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);

    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
    await expect(page.locator(".hero-hp-wrap .hp-bar")).toHaveClass(/hp-first-heal-flash/);

    await page.waitForTimeout(1500);
    await expect(page.locator(".hero-hp-wrap .hp-bar")).not.toHaveClass(/hp-first-heal-flash/);
  });

  test("attack counter drops hype when player already had hype", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 20, maxHp: 20 },
      hypeLevel: 3,
      foe: { hp: 50, maxHp: 50 },
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);

    await expect(page.locator("#player-buff")).toHaveText("HYPE 3/5");
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/You hit/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#battle-text")).toContainText(/hits you for/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#player-buff")).toHaveText("HYPE 2/5");
  });

  test("heal does not grant hype without a dance", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);

    await expect(page.locator("#player-buff")).toHaveText("HYPE 0/5");
    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#player-buff")).toHaveText("HYPE 0/5");
  });

  test("heal with counter drops hype when player already had hype", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      hypeLevel: 3,
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);

    await expect(page.locator("#player-buff")).toHaveText("HYPE 3/5");
    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#battle-text")).toContainText(/hits you for/i, {
      timeout: 10_000,
    });
    await expect(page.locator("#player-buff")).toHaveText("HYPE 2/5");
  });

  test("first heal does not blink player hype when counter zeros HYPE", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 10, maxHp: 20 },
      combatHints: { dismissedAttackHint: true },
    });
    await reloadAfterSavePatch(page);

    await page.getByRole("button", { name: "Heal" }).click();
    await expect(page.locator("#battle-text")).toContainText(/healed yourself/i, {
      timeout: 10_000,
    });

    await expect(page.locator("#player-buff")).toHaveText("HYPE 0/5");
    await expect(page.locator("#player-hype-wrap")).not.toHaveClass(/hype-first-dance-flash/);

    await page.waitForTimeout(1600);
    await expect(page.locator("#player-hype-wrap")).not.toHaveClass(/hype-first-dance-flash/);
  });
});

test.describe("combat hints — wave 12 dance fallback", () => {
  test("dance glows at wave 12 when full hp and still at 0 hype", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      wave: 12,
      hypeLevel: 0,
      player: { hp: 23, maxHp: 23 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
        showDanceHintThisFoe: true,
      },
    });
    await reloadAfterSavePatch(page);

    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "on");
    await expect(page.locator("#wave-banner")).toContainText("12");
  });

  test("dance does not glow at wave 11 without a post-kill arm", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      wave: 11,
      hypeLevel: 0,
      player: { hp: 23, maxHp: 23 },
      combatHints: {
        dismissedAttackHint: true,
        dismissedHealHint: true,
      },
    });
    await reloadAfterSavePatch(page);
    await expect(page.locator("#cmd-dance")).toHaveAttribute("data-combat-hint", "off");
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

test.describe("ui labels", () => {
  test("shows high score and new run labels", async ({ page }) => {
    await startFreshRun(page);
    await expect(page.getByText("High Score", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "More options" }).click();
    await expect(page.getByRole("button", { name: "New Run" })).toBeVisible();
  });

  test("shows title case footer and restart labels", async ({ page }) => {
    await startFreshRun(page);
    await expect(page.getByText("Runs Played")).toBeVisible();
    await expect(page.getByRole("button", { name: "More options" })).toBeVisible();
    await patchSaveSnapshot(page, {
      player: { hp: 1, maxHp: 20 },
      foe: { attack: 20 },
    });
    await reloadAfterSavePatch(page);
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#cmd-attack")).toBeEnabled({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Try Again?" })).toBeVisible({
      timeout: 15_000,
    });
  });
});
