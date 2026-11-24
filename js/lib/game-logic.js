export const CAMPAIGN_WAVE_COUNT = 100;
export const HERO_NAME_MAX_LENGTH = 16;
export const HYPE_ATTACK_PER_LEVEL = 1;
export const HYPE_MAX = 5;
export const LEVEL_COUNT = 10;
export const WAVES_PER_LEVEL = 10;
export const BASE_PLAYER_MAX_HP = 20;
export const BASE_PLAYER_ATTACK = 5;
export const BASE_HEAL_MAX = 7;
export const PLAYER_HP_PER_LEVEL = 3;
export const PLAYER_ATK_PER_LEVEL = 1;
export const HEAL_MAX_PER_LEVEL = 1;
/** Fraction of missing max HP restored after each wave win (Heal button is the main recovery). */
export const WAVE_VICTORY_HEAL_RATIO = 0.3;
export const FOE_HP_PER_LEVEL = 3;
export const FOE_ATK_PER_LEVEL = 1;
export const FOE_LEVEL1_HP_MULTIPLIER = 0.95;
export const FOE_LEVEL2_HP_MULTIPLIER = 0.95;
export const DEFEAT_VERBS = [
    "defeat",
    "vanquish",
    "crush",
    "destroy",
    "beat",
    "obliterate",
    "smite",
    "flatten",
    "annihilate",
    "pulverize",
    "rout",
    "trounce",
    "clobber",
    "wallop",
    "thrash",
];
export function heroLabelFromFoeName(name) {
    const words = name.trim().split(/\s+/);
    return words.slice(1).join(" ") || words[0];
}
export function shuffleArray(items, random = Math.random) {
    const order = items.map((item) => item);
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
}
export function foesForHero(allFoes, heroEmoji) {
    return allFoes.filter((f) => f.emoji !== heroEmoji);
}
export function buildFoeOrder(allFoes, heroEmoji, random = Math.random) {
    return shuffleArray(foesForHero(allFoes, heroEmoji), random);
}
export function restoreFoeOrder(ids, heroEmoji, allFoes, random = Math.random) {
    const expected = foesForHero(allFoes, heroEmoji);
    if (ids?.length === expected.length) {
        const byId = new Map(allFoes.map((f) => [f.id, f]));
        const restored = ids
            .map((id) => byId.get(id))
            .filter((f) => !!f && f.emoji !== heroEmoji);
        if (restored.length === expected.length) {
            return restored;
        }
    }
    return buildFoeOrder(allFoes, heroEmoji, random);
}
export function pickFoeTemplateIndex(wave, orderLength) {
    if (orderLength <= 0) {
        throw new Error("Foe order is empty");
    }
    return (wave - 1) % orderLength;
}
export function pickFoeFromOrder(foeOrder, wave) {
    return foeOrder[pickFoeTemplateIndex(wave, foeOrder.length)];
}
export function clampBattleLevel(level) {
    return Math.max(1, Math.min(LEVEL_COUNT, level));
}
export function playerLevelForWave(wave) {
    return clampBattleLevel(Math.floor((Math.max(1, wave) - 1) / WAVES_PER_LEVEL) + 1);
}
export function playerStatsForLevel(level) {
    const lvl = clampBattleLevel(level);
    const above = lvl - 1;
    return {
        level: lvl,
        maxHp: BASE_PLAYER_MAX_HP + above * PLAYER_HP_PER_LEVEL,
        attack: BASE_PLAYER_ATTACK + above * PLAYER_ATK_PER_LEVEL,
        healMax: BASE_HEAL_MAX + above * HEAL_MAX_PER_LEVEL,
    };
}
export function playerStatsForWave(wave) {
    return playerStatsForLevel(playerLevelForWave(wave));
}
/** True when clearing wave 10, 20, … — XP bar fills before the next level band. */
export function isLevelBandFinale(completedWave, campaignLength = CAMPAIGN_WAVE_COUNT) {
    return (completedWave % WAVES_PER_LEVEL === 0 && completedWave < campaignLength);
}
export function applyPlayerStatsForWave(wave, player, options) {
    const stats = playerStatsForWave(wave);
    const prevMax = player.maxHp;
    let hp = player.hp;
    if (options?.healToMax) {
        hp = stats.maxHp;
    }
    else if (options?.grantMaxHpIncrease && stats.maxHp > prevMax) {
        hp = Math.min(stats.maxHp, hp + (stats.maxHp - prevMax));
    }
    hp = Math.min(hp, stats.maxHp);
    return {
        hp,
        maxHp: stats.maxHp,
        attack: stats.attack,
        level: stats.level,
    };
}
export function refreshWaveFoeFromTemplate(currentHp, template, wave) {
    const rebuilt = makeFoeFromTemplate(template, wave);
    return {
        hp: Math.min(currentHp, rebuilt.maxHp),
        maxHp: rebuilt.maxHp,
        attack: rebuilt.attack,
        level: rebuilt.level,
    };
}
/** XP toward the next level-up — 0% on wave 1, 90% on wave 10 (last mob of the band), level up at 11. */
export function xpProgressForWave(wave) {
    const max = WAVES_PER_LEVEL;
    const current = (Math.max(1, wave) - 1) % max;
    return { current, max };
}
export function xpPercentForWave(wave) {
    const { current, max } = xpProgressForWave(wave);
    return Math.round((current / max) * 100);
}
/** XP bar values for UI — full bar on the campaign victory screen. */
export function xpProgressForDisplay(wave, phase) {
    const progress = xpProgressForWave(wave);
    if (phase === "victory") {
        return { current: progress.max, max: progress.max };
    }
    return progress;
}
export function xpPercentForDisplay(wave, phase) {
    const { current, max } = xpProgressForDisplay(wave, phase);
    return Math.round((current / max) * 100);
}
/** Rough power score from roster base stats — used to nudge foe level up/down. */
export function foeStatScore(template) {
    return template.baseHp + template.baseAtk * 2;
}
/** Easier roster entries fight below your level; beefier ones fight above. */
export function foeDifficultyOffset(template) {
    const score = foeStatScore(template);
    if (score <= 15) {
        return -1;
    }
    if (score >= 20) {
        return 1;
    }
    return 0;
}
export function foeLevelForTemplate(template, wave) {
    return clampBattleLevel(playerLevelForWave(wave) + foeDifficultyOffset(template));
}
export function scaleFoeHp(baseHp, foeLevel) {
    const levelBonus = Math.max(0, foeLevel - 1) * FOE_HP_PER_LEVEL;
    let hp = baseHp + levelBonus;
    if (foeLevel === 1) {
        hp = Math.round(hp * FOE_LEVEL1_HP_MULTIPLIER);
    }
    else if (foeLevel === 2) {
        hp = Math.round(hp * FOE_LEVEL2_HP_MULTIPLIER);
    }
    return Math.max(4, hp);
}
export function scaleFoeAttack(baseAtk, foeLevel) {
    const levelBonus = Math.max(0, foeLevel - 1) * FOE_ATK_PER_LEVEL;
    return Math.max(1, baseAtk + levelBonus);
}
/** HP gained from the between-wave victory top-up (capped at max). */
export function waveVictoryHealGain(currentHp, maxHp) {
    const room = Math.max(0, maxHp - currentHp);
    if (room <= 0) {
        return 0;
    }
    return Math.min(room, Math.ceil(maxHp * WAVE_VICTORY_HEAL_RATIO));
}
export function healHpAfterWaveVictory(currentHp, maxHp) {
    return Math.min(maxHp, currentHp + waveVictoryHealGain(currentHp, maxHp));
}
export function makeFoeFromTemplate(template, wave) {
    const level = foeLevelForTemplate(template, wave);
    const hp = scaleFoeHp(template.baseHp, level);
    const attack = scaleFoeAttack(template.baseAtk, level);
    return {
        id: template.id,
        name: template.name,
        emoji: template.emoji,
        hp,
        maxHp: hp,
        attack,
        level,
    };
}
/** Max damage a foe can roll on the next hit (includes HYPE). */
export function maxFoeHit(baseAttack, hypeLevel) {
    return effectiveAttack(baseAttack, hypeLevel);
}
export function buildInitialFoeQueue(foeOrder) {
    return foeOrder.map((entry) => entry.id);
}
export function buildQueueCycleFromWave(foeOrder, wave) {
    const start = pickFoeTemplateIndex(wave, foeOrder.length);
    const ids = foeOrder.map((entry) => entry.id);
    return [...ids.slice(start), ...ids.slice(0, start)];
}
export function advanceFoeQueueAfterVictory(queue, deferred, foeOrder, nextWave) {
    let nextQueue = queue.slice(1);
    let nextDeferred = [...deferred];
    if (nextQueue.length === 0 && nextDeferred.length > 0) {
        nextQueue = [...nextDeferred];
        nextDeferred = [];
    }
    if (nextQueue.length === 0) {
        nextQueue = buildQueueCycleFromWave(foeOrder, nextWave);
    }
    return { queue: nextQueue, deferred: nextDeferred };
}
export function advanceFoeQueueAfterFlee(queue, deferred, fledId, foeOrder, wave) {
    let nextDeferred = [...deferred, fledId];
    let nextQueue = queue.slice(1);
    if (nextQueue.length === 0 && nextDeferred.length > 0) {
        nextQueue = [...nextDeferred];
        nextDeferred = [];
    }
    if (nextQueue.length === 0) {
        nextQueue = buildQueueCycleFromWave(foeOrder, wave);
    }
    return { queue: nextQueue, deferred: nextDeferred };
}
export function makeFoeFromQueueHead(queue, foeOrder, wave) {
    const id = queue[0];
    if (!id) {
        throw new Error("Foe queue is empty");
    }
    const template = foeOrder.find((entry) => entry.id === id);
    if (!template) {
        throw new Error(`Unknown foe id ${id}`);
    }
    return makeFoeFromTemplate(template, wave);
}
export function makeFoeForWave(foeOrder, wave) {
    return makeFoeFromTemplate(pickFoeFromOrder(foeOrder, wave), wave);
}
export function normalizeHeroName(raw, maxLength = HERO_NAME_MAX_LENGTH) {
    return raw
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[<>]/g, "")
        .slice(0, maxLength);
}
export function getSetupBlockers(heroEmoji, rawHeroName) {
    const blockers = [];
    if (!heroEmoji) {
        blockers.push("pick a critter");
    }
    if (!normalizeHeroName(rawHeroName)) {
        blockers.push("enter your name");
    }
    return blockers;
}
export function formatSetupBlockerMessage(blockers) {
    if (blockers.length === 0) {
        return "";
    }
    if (blockers.length === 1) {
        return `To fight, ${blockers[0]}.`;
    }
    return `To fight, ${blockers[0]} and ${blockers[1]}.`;
}
export function foeColorConflictsWithHero(heroColorTheme, foeColorTheme) {
    return heroColorTheme === foeColorTheme;
}
export function formatFoeInText(template, foeName) {
    return template.replace(/\{foe\}/g, foeName);
}
export function nextDefeatVerb(index, verbs = DEFEAT_VERBS) {
    const verb = verbs[index % verbs.length];
    return { verb, nextIndex: index + 1 };
}
export function randomDamage(max, random) {
    if (max < 1) {
        throw new Error("randomDamage max must be at least 1");
    }
    return Math.floor(random() * max) + 1;
}
export function randomHeal(max, random) {
    return randomDamage(max, random);
}
/** Same 1–healMax roll as the Heal command; HP capped at max. */
export function applyPlayerHealRoll(currentHp, maxHp, healMax, random) {
    if (healMax < 1) {
        return { rolled: 0, hp: currentHp, gained: 0 };
    }
    const rolled = randomHeal(healMax, random);
    const hp = Math.min(maxHp, currentHp + rolled);
    return { rolled, hp, gained: hp - currentHp };
}
/** Lose 1 HYPE when damage is taken (same rule for player and foe). */
export function hypeAfterTakingHit(hypeBefore, damageDealt) {
    if (damageDealt <= 0) {
        return hypeBefore;
    }
    return Math.max(0, hypeBefore - 1);
}
export function hypeAttackBonus(hypeLevel) {
    return Math.max(0, hypeLevel) * HYPE_ATTACK_PER_LEVEL;
}
export function clampHype(level, max = HYPE_MAX) {
    return Math.max(0, Math.min(max, level));
}
export function applyHypeGain(current, amount, max = HYPE_MAX) {
    return clampHype(current + amount, max);
}
/** HYPE after taking counter damage on heal (or any hit). */
export function hypeAfterCounterHit(hypeBefore, counterOccurred, damageDealt = 1) {
    return counterOccurred ? hypeAfterTakingHit(hypeBefore, damageDealt) : hypeBefore;
}
export function hypeHeadroom(current, max = HYPE_MAX) {
    return Math.max(0, max - clampHype(current, max));
}
export function formatHypeLabel(level, max = HYPE_MAX) {
    return `HYPE ${clampHype(level, max)}/${max}`;
}
export function effectiveAttack(baseAttack, hypeLevel) {
    return baseAttack + hypeAttackBonus(hypeLevel);
}
export function canFleeWave(wave, campaignLength = CAMPAIGN_WAVE_COUNT) {
    return wave < campaignLength;
}
