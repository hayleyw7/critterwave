import { escapeHtml } from "../lib/escape-html.js";

export type DanceResponse = {
  message: string;
  /** Player hype gain; defaults to 0 unless foeJoins is set. */
  playerHype?: number;
  /** Foe hype gain without joining the dance. */
  foeHype?: number;
  /** Foe joins the dance — both sides get +1 hype. */
  foeJoins?: boolean;
};

export const DANCE_RESPONSES: DanceResponse[] = [
  // Former neutral reactions, reassigned so every dance grants HYPE.
  { message: "{foe} boos loudly, but the crowd loves your confidence.", playerHype: 1 },
  { message: "{foe} rates your performance a 7/10.", playerHype: 1 },
  { message: "{foe} claps once, then nods despite themselves.", playerHype: 1 },
  { message: "{foe} looks terrified by your moves.", playerHype: 1 },
  {
    message: "{foe} crosses their arms and studies your rhythm.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} refuses to acknowledge you, and powers up out of spite.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} looks disappointed, which somehow fuels them.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} throws a tomato, then winds up for more.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} checks their watch and catches the tempo.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} yawns, stretches, and gets battle-ready.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} holds up a 2/10 sign and gets smug.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} pretends to take a pep-talk phone call.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} slowly backs away, then finds their footing.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} eats a sandwich and carb-loads mid-fight.",
    playerHype: 0,
    foeHype: 1,
  },
  { message: "{foe} puts on sunglasses and joins with a cool-guy two-step.", foeJoins: true, playerHype: 1 },
  { message: "{foe} starts a somber funeral sway. It works.", foeJoins: true, playerHype: 1 },
  { message: "{foe} declares a bonus round and dances as the judge.", foeJoins: true, playerHype: 1 },

  // +1 player hype — foe cheers but doesn't dance. (14)
  { message: "{foe} claps politely.", playerHype: 1 },
  { message: "{foe} looks confused but supportive.", playerHype: 1 },
  { message: "{foe} tosses you a shiny pebble.", playerHype: 1 },
  { message: "{foe} looks genuinely impressed.", playerHype: 1 },
  { message: "{foe} laughs so hard they snort.", playerHype: 1 },
  { message: "{foe} chants your name.", playerHype: 1 },
  { message: "{foe} gives you a thumbs up.", playerHype: 1 },
  { message: "{foe} wipes away a tear.", playerHype: 1 },
  { message: "{foe} screams for an encore.", playerHype: 1 },
  { message: "{foe} pulls out a tiny fan and fans you.", playerHype: 1 },
  { message: "{foe} wheezes ONE MORE TIME!", playerHype: 1 },
  { message: "{foe} weeps with joy.", playerHype: 1 },
  { message: "{foe} whispers teach me with awe.", playerHype: 1 },
  { message: "{foe} faints from sheer awesomeness.", playerHype: 1 },

  // +1 foe hype only — they feed off your dance, not you. (8)
  {
    message: "{foe} gets WAY too into your beat.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} starts vibing. You immediately regret this.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} thinks the dance-off is about them now.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} hypes themselves up watching you flop.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} catches the rhythm and owns the floor.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} misreads your moves as a challenge—and accepts.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} feeds off your energy. For themselves.",
    playerHype: 0,
    foeHype: 1,
  },
  {
    message: "{foe} gets hyped. You get nothing.",
    playerHype: 0,
    foeHype: 1,
  },

  // +1 each — foe joins the dance. (14)
  { message: "{foe} starts dancing with you.", foeJoins: true, playerHype: 1 },
  { message: "{foe} starts stomping rhythmically.", foeJoins: true, playerHype: 1 },
  { message: "{foe} starts shadow dancing.", foeJoins: true, playerHype: 1 },
  { message: "{foe} spins in a circle.", foeJoins: true, playerHype: 1 },
  { message: "{foe} starts headbanging.", foeJoins: true, playerHype: 1 },
  { message: "{foe} tries to copy your moves.", foeJoins: true, playerHype: 1 },
  { message: "{foe} breakdances badly but with heart.", foeJoins: true, playerHype: 1 },
  { message: "{foe} grabs your hand for an awkward two-step.", foeJoins: true, playerHype: 1 },
  { message: "{foe} moonwalks three inches, triumphantly.", foeJoins: true, playerHype: 1 },
  { message: "{foe} does the worm. Approximately.", foeJoins: true, playerHype: 1 },
  { message: "{foe} vogues like their life depends on it.", foeJoins: true, playerHype: 1 },
  { message: "{foe} flosses. The dance. Not dental.", foeJoins: true, playerHype: 1 },
  { message: "{foe} starts a conga line of one.", foeJoins: true, playerHype: 1 },
  { message: "{foe} disco-points at the ceiling.", foeJoins: true, playerHype: 1 },
];

