import { el } from "./dom.js";
import { gameState } from "./state.js";
import type { GamePhase } from "../lib/save-validation.js";
import { readPersistedFields, withSaveMeta } from "./persistence.js";
import {
  channelLevelLabel,
  channelLevelMultiplier,
  nextChannelLevel,
  resolveMusicLevelFromSave,
  resolveSfxLevelFromSave,
  type SoundChannelLevel,
} from "../lib/sound-volume-preset.js";
import { writeSaveJson } from "./save-io.js";

type BgmTrack = "combat" | "victory" | "none";

type BgmStep = {
  melody: number;
  bass: number;
  holdMs: number;
  /** How much of the step the melody rings (1 = full step length). */
  tie?: number;
  /** Add a quiet harmony a major third below (held phrases). */
  harmony?: boolean;
  /** Soft major triad instead of a single lead note. */
  chord?: boolean;
};

const BGM_MASTER_GAIN = 0.18;
const SFX_MASTER_GAIN = 0.52;
const BASS_PUNCH_MS = 220;
const BGM_TEMPO = 0.82;
const BGM_TIMING_JITTER_MS = 14;
const BGM_VELOCITY_JITTER = 0.16;
const BGM_SURPRISE_CHORD_CHANCE = 0.26;
const BGM_MELODY_VARY_CHANCE = 0.26;

/** G-major palette for subtle per-loop note swaps (low register). */
const MELODY_VARIATION_SCALE: readonly number[] = [
  131, 147, 165, 175, 196, 220, 247, 262, 294,
];

/** Combat A — G major, low register; question phrase with breathing room. */
const COMBAT_SEQUENCE_A: readonly BgmStep[] = [
  { melody: 196, bass: 49, holdMs: 380, tie: 0.74 },
  { melody: 0, bass: 0, holdMs: 200 },
  { melody: 165, bass: 0, holdMs: 340, tie: 0.72 },
  { melody: 196, bass: 0, holdMs: 500, tie: 0.88, harmony: true, chord: true },
  { melody: 0, bass: 0, holdMs: 280 },
  { melody: 220, bass: 37, holdMs: 360, tie: 0.72 },
  { melody: 196, bass: 0, holdMs: 380, tie: 0.7 },
  { melody: 0, bass: 0, holdMs: 160 },
  { melody: 165, bass: 0, holdMs: 580, tie: 0.9, harmony: true },
  { melody: 0, bass: 0, holdMs: 420 },
  { melody: 147, bass: 49, holdMs: 680, tie: 0.92, harmony: true, chord: true },
  { melody: 0, bass: 0, holdMs: 360 },
];

/** Combat B — answer phrase; sparser, longer rests at the cadence. */
const COMBAT_SEQUENCE_B: readonly BgmStep[] = [
  { melody: 165, bass: 41, holdMs: 340, tie: 0.72 },
  { melody: 0, bass: 0, holdMs: 180 },
  { melody: 175, bass: 0, holdMs: 340, tie: 0.72 },
  { melody: 196, bass: 0, holdMs: 480, tie: 0.86, harmony: true },
  { melody: 0, bass: 0, holdMs: 320 },
  { melody: 220, bass: 37, holdMs: 340, tie: 0.7 },
  { melody: 196, bass: 0, holdMs: 520, tie: 0.88, harmony: true },
  { melody: 0, bass: 0, holdMs: 240 },
  { melody: 165, bass: 0, holdMs: 560, tie: 0.9, harmony: true },
  { melody: 0, bass: 0, holdMs: 200 },
  { melody: 147, bass: 33, holdMs: 820, tie: 0.94, harmony: true, chord: true },
  { melody: 0, bass: 0, holdMs: 480 },
];

/** Combat C — bridge phrase; different contour from A/B. */
const COMBAT_SEQUENCE_C: readonly BgmStep[] = [
  { melody: 175, bass: 44, holdMs: 340, tie: 0.72 },
  { melody: 0, bass: 0, holdMs: 220 },
  { melody: 196, bass: 0, holdMs: 360, tie: 0.78, harmony: true },
  { melody: 220, bass: 37, holdMs: 400, tie: 0.84, harmony: true },
  { melody: 0, bass: 0, holdMs: 300 },
  { melody: 196, bass: 0, holdMs: 340, tie: 0.72 },
  { melody: 0, bass: 0, holdMs: 180 },
  { melody: 175, bass: 0, holdMs: 340, tie: 0.72 },
  { melody: 165, bass: 0, holdMs: 520, tie: 0.88, harmony: true },
  { melody: 0, bass: 0, holdMs: 360 },
  { melody: 196, bass: 49, holdMs: 380, tie: 0.76 },
  { melody: 165, bass: 0, holdMs: 560, tie: 0.9, harmony: true, chord: true },
  { melody: 0, bass: 0, holdMs: 520 },
];

