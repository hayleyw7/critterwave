import { expect, type Page } from "@playwright/test";
import { LEGACY_STORAGE_KEYS, STORAGE_KEY } from "../../src/game/storage-keys.js";

export { LEGACY_STORAGE_KEYS, STORAGE_KEY };

export async function clearSave(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(
    ({ key, legacyKeys }) => {
      localStorage.removeItem(key);
      for (const legacyKey of legacyKeys) {
        localStorage.removeItem(legacyKey);
      }
    },
    { key: STORAGE_KEY, legacyKeys: [...LEGACY_STORAGE_KEYS] }
  );
  await page.reload();
}

export async function startFreshRun(
  page: Page,
  options: { name?: string; emojiIndex?: number } = {}
): Promise<void> {
  const { name = "Test Critter", emojiIndex = 0 } = options;
  await clearSave(page);
  await expect(
    page.getByRole("heading", { name: "Which critter are you?" })
  ).toBeVisible();

  await page.locator(".emoji-pick").nth(emojiIndex).click();
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Fight!" }).click();

  await expect(page.getByLabel("Combat actions")).toBeVisible();
  await expect(page.getByRole("button", { name: "Attack" })).toBeEnabled();
}

export async function clickCombatRun(page: Page): Promise<void> {
  await page.locator("#cmd-run").click();
}
