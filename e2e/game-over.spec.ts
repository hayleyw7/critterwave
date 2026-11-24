import { expect, test, type Page } from "@playwright/test";
import { patchSaveSnapshot, reloadAfterSavePatch } from "./helpers/save.js";
import { clearSave, clickCombatRun, startFreshRun, STORAGE_KEY } from "./helpers/index.js";

  test("game over screen persists across reload", async ({ page }) => {
    await page.goto("/?debug=lose");

    await expect(page.locator("#game-over")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#game-over-tag")).toHaveText("GAME OVER");

    await page.reload();

    await expect(page.locator("#game-over")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#game-over-tag")).toHaveText("GAME OVER");
    await expect(page.locator("#game-over-summary")).toContainText(/beat/i);
    await expect(page.locator("#game-over-battle-log")).toBeHidden();
    await page.getByText("Battle Log").click();
    await expect(page.locator("#game-over-battle-log")).toContainText("GAME OVER");
    await expect(page.locator("#game-over-battle-log")).toContainText(/WAVE|Turn/);
    await expect(page.locator("#actions")).toHaveClass(/hidden/);
  });

  test("game over log keeps capped dance hype inline", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, { hypeLevel: 5 });
    await reloadAfterSavePatch(page);
    await page.getByRole("button", { name: "Dance" }).click();

    await expect(page.locator("#battle-text .battle-line.battle-player")).toContainText(
      /MAX HYPE$/,
      { timeout: 10_000 }
    );

    await patchSaveSnapshot(page, {
      player: { hp: 0, maxHp: 20 },
    });
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error("missing save");
      const save = JSON.parse(raw);
      save.snapshot.phase = "gameover";
      localStorage.setItem(key, JSON.stringify(save));
    }, STORAGE_KEY);
    await page.reload();
    await expect(page.getByRole("button", { name: "Try Again?" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByText("Battle Log").click();
    await expect(page.locator("#game-over-battle-log")).toContainText(/MAX HYPE/);
    await expect(page.locator("#game-over-battle-log")).not.toContainText(
      "You're max hype!"
    );
    await expect(page.locator("#game-over-battle-log .game-over-log-entry", {
      hasText: /Turn \d+ - Dance/,
    })).toContainText(/MAX HYPE/);
  });

  test("shows turn dash on game over", async ({ page }) => {
    await startFreshRun(page);
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      const save = raw ? JSON.parse(raw) : {};
      localStorage.setItem(key, JSON.stringify({ ...save, bestWave: 0 }));
    }, STORAGE_KEY);
    await patchSaveSnapshot(page, {
      player: { hp: 1, maxHp: 20 },
      foe: { attack: 20 },
      wave: 2,
    });
    await reloadAfterSavePatch(page);
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.getByRole("button", { name: "Try Again?" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#game-over-summary")).toContainText(
      /^NEW RECORD! You beat 1 wave\./
    );
    await expect(page.locator("#turn-label")).toHaveText("-");
    await expect(page.locator("#wave-banner")).toContainText("Wave");
    await expect(page.locator("#game-over-battle-log")).toBeHidden();
    await page.getByText("Battle Log").click();
    await expect(page.locator("#game-over-battle-log")).not.toContainText(
      "What will you do?"
    );
    await expect(page.locator("#game-over-battle-log")).toContainText("WAVE 1");
    await expect(
      page.locator("#game-over-battle-log .game-over-log-meta", { hasText: "WAVE 1" })
    ).toHaveCount(1);
    await expect(page.locator("#game-over-battle-log")).toContainText(
      /LEVEL 1: \d+ HP · ATK \d+/
    );
    await expect(page.locator("#game-over-battle-log")).toContainText(
      /[A-Za-z -]+ · ATK \d+ · HP \d+/
    );
    await expect(page.locator("#game-over-battle-log")).not.toContainText(
      /HP \d+\/\d+/
    );
    await expect(page.locator("#game-over-battle-log")).not.toContainText(
      "Welcome back"
    );
    await expect(page.locator("#game-over-battle-log")).not.toContainText(
      "It's your turn against"
    );
    await expect(page.locator("#game-over-battle-log")).not.toContainText("appears!");
    await expect(page.locator("#game-over-battle-log")).toContainText(
      "Turn 1 - Attack"
    );
    await expect(page.locator("#game-over-battle-log")).not.toContainText(
      /You PWR \d\/5 · ATK \d+/
    );
    await expect(page.locator("#game-over-battle-log")).toContainText("GAME OVER");
    await expect(page.locator("#game-over-battle-log")).toContainText(/hits you/i);
  });

