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
  await expect(play).toHaveCSS("animation-name", "play-glow");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(play).toHaveCSS("animation-name", "none");
  await expect(play).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(play).toHaveCSS("animation-name", "play-glow");
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
    expect(wordmark.ink / width, JSON.stringify({width,...wordmark})).toBeGreaterThanOrEqual(0.81);
    expect(wordmark.ink / width, JSON.stringify({width,...wordmark})).toBeLessThanOrEqual(0.85);
    expect(wordmark.left).toBeGreaterThan(5);
    expect(wordmark.right).toBeLessThan(width - 5);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const pixels = await page.screenshot();
  const logo = await page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const {data: rgba} = context.getImageData(0, 0, canvas.width, canvas.height);
    let left = canvas.width, right = 0;
    for (let i=0; i<rgba.length; i+=4) {
      if (rgba[i]! > 175 && rgba[i+1]! > 145 && rgba[i+2]! < 115) {
        const x = (i/4) % canvas.width;
        left = Math.min(x,left);
        right = Math.max(x,right);
      }
    }
    return { left, right, width: canvas.width };
  }, pixels.toString("base64"));
  expect((logo.right-logo.left+1)/logo.width, JSON.stringify(logo)).toBeGreaterThan(0.81);
  expect((logo.right-logo.left+1)/logo.width, JSON.stringify(logo)).toBeLessThan(0.85);
  expect(Math.abs(logo.left - (logo.width - 1 - logo.right)),JSON.stringify(logo)).toBeLessThanOrEqual(3);
  await play.tap();
  await expect(page.getByRole("heading", { name: "Which critter are you?" })).toBeVisible();
  await context.close();
});
