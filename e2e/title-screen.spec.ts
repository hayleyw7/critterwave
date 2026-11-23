import { test, expect } from "@playwright/test";
import { INTRO_SEEN_KEY, STORAGE_KEY } from "../src/game/storage-keys.js";

test.use({ storageState: { cookies: [], origins: [] } });

test("first visit requires Play, leaves title and picker silent and then starts music", async ({ page }) => {
  await page.addInitScript(() => {
    const proto = AudioContext.prototype;
    const oscillator = proto.createOscillator;
    let notes = 0;
    proto.createOscillator = function () {
      document.documentElement.dataset.audioNotes = String(++notes);
      return oscillator.call(this);
    };
  });
  await page.goto("/");
  const play = page.getByRole("button", { name: "Play", exact: true });
  const picker = page.getByRole("heading", { name: "Which critter are you?" });
  await expect(page.getByRole("heading", { name: "Critterwave" })).toBeVisible();
  await expect(picker).toBeHidden();
  await expect(page.locator("html")).not.toHaveAttribute("data-audio-notes", /.+/);
  await page.keyboard.press("Tab");
  await expect(play).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(picker).toBeVisible();
  await page.getByRole("textbox", { name: "Name" }).fill("Test Critter");
  await page.waitForTimeout(400);
  await expect(page.locator("html")).not.toHaveAttribute("data-audio-notes", /.+/);
  await page.locator(".emoji-pick").first().click();
  await page.getByRole("button", { name: "Fight!" }).click();
  await expect(page.getByRole("button", { name: "Attack" })).toBeEnabled();
  await expect(page.locator("html")).toHaveAttribute("data-audio-notes", /[1-9]/);
  const save = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  expect(save).toContain("Test Critter");
  await page.reload();
  await expect(play).toBeHidden();
  await expect(page.getByRole("button", { name: "Attack" })).toBeEnabled();
  expect(await page.evaluate(key => localStorage.getItem(key), INTRO_SEEN_KEY)).toBe("1");
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toContain("Test Critter");
  await page.keyboard.press("Shift");
  await expect(page.locator("html")).toHaveAttribute("data-audio-notes", /[1-9]/);

  // Simulate a saved run from before this feature existed.
  const existing = await page.evaluate(({intro,save}) => {
    localStorage.removeItem(intro);
    const snapshot=localStorage.getItem(save);
    sessionStorage.setItem("critterwave-skip-exit-flush","1");
    return snapshot;
  }, {intro:INTRO_SEEN_KEY,save:STORAGE_KEY});
  await page.reload();
  await expect(play).toBeVisible();
  expect(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY)).toBe(existing);
  await play.click();
  await expect(page.getByRole("button", { name: "Attack" })).toBeEnabled();
  await expect(page.locator("#hero-name")).toContainText(/test critter/i);
  await expect(page.locator("html")).toHaveAttribute("data-audio-notes", /[1-9]/);
});

test("mobile rotates safely and Play opens the picker", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ isMobile: true, hasTouch: true, viewport: { width: 844, height: 390 } });
  const page = await context.newPage();
  await page.goto(baseURL!);
  const play = page.getByRole("button", { name: "Play", exact: true });
  await expect(page.getByText("Rotate your device to portrait.")).toBeVisible();
  await expect(play).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(play).toBeVisible();
  for (const width of [320, 360, 390, 430, 558, 650]) {
    await page.setViewportSize({ width, height: 844 });
    const wordmark = await page.locator("#title-screen-wordmark").evaluate(async (el) => {
      await document.fonts.ready;
      const style = getComputedStyle(el);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      context.font = `${style.fontSize} ${style.fontFamily}`;
      context.letterSpacing = style.letterSpacing;
      const ink = context.measureText(el.textContent!.toUpperCase());
      const bounds = el.getBoundingClientRect();
      return { ink: ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight, left: bounds.left, right: bounds.right };
    });
    expect(wordmark.ink / width, JSON.stringify({width,...wordmark})).toBeGreaterThanOrEqual(0.88);
    expect(wordmark.ink / width, JSON.stringify({width,...wordmark})).toBeLessThanOrEqual(0.92);
    expect(wordmark.left).toBeGreaterThan(5);
    expect(wordmark.right).toBeLessThan(width - 5);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await play.tap();
  await expect(page.getByRole("heading", { name: "Which critter are you?" })).toBeVisible();
  await context.close();
});
