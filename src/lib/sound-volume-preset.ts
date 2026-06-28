export type SoundChannelLevel = "high" | "low" | "off";

/** @deprecated Legacy global preset — use per-channel levels. */
export type SoundVolumePreset = "low" | "med" | "high";

export const SOUND_CHANNEL_LEVEL_CYCLE: readonly SoundChannelLevel[] = [
  "high",
  "low",
  "off",
];

export function parseSoundChannelLevel(value: unknown): SoundChannelLevel | undefined {
  if (value === "high" || value === "low" || value === "off") {
    return value;
  }
  if (value === "med") {
    return "high";
  }
  return undefined;
}

export function parseSoundVolumePreset(value: unknown): SoundVolumePreset {
  if (value === "low" || value === "med" || value === "high") {
    return value;
  }
  return "high";
}

function channelLevelFromLegacyPreset(value: unknown): SoundChannelLevel {
  return parseSoundVolumePreset(value) === "low" ? "low" : "high";
}

export function nextChannelLevel(current: SoundChannelLevel): SoundChannelLevel {
  const index = SOUND_CHANNEL_LEVEL_CYCLE.indexOf(current);
  const nextIndex = index < 0 ? 0 : (index + 1) % SOUND_CHANNEL_LEVEL_CYCLE.length;
  return SOUND_CHANNEL_LEVEL_CYCLE[nextIndex]!;
}

export function channelLevelLabel(level: SoundChannelLevel): string {
  if (level === "off") {
    return "Off";
  }
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function channelLevelMultiplier(
  level: SoundChannelLevel,
  channel: "music" | "sfx"
): number {
  if (level === "off") {
    return 0;
  }
  if (channel === "music") {
    switch (level) {
      case "low":
        return 0.56;
      case "high":
        return 1.4;
    }
  }
  switch (level) {
    case "low":
      return 0.65;
    case "high":
      return 1;
  }
}

export function resolveMusicLevelFromSave(fields: {
  musicLevel?: unknown;
  musicMuted?: boolean;
  soundMuted?: boolean;
  soundVolumePreset?: unknown;
}): SoundChannelLevel {
  const direct = parseSoundChannelLevel(fields.musicLevel);
  if (direct) {
    return direct;
  }
  if (fields.musicMuted === true || fields.soundMuted === true) {
    return "off";
  }
  return channelLevelFromLegacyPreset(fields.soundVolumePreset);
}

export function resolveSfxLevelFromSave(fields: {
  sfxLevel?: unknown;
  sfxMuted?: boolean;
  soundMuted?: boolean;
  soundVolumePreset?: unknown;
}): SoundChannelLevel {
  const direct = parseSoundChannelLevel(fields.sfxLevel);
  if (direct) {
    return direct;
  }
  if (fields.sfxMuted === true || fields.soundMuted === true) {
    return "off";
  }
  return channelLevelFromLegacyPreset(fields.soundVolumePreset);
}

/** @deprecated Use channelLevelMultiplier per channel. */
export function soundVolumePresetMultipliers(
  preset: SoundVolumePreset
): { music: number; sfx: number } {
  const level = channelLevelFromLegacyPreset(preset);
  return {
    music: channelLevelMultiplier(level, "music"),
    sfx: channelLevelMultiplier(level, "sfx"),
  };
}

/** @deprecated Use channelLevelLabel. */
export function soundVolumePresetLabel(preset: SoundVolumePreset): string {
  return channelLevelLabel(channelLevelFromLegacyPreset(preset));
}