/** Combat D — spaced walk; no quick note runs. */
const COMBAT_SEQUENCE_D: readonly BgmStep[] = [
  { melody: 147, bass: 37, holdMs: 340, tie: 0.74 },
  { melody: 0, bass: 0, holdMs: 200 },
  { melody: 165, bass: 0, holdMs: 340, tie: 0.72 },
  { melody: 0, bass: 0, holdMs: 180 },
  { melody: 175, bass: 0, holdMs: 360, tie: 0.76 },
  { melody: 0, bass: 0, holdMs: 160 },
  { melody: 196, bass: 49, holdMs: 400, tie: 0.84, harmony: true },
  { melody: 0, bass: 0, holdMs: 120 },
  { melody: 220, bass: 0, holdMs: 280, tie: 0.74 },
  { melody: 196, bass: 0, holdMs: 260, tie: 0.7 },
  { melody: 175, bass: 44, holdMs: 280, tie: 0.72 },
  { melody: 0, bass: 0, holdMs: 160 },
  { melody: 165, bass: 0, holdMs: 380, tie: 0.88, harmony: true },
  { melody: 147, bass: 0, holdMs: 340, tie: 0.84 },
  { melody: 131, bass: 33, holdMs: 460, tie: 0.92, chord: true },
  { melody: 0, bass: 0, holdMs: 260 },
];

const COMBAT_SECTIONS: readonly (readonly BgmStep[])[] = [
  COMBAT_SEQUENCE_A,
  COMBAT_SEQUENCE_B,
  COMBAT_SEQUENCE_C,
  COMBAT_SEQUENCE_D,
];

/** Victory — softer fanfare, octave down, gaps between hits. */
const VICTORY_SEQUENCE: readonly BgmStep[] = [
  { melody: 196, bass: 49, holdMs: 220, tie: 0.7 },
  { melody: 0, bass: 0, holdMs: 140 },
  { melody: 196, bass: 0, holdMs: 220, tie: 0.7 },
  { melody: 0, bass: 0, holdMs: 140 },
  { melody: 196, bass: 0, holdMs: 220, tie: 0.7 },
  { melody: 0, bass: 0, holdMs: 200 },
  { melody: 262, bass: 65, holdMs: 560, tie: 0.9, harmony: true },
  { melody: 294, bass: 0, holdMs: 300, tie: 0.76 },
  { melody: 330, bass: 73, holdMs: 560, tie: 0.92, harmony: true },
  { melody: 0, bass: 0, holdMs: 240 },
  { melody: 294, bass: 0, holdMs: 300, tie: 0.76 },
  { melody: 262, bass: 65, holdMs: 460, tie: 0.88 },
  { melody: 0, bass: 0, holdMs: 280 },
  { melody: 0, bass: 0, holdMs: 280 },
  { melody: 247, bass: 0, holdMs: 320, tie: 0.76 },
  { melody: 0, bass: 0, holdMs: 200 },
  { melody: 262, bass: 49, holdMs: 320, tie: 0.76 },
  { melody: 0, bass: 0, holdMs: 200 },
  { melody: 294, bass: 0, holdMs: 360, tie: 0.8 },
  { melody: 330, bass: 65, holdMs: 660, tie: 0.94, harmony: true, chord: true },
  { melody: 392, bass: 0, holdMs: 760, tie: 0.96, harmony: true, chord: true },
  { melody: 0, bass: 0, holdMs: 320 },
  { melody: 330, bass: 73, holdMs: 400, tie: 0.8 },
  { melody: 294, bass: 0, holdMs: 400, tie: 0.8 },
  { melody: 262, bass: 49, holdMs: 1100, tie: 0.97, harmony: true, chord: true },
];

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgmGain: GainNode | null = null;
let bgmBusFilter: BiquadFilterNode | null = null;
let bgmBassHighpass: BiquadFilterNode | null = null;
let bgmWetDelay: DelayNode | null = null;
let bgmWetGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicLevel: SoundChannelLevel = "high";
let sfxLevel: SoundChannelLevel = "high";
let unlocked = false;
let currentTrack: BgmTrack = "none";
let bgmStep = 0;
let bgmSectionPlaylist: number[] = [0, 1, 2, 3];
let bgmSectionPlaylistIndex = 0;
let bgmScheduleTime = 0;
let bgmTimeout: number | null = null;