export const DANCE_OPENERS = [
  "You bust out your signature critter shuffle.",
  "You do a dramatic spin that almost works.",
  "You attempt the floss. Your hips disagree.",
  "You pop and lock. Mostly pop.",
  "You moonwalk two inches to the left.",
  "You jazz-hand with terrifying confidence.",
  "You breakdance like nobody's watching. They are.",
  "You vogue. Briefly. With commitment.",
  "You do the robot. Badly. Proudly.",
  "You twirl like you paid for it.",
  "You drop into a squat and wiggle.",
  "You air-guitar through an entire solo.",
  "You square-dance alone. Respectfully.",
  "You whip and nae nae at your own risk.",
  "You do a tiny bow nobody asked for.",
  "You cha-cha with unearned swagger.",
  "You attempt a cartwheel. Gravity wins.",
  "You disco-point at the ceiling. Twice.",
  "You floss. The dance. Not dental.",
] as const;

export function getPlayerHypeGain(response: DanceResponse): number {
  if (response.playerHype !== undefined) {
    return response.playerHype;
  }
  if (response.foeJoins) {
    return 1;
  }
  return 0;
}

export function getFoeHypeGain(response: DanceResponse): number {
  if (response.foeHype !== undefined) {
    return response.foeHype;
  }
  if (response.foeJoins) {
    return 1;
  }
  return 0;
}

/** Foe cheers but does not join — safe pool for the guaranteed first-dance tutorial. */
export const PLAYER_ONLY_DANCE_RESPONSES: DanceResponse[] = DANCE_RESPONSES.filter(
  (response) =>
    getPlayerHypeGain(response) === 1 &&
    getFoeHypeGain(response) === 0 &&
    response.foeJoins !== true
);

export type DanceHypeTailOptions = {
  playerCapped?: boolean;
  foeCapped?: boolean;
};

function formatDanceHypeGain(gain: number): string {
  return `<span class="battle-hype-gain">+${gain} HYPE</span>`;
}

export function formatDanceHypeTail(
  playerGain: number,
  foeGain: number,
  foeName?: string,
  options?: DanceHypeTailOptions
): string {
  const playerCapped = options?.playerCapped ?? false;
  const foeCapped = options?.foeCapped ?? false;

  if (playerGain === 0 && foeGain === 0) {
    if (playerCapped && foeCapped) {
      return "You're both max hype!";
    }
    if (playerCapped) {
      return "You're max hype!";
    }
    if (foeCapped) {
      const label = foeName ? escapeHtml(foeName) : "They";
      return `${label} is max hype!`;
    }
    return "";
  }

  const segments: string[] = [];

  if (playerGain > 0 && foeGain > 0) {
    segments.push(`You both get ${formatDanceHypeGain(1)}!`);
  } else if (foeGain > 0) {
    const label = foeName ? escapeHtml(foeName) : "They";
    segments.push(`${label} gets ${formatDanceHypeGain(foeGain)}!`);
  } else if (playerGain > 0) {
    segments.push(`You get ${formatDanceHypeGain(playerGain)}!`);
  }

  if (playerCapped) {
    segments.push("You're max hype!");
  }
  if (foeCapped) {
    const label = foeName ? escapeHtml(foeName) : "They";
    segments.push(`${label} is max hype!`);
  }

  return segments.join(" ");
}

let lastDanceResponseIndex = -1;
let lastFirstDanceResponseIndex = -1;
let lastDanceOpenerIndex = -1;

export function resetDancePicker(): void {
  lastDanceResponseIndex = -1;
  lastFirstDanceResponseIndex = -1;
  lastDanceOpenerIndex = -1;
}

function pickIndexAvoidingRepeat(
  length: number,
  lastIndex: number,
  random: () => number
): number {
  if (length <= 1) {
    return 0;
  }
  let index = Math.floor(random() * length);
  if (index === lastIndex) {
    index = (lastIndex + 1) % length;
  }
  return index;
}

export function pickRandomDanceResponse(
  random = Math.random
): DanceResponse {
  const index = pickIndexAvoidingRepeat(
    DANCE_RESPONSES.length,
    lastDanceResponseIndex,
    random
  );
  lastDanceResponseIndex = index;
  return DANCE_RESPONSES[index]!;
}

/** First dance each run — always +1 player HYPE, never foe HYPE or join. */
export function pickFirstDanceResponse(random = Math.random): DanceResponse {
  const index = pickIndexAvoidingRepeat(
    PLAYER_ONLY_DANCE_RESPONSES.length,
    lastFirstDanceResponseIndex,
    random
  );
  lastFirstDanceResponseIndex = index;
  return PLAYER_ONLY_DANCE_RESPONSES[index]!;
}

export function pickRandomDanceOpener(random = Math.random): string {
  const index = pickIndexAvoidingRepeat(
    DANCE_OPENERS.length,
    lastDanceOpenerIndex,
    random
  );
  lastDanceOpenerIndex = index;
  return DANCE_OPENERS[index]!;
}
