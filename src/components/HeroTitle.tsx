"use client";

import { useEffect, useRef } from "react";

/*
  The hero's YETENBI as gold dust: it drifts in on arching paths letter by letter, a slow wave of light ignites it
  into the Ethiopian flag (green, gold, red), and then it lives on quietly: the flag waves like cloth, light glides
  over the folds, a rare grain sparkles and small embers rise.

  The letters stay real (transparent) text: they hold the layout, are what search engines and screen readers get,
  and tell the canvas exactly where each glyph sits. Once the dust has settled, the glitter is baked into one image
  and only that image is moved, so the calm "living" phase costs almost nothing. Paused when off screen.
*/

const WORD = "YETENBI".split("");

// the flag in the site's warm palette, a touch brighter than the CSS tokens so fine grains read on the photo
const FLAG = [
  [98, 166, 114],
  [238, 202, 104],
  [204, 84, 58],
] as const;
const GOLD = [236, 200, 110];
const GLINT = [255, 246, 222];
const EMBER = [244, 146, 62];

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

type Grain = {
  x: number; // position in the word, 0..1 (for the letter-by-letter order and the wave)
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  mx: number;
  my: number;
  delay: number;
  dur: number;
  s: number;
  ph: number;
  spark: boolean;
  flag: readonly number[];
};

