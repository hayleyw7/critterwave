let victoryEmojis: string[] = [];

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

const GRAVITY = 0.42;
const BOUNCE_DAMPING = 0.72;
const FRICTION = 0.985;
const SPAWN_INTERVAL_MS = 110;
const PARTICLE_SIZE_REM_MIN = 1.35;
const PARTICLE_SIZE_REM_RANGE = 1.65;

type Particle = {
  el: HTMLSpanElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  half: number;
};

let layerEl: HTMLElement | null = null;
let particles: Particle[] = [];
let rafId: number | null = null;
let spawnTimer: number | null = null;
let spawnCount = 0;
let running = false;

function spawnParticle(width: number, emoji: string): void {
  if (!layerEl) {
    return;
  }

  const el = document.createElement("span");
  el.className = "victory-emoji";
  el.textContent = emoji;
  el.setAttribute("aria-hidden", "true");

  const sizeRem = PARTICLE_SIZE_REM_MIN + Math.random() * PARTICLE_SIZE_REM_RANGE;
  el.style.fontSize = `${sizeRem}rem`;
  layerEl.appendChild(el);

  const rect = el.getBoundingClientRect();
  const half = Math.max(8, rect.width / 2);
  const minX = half;
  const maxX = Math.max(minX, width - half);

  particles.push({
    el,
    x: Math.random() * (maxX - minX) + minX,
    y: -40 - Math.random() * 120,
    vx: (Math.random() - 0.5) * 10,
    vy: Math.random() * 3 + 1,
    rotation: Math.random() * 360,
    spin: (Math.random() - 0.5) * 14,
    half,
  });
}

function tick(): void {
  if (!layerEl || !running) {
    return;
  }

  const bounds = layerEl.closest(".game-over")?.getBoundingClientRect();
  const { width, height } = bounds ?? layerEl.getBoundingClientRect();
  const floor = height - 28;

  for (const particle of particles) {
    particle.vy += GRAVITY;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.rotation += particle.spin;
    particle.vx *= FRICTION;

    const ceiling = particle.half;
    if (particle.y > floor) {
      particle.y = floor;
      particle.vy *= -BOUNCE_DAMPING;
      particle.vx += (Math.random() - 0.5) * 2;
      if (Math.abs(particle.vy) < 1.2) {
        particle.vy = -5 - Math.random() * 4;
      }
    }

    if (particle.x < ceiling) {
      particle.x = ceiling;
      particle.vx = Math.abs(particle.vx) * BOUNCE_DAMPING;
    }
    if (particle.x > width - ceiling) {
      particle.x = width - ceiling;
      particle.vx = -Math.abs(particle.vx) * BOUNCE_DAMPING;
    }

    particle.el.style.transform = `translate3d(${particle.x}px, ${particle.y}px, 0) rotate(${particle.rotation}deg)`;
  }

  rafId = requestAnimationFrame(tick);
}

function scheduleSpawns(): void {
  if (!running || !layerEl) {
    return;
  }

  const { width } = layerEl.getBoundingClientRect();

  if (spawnCount < victoryEmojis.length && width > 0) {
    spawnParticle(width, victoryEmojis[spawnCount]!);
    spawnCount += 1;
  }

  if (spawnCount < victoryEmojis.length) {
    spawnTimer = window.setTimeout(scheduleSpawns, SPAWN_INTERVAL_MS);
  }
}

function spawnStaticBackdrop(
  layer: HTMLElement,
  emojis: readonly string[]
): void {
  layer.textContent = "";
  const shown = emojis.slice(0, 12);
  for (let i = 0; i < emojis.length; i++) {
    const el = document.createElement("span");
    el.className = "victory-emoji victory-emoji-static";
    el.textContent = shown[i]!;
    el.style.left = `${12 + i * 14}%`;
    el.style.bottom = `${8 + (i % 3) * 6}%`;
    el.style.fontSize = `${1.5 + (i % 2) * 0.5}rem`;
    layer.appendChild(el);
  }
}

export function startVictoryCelebration(
  layer: HTMLElement,
  emojis: readonly string[],
  playerEmoji: string
): void {
  stopVictoryCelebration(layer);

  victoryEmojis = shuffle(
    emojis.filter((emoji) => emoji !== playerEmoji)
  );

  layer.classList.remove("hidden");
  layerEl = layer;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    spawnStaticBackdrop(layer, victoryEmojis);
    return;
  }

  layer.textContent = "";
  particles = [];
  spawnCount = 0;
  running = true;
  scheduleSpawns();
  rafId = requestAnimationFrame(tick);
}

export function stopVictoryCelebration(layer?: HTMLElement): void {
  running = false;

  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (spawnTimer !== null) {
    clearTimeout(spawnTimer);
    spawnTimer = null;
  }

  particles = [];
  spawnCount = 0;

  if (layerEl) {
    layerEl.textContent = "";
    layerEl = null;
  }

  layer?.classList.add("hidden");
}
