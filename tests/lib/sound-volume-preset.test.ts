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
  });

  it("cycles high → med → low → off → high", () => {
    expect(nextChannelLevel("high")).toBe("med");
    expect(nextChannelLevel("med")).toBe("low");
    expect(nextChannelLevel("low")).toBe("off");
    expect(nextChannelLevel("off")).toBe("high");
  });

  it("scales music more than sfx on low and med", () => {
    expect(channelLevelMultiplier("low", "music")).toBeLessThan(
      channelLevelMultiplier("low", "sfx")
    );
    expect(channelLevelMultiplier("off", "music")).toBe(0);
    expect(channelLevelMultiplier("high", "sfx")).toBe(1);
  });

  it("labels levels for ui", () => {
    expect(channelLevelLabel("high")).toBe("High");
    expect(channelLevelLabel("off")).toBe("Off");
  });

  it("migrates legacy mute and global preset fields", () => {
    expect(resolveMusicLevelFromSave({ musicMuted: true })).toBe("off");
    expect(resolveSfxLevelFromSave({ sfxMuted: true })).toBe("off");
    expect(resolveMusicLevelFromSave({ soundVolumePreset: "low" })).toBe("low");
    expect(resolveMusicLevelFromSave({ musicLevel: "high" })).toBe("high");
  });
});
