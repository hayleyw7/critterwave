import { expect, test, type Page } from "@playwright/test";
import { patchSaveSnapshot, reloadAfterSavePatch } from "./helpers/save.js";
import { clearSave, clickCombatRun, startFreshRun, STORAGE_KEY } from "./helpers/index.js";
import { clickFooterMenuButton, openMoreOptions } from "./helpers/app.js";

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
    await expect(page.getByRole("button", { name: "New Run and data options" })).toBeVisible();
    await openMoreOptions(page);
    await expect(page.getByRole("button", { name: "New Run", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "New Run", exact: true })).toBeHidden();
    await openMoreOptions(page);
    await page.locator("#battle-text").click();
    await expect(page.getByRole("button", { name: "New Run", exact: true })).toBeHidden();
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

test.describe("ui labels", () => {
  test("sound controls cycle high, low, and off", async ({ page }) => {
    await startFreshRun(page);
    await page.getByRole("button", { name: "Sound options" }).click();

    const music = page.locator("#music-level-btn");
    const sfx = page.locator("#sfx-level-btn");
    await expect(music).toHaveText("Music: High");
    await music.click();
    await expect(music).toHaveText("Music: Low");
    await music.click();
    await expect(music).toHaveText("Music: Off");
    await music.click();
    await expect(music).toHaveText("Music: High");

    await expect(sfx).toHaveText("SFX: High");
    await sfx.click();
    await expect(sfx).toHaveText("SFX: Low");
    await sfx.click();
    await expect(sfx).toHaveText("SFX: Off");
  });

  test("shows high score and new run labels", async ({ page }) => {
    await startFreshRun(page);
    await expect(page.getByText("High Score", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "New Run and data options" }).click();
    await expect(page.getByRole("button", { name: "New Run", exact: true })).toBeVisible();
  });

  test("shows title case footer and restart labels", async ({ page }) => {
    await startFreshRun(page);
    await expect(page.getByText("Runs Played")).toBeVisible();
    await expect(page.getByRole("button", { name: "New Run and data options" })).toBeVisible();
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


test("New Run and Clear Data hover fills retain the right opacity for each theme", async ({ page }) => {
  await startFreshRun(page);
  const menu = page.getByRole("button", { name: "New Run and data options" });
  await menu.click();
  const colors = [];
  for (const theme of ["dark", "light"]) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    for (const label of ["New Run", "Clear Data"]) {
      const button = page.getByRole("button", { name: label, exact: true });
      await button.hover();
      const rgba = await button.evaluate(el => {
        const ctx = document.createElement("canvas").getContext("2d")!;
        ctx.fillStyle = getComputedStyle(el).backgroundColor;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data];
      });
      if (theme === "dark") expect(rgba[3]).toBe(255);
      else expect(rgba[3]! / 255).toBeCloseTo(label === "New Run" ? 0.14 : 0.18, 2);
      colors.push(rgba);
      await button.focus();
      await expect(button).toBeFocused();
    }
    expect(colors.at(-1)).not.toEqual(colors.at(-2));
  }
});


test("battle cards switch at 615px without overlapping stats, including just above the breakpoint", async ({ page }) => {
  await startFreshRun(page);
  for (const width of [535, 615, 616]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(page.locator(".portrait-notice")).toBeHidden();
    await expect(page.locator("#player-panel")).toHaveCSS("display", width <= 615 ? "contents" : "grid");
    for (const group of await page.locator(".stat-group").all()) {
      const fits = await group.evaluate(el => {
        const left = el.querySelector(".stat-left > :last-child")!.getBoundingClientRect();
        const hype = el.querySelector(".hype-stat-wrap .hype-stat")!.getBoundingClientRect();
        const bounds = el.getBoundingClientRect();
        return (left.right <= hype.left + 1 || left.bottom <= hype.top + 1)
          && left.left >= bounds.left - 1 && hype.right <= bounds.right + 1
          && el.scrollWidth <= el.clientWidth + 1;
      });
      expect(fits, `battle stats fit at ${width}px`).toBe(true);
    }
  }
});
