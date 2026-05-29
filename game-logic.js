export const CAMPAIGN_WAVE_COUNT = 100;
export const HERO_NAME_MAX_LENGTH = 16;
export const HYPE_ATTACK_PER_LEVEL = 1;
export const DEFEAT_VERBS = [
    "defeat",
    "vanquish",
    "crush",
    "destroy",
    "best",
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
export function scaleFoeHp(baseHp, wave) {
    return baseHp + Math.max(0, wave - 1) * 2;
}
export function scaleFoeAttack(baseAtk, wave) {
    return baseAtk + Math.floor((wave - 1) / 3);
}
export function makeFoeFromTemplate(template, wave) {
    const hp = scaleFoeHp(template.baseHp, wave);
    return {
        id: template.id,
        name: template.name,
        emoji: template.emoji,
        hp,
        maxHp: hp,
        attack: scaleFoeAttack(template.baseAtk, wave),
    };
}
export function makeFoeForWave(foeOrder, wave) {
    return makeFoeFromTemplate(pickFoeFromOrder(foeOrder, wave), wave);
}
export function normalizeHeroName(raw, maxLength = HERO_NAME_MAX_LENGTH) {
    return raw.trim().replace(/\s+/g, " ").slice(0, maxLength);
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
    if (heroColorTheme === "green") {
        return false;
    }
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
export function hypeAttackBonus(hypeLevel) {
    return Math.max(0, hypeLevel) * HYPE_ATTACK_PER_LEVEL;
}
export function effectiveAttack(baseAttack, hypeLevel) {
    return baseAttack + hypeAttackBonus(hypeLevel);
}
export function canFleeWave(wave, campaignLength = CAMPAIGN_WAVE_COUNT) {
    return wave < campaignLength;
}
