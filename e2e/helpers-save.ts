import { expect, type Page } from "@playwright/test";
import { STORAGE_KEY } from "./helpers.js";

const SKIP_EXIT_FLUSH_KEY = "critterwave-skip-exit-flush";

type SnapshotPatch = {
  player?: { hp?: number; maxHp?: number };
  foe?: { hp?: number; maxHp?: number; attack?: number };
  wave?: number;
  hypeLevel?: number;
  foeHypeLevel?: number;
  combatHints?: Record<string, boolean>;
  foeQueueIds?: string[];
  deferredFoeIds?: string[];
};

export async function patchSaveSnapshot(
  page: Page,
  patch: SnapshotPatch
): Promise<void> {
  await page.evaluate(
    ({ key, patch: p, skipKey }) => {
      sessionStorage.setItem(skipKey, "1");
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error("missing save");
      const data = JSON.parse(raw) as { snapshot?: Record<string, unknown> };
      if (!data.snapshot) throw new Error("missing snapshot");
      if (p.player) {
        data.snapshot.player = { ...(data.snapshot.player as object), ...p.player };
      }
      if (p.foe) {
        data.snapshot.foe = { ...(data.snapshot.foe as object), ...p.foe };
      }
      if (p.wave !== undefined) data.snapshot.wave = p.wave;
      if (p.hypeLevel !== undefined) data.snapshot.hypeLevel = p.hypeLevel;
      if (p.foeHypeLevel !== undefined) data.snapshot.foeHypeLevel = p.foeHypeLevel;
      if (p.combatHints) {
        data.snapshot.combatHints = {
          ...(data.snapshot.combatHints as object),
          ...p.combatHints,
        };
      }
      if (p.foeQueueIds) data.snapshot.foeQueueIds = p.foeQueueIds;
      if (p.deferredFoeIds) data.snapshot.deferredFoeIds = p.deferredFoeIds;
      localStorage.setItem(key, JSON.stringify(data));
    },
    { key: STORAGE_KEY, patch, skipKey: SKIP_EXIT_FLUSH_KEY }
  );
}

/** Reload after patchSaveSnapshot without pagehide clobbering the patched save. */
export async function reloadAfterSavePatch(page: Page): Promise<void> {
  await page.reload();
  await expect(page.getByLabel("Combat actions")).toBeVisible();
  await expect(page.getByRole("button", { name: "Attack" })).toBeEnabled();
}

export async function readSaveSnapshot(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error("missing save");
    const data = JSON.parse(raw) as { snapshot?: Record<string, unknown> };
    if (!data.snapshot) throw new Error("missing snapshot");
    return data.snapshot;
  }, STORAGE_KEY);
}
