import { test, expect } from "@playwright/test";
import { INTRO_SEEN_KEY, STORAGE_KEY } from "../src/game/storage-keys.js";

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(({ page }) => {
  page.on("console", message => { if (message.type() === "error") console.error(message.text()); });
});

test("first visit requires Play, leaves title and picker silent and then starts music", async ({ page }) => {
  await page.addInitScript(() => {
    const proto = AudioContext.prototype;
    const oscillator = proto.createOscillator;
    let notes = 0;
    proto.createOscillator = function () {
      document.documentElement.dataset.audioNotes = String(++notes);
      return oscillator.call(this);
    };
  });
  await page.goto("/");
  const play = page.getByRole("button", { name: "Play", exact: true });
  const picker = page.getByRole("heading", { name: "Which critter are you?" });
  await expect(page.locator("#title-screen-wordmark")).toBeVisible({ timeout: 10_000 });
  await expect(picker).toBeHidden();
  await expect(page.locator("html")).not.toHaveAttribute("data-audio-notes", /.+/);
  await expect(play).toHaveCSS("animation-name", "play-glow");
  await page.evaluate(() => document.fonts.ready);
  const playAt = async (time: number) => {
    await play.evaluate((button, time) => {
      const glow = button.getAnimations()[0]!;
      glow.pause();
      glow.currentTime = time;
    }, time);
    return (await play.screenshot()).toString("base64");
  };
  const rest = await playAt(0);
  const peak = await playAt(1300);
  const amberPixels = await page.evaluate(async ([rest,peak]) => {
    const decode = async (data: string) => {
      const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      const image = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const canvas=document.createElement("canvas");
      canvas.width=image.width;
      canvas.height=image.height;
      const context=canvas.getContext("2d")!;
      context.drawImage(image,0,0);
      return context.getImageData(0,0,canvas.width,canvas.height).data;
    };
    const [a,b] = await Promise.all([decode(rest!), decode(peak!)]);
    let count=0;
    for(let i=0;i<a.length;i+=4){
      if(b[i]!-a[i]!>12 && b[i+1]!-a[i+1]!>6 && b[i]!>b[i+2]!+20)count++;
    }
    return count;
  },[rest,peak]);
  expect(amberPixels).toBeGreaterThan(100);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(play).toHaveCSS("animation-name", "none");
  await expect(play).toHaveCSS("opacity", "1");
  await expect(play).not.toHaveCSS("text-shadow", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(play).toHaveCSS("animation-name", "play-glow");
  await page.keyboard.press("Tab");
  await expect(play).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(picker).toBeVisible();
  await page.getByRole("textbox", { name: "Name" }).fill("Test Critter");
  await page.waitForTimeout(400);
  await expect(page.locator("html")).not.toHaveAttribute("data-audio-notes", /.+/);
  await page.locator(".emoji-pick").first().click();
  await page.getByRole("button", { name: "Fight!" }).click();
  await expect(page.getByRole("button", { name: "Attack" })).toBeEnabled();
  await expect(page.locator("html")).toHaveAttribute("data-audio-notes", /[1-9]/);
  const save = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  expect(save).toContain("Test Critter");
  await page.reload();
  await expect(play).toBeHidden();
  await expect(page.getByRole("button", { name: "Attack" })).toBeEnabled();
  expect(await page.evaluate(key => localStorage.getItem(key), INTRO_SEEN_KEY)).toBe("1");
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toContain("Test Critter");
  await page.keyboard.press("Shift");
  await expect(page.locator("html")).toHaveAttribute("data-audio-notes", /[1-9]/);

  // Simulate a saved run from before this feature existed.
  const existing = await page.evaluate(({intro,save}) => {
    localStorage.removeItem(intro);
    const snapshot=localStorage.getItem(save);
    sessionStorage.setItem("critterwave-skip-exit-flush","1");
    return snapshot;
  }, {intro:INTRO_SEEN_KEY,save:STORAGE_KEY});
  await page.reload();
  await expect(play).toBeVisible();
  expect(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY)).toBe(existing);
  await play.click();
  await expect(page.getByRole("button", { name: "Attack" })).toBeEnabled();
  await expect(page.locator("#hero-name")).toContainText(/test critter/i);
  await expect(page.locator("html")).toHaveAttribute("data-audio-notes", /[1-9]/);
});

