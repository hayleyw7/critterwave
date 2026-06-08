import { expect, test, type Page } from "@playwright/test";
import { patchSaveSnapshot, reloadAfterSavePatch } from "./helpers-save.js";
import { clearSave, clickCombatRun, startFreshRun, STORAGE_KEY } from "./helpers.js";

async function openMoreOptions(page: Page): Promise<void> {
  await page.getByRole("button", { name: "More options" }).click();
}

async function clickFooterMenuButton(page: Page, name: "New Run" | "Clear Data"): Promise<void> {
  await openMoreOptions(page);
  await page.getByRole("button", { name }).click();
}

test.describe("Critterwave — happy paths", () => {
  test("hero setup starts a run", async ({ page }) => {
    await startFreshRun(page);
    await expect(page.locator("#hero-name")).toContainText(/test critter/i);
    await expect(page.locator("#wave-banner")).toHaveText(/^Wave 1 \/ \d+$/);
    await expect(page.locator("#battle-text")).toContainText(/appears!/i);
    await expect(page.locator("#player-hp-text")).toHaveText("20/20");

    const save = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { setupActive?: boolean }) : null;
    }, STORAGE_KEY);
    expect(save?.setupActive).toBeFalsy();
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

  test("high score lives in the footer not the top hud", async ({ page }) => {
    await startFreshRun(page);
    await expect(page.locator(".records-bar #stat-best-wave")).toBeVisible();
    await expect(page.locator(".hud-stats #stat-best-wave")).toHaveCount(0);
    await expect(page.getByText("High Score", { exact: true })).toBeVisible();
  });

  test("compact one-line footer on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await startFreshRun(page);
    await expect(page.getByText("Best", { exact: true })).toBeVisible();
    await expect(page.getByText("Runs", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "How to play" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();
    await expect(page.getByRole("button", { name: "More options" })).toBeVisible();
    await openMoreOptions(page);
    await expect(page.getByRole("button", { name: "New Run" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "New Run" })).toBeHidden();
    await openMoreOptions(page);
    await page.locator("#battle-text").click();
    await expect(page.getByRole("button", { name: "New Run" })).toBeHidden();
    await expect(page.locator(".records-stat-label--long").first()).toBeHidden();
    await expect(page.locator(".records-stat-label--short").first()).toBeVisible();
  });

  test("help modal opens and closes from footer", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "How to play" }).click();
    await expect(page.locator("#help-overlay")).toBeVisible();
    await expect(page.getByRole("heading", { name: "How to Play" })).toBeVisible();
    await expect(page.locator("#help-overlay")).toContainText("Dance");
    await expect(page.locator(".help-goal")).toHaveText("Defeat 100 waves of critters!");
    await page.reload();
    await expect(page.locator("#help-overlay")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#help-overlay")).toHaveClass(/hidden/);
    await page.reload();
    await expect(page.locator("#help-overlay")).toHaveClass(/hidden/);
  });

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

  test("hides devil emoji in hero picker on mobile only", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await clearSave(page);
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
    await expect(page.locator('.emoji-pick[data-emoji="😈"]')).toHaveCount(0);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
    await expect(page.locator('.emoji-pick[data-emoji="😈"]')).toHaveCount(1);
  });

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

  test("theme toggle switches palette and persists", async ({ page }) => {
    await startFreshRun(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      /site-light\.webmanifest$/
    );
    await expect(page.locator("#battle-text")).toHaveCSS("color", "rgb(26, 15, 46)");

    const saveAfterToggle = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { colorMode?: string }) : null;
    }, STORAGE_KEY);
    expect(saveAfterToggle?.colorMode).toBe("light");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      /site-light\.webmanifest$/
    );
    await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
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

  test("setup screen survives reload with draft choices", async ({ page }) => {
    await clearSave(page);
    await page.locator(".emoji-pick").first().click();
    await page.getByLabel("Name").fill("Refresh Cat");
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
    await expect(page.getByLabel("Name")).toHaveValue("Refresh Cat");
    await expect(page.locator(".game-shell")).toHaveClass(/setup-active/);
  });

  test("setup draft persists setupActive in save", async ({ page }) => {
    await clearSave(page);
    await page.locator(".emoji-pick").first().click();
    await page.getByLabel("Name").fill("Saved Draft");

    const save = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { setupActive?: boolean; heroName?: string }) : null;
    }, STORAGE_KEY);

    expect(save?.setupActive).toBe(true);
    expect(save?.heroName).toBe("Saved Draft");
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
});