function createAudioContext(): AudioContext | null {
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctor) {
    return null;
  }
  return new Ctor();
}

function ensureGraph(): boolean {
  if (!audioContext) {
    audioContext = createAudioContext();
  }
  if (!audioContext || !masterGain) {
    if (!audioContext) {
      return false;
    }
    masterGain = audioContext.createGain();
    bgmGain = audioContext.createGain();
    bgmBusFilter = audioContext.createBiquadFilter();
    bgmBusFilter.type = "lowpass";
    bgmBusFilter.frequency.value = 3200;
    bgmBusFilter.Q.value = 0.35;
    bgmBassHighpass = audioContext.createBiquadFilter();
    bgmBassHighpass.type = "highpass";
    bgmBassHighpass.frequency.value = 72;
    bgmBassHighpass.Q.value = 0.5;
    bgmWetDelay = audioContext.createDelay(0.4);
    bgmWetDelay.delayTime.value = 0.18;
    bgmWetGain = audioContext.createGain();
    bgmWetGain.gain.value = 0.04;
    sfxGain = audioContext.createGain();
    bgmGain.connect(bgmBusFilter);
    bgmBassHighpass.connect(bgmBusFilter);
    bgmBusFilter.connect(masterGain);
    bgmGain.connect(bgmWetDelay);
    bgmWetDelay.connect(bgmWetGain);
    bgmWetGain.connect(bgmBusFilter);
    masterGain.connect(audioContext.destination);
    sfxGain.connect(masterGain);
    applyGainLevels();
  }
  return true;
}

function applyGainLevels(): void {
  if (!masterGain || !bgmGain || !sfxGain) {
    return;
  }
  masterGain.gain.value = 1;
  bgmGain.gain.value = BGM_MASTER_GAIN * channelLevelMultiplier(musicLevel, "music");
  sfxGain.gain.value = SFX_MASTER_GAIN * channelLevelMultiplier(sfxLevel, "sfx");
}

function canPlayBgm(): boolean {
  return musicLevel !== "off" && unlocked && ensureGraph();
}

function canPlaySfx(): boolean {
  return sfxLevel !== "off" && unlocked && ensureGraph();
}

function playOscillator(
  frequency: number,
  durationSec: number,
  type: OscillatorType,
  gainValue: number,
  destination: GainNode,
  startAt?: number
): void {
  if (!audioContext || frequency <= 0) {
    return;
  }
  const start = startAt ?? audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + durationSec);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(start);
  osc.stop(start + durationSec + 0.02);
}

function playSweep(
  fromHz: number,
  toHz: number,
  durationSec: number,
  type: OscillatorType,
  gainValue: number,
  startAt?: number
): void {
  if (!canPlaySfx() || !audioContext || !sfxGain) {
    return;
  }
  const start = startAt ?? audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(fromHz, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), start + durationSec);
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + durationSec + 0.04);
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(start);
  osc.stop(start + durationSec + 0.06);
}

function playNoise(durationSec: number, gainValue: number): void {
  if (!canPlaySfx() || !audioContext || !sfxGain) {
    return;
  }
  const sampleCount = Math.max(1, Math.floor(audioContext.sampleRate * durationSec));
  const buffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  source.buffer = buffer;
  const start = audioContext.currentTime;
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + durationSec);
  source.connect(gain);
  gain.connect(sfxGain);
  source.start(start);
  source.stop(start + durationSec + 0.02);
}

function bgmStepDurationMs(step: BgmStep): number {
  return Math.max(72, Math.round(step.holdMs * BGM_TEMPO));
}

function nearestScaleIndex(frequency: number): number {
  let bestIdx = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < MELODY_VARIATION_SCALE.length; i++) {
    const diff = Math.abs(MELODY_VARIATION_SCALE[i]! - frequency);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestDiff <= 6 ? bestIdx : -1;
}

