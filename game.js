import { FOES as FOES_RAW } from "./foes-data.js";
import { assertAlliterativeName } from "./alliteration.js";
const STORAGE_KEY = "critterwave-v1";
const LEGACY_STORAGE_KEYS = ["goblinwave-v4", "goblinwave-v1"];
const HYPE_ATTACK_PER_LEVEL = 1;
const DEFAULT_HERO_EMOJI = "🐱";
const DEFAULT_HERO_LABEL = "Cat";
function assertUniqueEmojis(entries) {
    const seen = new Set();
    for (const entry of entries) {
        if (seen.has(entry.emoji)) {
            throw new Error(`Duplicate emoji ${entry.emoji} (${entry.name ?? entry.label})`);
        }
        seen.add(entry.emoji);
    }
}
function heroLabelFromFoeName(name) {
    const words = name.trim().split(/\s+/);
    return words.slice(1).join(" ") || words[0];
}
function heroesFromFoes(foes) {
    return foes.map((foe) => ({
        id: foe.id,
        label: heroLabelFromFoeName(foe.name),
        emoji: foe.emoji,
    }));
}
const FOES = FOES_RAW.map((f) => ({ ...f }));
const HEROES = heroesFromFoes(FOES).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
for (const foe of FOES) {
    assertAlliterativeName(foe.name);
}
assertUniqueEmojis(FOES);
function shuffleFoes(roster) {
    const order = roster.map((f) => ({ ...f }));
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
}
function foesForHero(heroEmoji) {
    return FOES.filter((f) => f.emoji !== heroEmoji);
}
function buildFoeOrder(heroEmoji) {
    return shuffleFoes(foesForHero(heroEmoji));
}
function getCampaignLength() {
    return foeOrder.length > 0 ? foeOrder.length : foesForHero(player.emoji).length;
}
function restoreFoeOrder(ids, heroEmoji) {
    const expected = foesForHero(heroEmoji);
    if (ids?.length === expected.length) {
        const byId = new Map(FOES.map((f) => [f.id, f]));
        const restored = ids
            .map((id) => byId.get(id))
            .filter((f) => !!f && f.emoji !== heroEmoji);
        if (restored.length === expected.length)
            return restored;
    }
    return buildFoeOrder(heroEmoji);
}
const FOE_MOOD_EMOJI = {
    default: "",
    happy: "✨",
    angry: "💢",
    confused: "❓",
    impressed: "⭐",
    disappointed: "😒",
    silly: "😂",
    dancing: "🎵",
};
const danceResponses = [
    { message: "{foe} boos loudly.", mood: "disappointed", playerHype: 0 },
    { message: "{foe} crosses their arms and watches silently.", mood: "default", playerHype: 0 },
    { message: "{foe} refuses to acknowledge your performance.", mood: "disappointed", playerHype: 0 },
    { message: "{foe} looks disappointed in you personally.", mood: "disappointed", playerHype: 0 },
    { message: "{foe} throws a tomato at you.", mood: "angry", playerHype: 0 },
    { message: "{foe} rates your performance a 7/10.", mood: "default", playerHype: 0 },
    { message: "{foe} checks their watch pointedly.", mood: "default", playerHype: 0 },
    { message: "{foe} yawns mid-dance.", mood: "disappointed", playerHype: 0 },
    { message: "{foe} holds up a little sign that says 2/10.", mood: "disappointed", playerHype: 0 },
    { message: "{foe} pretends to take an important phone call.", mood: "default", playerHype: 0 },
    { message: "{foe} slowly backs away from the dance floor.", mood: "confused", playerHype: 0 },
    { message: "{foe} eats a sandwich, unimpressed.", mood: "default", playerHype: 0 },
    { message: "{foe} claps once, then stops forever.", mood: "disappointed", playerHype: 0 },
    { message: "{foe} puts on sunglasses and stares at the ceiling.", mood: "default", playerHype: 0 },
    { message: "{foe} whispers they've seen better at a funeral.", mood: "disappointed", playerHype: 0 },
    { message: "{foe} claps politely.", mood: "happy" },
    { message: "{foe} looks confused but supportive.", mood: "confused" },
    { message: "{foe} tosses you a shiny pebble.", mood: "happy" },
    { message: "{foe} looks genuinely impressed.", mood: "impressed" },
    { message: "{foe} laughs so hard they snort.", mood: "silly" },
    { message: "{foe} chants your name.", mood: "happy" },
    { message: "{foe} gives you a thumbs up.", mood: "happy" },
    { message: "{foe} looks terrified by your moves.", mood: "confused" },
    { message: "{foe} pretends to be a dance judge.", mood: "impressed" },
    { message: "{foe} wipes away a tear.", mood: "impressed" },
    { message: "{foe} screams for an encore.", mood: "happy" },
    { message: "{foe} pulls out a tiny fan and fans you.", mood: "happy" },
    { message: "{foe} wheezes ONE MORE TIME!", mood: "happy" },
    { message: "{foe} weeps with joy.", mood: "impressed" },
    { message: "{foe} whispers teach me with awe.", mood: "impressed" },
    { message: "{foe} faints from sheer awesomeness.", mood: "silly" },
    { message: "{foe} honks a party horn once, respectfully.", mood: "silly" },
    { message: "{foe} throws glitter into the air.", mood: "silly" },
    { message: "{foe} starts dancing with you.", mood: "dancing" },
    { message: "{foe} starts stomping rhythmically.", mood: "dancing" },
    { message: "{foe} starts shadow dancing.", mood: "dancing" },
    { message: "{foe} spins in a circle.", mood: "dancing" },
    { message: "{foe} starts headbanging.", mood: "dancing" },
    { message: "{foe} tries to copy your moves.", mood: "dancing" },
    { message: "{foe} breakdances badly but with heart.", mood: "dancing" },
    { message: "{foe} grabs your hand for an awkward two-step.", mood: "dancing" },
    { message: "{foe} moonwalks three inches, triumphantly.", mood: "dancing" },
    { message: "{foe} does the worm. Approximately.", mood: "dancing" },
    { message: "{foe} vogues like their life depends on it.", mood: "dancing" },
    { message: "{foe} flosses. The dance. Not dental.", mood: "dancing" },
    { message: "{foe} starts a conga line of one.", mood: "dancing" },
    { message: "{foe} disco-points at the ceiling.", mood: "dancing" },
    { message: "{foe} does the robot with suspicious fluidity.", mood: "dancing" },
];
const player = {
    name: "Hero",
    hp: 20,
    maxHp: 20,
    attack: 5,
    emoji: DEFAULT_HERO_EMOJI,
};
let foe = null;
let foeOrder = [];
let turn = 1;
let wave = 1;
let hypeLevel = 0;
let foeHypeLevel = 0;
let phase = "combat";
let actionsLocked = false;
let pendingHeroEmoji = DEFAULT_HERO_EMOJI;
let pendingHeroLabel = DEFAULT_HERO_LABEL;
const el = {
    arena: document.getElementById("arena"),
    playerPanel: document.getElementById("player-panel"),
    foePanel: document.getElementById("foe-panel"),
    damageLayer: document.getElementById("damage-layer"),
    bestWave: document.getElementById("stat-best-wave"),
    runs: document.getElementById("stat-runs"),
    waveBanner: document.getElementById("wave-banner"),
    playerHpFill: document.getElementById("player-hp-fill"),
    playerHpText: document.getElementById("player-hp-text"),
    playerAttack: document.getElementById("player-attack"),
    playerBuff: document.getElementById("player-buff"),
    playerEmoji: document.getElementById("hero-emoji"),
    playerName: document.getElementById("hero-name"),
    foeName: document.getElementById("foe-name"),
    foeAttack: document.getElementById("foe-attack"),
    foeBuff: document.getElementById("foe-buff"),
    foeEmoji: document.getElementById("foe-emoji"),
    foeMoodBadge: document.getElementById("foe-mood-badge"),
    foeHpFill: document.getElementById("foe-hp-fill"),
    foeHpText: document.getElementById("foe-hp-text"),
    turnLabel: document.getElementById("turn-label"),
    battleText: document.getElementById("battle-text"),
    actions: document.getElementById("actions"),
    gameOver: document.getElementById("game-over"),
    gameOverTag: document.getElementById("game-over-tag"),
    gameOverSummary: document.getElementById("game-over-summary"),
    restartLabel: document.querySelector("#restart-btn .cmd-label"),
    restartBtn: document.getElementById("restart-btn"),
    quitBtn: document.getElementById("quit-btn"),
    restartRunBtn: document.getElementById("restart-run-btn"),
    resetStatsBtn: document.getElementById("reset-stats-btn"),
    confirmOverlay: document.getElementById("confirm-overlay"),
    confirmTitle: document.getElementById("confirm-title"),
    confirmMessage: document.getElementById("confirm-message"),
    confirmOk: document.getElementById("confirm-ok"),
    confirmCancel: document.getElementById("confirm-cancel"),
    setupOverlay: document.getElementById("character-setup"),
    heroPicker: document.getElementById("hero-picker"),
    setupStartBtn: document.getElementById("setup-start-btn"),
    gameShell: document.querySelector(".game-shell"),
};
let confirmResolve = null;
function showConfirm(options) {
    return new Promise((resolve) => {
        el.confirmTitle.textContent = options.title;
        el.confirmMessage.textContent = options.message;
        el.confirmOk.textContent = options.confirmLabel ?? "Yes";
        el.confirmCancel.textContent = options.cancelLabel ?? "Cancel";
        el.confirmOverlay.classList.toggle("confirm-danger", options.danger ?? false);
        el.confirmOverlay.classList.remove("hidden");
        confirmResolve = resolve;
        el.confirmCancel.focus();
    });
}
function closeConfirm(confirmed) {
    el.confirmOverlay.classList.add("hidden");
    el.confirmOverlay.classList.remove("confirm-danger");
    const resolve = confirmResolve;
    confirmResolve = null;
    resolve?.(confirmed);
}
function bindConfirmDialog() {
    el.confirmOk.addEventListener("click", () => {
        closeConfirm(true);
    });
    el.confirmCancel.addEventListener("click", () => {
        closeConfirm(false);
    });
    el.confirmOverlay.addEventListener("click", (event) => {
        if (event.target === el.confirmOverlay) {
            closeConfirm(false);
        }
    });
    document.addEventListener("keydown", (event) => {
        if (el.confirmOverlay.classList.contains("hidden"))
            return;
        if (event.key === "Escape") {
            event.preventDefault();
            closeConfirm(false);
        }
    });
}
function getStorageRaw() {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current)
        return current;
    for (const key of LEGACY_STORAGE_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy)
            return legacy;
    }
    return null;
}
function loadSave() {
    try {
        const raw = getStorageRaw();
        if (!raw) {
            return { bestWave: 0, runsPlayed: 0 };
        }
        const parsed = JSON.parse(raw);
        return {
            bestWave: parsed.bestWave ?? 0,
            runsPlayed: parsed.runsPlayed ?? 0,
            playerEmoji: parsed.playerEmoji,
            heroLabel: parsed.heroLabel,
        };
    }
    catch {
        return { bestWave: 0, runsPlayed: 0 };
    }
}
function loadSnapshot() {
    try {
        const raw = getStorageRaw();
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        const snap = parsed.snapshot;
        if (!snap)
            return null;
        return normalizeSnapshot(snap);
    }
    catch {
        return null;
    }
}
function normalizeSnapshot(snap) {
    const legacyFoe = snap.foe ?? snap.goblin;
    const foeNormalized = legacyFoe
        ? {
            id: legacyFoe.id ?? "grumpy-goblin",
            name: legacyFoe.name ?? "Grumpy Goblin",
            emoji: legacyFoe.emoji ?? "👺",
            hp: legacyFoe.hp,
            maxHp: legacyFoe.maxHp,
            attack: legacyFoe.attack,
        }
        : null;
    return {
        player: {
            ...snap.player,
            emoji: snap.player.emoji ?? DEFAULT_HERO_EMOJI,
        },
        foe: foeNormalized,
        turn: snap.turn,
        wave: snap.wave,
        phase: snap.phase,
        hypeLevel: snap.hypeLevel ?? 0,
        foeHypeLevel: snap.foeHypeLevel ?? snap.goblinHypeLevel ?? 0,
        foeOrderIds: snap.foeOrderIds,
    };
}
function persistStatsOnly() {
    const save = loadSave();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bestWave: save.bestWave,
        runsPlayed: save.runsPlayed,
        playerEmoji: player.emoji,
        heroLabel: getHeroLabelForEmoji(player.emoji),
    }));
}
function persist(snapshot) {
    const save = loadSave();
    const activeSnapshot = phase === "gameover" || phase === "victory" ? undefined : (snapshot ?? getSnapshot());
    const payload = activeSnapshot
        ? {
            bestWave: save.bestWave,
            runsPlayed: save.runsPlayed,
            playerEmoji: player.emoji,
            heroLabel: getHeroLabelForEmoji(player.emoji),
            snapshot: activeSnapshot,
        }
        : {
            bestWave: save.bestWave,
            runsPlayed: save.runsPlayed,
            playerEmoji: player.emoji,
            heroLabel: getHeroLabelForEmoji(player.emoji),
        };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
function getSnapshot() {
    return {
        player: { ...player },
        foe: foe ? { ...foe } : null,
        turn,
        wave,
        phase,
        hypeLevel,
        foeHypeLevel,
        foeOrderIds: foeOrder.map((f) => f.id),
    };
}
function applySnapshot(snapshot) {
    Object.assign(player, snapshot.player);
    foe = snapshot.foe ? { ...snapshot.foe } : null;
    turn = snapshot.turn;
    wave = snapshot.wave;
    phase = snapshot.phase;
    hypeLevel = snapshot.hypeLevel ?? 0;
    foeHypeLevel = snapshot.foeHypeLevel ?? 0;
    foeOrder = restoreFoeOrder(snapshot.foeOrderIds, snapshot.player.emoji);
}
function getHeroLabelForEmoji(emoji) {
    return HEROES.find((h) => h.emoji === emoji)?.label ?? DEFAULT_HERO_LABEL;
}
function getPlayerHypeBonus() {
    return hypeLevel * HYPE_ATTACK_PER_LEVEL;
}
function getFoeHypeBonus() {
    return foeHypeLevel * HYPE_ATTACK_PER_LEVEL;
}
function getEffectiveAttack() {
    return player.attack + getPlayerHypeBonus();
}
function getEffectiveFoeAttack() {
    if (!foe)
        return 0;
    return foe.attack + getFoeHypeBonus();
}
function getPlayerHypeGain(response) {
    return response.playerHype ?? 1;
}
function applyPlayerDanceBuff(amount = 1) {
    hypeLevel += amount;
}
function foeDancesBack(mood) {
    return mood === "dancing";
}
function applyFoeDanceBuff() {
    foeHypeLevel += 1;
}
function formatHypeLabel(level) {
    return `HYPE x${level}`;
}
function clearAllHype() {
    hypeLevel = 0;
    foeHypeLevel = 0;
}
function foeDisplayName() {
    return foe?.name ?? "foe";
}
function formatFoeInText(template) {
    return template.replace(/\{foe\}/g, foeDisplayName());
}
function renderRecords() {
    const save = loadSave();
    el.bestWave.textContent = String(save.bestWave);
    el.runs.textContent = String(save.runsPlayed);
}
function setHpBar(fill, current, max) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    fill.style.width = `${pct}%`;
}
function setFoeMood(mood) {
    if (!foe)
        return;
    const badge = FOE_MOOD_EMOJI[mood];
    el.foeMoodBadge.textContent = badge;
    el.foeMoodBadge.classList.toggle("hidden", !badge);
    el.foeEmoji.textContent = foe.emoji;
    el.foeEmoji.setAttribute("aria-label", `${foe.name} (${mood})`);
}
function briefClass(element, className, ms) {
    element.classList.add(className);
    window.setTimeout(() => element.classList.remove(className), ms);
}
function showDamagePop(side, text, kind) {
    const pop = document.createElement("span");
    pop.className = kind === "heal" ? "damage-pop heal-pop" : "damage-pop";
    pop.textContent = text;
    pop.style.left = side === "hero" ? "18%" : "62%";
    pop.style.top = side === "hero" ? "28%" : "22%";
    el.damageLayer.appendChild(pop);
    window.setTimeout(() => pop.remove(), 900);
}
function pulseWaveHud() {
    el.waveBanner.classList.remove("wave-pop");
    void el.waveBanner.offsetWidth;
    el.waveBanner.classList.add("wave-pop");
}
function renderHeroSprite() {
    const label = getHeroLabelForEmoji(player.emoji);
    el.playerEmoji.textContent = player.emoji;
    el.playerEmoji.setAttribute("aria-label", label);
    el.playerName.textContent = label.toUpperCase();
}
function render() {
    renderRecords();
    renderHeroSprite();
    el.waveBanner.textContent = `${Math.min(wave, getCampaignLength())} / ${getCampaignLength()}`;
    el.turnLabel.textContent = String(turn);
    setHpBar(el.playerHpFill, player.hp, player.maxHp);
    el.playerHpText.textContent = `${player.hp}/${player.maxHp}`;
    el.playerAttack.textContent = String(getEffectiveAttack());
    el.playerBuff.textContent = formatHypeLabel(hypeLevel);
    el.playerBuff.classList.toggle("hidden", hypeLevel === 0);
    const playerHpBar = el.playerPanel.querySelector(".hp-bar");
    playerHpBar?.classList.toggle("hp-low", player.hp / player.maxHp < 0.3);
    if (foe) {
        el.foeName.textContent = foe.name.toUpperCase();
        el.foeAttack.textContent = String(getEffectiveFoeAttack());
        el.foeBuff.textContent = formatHypeLabel(foeHypeLevel);
        el.foeBuff.classList.toggle("hidden", foeHypeLevel === 0);
        el.foeEmoji.textContent = foe.emoji;
        setHpBar(el.foeHpFill, foe.hp, foe.maxHp);
        el.foeHpText.textContent = `${foe.hp}/${foe.maxHp}`;
        const foeHpBar = el.foePanel.querySelector(".hp-bar");
        foeHpBar?.classList.toggle("hp-low", foe.hp / foe.maxHp < 0.3);
    }
    const inEndScreen = phase === "gameover" || phase === "victory";
    el.gameOver.classList.toggle("hidden", !inEndScreen);
    el.gameOver.classList.toggle("game-victory", phase === "victory");
    el.gameOverTag.textContent = phase === "victory" ? "YOU WIN!" : "GAME OVER";
    el.restartLabel.textContent = phase === "victory" ? "Play again?" : "Try again?";
    el.actions.classList.toggle("hidden", inEndScreen);
    el.turnLabel.classList.toggle("hidden", inEndScreen);
    for (const btn of el.actions.querySelectorAll("button")) {
        btn.disabled = actionsLocked || inEndScreen;
    }
}
function logLine(text, kind = "info") {
    el.battleText.textContent = text;
    el.battleText.className = `battle-text battle-${kind}`;
}
function clearLog() {
    logLine("What will you do?", "info");
}
function pickFoeTemplate(w) {
    const idx = Math.min(w - 1, foeOrder.length - 1);
    return foeOrder[idx];
}
function makeFoeForWave(w) {
    const template = pickFoeTemplate(w);
    const hp = template.baseHp + Math.max(0, w - 1) * 2;
    const attack = template.baseAtk + Math.floor((w - 1) / 3);
    return {
        id: template.id,
        name: template.name,
        emoji: template.emoji,
        hp,
        maxHp: hp,
        attack,
    };
}
function randomDamage(max) {
    return Math.floor(Math.random() * max) + 1;
}
function randomDanceResponse() {
    return danceResponses[Math.floor(Math.random() * danceResponses.length)];
}
function startWave() {
    foe = makeFoeForWave(wave);
    foeHypeLevel = 0;
    setFoeMood("default");
    pulseWaveHud();
    logLine(`${foe.name} appears!`, "foe");
    render();
    persist();
}
function updateRecordsOnGameOver() {
    const save = loadSave();
    const completedWave = Math.max(0, wave - 1);
    save.bestWave = Math.max(save.bestWave, completedWave);
    save.runsPlayed += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bestWave: save.bestWave,
        runsPlayed: save.runsPlayed,
        playerEmoji: player.emoji,
        heroLabel: getHeroLabelForEmoji(player.emoji),
    }));
    const waveText = completedWave === 1 ? "1 wave" : `${completedWave} waves`;
    el.gameOverSummary.textContent = `You reached ${waveText}.`;
}
function updateRecordsOnVictory() {
    const save = loadSave();
    save.bestWave = Math.max(save.bestWave, getCampaignLength());
    save.runsPlayed += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bestWave: save.bestWave,
        runsPlayed: save.runsPlayed,
        playerEmoji: player.emoji,
        heroLabel: getHeroLabelForEmoji(player.emoji),
    }));
    el.gameOverSummary.textContent = `You defeated all ${getCampaignLength()} foes!`;
}
function endGame() {
    phase = "gameover";
    clearAllHype();
    setFoeMood("disappointed");
    logLine("You lose! Game over.", "lose");
    updateRecordsOnGameOver();
    persist();
    render();
}
function winCampaign() {
    phase = "victory";
    clearAllHype();
    setFoeMood("happy");
    logLine("Every foe defeated! Total victory!", "win");
    updateRecordsOnVictory();
    persist();
    render();
}
function winWave() {
    logLine("You win this wave!", "win");
    if (wave >= getCampaignLength()) {
        winCampaign();
        return;
    }
    wave += 1;
    turn = 1;
    startWave();
}
function foeCounterAttack() {
    if (!foe || foe.hp <= 0)
        return;
    const hit = randomDamage(getEffectiveFoeAttack());
    player.hp = Math.max(0, player.hp - hit);
    setFoeMood("angry");
    showDamagePop("hero", `-${hit}`, "damage");
    logLine(`${foe.name} hits you for ${hit} damage.`, "foe");
    logLine(`Player HP: ${player.hp}`, "info");
    if (player.hp <= 0) {
        endGame();
        return;
    }
    turn += 1;
    setFoeMood("default");
    render();
    persist();
}
async function withActionLock(fn) {
    if (actionsLocked || phase === "gameover" || phase === "victory")
        return;
    actionsLocked = true;
    render();
    try {
        await fn();
    }
    finally {
        actionsLocked = false;
        render();
    }
}
function onAttack() {
    if (!foe)
        return;
    const hit = randomDamage(getEffectiveAttack());
    foe.hp = Math.max(0, foe.hp - hit);
    setFoeMood(foe.hp <= foe.maxHp / 2 ? "angry" : "default");
    briefClass(el.foePanel, "foe-shake", 350);
    showDamagePop("foe", `-${hit}`, "damage");
    logLine(`You hit ${foe.name} for ${hit} damage.`, "player");
    logLine(`${foe.name} HP: ${foe.hp}`, "info");
    render();
    if (foe.hp <= 0) {
        winWave();
        return;
    }
    foeCounterAttack();
}
function onHeal() {
    const heal = 3;
    player.hp = Math.min(player.maxHp, player.hp + heal);
    showDamagePop("hero", `+${heal}`, "heal");
    logLine(`You heal for ${heal} HP.`, "player");
    logLine(`Player HP: ${player.hp}/${player.maxHp}`, "info");
    render();
    foeCounterAttack();
}
function formatDanceHypeMessage(response, playerGain, foeJoins) {
    const line = formatFoeInText(response.message);
    if (playerGain === 0) {
        return `${line} You get +0 hype!`;
    }
    if (foeJoins) {
        return `${line} You get +1 hype, but ${foeDisplayName()} gets +1 hype too!`;
    }
    return `${line} You get +1 hype!`;
}
function onDance() {
    const response = randomDanceResponse();
    const playerGain = getPlayerHypeGain(response);
    const joins = foeDancesBack(response.mood);
    if (playerGain > 0) {
        applyPlayerDanceBuff(playerGain);
    }
    if (joins) {
        applyFoeDanceBuff();
    }
    logLine(formatDanceHypeMessage(response, playerGain, joins), "foe");
    turn += 1;
    render();
    persist();
}
function onRun() {
    if (wave >= getCampaignLength()) {
        logLine("No fleeing the final foe!", "info");
        return;
    }
    clearAllHype();
    logLine("You fled! Your hype fades...", "player");
    wave += 1;
    turn = 1;
    startWave();
}
function applyHeroChoice(emoji, label) {
    player.emoji = emoji;
    player.name = label;
    pendingHeroEmoji = emoji;
    pendingHeroLabel = label;
}
function buildHeroPicker() {
    el.heroPicker.innerHTML = "";
    for (const hero of HEROES) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "emoji-pick";
        btn.dataset.emoji = hero.emoji;
        btn.dataset.label = hero.label;
        btn.setAttribute("aria-label", hero.label);
        btn.innerHTML = `<span class="emoji-pick-glyph" aria-hidden="true">${hero.emoji}</span><span class="emoji-pick-label">${hero.label}</span>`;
        if (hero.emoji === pendingHeroEmoji) {
            btn.classList.add("selected");
        }
        btn.addEventListener("click", () => {
            for (const other of el.heroPicker.querySelectorAll(".emoji-pick")) {
                other.classList.remove("selected");
            }
            btn.classList.add("selected");
            pendingHeroEmoji = hero.emoji;
            pendingHeroLabel = hero.label;
        });
        el.heroPicker.appendChild(btn);
    }
}
function showSetup() {
    const save = loadSave();
    pendingHeroEmoji = save.playerEmoji ?? player.emoji;
    pendingHeroLabel = getHeroLabelForEmoji(pendingHeroEmoji);
    buildHeroPicker();
    el.setupOverlay.classList.remove("hidden");
    el.gameShell.classList.add("setup-active");
}
function hideSetup() {
    el.setupOverlay.classList.add("hidden");
    el.gameShell.classList.remove("setup-active");
}
function confirmHeroAndStart() {
    applyHeroChoice(pendingHeroEmoji, pendingHeroLabel);
    hideSetup();
    persistStatsOnly();
    if (foe) {
        resetGame();
    }
}
function resetGame() {
    player.hp = player.maxHp;
    turn = 1;
    wave = 1;
    foeOrder = buildFoeOrder(player.emoji);
    clearAllHype();
    phase = "combat";
    el.gameOver.classList.add("hidden");
    clearLog();
    logLine("A new adventure begins.", "info");
    startWave();
}
async function quitGame() {
    const confirmed = await showConfirm({
        title: "Quit to hero select?",
        message: "Your best wave and run count are kept, but this run will be abandoned and can't be resumed.",
        confirmLabel: "Quit",
    });
    if (!confirmed) {
        return;
    }
    persistStatsOnly();
    foe = null;
    phase = "combat";
    el.gameOver.classList.add("hidden");
    showSetup();
}
async function restartRun() {
    const confirmed = await showConfirm({
        title: "Restart this run?",
        message: "You keep your character and all-time stats, but this run starts over at wave 1. This can't be undone.",
        confirmLabel: "Restart",
    });
    if (!confirmed) {
        return;
    }
    resetGame();
}
async function resetStats() {
    const confirmed = await showConfirm({
        title: "Delete everything?",
        message: "Permanently delete your character and all-time play history. This can't be undone.",
        confirmLabel: "Reset",
        danger: true,
    });
    if (!confirmed) {
        return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bestWave: 0,
        runsPlayed: 0,
    }));
    renderRecords();
    foe = null;
    phase = "combat";
    el.gameOver.classList.add("hidden");
    showSetup();
}
function bindActions() {
    el.actions.addEventListener("click", (event) => {
        const target = event.target.closest("[data-action]");
        if (!target)
            return;
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
    el.quitBtn.addEventListener("click", () => {
        void quitGame();
    });
    el.restartRunBtn.addEventListener("click", () => {
        void restartRun();
    });
    el.resetStatsBtn.addEventListener("click", () => {
        void resetStats();
    });
    el.setupStartBtn.addEventListener("click", () => {
        confirmHeroAndStart();
        if (!foe) {
            beginGame();
        }
        else {
            render();
            persist();
        }
    });
}
function beginGame() {
    const save = loadSave();
    if (save.playerEmoji) {
        applyHeroChoice(save.playerEmoji, getHeroLabelForEmoji(save.playerEmoji));
    }
    const snapshot = loadSnapshot();
    if (snapshot && snapshot.phase === "combat" && snapshot.foe) {
        applySnapshot(snapshot);
        clearLog();
        logLine("Welcome back — your run was restored.", "info");
        setFoeMood("default");
        render();
        persist();
        return;
    }
    if (snapshot?.phase === "gameover" || snapshot?.phase === "victory") {
        resetGame();
        return;
    }
    resetGame();
}
function init() {
    bindConfirmDialog();
    bindActions();
    renderRecords();
    const save = loadSave();
    if (!save.playerEmoji) {
        showSetup();
        return;
    }
    applyHeroChoice(save.playerEmoji, getHeroLabelForEmoji(save.playerEmoji));
    beginGame();
}
init();