test.describe("wave victory heal", () => {
  test("defeating a foe heals 30% of missing max hp before next appears", async ({ page }) => {
    await startFreshRun(page);
    await patchSaveSnapshot(page, {
      player: { hp: 8, maxHp: 20 },
      foe: { hp: 1, maxHp: 12 },
    });
    await reloadAfterSavePatch(page);

    const waveBefore = await page.locator("#wave-banner").textContent();
    await page.getByRole("button", { name: "Attack" }).click();
    await expect(page.locator("#battle-text")).toContainText(/appears!/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#player-hp-text")).toHaveText("14/20");
    await expect(page.locator(".hero-hp-wrap .hp-bar")).toHaveClass(/hp-first-wave-heal-flash/);
    await expect(page.locator("#wave-banner")).not.toHaveText(waveBefore ?? "");

    await page.waitForTimeout(1500);
    await expect(page.locator(".hero-hp-wrap .hp-bar")).not.toHaveClass(
      /hp-first-wave-heal-flash/
    );
  });
});


test("Try Again matches the Fight palette in both themes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?debug=lose");
  const button = page.getByRole("button", { name: "Try Again?" });
  await expect(button).toBeVisible();
  for (const theme of ["dark", "light"]) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    const palettes = await button.evaluate((el, theme) => {
      const probe = document.createElement("div");
      document.body.append(probe);
      const sample = (style: string) => {
        probe.style.backgroundColor = style;
        return getComputedStyle(probe).backgroundColor;
      };
      const values = theme === "dark"
        ? [sample("var(--setup-start-fill)"), sample("var(--setup-start-fill-hover)")]
        : [sample("var(--setup-start-fill-ready)"), sample("var(--setup-start-fill-hover)")];
      probe.remove();
      return values;
    }, theme);
    await page.mouse.move(1, 1);
    await expect(button).toHaveCSS("background-color", palettes[0]!);
    await expect(button).toHaveCSS("border-top-color", theme === "dark" ? "rgb(253, 224, 71)" : "rgb(90, 61, 138)");
    await button.hover();
    await expect(button).toHaveCSS("background-color", palettes[1]!);
    await expect(button).toHaveCSS("border-top-color", theme === "dark" ? "rgb(253, 224, 71)" : "rgb(90, 61, 138)");
    if (theme === "light") {
      const ratios = async () => button.evaluate(el => {
        const st = getComputedStyle(el);
        const surrounding = getComputedStyle(el.closest(".game-over-panel")!).backgroundColor;
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d")!;
        const factor = Number(st.filter.match(/brightness\(([^)]+)\)/)?.[1] ?? 1);
        const luminance = (value: string, brightness = 1) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = value;
          ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3)
            .map(value => Math.min(1, value * brightness / 255))
            .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
            .reduce((total, value, i) => total + value * [0.2126, 0.7152, 0.0722][i]!, 0);
        };
        const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        return {
          text: contrast(luminance(st.color, factor), luminance(st.backgroundColor, factor)),
          outline: contrast(luminance(st.borderTopColor, factor), luminance(surrounding)),
        };
      });
      const expectContrast = async () => {
        const result = await ratios();
        expect(result.text).toBeGreaterThanOrEqual(4.5);
        expect(result.outline).toBeGreaterThanOrEqual(3);
      };
      await expectContrast();
      await page.mouse.down();
      await expectContrast();
      await page.mouse.move(1, 1);
      await page.mouse.up();
      await expect(button).toHaveCSS("background-color", palettes[0]!);
      await expectContrast();
    }
  }
});


test("Game Over blinks twice and remains visible, with no blinking under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?debug=lose");
  const title = page.getByText("GAME OVER", { exact: true }).first();
  await expect(title).toBeVisible();
  await expect(title).toHaveCSS("animation-name", "game-over-blink");
  await expect(title).toHaveCSS("animation-iteration-count", "2");
  expect(await title.evaluate(el => {
    const blink = el.getAnimations()[0]!;
    const samples = [400, 800, 1400, 1800].map(time => {
      blink.currentTime = time;
      return getComputedStyle(el).opacity;
    });
    blink.finish();
    return [...samples, getComputedStyle(el).opacity];
  })).toEqual(["1", "0.4", "1", "0.4", "1"]);
  await expect(title).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(title).toHaveCSS("animation-name", "none");
  await expect(title).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => localStorage.setItem("critterwave-motion", "off"));
  await page.reload();
  await expect(title).toBeVisible();
  await expect(title).toHaveCSS("animation-name", "none");
  await expect(title).toHaveCSS("opacity", "1");
});