function varyMelodyHz(frequency: number): number {
  if (frequency <= 0 || Math.random() >= BGM_MELODY_VARY_CHANCE) {
    return frequency;
  }
  const idx = nearestScaleIndex(frequency);
  if (idx < 0) {
    return frequency;
  }
  const direction = Math.random() < 0.5 ? -1 : 1;
  const neighbor = MELODY_VARIATION_SCALE[idx + direction];
  return neighbor ?? frequency;
}

function shuffleCombatPlaylist(avoidFirst?: number): void {
  const order = COMBAT_SECTIONS.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  if (avoidFirst !== undefined && order[0] === avoidFirst && order.length > 1) {
    [order[0], order[1]] = [order[1]!, order[0]!];
  }
  bgmSectionPlaylist = order;
  bgmSectionPlaylistIndex = 0;
}

function bgmVelocityMult(): number {
  return 1 + (Math.random() * 2 - 1) * BGM_VELOCITY_JITTER;
}

function bgmStepJitterSec(): number {
  return ((Math.random() * 2 - 1) * BGM_TIMING_JITTER_MS) / 1000;
}

function harmonyThirdBelow(frequency: number): number {
  return frequency * 0.8;
}

function majorTriad(root: number): readonly [number, number, number] {
  return [root, root * 1.25, root * 1.5];
}

type MelodyRender = "single" | "chord";

function pickMelodyRender(step: BgmStep, tie: number): MelodyRender {
  if (step.chord) {
    return "chord";
  }
  if (step.harmony && tie >= 0.84 && Math.random() < BGM_SURPRISE_CHORD_CHANCE) {
    return "chord";
  }
  return "single";
}

function connectMelodyVoice(gain: GainNode): void {
  if (!bgmGain || !bgmBusFilter) {
    return;
  }
  gain.connect(bgmGain);
}

function connectBassVoice(gain: GainNode): void {
  if (!bgmBassHighpass) {
    return;
  }
  gain.connect(bgmBassHighpass);
}

function scheduleNoteEnvelope(
  gain: GainNode,
  startAt: number,
  noteSec: number,
  peak: number
): void {
  const attack = Math.min(0.018, noteSec * 0.1);
  const releaseStart = startAt + noteSec * 0.84;
  const end = startAt + noteSec;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + attack);
  gain.gain.setValueAtTime(peak, releaseStart);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
}

function playBgmVoice(
  frequency: number,
  noteSec: number,
  startAt: number,
  type: OscillatorType,
  peak: number,
  destination: "melody" | "bass"
): void {
  if (!audioContext || frequency <= 0) {
    return;
  }
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  scheduleNoteEnvelope(gain, startAt, noteSec, peak);
  osc.connect(gain);
  if (destination === "bass") {
    connectBassVoice(gain);
  } else {
    connectMelodyVoice(gain);
  }
  osc.start(startAt);
  osc.stop(startAt + noteSec + 0.03);
}

function defaultMelodyTie(holdMs: number): number {
  if (holdMs < 220) return 0.68;
  if (holdMs < 400) return 0.75;
  if (holdMs < 650) return 0.88;
  return 0.94;
}

function shouldAddHarmony(step: BgmStep, tie: number): boolean {
  if (step.harmony === true) {
    return true;
  }
  return tie >= 0.86 && step.melody > 0;
}

function playSoftMelody(
  frequency: number,
  noteMs: number,
  startAt: number,
  velocityMult: number,
  withHarmony: boolean
): void {
  if (!audioContext || !bgmGain || frequency <= 0) {
    return;
  }
  const noteSec = Math.max(0.1, noteMs / 1000);
  const triPeak = 0.02 * velocityMult;
  const sqPeak = 0.007 * velocityMult;
  playBgmVoice(frequency, noteSec, startAt, "triangle", triPeak, "melody");
  playBgmVoice(frequency, noteSec, startAt, "square", sqPeak, "melody");
  if (withHarmony) {
    const harmonyHz = harmonyThirdBelow(frequency);
    playBgmVoice(harmonyHz, noteSec * 0.92, startAt, "triangle", triPeak * 0.45, "melody");
  }
}

function playSoftChord(
  root: number,
  noteMs: number,
  startAt: number,
  velocityMult: number
): void {
  const noteSec = Math.max(0.14, noteMs / 1000);
  const triPeak = 0.011 * velocityMult;
  const sqPeak = 0.0035 * velocityMult;
  for (const frequency of majorTriad(root)) {
    playBgmVoice(frequency, noteSec, startAt, "triangle", triPeak, "melody");
    playBgmVoice(frequency, noteSec, startAt, "square", sqPeak, "melody");
  }
}