test("mobile rotates safely and Play opens the picker", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ isMobile: true, hasTouch: true, viewport: { width: 844, height: 390 } });
  const page = await context.newPage();
  await page.goto(baseURL!);
  const play = page.getByRole("button", { name: "Play", exact: true });
  await expect(page.getByText("Rotate your device to portrait.")).toBeVisible();
  await expect(play).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(play).toBeVisible();
  for (const width of [320, 360, 390, 430, 558, 650]) {
    await page.setViewportSize({ width, height: 844 });
    const wordmark = await page.locator("#title-screen-wordmark").evaluate(async (el) => {
      await document.fonts.ready;
      const style = getComputedStyle(el);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      context.font = `${style.fontSize} ${style.fontFamily}`;
      context.letterSpacing = style.letterSpacing;
      const ink = context.measureText(el.textContent!.toUpperCase());
      const bounds = el.getBoundingClientRect();
      return { ink: ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight, left: bounds.left, right: bounds.right };
    });
    expect(wordmark.ink / width, JSON.stringify({width,...wordmark})).toBeGreaterThanOrEqual(0.81);
    expect(wordmark.ink / width, JSON.stringify({width,...wordmark})).toBeLessThanOrEqual(0.85);
    expect(wordmark.left).toBeGreaterThan(5);
    expect(wordmark.right).toBeLessThan(width - 5);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const pixels = await page.screenshot();
  const logo = await page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const {data: rgba} = context.getImageData(0, 0, canvas.width, canvas.height);
    let left = canvas.width, right = 0;
    for (let i=0; i<rgba.length; i+=4) {
      if (rgba[i]! > 175 && rgba[i+1]! > 145 && rgba[i+2]! < 115) {
        const x = (i/4) % canvas.width;
        left = Math.min(x,left);
        right = Math.max(x,right);
      }
    }
    return { left, right, width: canvas.width };
  }, pixels.toString("base64"));
  expect((logo.right-logo.left+1)/logo.width, JSON.stringify(logo)).toBeGreaterThan(0.79);
  expect((logo.right-logo.left+1)/logo.width, JSON.stringify(logo)).toBeLessThan(0.86);
  expect(Math.abs(logo.left - (logo.width - 1 - logo.right)),JSON.stringify(logo)).toBeLessThanOrEqual(3);
  await play.tap();
  await expect(page.getByRole("heading", { name: "Which critter are you?" })).toBeVisible();
  await context.close();
});

