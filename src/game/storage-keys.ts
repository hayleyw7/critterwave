export const STORAGE_KEY = "critterwave-v1.1";
/** Older localStorage keys migrated to STORAGE_KEY on first read. */
export const LEGACY_STORAGE_KEYS = [
  "critterwave-v1.0",
  "critterwave-v0.7",
  "critterwave-v6",
] as const;
