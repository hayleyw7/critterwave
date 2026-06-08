import { describe, expect, it } from "vitest";
import {
  advanceFoeQueueAfterFlee,
  advanceFoeQueueAfterVictory,
  buildInitialFoeQueue,
  buildQueueCycleFromWave,
  makeFoeFromQueueHead,
} from "../../src/lib/game-logic.js";

const SAMPLE_FOES = [
  { id: "a", name: "Angry Ant", emoji: "🐜", baseHp: 10, baseAtk: 2 },
  { id: "b", name: "Berserk Bat", emoji: "🦇", baseHp: 12, baseAtk: 3 },
  { id: "c", name: "Conniving Cat", emoji: "🐱", baseHp: 14, baseAtk: 4 },
] as const;

describe("foe queue", () => {
  it("builds initial queue in roster order", () => {
    expect(buildInitialFoeQueue(SAMPLE_FOES)).toEqual(["a", "b", "c"]);
  });

  it("builds wave-aligned cycles", () => {
    expect(buildQueueCycleFromWave(SAMPLE_FOES, 1)).toEqual(["a", "b", "c"]);
    expect(buildQueueCycleFromWave(SAMPLE_FOES, 2)).toEqual(["b", "c", "a"]);
    expect(buildQueueCycleFromWave(SAMPLE_FOES, 4)).toEqual(["a", "b", "c"]);
  });

  it("advances queue on victory without touching deferred", () => {
    const queue = ["a", "b", "c"];
    const won = advanceFoeQueueAfterVictory(queue, [], SAMPLE_FOES, 2);
    expect(won.queue).toEqual(["b", "c"]);
    expect(won.deferred).toEqual([]);
  });

  it("defers fled foe and advances to next in queue", () => {
    const queue = ["a", "b", "c"];
    const fled = advanceFoeQueueAfterFlee(queue, [], "a", SAMPLE_FOES, 1);
    expect(fled.queue).toEqual(["b", "c"]);
    expect(fled.deferred).toEqual(["a"]);
  });

  it("does not increment wave on flee — queue head changes only", () => {
    const queue = ["a", "b", "c"];
    const fled = advanceFoeQueueAfterFlee(queue, [], "a", SAMPLE_FOES, 1);
    const foe = makeFoeFromQueueHead(fled.queue, SAMPLE_FOES, 1);
    expect(foe.id).toBe("b");
  });

  it("uses current wave stats for queue head after flee", () => {
    const fled = advanceFoeQueueAfterFlee(["a", "b"], [], "a", SAMPLE_FOES, 11);
    const high = makeFoeFromQueueHead(fled.queue, SAMPLE_FOES, 11);
    const low = makeFoeFromQueueHead(fled.queue, SAMPLE_FOES, 1);
    expect(high.level).toBeGreaterThan(low.level);
  });

  it("pulls deferred foes after clearing the active queue", () => {
    const mid = advanceFoeQueueAfterVictory(["b", "c"], ["a"], SAMPLE_FOES, 2);
    expect(mid.queue).toEqual(["c"]);
    expect(mid.deferred).toEqual(["a"]);

    const final = advanceFoeQueueAfterVictory(["c"], ["a"], SAMPLE_FOES, 3);
    expect(final.queue).toEqual(["a"]);
    expect(final.deferred).toEqual([]);
  });

  it("simulates flee one foe then beating rest brings deferred back", () => {
    let queue = buildInitialFoeQueue(SAMPLE_FOES);
    let deferred: string[] = [];

    const fleeA = advanceFoeQueueAfterFlee(queue, deferred, "a", SAMPLE_FOES, 1);
    queue = fleeA.queue;
    deferred = fleeA.deferred;
    expect(queue).toEqual(["b", "c"]);
    expect(deferred).toEqual(["a"]);

    const winB = advanceFoeQueueAfterVictory(queue, deferred, SAMPLE_FOES, 2);
    queue = winB.queue;
    deferred = winB.deferred;
    expect(queue).toEqual(["c"]);
    expect(deferred).toEqual(["a"]);

    const winC = advanceFoeQueueAfterVictory(queue, deferred, SAMPLE_FOES, 3);
    queue = winC.queue;
    deferred = winC.deferred;
    expect(queue).toEqual(["a"]);
    expect(deferred).toEqual([]);
  });

  it("rebuilds cycle when queue and deferred are both empty after victory", () => {
    const won = advanceFoeQueueAfterVictory(["c"], [], SAMPLE_FOES, 4);
    expect(won.queue[0]).toBe("a");
    expect(won.deferred).toEqual([]);
  });

  it("throws when spawning from empty queue", () => {
    expect(() => makeFoeFromQueueHead([], SAMPLE_FOES, 1)).toThrow(/empty/i);
  });

  it("throws for unknown queue id", () => {
    expect(() => makeFoeFromQueueHead(["missing"], SAMPLE_FOES, 1)).toThrow(/unknown/i);
  });
});
