import { expect, test, type Page } from "@playwright/test";
import { patchSaveSnapshot, reloadAfterSavePatch } from "./helpers/save.js";
import { clearSave, clickCombatRun, startFreshRun, STORAGE_KEY } from "./helpers/index.js";

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

  test("hides devil emoji in hero picker on mobile and fills complete rows", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await clearSave(page);
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
    await expect(page.locator('.emoji-pick[data-emoji="😈"]')).toHaveCount(0);
    await expect(
      page.evaluate(() => {
        const cells = [...document.querySelectorAll(".emoji-pick")] as HTMLElement[];
        const firstTop = cells[0]?.offsetTop ?? 0;
        let columns = 0;
        for (const cell of cells) {
          if (cell.offsetTop > firstTop) break;
          columns++;
        }
        columns = Math.max(1, columns);
        return cells.length > 0 && cells.length % columns === 0;
      })
    ).resolves.toBe(true);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Which critter are you?" })
    ).toBeVisible();
    await expect(page.locator('.emoji-pick[data-emoji="😈"]')).toHaveCount(0);
    await expect(
      page.evaluate(() => {
        const cells = [...document.querySelectorAll(".emoji-pick")] as HTMLElement[];
        const firstTop = cells[0]?.offsetTop ?? 0;
        let columns = 0;
        for (const cell of cells) {
          if (cell.offsetTop > firstTop) break;
          columns++;
        }
        columns = Math.max(1, columns);
        return cells.length > 0 && cells.length % columns === 0;
      })
    ).resolves.toBe(true);
  });

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