function playMelodyStep(
  step: BgmStep,
  tie: number,
  noteMs: number,
  startAt: number,
  velocityMult: number
): void {
  if (step.melody <= 0) {
    return;
  }
  const render = pickMelodyRender(step, tie);
  if (render === "chord") {
    playSoftChord(step.melody, noteMs, startAt, velocityMult);
    return;
  }
  playSoftMelody(
    step.melody,
    noteMs,
    startAt,
    velocityMult,
    shouldAddHarmony(step, tie)
  );
}

function playChiptuneBass(frequency: number, startAt: number, velocityMult: number): void {
  if (!audioContext || frequency <= 0) {
    return;
  }
  const noteSec = BASS_PUNCH_MS / 1000;
  const peak = 0.028 * velocityMult;
  playBgmVoice(frequency, noteSec, startAt, "triangle", peak, "bass");
}

function getCombatSequence(): readonly BgmStep[] {
  const sectionIndex = bgmSectionPlaylist[bgmSectionPlaylistIndex] ?? 0;
  return COMBAT_SECTIONS[sectionIndex] ?? COMBAT_SEQUENCE_A;
}

function getActiveSequence(): readonly BgmStep[] {
  if (currentTrack === "victory") {
    return VICTORY_SEQUENCE;
  }
  return getCombatSequence();
}

function advanceBgmStep(): void {
  const sequence = getActiveSequence();
  bgmStep += 1;
  if (bgmStep >= sequence.length) {
    bgmStep = 0;
    if (currentTrack === "combat") {
      const finishedSection = bgmSectionPlaylist[bgmSectionPlaylistIndex] ?? 0;
      bgmSectionPlaylistIndex += 1;
      if (bgmSectionPlaylistIndex >= bgmSectionPlaylist.length) {
        shuffleCombatPlaylist(finishedSection);
      }
    }
  }
}

function stopBgmTimer(): void {
  if (bgmTimeout !== null) {
    window.clearTimeout(bgmTimeout);
    bgmTimeout = null;
  }
  bgmScheduleTime = 0;
}

function scheduleBgmTick(): void {
  if (!canPlayBgm() || !audioContext || !bgmGain || currentTrack === "none") {
    return;
  }
  const sequence = getActiveSequence();
  const step = sequence[bgmStep % sequence.length]!;
  const now = audioContext.currentTime;
  if (bgmScheduleTime < now) {
    bgmScheduleTime = now + 0.04;
  }
  const t = bgmScheduleTime;
  const velocity = bgmVelocityMult();
  const stepHoldMs = bgmStepDurationMs(step);

  if (step.melody > 0) {
    const melodyHz = varyMelodyHz(step.melody);
    const tie = step.tie ?? defaultMelodyTie(stepHoldMs);
    const melodyStep: BgmStep = { ...step, melody: melodyHz };
    playMelodyStep(melodyStep, tie, stepHoldMs * tie, t, velocity);
  }
  if (step.bass > 0) {
    playChiptuneBass(step.bass, t, velocity);
  }

  const stepSec = stepHoldMs / 1000 + bgmStepJitterSec();
  bgmScheduleTime = t + stepSec;
  advanceBgmStep();

  const leadSec = Math.max(0.02, bgmScheduleTime - audioContext.currentTime - 0.02);
  bgmTimeout = window.setTimeout(scheduleBgmTick, leadSec * 1000);
}

function startBgm(track: BgmTrack): void {
  if (track === currentTrack && bgmTimeout !== null) {
    return;
  }
  stopBgmTimer();
  currentTrack = track;
  bgmStep = 0;
  shuffleCombatPlaylist();
  if (track === "none" || musicLevel === "off" || !unlocked) {
    return;
  }
  if (!ensureGraph()) {
    return;
  }
  if (audioContext) {
    bgmScheduleTime = audioContext.currentTime + 0.06;
  }
  scheduleBgmTick();
}

function persistAudioPrefs(): void {
  writeSaveJson(
    withSaveMeta({
      ...readPersistedFields(),
      musicLevel,
      sfxLevel,
    })
  );
}

