import { expect, test } from "@playwright/test";
import { patchSavedSnapshot, readSave, writeSave } from "../helpers/security.js";
import { clearSave, startFreshRun } from "../helpers/index.js";

test.describe("security — XSS-safe rendering", () => {
  test("strips angle brackets from hero names entered at setup", async ({ page }) => {
    await startFreshRun(page, { name: "<Pat>" });
    await expect(page.locator("#hero-name")).toHaveText("PAT");
    await expect(page.locator("#hero-name img")).toHaveCount(0);
  });

  test("battle log dance lines do not inject script elements", async ({ page }) => {
    await startFreshRun(page, { name: "Safe Hero" });
    await page.getByRole("button", { name: "Dance" }).click();
    await expect(page.locator("#battle-text .battle-line.battle-foe").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator("#battle-text script")).toHaveCount(0);
    await expect(page.locator("#battle-text img")).toHaveCount(0);
  });
});
