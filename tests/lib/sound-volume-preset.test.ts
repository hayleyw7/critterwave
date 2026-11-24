import { describe, expect, it } from "vitest";
import {
  channelLevelLabel,
  channelLevelMultiplier,
  nextChannelLevel,
  parseSoundChannelLevel,
  resolveMusicLevelFromSave,
  resolveSfxLevelFromSave,
} from "../../src/lib/sound-volume-preset.js";

describe("sound channel level", () => {
  it("defaults invalid values when parsing level", () => {
    expect(parseSoundChannelLevel(undefined)).toBeUndefined();
    expect(parseSoundChannelLevel("loud")).toBeUndefined();
    expect(parseSoundChannelLevel("high")).toBe("high");
    expect(parseSoundChannelLevel("medium")).toBe("medium");
    expect(parseSoundChannelLevel("med")).toBe("high");
  });

  it("cycles music high → off → low → medium → high", () => {
    expect(nextChannelLevel("high")).toBe("off");
    expect(nextChannelLevel("off")).toBe("low");
    expect(nextChannelLevel("low")).toBe("medium");
    expect(nextChannelLevel("medium")).toBe("high");
  });

  it("leaves the sound effects cycle unchanged", () => {
    expect(nextChannelLevel("high", "sfx")).toBe("low");
    expect(nextChannelLevel("low", "sfx")).toBe("off");
    expect(nextChannelLevel("off", "sfx")).toBe("high");
  });

  it("scales music more than sfx on low and med", () => {
    expect(channelLevelMultiplier("low", "music")).toBeLessThan(
      channelLevelMultiplier("low", "sfx")
    );
    expect(channelLevelMultiplier("off", "music")).toBe(0);
    expect(channelLevelMultiplier("low", "music")).toBe(0.56);
    expect(channelLevelMultiplier("medium", "music")).toBeGreaterThan(0.56);
    expect(channelLevelMultiplier("medium", "music")).toBeLessThan(1.4);
    expect(channelLevelMultiplier("high", "music")).toBe(1.4);
    expect(channelLevelMultiplier("high", "sfx")).toBe(1);
  });

  it("labels levels for ui", () => {
    expect(channelLevelLabel("high")).toBe("High");
    expect(channelLevelLabel("medium")).toBe("Medium");
    expect(channelLevelLabel("off")).toBe("Off");
  });

  it("migrates legacy mute and global preset fields", () => {
    expect(resolveMusicLevelFromSave({})).toBe("high");
    expect(resolveSfxLevelFromSave({})).toBe("high");
    expect(resolveMusicLevelFromSave({ musicMuted: true })).toBe("off");
    expect(resolveSfxLevelFromSave({ sfxMuted: true })).toBe("off");
    expect(resolveMusicLevelFromSave({ soundVolumePreset: "low" })).toBe("low");
    expect(resolveMusicLevelFromSave({ musicLevel: "med" })).toBe("high");
    expect(resolveMusicLevelFromSave({ musicLevel: "medium" })).toBe("medium");
    expect(resolveSfxLevelFromSave({ soundVolumePreset: "med" })).toBe("high");
    expect(resolveMusicLevelFromSave({ musicLevel: "high" })).toBe("high");
  });
});