test("title appears and accepts Play while the game module is still downloading", async ({ page }) => {
  let resumeDownload!: () => void;
  const download = new Promise<void>(resolve => { resumeDownload = resolve; });
  let markRequested!: () => void;
  const requested = new Promise<void>(resolve => { markRequested = resolve; });
  await page.route("**/js/game/app.js", async route => {
    markRequested();
    await download;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await requested;
    const play = page.getByRole("button", { name: "Play", exact: true });
    await expect(play).toBeVisible();
    await expect(page.locator("#title-screen-wordmark")).toBeVisible();
    await play.click();
    await expect(play).toBeDisabled();
    const loading = page.getByText("LOADING CRITTERS");
    await expect(loading).toBeVisible();
    await expect(loading.locator(".transition-critter")).toHaveText("⏳");
    await expect(loading.locator(".transition-critter")).toHaveCSS("background-color","rgba(0, 0, 0, 0)");
    const playFont = await play.evaluate(el=>[getComputedStyle(el).fontFamily,getComputedStyle(el).fontSize]);
    await expect(loading).toHaveCSS("font-family",playFont[0]!);
    await expect(loading).toHaveCSS("font-size",playFont[1]!);
    for (const width of [320,390]) {
      await page.setViewportSize({width,height:740});
      const bounds = (await loading.boundingBox())!;
      expect(bounds.x).toBeGreaterThan(0);
      expect(bounds.x+bounds.width).toBeLessThan(width);
    }
    await expect(page.getByRole("heading", { name: "Which critter are you?" })).toBeHidden();
    expect(await page.evaluate(key => localStorage.getItem(key), INTRO_SEEN_KEY)).toBeNull();
    resumeDownload();
    await expect(page.getByRole("heading", { name: "Which critter are you?" })).toBeVisible();
    await expect(play).toBeHidden();
    await expect(page.getByText("LOADING CRITTERS")).toBeHidden();
    expect(await page.evaluate(key => localStorage.getItem(key), INTRO_SEEN_KEY)).toBe("1");
  } finally { resumeDownload(); }
});

test("a failed first-load module leaves a retryable title, not a blank screen", async ({ page }) => {
  await page.route("**/js/game/app.js", route=>route.abort());
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Play",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("Couldn’t load the game.");
  expect(await page.evaluate(key=>localStorage.getItem(key),INTRO_SEEN_KEY)).toBeNull();
  await page.unroute("**/js/game/app.js");
  await page.getByRole("button",{name:"Retry"}).click();
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Play",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Which critter are you?"})).toBeVisible();
});

test("arena loading status is shown only during a delayed Fight transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const audio = AudioContext.prototype;
    const nativeResume = audio.resume;
    const nativeState = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, "state")!.get!;
    let release!: () => void;
    const pending = new Promise<void>(resolve=>{ release=resolve; });
    let held = true;
    Object.defineProperty(audio, "state", { get() { return held?"suspended":nativeState.call(this); } });
    audio.resume = async function () { await pending; return nativeResume.call(this); };
    window.addEventListener("release-test-audio",()=>{ held=false;release(); },{once:true});
  });
  await page.goto("/");
  await page.getByRole("button",{name:"Play",exact:true}).click();
  await expect(page.getByText("LOADING CRITTERS")).toBeHidden();
  await expect(page.getByText("ENTERING ARENA")).toBeHidden();
  const picker=page.locator("#character-setup");
  await expect(picker).toHaveCSS("background-color","rgb(20, 13, 32)");
  await page.evaluate(()=>{document.documentElement.dataset.theme="light";});
  await expect(picker).toHaveCSS("background-color","rgb(248, 240, 255)");
  await page.locator(".emoji-pick").first().click();
  await page.getByRole("textbox",{name:"Name"}).fill("Test Critter");
  await page.getByRole("button",{name:"Fight!"}).click();
  const waiting=page.getByText("ENTERING ARENA");
  await expect(waiting).toBeVisible();
  await expect(waiting).toHaveCSS("background-color","rgb(20, 13, 32)");
  await expect(waiting.locator(".transition-critter")).toHaveText("⏳");
  const play=page.locator("#title-screen-play");
  const playFont=await play.evaluate(el=>[getComputedStyle(el).fontFamily,getComputedStyle(el).fontSize]);
  await expect(waiting).toHaveCSS("font-family",playFont[0]!);
  await expect(waiting).toHaveCSS("font-size",playFont[1]!);
  for (const width of [320,390]) {
    await page.setViewportSize({width,height:740});
    const bounds = (await waiting.boundingBox())!;
    expect(bounds.x).toBe(0);
    expect(bounds.width).toBe(width);
    expect(bounds.height).toBe(740);
    const textFits = await waiting.evaluate(el=>el.scrollWidth<=el.clientWidth);
    expect(textFits).toBe(true);
  }
  await expect(waiting.locator(".transition-critter")).toHaveCSS("animation-name","none");
  await expect(page.getByRole("button",{name:"Fight!"})).toBeDisabled();
  await page.evaluate(()=>window.dispatchEvent(new Event("release-test-audio")));
  await expect(page.getByRole("button",{name:"Attack"})).toBeEnabled();
  await expect(waiting).toBeHidden();
});
