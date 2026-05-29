import type { Page } from "@playwright/test";
import { STORAGE_KEY } from "./helpers.js";

type SavePayload = Record<string, unknown>;

export async function writeSave(page: Page, payload: SavePayload): Promise<void> {
  await page.evaluate(
    ({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    },
    { key: STORAGE_KEY, data: payload }
  );
}

export async function readSave(page: Page): Promise<SavePayload | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  }, STORAGE_KEY);
}

export async function patchSavedSnapshot(
  page: Page,
  patch: Record<string, unknown>
): Promise<void> {
  await page.evaluate(
    ({ key, patch: p }) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error("missing save");
      const data = JSON.parse(raw) as { snapshot?: Record<string, unknown> };
      if (!data.snapshot) throw new Error("missing snapshot");
      data.snapshot = { ...data.snapshot, ...p };
      localStorage.setItem(key, JSON.stringify(data));
    },
    { key: STORAGE_KEY, patch }
  );
}
