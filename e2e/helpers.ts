import { expect, type Page } from "@playwright/test";

export const STORAGE_KEY = "critterwave-v1";

export async function clearSave(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
}

export async function startFreshRun(
  page: Page,
  options: { name?: string; emojiIndex?: number } = {}
): Promise<void> {
  const { name = "Test Critter", emojiIndex = 0 } = options;
  await clearSave(page);
  await expect(
    page.getByRole("heading", { name: "What critter are you?" })
  ).toBeVisible();

  await page.locator(".emoji-pick").nth(emojiIndex).click();
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Fight!" }).click();

  await expect(page.getByLabel("Combat actions")).toBeVisible();
  await expect(page.getByRole("button", { name: "Attack" })).toBeEnabled();
}
