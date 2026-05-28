type Player = {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  gold: number;
};

type Enemy = {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
};

type GoblinMood =
  | "default"
  | "happy"
  | "angry"
  | "confused"
  | "impressed"
  | "disappointed"
  | "silly"
  | "dancing";

type DanceResponse = {
  message: string;
  gold: number;
  mood: GoblinMood;
};

type SaveData = {
  bestWave: number;
  bestRunGold: number;
  totalGold: number;
  runsPlayed: number;
};

type GameSnapshot = {
  player: Player;
  goblin: Enemy | null;
  turn: number;
  wave: number;
  phase: "combat" | "gameover";
};

const STORAGE_KEY = "goblinwave-v1";

const GOBLIN_IMAGES: Record<GoblinMood, string> = {
  default: "assets/goblins/goblin-default.svg",
  happy: "assets/goblins/goblin-happy.svg",
  angry: "assets/goblins/goblin-angry.svg",
  confused: "assets/goblins/goblin-confused.svg",
  impressed: "assets/goblins/goblin-impressed.svg",
  disappointed: "assets/goblins/goblin-disappointed.svg",
  silly: "assets/goblins/goblin-silly.svg",
  dancing: "assets/goblins/goblin-dancing.svg",
};

const danceResponses: DanceResponse[] = [
  { message: "The goblin claps politely.", gold: 0, mood: "happy" },
  { message: "The goblin starts dancing with you.", gold: 0, mood: "dancing" },
  { message: "The goblin looks confused but supportive.", gold: 0, mood: "confused" },
  { message: "The goblin throws a gold coin at your feet.", gold: 1, mood: "happy" },
  { message: "The goblin boos loudly.", gold: 0, mood: "disappointed" },
  { message: "The goblin nods to the beat.", gold: 0, mood: "happy" },
  { message: "The goblin crosses their arms and watches silently.", gold: 0, mood: "default" },
  { message: "The goblin looks genuinely impressed.", gold: 0, mood: "impressed" },
  { message: "The goblin laughs so hard they snort.", gold: 0, mood: "silly" },
  { message: "The goblin attempts a cartwheel and fails.", gold: 0, mood: "silly" },
  { message: "The goblin chants your name.", gold: 0, mood: "happy" },
  { message: "The goblin looks emotionally moved.", gold: 0, mood: "impressed" },
  { message: "The goblin refuses to acknowledge your performance.", gold: 0, mood: "disappointed" },
  { message: "The goblin starts stomping rhythmically.", gold: 0, mood: "dancing" },
  { message: "The goblin gives you a thumbs up.", gold: 0, mood: "happy" },
  { message: "The goblin looks terrified by your moves.", gold: 0, mood: "confused" },
  { message: "The goblin throws glitter into the air.", gold: 0, mood: "silly" },
  { message: "The goblin starts shadow dancing.", gold: 0, mood: "dancing" },
  { message: "The goblin spins in a circle.", gold: 0, mood: "dancing" },
  { message: "The goblin looks disappointed in you personally.", gold: 0, mood: "disappointed" },
  { message: "The goblin starts beatboxing poorly.", gold: 0, mood: "silly" },
  { message: "The goblin throws a tomato at you.", gold: 0, mood: "angry" },
  { message: "The goblin pretends to be a dance judge.", gold: 0, mood: "impressed" },
  { message: "The goblin wipes away a tear.", gold: 0, mood: "impressed" },
  { message: "The goblin starts headbanging.", gold: 0, mood: "dancing" },
  { message: "The goblin throws you a gold coin.", gold: 1, mood: "happy" },
  { message: "The goblin tries to copy your moves.", gold: 0, mood: "dancing" },
  { message: "The goblin looks spiritually awakened.", gold: 0, mood: "impressed" },
  { message: "The goblin screams for an encore.", gold: 0, mood: "happy" },
  { message: "The goblin rates your performance a 7/10.", gold: 0, mood: "default" },
];

const player: Player = {
  name: "Hero",
  hp: 20,
  maxHp: 20,
  attack: 5,
  gold: 0,
};

let goblin: Enemy | null = null;
let turn = 1;
let wave = 1;
let phase: GameSnapshot["phase"] = "combat";
let actionsLocked = false;

