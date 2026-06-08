import { expect, test } from "@playwright/test";
import { patchSavedSnapshot, readSave, writeSave } from "../helpers/security.js";
import { clearSave, startFreshRun } from "../helpers/index.js";

test.describe("security — setup persistence hygiene", () => {
  test("persisted setup draft keeps normalized hero name", async ({ page }) => {
    await clearSave(page);
    await page.locator(".emoji-pick").first().click();
    await page.getByLabel("Name").fill("  Draft   Name  ");
    const save = await readSave(page);
    expect(save?.heroName).toBe("Draft Name");
  });
});
