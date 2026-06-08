import { expect, test } from "@playwright/test";
import { patchSaveSnapshot, reloadAfterSavePatch } from "./helpers/save.js";
import { openMoreOptions } from "./helpers/app.js";
import { clearSave, startFreshRun, STORAGE_KEY } from "./helpers/index.js";

test.describe("setup — hero color", () => {
  test("picker saves heroColorTheme and applies it after reload", async ({ page }) => {
    await clearSave(page);
    await page.locator(".emoji-pick").first().click();
    await page.getByLabel("Name").fill("Color Cat");
    await page.locator("#hero-color-toggle").click();
    await page.locator('.setup-color-swatch[data-theme="rose"]').click();
    await page.getByRole("button", { name: "Fight!" }).click();
    await expect(page.getByLabel("Combat actions")).toBeVisible();

    const saveMidRun = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { heroColorTheme?: string }) : null;
    }, STORAGE_KEY);
    expect(saveMidRun?.heroColorTheme).toBe("rose");

    await page.reload();
    await expect(page.getByLabel("Combat actions")).toBeVisible();
    const playerAccent = await page.locator("#player-panel").evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--hero").trim()
    );
    expect(playerAccent).toBeTruthy();
  });
});

test.describe("app — theme on setup", () => {
  test("setup screen reflects saved light theme on boot", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(
      (key) => {
        localStorage.setItem(
          key,
          JSON.stringify({ colorMode: "light", bestWave: 0, runsPlayed: 0, setupActive: true })
        );
      },
      STORAGE_KEY
    );
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("#character-setup")).toBeVisible();
    await expect(page.locator(".setup-panel")).toBeVisible();
  });
});

test.describe("combat — command button text colors", () => {
  test("each action button uses its themed text color, not generic dialog text", async ({
    page,
  }) => {
    await startFreshRun(page);
    const { attack, heal, dance, run, dialogText } = await page.evaluate(() => {
      const colorOf = (id: string) =>
        getComputedStyle(document.getElementById(id)!).color;
      return {
        attack: colorOf("cmd-attack"),
        heal: colorOf("cmd-heal"),
        dance: colorOf("cmd-dance"),
        run: colorOf("cmd-run"),
        dialogText: getComputedStyle(document.querySelector(".dialog-box")!).color,
      };
    });

    expect(attack).not.toBe(dialogText);
    expect(heal).not.toBe(dialogText);
    expect(dance).not.toBe(dialogText);
    expect(run).not.toBe(dialogText);
    expect(new Set([attack, heal, dance, run]).size).toBe(4);
  });
});

test.describe("app — help action colors", () => {
  test("help modal action terms use combat command color classes", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "How to play" }).click();
    await expect(page.locator(".help-action-attack")).toBeVisible();
    await expect(page.locator(".help-action-heal")).toBeVisible();
    await expect(page.locator(".help-action-dance")).toBeVisible();
    await expect(page.locator(".help-action-run")).toBeVisible();

    await expect(page.locator(".help-action-attack")).toHaveClass(/help-action-attack/);
    await expect(page.locator(".help-action-heal")).toHaveClass(/help-action-heal/);
    await expect(page.locator(".help-action-dance")).toHaveClass(/help-action-dance/);
    await expect(page.locator(".help-action-run")).toHaveClass(/help-action-run/);
  });
});

test.describe("persistence — confirm dialog", () => {
  test("blocks combat actions while confirm is open", async ({ page }) => {
    await startFreshRun(page);
    await openMoreOptions(page);
    await page.getByRole("button", { name: "New Run" }).click();
    await expect(page.locator("#confirm-overlay")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start a new run?" })).toBeVisible();

    const turnBefore = await page.locator("#turn-label").textContent();
    const attackBlocked = await page.locator("#cmd-attack").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const top = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      );
      return top !== el && !el.contains(top);
    });
    expect(attackBlocked).toBe(true);
    await expect(page.locator("#turn-label")).toHaveText(turnBefore ?? "");

    await page.locator("#confirm-cancel").click();
    await expect(page.locator("#confirm-overlay")).toHaveClass(/hidden/);
    await expect(page.locator("#cmd-attack")).toBeEnabled();
  });
});

test.describe("presentation — level boundary", () => {
  test("shows updated level stat after crossing a level band", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, { wave: 11 });
    await reloadAfterSavePatch(page);
    await expect(page.locator("#player-level")).toHaveText("2");
    await patchSaveSnapshot(page, { wave: 12 });
    await reloadAfterSavePatch(page);
    await expect(page.locator("#player-level")).toHaveText("2");
    await patchSaveSnapshot(page, { wave: 21 });
    await reloadAfterSavePatch(page);
    await expect(page.locator("#player-level")).toHaveText("3");
    await expect(page.locator("#wave-banner")).toContainText("Wave 21");
  });
});

test.describe("game-over — restart and victory", () => {
  test("try again restarts combat from wave 1", async ({ page }) => {
    await page.goto("/?debug=lose");
    await expect(page.getByRole("button", { name: "Try Again?" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Try Again?" }).click();
    await expect(page.locator("#game-over")).toHaveClass(/hidden/);
    await expect(page.getByLabel("Combat actions")).toBeVisible();
    await expect(page.locator("#wave-banner")).toContainText("Wave 1");
  });

  test("victory screen spawns emoji celebration layer", async ({ page }) => {
    await page.goto("/?debug=win");
    await expect(page.locator("#game-over")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#victory-emoji-layer")).not.toHaveClass(/hidden/);
    await expect(page.locator("#victory-emoji-layer .victory-emoji")).not.toHaveCount(0);
  });
});