export function initAudioFromSave(opts?: {
  musicLevel?: SoundChannelLevel;
  sfxLevel?: SoundChannelLevel;
  musicMuted?: boolean;
  sfxMuted?: boolean;
  soundVolumePreset?: "low" | "med" | "high";
  /** @deprecated Legacy single mute flag. */
  soundMuted?: boolean;
}): void {
  musicLevel = resolveMusicLevelFromSave({
    musicLevel: opts?.musicLevel,
    musicMuted: opts?.musicMuted,
    soundMuted: opts?.soundMuted,
    soundVolumePreset: opts?.soundVolumePreset,
  });
  sfxLevel = resolveSfxLevelFromSave({
    sfxLevel: opts?.sfxLevel,
    sfxMuted: opts?.sfxMuted,
    soundMuted: opts?.soundMuted,
    soundVolumePreset: opts?.soundVolumePreset,
  });
  applyGainLevels();
  updateAudioToggleUi();
}

export async function unlockAudio(): Promise<boolean> {
  if (!ensureGraph() || !audioContext) {
    return false;
  }
  if (audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch {
      return false;
    }
  }
  if (audioContext.state !== "running") {
    return false;
  }
  unlocked = true;
  applyGainLevels();
  syncBgmForPhase(gameState.phase);
  return true;
}

export function closeFooterDropdowns(): void {
  el.footerMore.open = false;
  el.footerSound.open = false;
}

export function updateAudioToggleUi(): void {
  const musicLabel = channelLevelLabel(musicLevel);
  const sfxLabel = channelLevelLabel(sfxLevel);
  el.musicLevelBtn.textContent = `Music: ${musicLabel}`;
  el.musicLevelBtn.setAttribute("aria-pressed", musicLevel === "off" ? "false" : "true");
  el.musicLevelBtn.setAttribute(
    "aria-label",
    `Music volume ${musicLabel}. Click to change.`
  );
  el.musicLevelBtn.classList.toggle("sound-level-off", musicLevel === "off");

  el.sfxLevelBtn.textContent = `SFX: ${sfxLabel}`;
  el.sfxLevelBtn.setAttribute("aria-pressed", sfxLevel === "off" ? "false" : "true");
  el.sfxLevelBtn.setAttribute(
    "aria-label",
    `Sound effects volume ${sfxLabel}. Click to change.`
  );
  el.sfxLevelBtn.classList.toggle("sound-level-off", sfxLevel === "off");

  el.soundMenuToggle.classList.toggle("meta-btn-muted", musicLevel === "off" && sfxLevel === "off");
}

export function cycleMusicLevel(): void {
  el.footerMore.open = false;
  musicLevel = nextChannelLevel(musicLevel);
  applyGainLevels();
  updateAudioToggleUi();
  if (musicLevel === "off") {
    stopBgmTimer();
    currentTrack = "none";
  } else if (unlocked) {
    syncBgmForPhase(gameState.phase);
  }
  persistAudioPrefs();
}

export function cycleSfxLevel(): void {
  el.footerMore.open = false;
  sfxLevel = nextChannelLevel(sfxLevel);
  applyGainLevels();
  updateAudioToggleUi();
  if (sfxLevel !== "off" && unlocked) {
    sfxUiClick();
  }
  persistAudioPrefs();
}

export function toggleMusicMuted(): void {
  cycleMusicLevel();
}

export function toggleSfxMuted(): void {
  cycleSfxLevel();
}

export function syncBgmForPhase(phase: GamePhase | "setup"): void {
  if (!unlocked || musicLevel === "off") {
    stopBgmTimer();
    currentTrack = "none";
    return;
  }
  if (phase === "combat") {
    startBgm("combat");
    return;
  }
  if (phase === "victory") {
    startBgm("victory");
    return;
  }
  stopBgmTimer();
  currentTrack = "none";
}

export function sfxUiClick(): void {
  if (!canPlaySfx() || !sfxGain) {
    return;
  }
  playOscillator(880, 0.04, "square", 0.14, sfxGain);
}

export function sfxHit(fatal = false): void {
  if (!canPlaySfx() || !sfxGain) {
    return;
  }
  playNoise(fatal ? 0.14 : 0.08, fatal ? 0.28 : 0.2);
  playOscillator(fatal ? 110 : 180, fatal ? 0.2 : 0.1, "square", fatal ? 0.24 : 0.16, sfxGain);
  if (fatal) {
    playOscillator(70, 0.25, "triangle", 0.18, sfxGain);
  }
}