for (const bestBefore of [0, 1]) {
  test(`Game Over preserves only a genuine new record after refresh (previous best ${bestBefore})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await startFreshRun(page);
    await page.evaluate(({ key, bestBefore }) => {
      const save = JSON.parse(localStorage.getItem(key)!);
      save.bestWave = bestBefore;
      localStorage.setItem(key, JSON.stringify(save));
    }, { key: STORAGE_KEY, bestBefore });
    await patchSaveSnapshot(page, { player: { hp: 1, maxHp: 20 }, foe: { attack: 20 }, wave: 2 });
    await reloadAfterSavePatch(page);
    await page.getByRole("button", { name: "Attack" }).click();
    const summary = page.locator("#game-over-summary");
    const record = bestBefore === 0;
    const expected = record ? "NEW RECORD! You beat 1 wave." : "You beat 1 wave.";
    await expect(summary).toHaveText(expected);
    await page.reload();
    await expect(summary).toHaveText(expected);
    const recordLabel = summary.locator(".game-over-new-record");
    if (record) {
      await expect(recordLabel).toBeVisible();
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        const positions = await summary.evaluate(el => {
          const record = el.querySelector(".game-over-new-record")!.getBoundingClientRect();
          const waves = document.createRange();
          waves.selectNode(el.lastChild!);
          const line = waves.getBoundingClientRect();
          return { recordTop: record.top, recordBottom: record.bottom, waveTop: line.top };
        });
        if (width === 390) expect(positions.waveTop).toBeGreaterThanOrEqual(positions.recordBottom);
        else expect(Math.abs(positions.waveTop - positions.recordTop)).toBeLessThan(2);
      }
    } else {
      await expect(recordLabel).toHaveCount(0);
    }
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
    expect(await read()).toMatchObject({ bestWave: 1, snapshot: { isNewRecord: record } });
    await page.getByRole("button", { name: "Try Again?" }).click();
    await expect(summary).toBeHidden();
    expect(await read()).toMatchObject({ bestWave: 1, snapshot: { phase: "combat", isNewRecord: false } });
  });
}


test("Game Over backdrop and panel hide underlying battle pixels in both themes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?debug=lose");
  const overlay = page.locator("#game-over");
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveCSS("backdrop-filter", "none");
  for (const theme of ["dark", "light"]) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    const capture = async (background: string) => {
      await page.evaluate(value => { document.querySelector<HTMLElement>(".game-shell")!.style.backgroundColor = value; }, background);
      const png = await overlay.screenshot({ animations: "disabled", scale: "css" });
      return overlay.evaluate(async (el, data) => {
        const pic = new Image();
        pic.src = "data:image/png;base64," + data;
        await pic.decode();
        const canvas = document.createElement("canvas");
        canvas.width = pic.width;
        canvas.height = pic.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(pic, 0, 0);
        const panel = el.querySelector(".game-over-panel")!;
        const bounds = panel.getBoundingClientRect();
        const edge = [...ctx.getImageData(10, 20, 2, 4).data];
        const panelArea = [...ctx.getImageData(Math.ceil(bounds.left + 10), Math.ceil(bounds.top + 10), 2, 4).data];
        const exact = (pixels: number[], color: string) => {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          const rgb = [...ctx.getImageData(0, 0, 1, 1).data];
          return rgb[3] === 255 && pixels.some((_, i) => i % 4 === 0 && rgb.every((v, j) => v === pixels[i + j]));
        };
        return { edge, panelArea, solid: exact(edge, getComputedStyle(el).backgroundColor) && exact(panelArea, getComputedStyle(panel).backgroundColor) };
      }, png.toString("base64"));
    };
    const bright = await capture("#ff00ff");
    const green = await capture("#00ff00");
    expect(bright.solid).toBe(true);
    expect(green).toEqual(bright);
  }
});