function run(heading: HTMLElement, canvas: HTMLCanvasElement, animate: boolean, skipBuild: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // ---- geometry: the word's box, and room around it for the dust to fly in from ----
  const W = heading.offsetWidth;
  const H = heading.offsetHeight;
  const PL = Math.round(W * 0.1);
  const PR = Math.round(W * 0.5);
  const PT = Math.round(H * 1.1);
  const PB = Math.round(H * 0.9);
  const CW = W + PL + PR;
  const CH = H + PT + PB;
  Object.assign(canvas.style, { left: `${-PL}px`, top: `${-PT}px`, width: `${CW}px`, height: `${CH}px` });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(CW * dpr);
  canvas.height = Math.round(CH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const scale = W / 980; // the design was tuned at 980 px wide

  // ---- sample the glyphs exactly where the (transparent) DOM letters are ----
  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const o = off.getContext("2d", { willReadFrequently: true })!;
  const letters = [...heading.querySelectorAll<HTMLElement>("[data-letter]")];
  const style = getComputedStyle(letters[0]);
  o.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  o.fillStyle = "#fff";
  const metrics = o.measureText("YETENBI");
  const ascent = metrics.fontBoundingBoxAscent;
  const descent = metrics.fontBoundingBoxDescent;
  for (const letter of letters) {
    const lineHeight = letter.offsetHeight;
    const baseline = letter.offsetTop + (lineHeight - (ascent + descent)) / 2 + ascent;
    o.fillText(letter.textContent ?? "", letter.offsetLeft, baseline);
  }
  const data = o.getImageData(0, 0, W, H).data;
  const points: number[] = [];
  let top = H;
  let bottom = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (data[(y * W + x) * 4 + 3] > 140) {
        points.push(x, y);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  const count = points.length / 2;
  if (count === 0) return null;

  // fewer grains on small or slow devices
  const phone = window.innerWidth < 700;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
  const max = Math.round((phone ? 7000 : 22000) * (weak ? 0.6 : 1));
  const take = Math.min(max, count);
  const grains: Grain[] = [];
  for (let i = 0; i < take; i++) {
    const k = Math.floor(Math.random() * count) * 2;
    const x = points[k] + Math.random();
    const y = points[k + 1] + Math.random();
    const a = Math.random() * Math.PI * 2;
    const r = (30 + Math.pow(Math.random(), 0.7) * 190) * scale;
    const sx = PL + W + 250 * scale + Math.cos(a) * r * 1.3; // a swirling cloud low on the right
    const sy = PT + H * 0.85 + Math.sin(a) * r * 0.7;
    const tx = PL + x;
    const ty = PT + y;
    const band = (y - top) / Math.max(1, bottom - top);
    grains.push({
      x: x / W,
      tx,
      ty,
      sx,
      sy,
      mx: (sx + tx) / 2 + (Math.random() - 0.5) * 120 * scale,
      my: Math.min(sy, ty) - (70 + Math.random() * 190) * scale, // paths arc up and over
      delay: (x / W) * 0.9 + Math.random() * 0.45, // letter by letter, Y first
      dur: 1.15 + Math.random() * 0.45,
      s: (0.55 + Math.random() * 0.75) * Math.max(0.8, Math.min(1.2, scale)),
      ph: Math.random() * Math.PI * 2,
      spark: Math.random() < 0.12,
      flag: FLAG[band < 0.36 ? 0 : band < 0.66 ? 1 : 2],
    });
  }

  // ---- the settled glitter, baked once; the living phase only moves this image ----
  const baked = document.createElement("canvas");
  baked.width = canvas.width;
  baked.height = canvas.height;
  const b = baked.getContext("2d")!;
  b.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const g of grains) {
    b.fillStyle = `rgba(${g.flag[0]},${g.flag[1]},${g.flag[2]},0.9)`;
    b.fillRect(g.tx - g.s / 2, g.ty - g.s / 2, g.s, g.s);
  }

  const front = (t: number) => ((t - 1.15) / 1.75) * (W * 1.3) - W * 0.15; // the ignition wave, left to right
  const glowWidth = W * 0.14;
  const bakeAt = Math.max(3.1, Math.max(...grains.map((g) => g.delay + g.dur)) + 0.7);

  type Spark = { x: number; y: number; born: number; life: number };
  type Ember = { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number };
  let sparks: Spark[] = [];
  let embers: Ember[] = [];
  let lastSpark = 0;

  // One frame of the build-up: every grain drawn on its own.
  const drawBuild = (t: number) => {
    const gathering = t < 2.6;
    if (gathering) {
      // fade the previous frame instead of clearing it: soft light trails behind the flying dust
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.24)";
      ctx.fillRect(0, 0, CW, CH);
    } else {
      ctx.clearRect(0, 0, CW, CH);
    }
    const f = front(t);
    for (const g of grains) {
      const k = clamp((t - g.delay) / g.dur);
      const e = smooth(k);
      const u = 1 - e;
      let x = u * u * g.sx + 2 * u * e * g.mx + e * e * g.tx;
      let y = u * u * g.sy + 2 * u * e * g.my + e * e * g.ty;
      x += Math.sin(t * 1.6 + g.ph) * 18 * scale * u;
      y += Math.cos(t * 1.3 + g.ph) * 18 * scale * u;
      const settle = clamp((t - g.delay - g.dur) / 0.7);
      const phase = g.x * 6 - t * 0.7;
      y += Math.sin(phase) * 1.6 * scale * (0.3 + g.x) * settle;
      const light = 0.84 + 0.26 * Math.cos(phase - 0.6) * settle;

      let col: readonly number[];
      let alpha: number;
      let size = g.s;
      const d = f - (g.tx - PL);
      ctx.globalCompositeOperation = k < 1 ? "lighter" : "source-over";
      if (k < 1) {
        col = g.spark ? EMBER : GOLD;
        alpha = 0.3 + 0.6 * e;
        size *= 1.25;
      } else if (d < 0) {
        col = GOLD.map((c) => c * light);
        alpha = 0.8;
      } else if (d < glowWidth) {
        const glow = Math.pow(1 - d / glowWidth, 1.6); // a warm glow as the wave passes
        col = g.flag.map((c, i) => c + (GLINT[i] - c) * glow * 0.75);
        alpha = 0.85 + 0.15 * glow;
        size *= 1 + 0.8 * glow;
      } else {
        col = g.flag.map((c) => c * light);
        alpha = 0.88;
      }
      ctx.fillStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${alpha})`;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }
    ctx.globalCompositeOperation = "source-over";
  };

  // One frame of the living flag: the baked glitter in thin columns that rise and fall like cloth,
  // with light gliding over the folds, a rare slow sparkle and drifting embers.
  const drawLiving = (t: number) => {
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, CW, CH);
    const strip = 6; // columns of the cloth wave; the wave is slow and small, so 6 px look the same as 3
    for (let x = 0; x < W; x += strip) {
      const xr = x / W;
      const dy = Math.sin(xr * 6 - t * 0.7) * 1.6 * scale * (0.3 + xr);
      const sx = (PL + x) * dpr;
      ctx.drawImage(baked, sx, 0, strip * dpr, baked.height, PL + x, dy, strip, CH);
    }
    // light and shade over the folds, only where there is glitter
    ctx.globalCompositeOperation = "source-atop";
    const light = ctx.createLinearGradient(PL, 0, PL + W, 0);
    for (let i = 0; i <= 12; i++) {
      const xr = i / 12;
      const c = Math.cos(xr * 6 - t * 0.7 - 0.6);
      light.addColorStop(xr, c > 0 ? `rgba(255,236,190,${0.14 * c})` : `rgba(20,12,6,${-0.16 * c})`);
    }
    ctx.fillStyle = light;
    ctx.fillRect(PL, 0, W, CH);

    // a few slow, soft sparkles that swell and fade
    ctx.globalCompositeOperation = "lighter";
    if (animate && t - lastSpark > (phone ? 2.6 : 1.5)) {
      lastSpark = t;
      const g = grains[(Math.random() * grains.length) | 0];
      sparks.push({ x: g.tx, y: g.ty, born: t, life: 2.6 + Math.random() * 1.4 });
    }
    sparks = sparks.filter((s) => t - s.born < s.life);
    for (const s of sparks) {
      const a = Math.sin(((t - s.born) / s.life) * Math.PI);
      const r = 4.5 * a * Math.max(0.8, scale);
      ctx.fillStyle = `rgba(${GLINT[0]},${GLINT[1]},${GLINT[2]},${0.16 * a})`;
      ctx.fillRect(s.x - r * 0.55, s.y - r * 0.55, r * 1.1, r * 1.1);
      ctx.fillStyle = `rgba(${GLINT[0]},${GLINT[1]},${GLINT[2]},${0.55 * a})`;
      ctx.fillRect(s.x - r, s.y - 0.35, r * 2, 0.7);
      ctx.fillRect(s.x - 0.35, s.y - r, 0.7, r * 2);
    }

    // embers drifting up from the tops of the letters
    if (animate && Math.random() < (phone ? 0.12 : 0.3)) {
      const g = grains[(Math.random() * grains.length) | 0];
      if ((g.ty - PT - top) / Math.max(1, bottom - top) < 0.3)
        embers.push({
          x: g.tx,
          y: g.ty,
          vx: (Math.random() - 0.5) * 0.18,
          vy: -(0.12 + Math.random() * 0.22),
          life: 0,
          max: 3.5 + Math.random() * 3,
          s: 0.6 + Math.random() * 0.9,
        });
    }
    embers = embers.filter((m) => m.life < m.max);
    for (const m of embers) {
      m.life += 1 / 30;
      m.x += (m.vx + Math.sin(m.life * 1.2 + m.y) * 0.08) * 2;
      m.y += m.vy * 2;
      const a = Math.sin((m.life / m.max) * Math.PI) * 0.85;
      ctx.fillStyle = `rgba(${EMBER[0]},${EMBER[1] + 40},${EMBER[2]},${a})`;
      ctx.fillRect(m.x, m.y, m.s, m.s);
    }
    ctx.globalCompositeOperation = "source-over";
  };

  // ---- the loop: build-up at full rate, the calm living phase at 30 fps; paused when not visible ----
  let start = performance.now();
  let raf = 0;
  let visible = true;
  let lastLiving = 0;
  const startAt = animate && !skipBuild ? 0 : bakeAt; // without motion or after a resize: the finished letters

  const tick = (now: number) => {
    raf = 0;
    if (!visible || document.hidden) return;
    const t = startAt + (now - start) / 1000;
    if (t < bakeAt) drawBuild(t);
    else if (now - lastLiving > (weak ? 50 : 33)) {
      lastLiving = now;
      drawLiving(t);
    }
    if (animate) raf = requestAnimationFrame(tick);
  };
  const resume = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
  };

  let pausedAt = 0;
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) pausedAt = performance.now();
    else {
      if (pausedAt) start += performance.now() - pausedAt; // continue where it left off
      pausedAt = 0;
      resume();
    }
  });
  observer.observe(canvas);
  const onVisibility = () => {
    if (document.hidden) pausedAt = performance.now();
    else {
      if (pausedAt) start += performance.now() - pausedAt;
      pausedAt = 0;
      resume();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  resume();

  return {
    stop: () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

export default function HeroTitle({ start }: { start: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const h = heading.current;
    const c = canvas.current;
    if (!start || !h || !c) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let current: ReturnType<typeof run> = null;
    let cancelled = false;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const begin = (skipBuild: boolean) => {
      current?.stop();
      current = run(h, c, !reduce, skipBuild);
      // no canvas (very old browsers): show the letters in plain gold instead
      if (!current) h.dataset.fallback = "1";
    };
    void document.fonts.ready.then(() => !cancelled && begin(false));

    // a new size redraws the letters settled (no replay), still gently alive
    let width = h.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (h.offsetWidth === width) return;
      width = h.offsetWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => begin(true), 200);
    });
    observer.observe(h);

    return () => {
      cancelled = true;
      clearTimeout(resizeTimer);
      observer.disconnect();
      current?.stop();
    };
  }, [start]);

  return (
    <h1
      ref={heading}
      aria-label="Yetenbi"
      className="group/title relative mt-3 flex font-display text-[clamp(4.5rem,15vw,12rem)] font-bold leading-[0.9] tracking-[0.04em]"
    >
      {WORD.map((letter, index) => (
        <span
          key={index}
          aria-hidden
          data-letter
          className="inline-block text-transparent group-data-[fallback]/title:text-gold-soft"
        >
          {letter}
        </span>
      ))}
      <canvas ref={canvas} aria-hidden className="pointer-events-none absolute" />
    </h1>
  );
}