export function sfxHeal(): void {
  if (!canPlaySfx() || !sfxGain || !audioContext) {
    return;
  }
  const gain = sfxGain;
  const ctx = audioContext;
  const freqs = [523, 659, 784];
  freqs.forEach((freq, i) => {
    playOscillator(freq, 0.12, "triangle", 0.18, gain, ctx.currentTime + i * 0.07);
  });
}

export function sfxFoeDefeated(isFinal = false): void {
  if (!canPlaySfx() || !sfxGain || !audioContext) {
    return;
  }
  const gain = sfxGain;
  const ctx = audioContext;
  const t = ctx.currentTime;

  playNoise(isFinal ? 0.28 : 0.22, isFinal ? 0.42 : 0.34);
  playSweep(isFinal ? 880 : 660, 90, isFinal ? 0.35 : 0.28, "square", isFinal ? 0.3 : 0.24, t);
  playOscillator(isFinal ? 98 : 130, isFinal ? 0.45 : 0.32, "sine", isFinal ? 0.28 : 0.22, gain, t);

  const chime = isFinal ? [523, 659, 784, 1047, 1319] : [784, 988, 1175];
  chime.forEach((freq, i) => {
    playOscillator(freq, isFinal ? 0.2 : 0.16, "triangle", isFinal ? 0.26 : 0.22, gain, t + 0.08 + i * 0.09);
  });
}

export function sfxFlee(): void {
  if (!canPlaySfx() || !sfxGain || !audioContext) {
    return;
  }
  const gain = sfxGain;
  const ctx = audioContext;
  const t = ctx.currentTime;

  playNoise(0.24, 0.38);
  playSweep(120, 920, 0.22, "square", 0.3, t);
  playSweep(740, 160, 0.26, "triangle", 0.26, t + 0.14);
  playOscillator(392, 0.12, "square", 0.24, gain, t + 0.28);
  playOscillator(523, 0.14, "triangle", 0.22, gain, t + 0.36);
}

export function sfxEntrance(): void {
  if (!canPlaySfx() || !sfxGain || !audioContext) {
    return;
  }
  const gain = sfxGain;
  playOscillator(220, 0.08, "triangle", 0.14, gain);
  playOscillator(330, 0.1, "triangle", 0.16, gain, audioContext.currentTime + 0.06);
}

export function sfxDeath(): void {
  if (!canPlaySfx() || !sfxGain || !audioContext) {
    return;
  }
  const gain = sfxGain;
  playOscillator(196, 0.35, "triangle", 0.22, gain);
  playOscillator(98, 0.5, "triangle", 0.2, gain, audioContext.currentTime + 0.12);
}

export type HeroDanceSfxKind = "solo" | "setup" | "maxed";
export type FoeDanceSfxKind = "join" | "powerUp";

const HERO_DANCE_VARIANTS: readonly (readonly number[])[] = [
  [440, 554, 659, 554],
  [523, 659, 784, 659],
  [392, 494, 587, 494],
];

let heroDanceVariant = 0;

function nextHeroDanceVariant(): number {
  heroDanceVariant = (heroDanceVariant + 1) % HERO_DANCE_VARIANTS.length;
  return heroDanceVariant;
}

function playNoteSequence(
  freqs: readonly number[],
  stepSec: number,
  durationSec: number,
  type: OscillatorType,
  gainValue: number,
  startAt?: number
): void {
  if (!canPlaySfx() || !sfxGain || !audioContext) {
    return;
  }
  const gain = sfxGain;
  const t0 = startAt ?? audioContext.currentTime;
  freqs.forEach((freq, i) => {
    playOscillator(freq, durationSec, type, gainValue, gain, t0 + i * stepSec);
  });
}

export function sfxHeroDance(kind: HeroDanceSfxKind): void {
  if (!canPlaySfx() || !sfxGain || !audioContext) {
    return;
  }
  const gain = sfxGain;
  const ctx = audioContext;
  const t = ctx.currentTime;

  if (kind === "maxed") {
    playOscillator(349, 0.1, "triangle", 0.12, gain, t);
    playOscillator(330, 0.12, "triangle", 0.1, gain, t + 0.09);
    playOscillator(311, 0.14, "sine", 0.08, gain, t + 0.18);
    return;
  }

  const variant = nextHeroDanceVariant();
  const freqs = HERO_DANCE_VARIANTS[variant] ?? HERO_DANCE_VARIANTS[0]!;
  if (kind === "setup") {
    playNoteSequence(freqs.slice(0, 3), 0.07, 0.06, "triangle", 0.11, t);
    return;
  }

  playNoteSequence(freqs, 0.085, 0.08, "triangle", 0.17, t);
  playOscillator(freqs[freqs.length - 1] ?? 523, 0.05, "square", 0.1, gain, t + 0.3);
}