const el = {
  bestWave: document.getElementById("stat-best-wave")!,
  bestGold: document.getElementById("stat-best-gold")!,
  totalGold: document.getElementById("stat-total-gold")!,
  runs: document.getElementById("stat-runs")!,
  waveBanner: document.getElementById("wave-banner")!,
  playerHpFill: document.getElementById("player-hp-fill")!,
  playerHpText: document.getElementById("player-hp-text")!,
  playerAttack: document.getElementById("player-attack")!,
  playerGold: document.getElementById("player-gold")!,
  goblinName: document.getElementById("goblin-name")!,
  goblinImage: document.getElementById("goblin-image") as HTMLImageElement,
  goblinHpFill: document.getElementById("goblin-hp-fill")!,
  goblinHpText: document.getElementById("goblin-hp-text")!,
  turnLabel: document.getElementById("turn-label")!,
  log: document.getElementById("log")!,
  actions: document.getElementById("actions")!,
  gameOver: document.getElementById("game-over")!,
  gameOverSummary: document.getElementById("game-over-summary")!,
  restartBtn: document.getElementById("restart-btn")!,
};

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { bestWave: 0, bestRunGold: 0, totalGold: 0, runsPlayed: 0 };
    }
    const parsed = JSON.parse(raw) as Partial<SaveData & { snapshot?: GameSnapshot }>;
    return {
      bestWave: parsed.bestWave ?? 0,
      bestRunGold: parsed.bestRunGold ?? 0,
      totalGold: parsed.totalGold ?? 0,
      runsPlayed: parsed.runsPlayed ?? 0,
    };
  } catch {
    return { bestWave: 0, bestRunGold: 0, totalGold: 0, runsPlayed: 0 };
  }
}

function loadSnapshot(): GameSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { snapshot?: GameSnapshot };
    return parsed.snapshot ?? null;
  } catch {
    return null;
  }
}

