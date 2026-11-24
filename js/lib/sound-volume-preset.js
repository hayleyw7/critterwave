export const SOUND_CHANNEL_LEVEL_CYCLE = [
    "high",
    "low",
    "off",
];
export function parseSoundChannelLevel(value) {
    if (value === "high" || value === "low" || value === "off") {
        return value;
    }
    if (value === "med") {
        return "high";
    }
    return undefined;
}
export function parseSoundVolumePreset(value) {
    if (value === "low" || value === "med" || value === "high") {
        return value;
    }
    return "high";
}
function channelLevelFromLegacyPreset(value) {
    return parseSoundVolumePreset(value) === "low" ? "low" : "high";
}
export function nextChannelLevel(current) {
    const index = SOUND_CHANNEL_LEVEL_CYCLE.indexOf(current);
    const nextIndex = index < 0 ? 0 : (index + 1) % SOUND_CHANNEL_LEVEL_CYCLE.length;
    return SOUND_CHANNEL_LEVEL_CYCLE[nextIndex];
}
export function channelLevelLabel(level) {
    if (level === "off") {
        return "Off";
    }
    return level.charAt(0).toUpperCase() + level.slice(1);
}
export function channelLevelMultiplier(level, channel) {
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
export function resolveMusicLevelFromSave(fields) {
    const direct = parseSoundChannelLevel(fields.musicLevel);
    if (direct) {
        return direct;
    }
    if (fields.musicMuted === true || fields.soundMuted === true) {
        return "off";
    }
    return channelLevelFromLegacyPreset(fields.soundVolumePreset);
}
export function resolveSfxLevelFromSave(fields) {
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
export function soundVolumePresetMultipliers(preset) {
    const level = channelLevelFromLegacyPreset(preset);
    return {
        music: channelLevelMultiplier(level, "music"),
        sfx: channelLevelMultiplier(level, "sfx"),
    };
}
/** @deprecated Use channelLevelLabel. */
export function soundVolumePresetLabel(preset) {
    return channelLevelLabel(channelLevelFromLegacyPreset(preset));
}