export function sfxFoeDance(kind: FoeDanceSfxKind): void {
  if (!canPlaySfx() || !sfxGain || !audioContext) {
    return;
  }
  const gain = sfxGain;
  const ctx = audioContext;
  const t = ctx.currentTime;

  if (kind === "join") {
    playNoteSequence([330, 392, 440, 523, 587], 0.09, 0.1, "triangle", 0.18, t);
    playOscillator(262, 0.14, "sine", 0.14, gain, t);
    playOscillator(330, 0.1, "square", 0.12, gain, t + 0.28);
    return;
  }

  playSweep(98, 247, 0.22, "square", 0.22, t);
  playNoteSequence([185, 220, 277, 330], 0.1, 0.09, "square", 0.2, t + 0.08);
  playOscillator(147, 0.2, "triangle", 0.16, gain, t + 0.12);
}

export type HypeSfxKind = "player" | "foe" | "both" | "maxed";

export function sfxHypeGain(kind: HypeSfxKind): void {
  if (!canPlaySfx() || !sfxGain || !audioContext) {
    return;
  }
  const gain = sfxGain;
  const ctx = audioContext;
  const t = ctx.currentTime;

  switch (kind) {
    case "player":
      playOscillator(659, 0.08, "triangle", 0.2, gain, t);
      playOscillator(784, 0.1, "triangle", 0.22, gain, t + 0.07);
      playOscillator(988, 0.12, "square", 0.16, gain, t + 0.14);
      break;
    case "foe":
      playSweep(146, 392, 0.2, "square", 0.24, t);
      playOscillator(311, 0.14, "triangle", 0.2, gain, t + 0.1);
      playOscillator(370, 0.1, "square", 0.18, gain, t + 0.18);
      break;
    case "both":
      playOscillator(392, 0.16, "triangle", 0.18, gain, t);
      playOscillator(494, 0.16, "triangle", 0.18, gain, t);
      playOscillator(587, 0.16, "triangle", 0.18, gain, t);
      playOscillator(659, 0.1, "square", 0.2, gain, t + 0.12);
      playOscillator(784, 0.12, "square", 0.2, gain, t + 0.2);
      playOscillator(988, 0.14, "square", 0.18, gain, t + 0.28);
      break;
    case "maxed":
      playOscillator(440, 0.12, "triangle", 0.14, gain, t);
      playOscillator(330, 0.16, "triangle", 0.12, gain, t + 0.08);
      playOscillator(220, 0.2, "sine", 0.1, gain, t + 0.16);
      playNoise(0.06, 0.1);
      break;
  }
}

export function sfxLevelUp(): void {
  if (!canPlaySfx() || !sfxGain || !audioContext) {
    return;
  }
  const gain = sfxGain;
  const ctx = audioContext;
  const freqs = [523, 659, 784, 1047];
  freqs.forEach((freq, i) => {
    playOscillator(freq, 0.1, "square", 0.2, gain, ctx.currentTime + i * 0.09);
  });
}

export function sfxVictoryFanfare(): void {
  if (!canPlaySfx() || !sfxGain || !audioContext) {
    return;
  }
  const gain = sfxGain;
  const ctx = audioContext;
  const freqs = [523, 659, 784, 1047, 784, 1047];
  freqs.forEach((freq, i) => {
    playOscillator(freq, 0.14, "square", 0.24, gain, ctx.currentTime + i * 0.1);
  });
}

export function sfxGameOver(): void {
  if (!canPlaySfx() || !sfxGain || !audioContext) {
    return;
  }
  const gain = sfxGain;
  const ctx = audioContext;
  stopBgmTimer();
  currentTrack = "none";
  const freqs = [392, 330, 262, 196];
  freqs.forEach((freq, i) => {
    playOscillator(freq, 0.22, "triangle", 0.2, gain, ctx.currentTime + i * 0.16);
  });
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