function persist(snapshot?: GameSnapshot): void {
  const save = loadSave();
  const activeSnapshot =
    phase === "gameover" ? undefined : (snapshot ?? getSnapshot());
  const payload = activeSnapshot ? { ...save, snapshot: activeSnapshot } : { ...save };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function getSnapshot(): GameSnapshot {
  return {
    player: { ...player },
    goblin: goblin ? { ...goblin } : null,
    turn,
    wave,
    phase,
  };
}

function applySnapshot(snapshot: GameSnapshot): void {
  Object.assign(player, snapshot.player);
  goblin = snapshot.goblin ? { ...snapshot.goblin } : null;
  turn = snapshot.turn;
  wave = snapshot.wave;
  phase = snapshot.phase;
}

function renderRecords(): void {
  const save = loadSave();
  el.bestWave.textContent = String(save.bestWave);
  el.bestGold.textContent = String(save.bestRunGold);
  el.totalGold.textContent = String(save.totalGold);
  el.runs.textContent = String(save.runsPlayed);
}

function setHpBar(fill: HTMLElement, current: number, max: number): void {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  fill.style.width = `${pct}%`;
}

function setGoblinMood(mood: GoblinMood): void {
  el.goblinImage.src = GOBLIN_IMAGES[mood];
  el.goblinImage.alt = `Goblin (${mood})`;
}

function render(): void {
  renderRecords();
  el.waveBanner.textContent = `Wave ${wave}`;
  el.turnLabel.textContent = `Turn ${turn}`;

  setHpBar(el.playerHpFill, player.hp, player.maxHp);
  el.playerHpText.textContent = `${player.hp} / ${player.maxHp} HP`;
  el.playerAttack.textContent = String(player.attack);
  el.playerGold.textContent = String(player.gold);

  if (goblin) {
    el.goblinName.textContent = goblin.name;
    setHpBar(el.goblinHpFill, goblin.hp, goblin.maxHp);
    el.goblinHpText.textContent = `${goblin.hp} / ${goblin.maxHp} HP`;
  }

  const inGameOver = phase === "gameover";
  el.gameOver.classList.toggle("hidden", !inGameOver);
  el.actions.classList.toggle("hidden", inGameOver);
  el.turnLabel.classList.toggle("hidden", inGameOver);

  for (const btn of el.actions.querySelectorAll<HTMLButtonElement>("button")) {
    btn.disabled = actionsLocked || inGameOver;
  }
}

function logLine(text: string, kind: "info" | "player" | "goblin" | "win" | "lose" = "info"): void {
  const line = document.createElement("p");
  line.className = `log-line log-${kind}`;
  line.textContent = text;
  el.log.appendChild(line);
  el.log.scrollTop = el.log.scrollHeight;
}

function clearLog(): void {
  el.log.innerHTML = "";
}

function makeGoblin(): Enemy {
  return {
    name: "Goblin",
    hp: 12,
    maxHp: 12,
    attack: 3,
  };
}

function randomDamage(max: number): number {
  return Math.floor(Math.random() * max) + 1;
}

function randomDanceResponse(): DanceResponse {
  return danceResponses[Math.floor(Math.random() * danceResponses.length)];
}

function startWave(): void {
  goblin = makeGoblin();
  setGoblinMood("default");
  logLine(`A ${goblin.name} appears!`, "goblin");
  render();
  persist();
}

function updateRecordsOnGameOver(): void {
  const save = loadSave();
  const completedWave = Math.max(0, wave - 1);
  save.bestWave = Math.max(save.bestWave, completedWave);
  save.bestRunGold = Math.max(save.bestRunGold, player.gold);
  save.totalGold += player.gold;
  save.runsPlayed += 1;

  const payload = { ...save };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

  const waveText =
    completedWave === 1 ? "1 wave" : `${completedWave} waves`;
  el.gameOverSummary.textContent = `You reached ${waveText} and earned ${player.gold} gold this run.`;
}

function endGame(): void {
  phase = "gameover";
  setGoblinMood("disappointed");
  logLine("You lose! Game over.", "lose");
  updateRecordsOnGameOver();
  persist();
  render();
}

function winWave(): void {
  logLine("You win this wave!", "win");
  wave += 1;
  turn = 1;
  startWave();
}

function goblinCounterAttack(): void {
  if (!goblin || goblin.hp <= 0) return;

  const hit = randomDamage(goblin.attack);
  player.hp = Math.max(0, player.hp - hit);
  setGoblinMood("angry");
  logLine(`Goblin hits you for ${hit} damage.`, "goblin");
  logLine(`Player HP: ${player.hp}`, "info");

  if (player.hp <= 0) {
    endGame();
    return;
  }

  turn += 1;
  setGoblinMood("default");
  render();
  persist();
}

async function withActionLock(fn: () => void | Promise<void>): Promise<void> {
  if (actionsLocked || phase === "gameover") return;
  actionsLocked = true;
  render();
  try {
    await fn();
  } finally {
    actionsLocked = false;
    render();
  }
}

function onAttack(): void {
  if (!goblin) return;

  const hit = randomDamage(player.attack);
  goblin.hp = Math.max(0, goblin.hp - hit);
  setGoblinMood(goblin.hp <= goblin.maxHp / 2 ? "angry" : "default");

  logLine(`You hit the goblin for ${hit} damage.`, "player");
  logLine(`Goblin HP: ${goblin.hp}`, "info");
  render();

  if (goblin.hp <= 0) {
    winWave();
    return;
  }

  goblinCounterAttack();
}

function onHeal(): void {
  const heal = 3;
  player.hp = Math.min(player.maxHp, player.hp + heal);
  logLine(`You heal for ${heal} HP.`, "player");
  logLine(`Player HP: ${player.hp}/${player.maxHp}`, "info");
  render();
  goblinCounterAttack();
}

function onDance(): void {
  const response = randomDanceResponse();
  setGoblinMood(response.mood);
  logLine("You start dancing.", "player");
  logLine(response.message, "goblin");

  if (response.gold > 0) {
    player.gold += response.gold;
    logLine(`Gold +${response.gold}`, "win");
  }

  turn += 1;
  render();
  persist();
}

function onRun(): void {
  logLine("You run away to the next wave!", "player");
  wave += 1;
  turn = 1;
  startWave();
}

function resetGame(): void {
  player.hp = player.maxHp;
  player.gold = 0;
  turn = 1;
  wave = 1;
  phase = "combat";
  clearLog();
  logLine("A new adventure begins.", "info");
  startWave();
}

function bindActions(): void {
  el.actions.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    void withActionLock(() => {
      switch (action) {
        case "attack":
          onAttack();
          break;
        case "heal":
          onHeal();
          break;
        case "dance":
          onDance();
          break;
        case "run":
          onRun();
          break;
      }
    });
  });

  el.restartBtn.addEventListener("click", () => {
    resetGame();
  });
}

function init(): void {
  bindActions();
  renderRecords();

  const snapshot = loadSnapshot();
  if (snapshot && snapshot.phase === "combat" && snapshot.goblin) {
    applySnapshot(snapshot);
    clearLog();
    logLine("Welcome back — your run was restored.", "info");
    setGoblinMood("default");
    render();
    persist();
    return;
  }

  if (snapshot?.phase === "gameover") {
    resetGame();
    return;
  }

  resetGame();
}

init();
