import type { Page } from "@playwright/test";

export async function openMoreOptions(page: Page): Promise<void> {
  await page.getByRole("button", { name: "More options" }).click();
}

export async function clickFooterMenuButton(
  page: Page,
  name: "New Run" | "Clear Data"
): Promise<void> {
  await openMoreOptions(page);
  await page.getByRole("button", { name }).click();
}
